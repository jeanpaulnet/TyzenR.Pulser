import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import cors from "cors";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { getFirebaseDb } from "./services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const STATES_FILE = path.join(process.cwd(), "user_states.json");

function readUserStatesFromFile(): Record<string, any> {
  try {
    if (fs.existsSync(STATES_FILE)) {
      const content = fs.readFileSync(STATES_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to read user states from local file:", err);
  }
  return {};
}

function saveUserStateToFile(email: string, state: any) {
  try {
    const states = readUserStatesFromFile();
    states[email.toLowerCase().trim()] = state;
    const tempFile = STATES_FILE + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify(states, null, 2), "utf-8");
    fs.renameSync(tempFile, STATES_FILE);
  } catch (err) {
    console.error("Failed to save user state to local file:", err);
  }
}

async function getUserState(email: string): Promise<any> {
  const normEmail = email.toLowerCase().trim();
  const path = `user_states/${normEmail}`;
  
  // 1. Try Firestore first if available
  try {
    const db = await getFirebaseDb();
    if (db) {
      const docRef = doc(db, "user_states", normEmail);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.state) {
          console.log(`Loaded state for user ${normEmail} from Firestore.`);
          saveUserStateToFile(normEmail, data.state);
          return data.state;
        }
      }
    }
  } catch (err: any) {
    console.warn(`Firestore read failed for ${normEmail}, falling back to local file:`, err.message || err);
    // Log structured Firestore error as required by the Firebase Skill
    const errInfo = {
      error: err.message || String(err),
      operationType: "get",
      path: path,
      authInfo: {
        userId: null,
        email: normEmail,
        emailVerified: null,
        isAnonymous: false
      }
    };
    console.error("Firestore Structured Error:", JSON.stringify(errInfo));
  }

  // 2. Fall back to local file persistence
  const states = readUserStatesFromFile();
  return states[normEmail] || null;
}

async function saveUserState(email: string, state: any): Promise<void> {
  const normEmail = email.toLowerCase().trim();
  const path = `user_states/${normEmail}`;

  // 1. Save to local file cache first (always have a backup, super fast)
  saveUserStateToFile(normEmail, state);

  // 2. Sync to Firestore if available
  try {
    const db = await getFirebaseDb();
    if (db) {
      const docRef = doc(db, "user_states", normEmail);
      await setDoc(docRef, {
        email: normEmail,
        state: state,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`Synced state for user ${normEmail} to Firestore.`);
    }
  } catch (err: any) {
    console.warn(`Firestore sync failed for ${normEmail}:`, err.message || err);
    // Log structured Firestore error as required by the Firebase Skill
    const errInfo = {
      error: err.message || String(err),
      operationType: "write",
      path: path,
      authInfo: {
        userId: null,
        email: normEmail,
        emailVerified: null,
        isAnonymous: false
      }
    };
    console.error("Firestore Structured Error:", JSON.stringify(errInfo));
  }
}

// Initialize Stripe lazily
let stripe: Stripe | null = null;
function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn("STRIPE_SECRET_KEY is missing. Payment features will be disabled.");
      return null;
    }
    stripe = new Stripe(key);
  }
  return stripe;
}

// Gemini Helper (Server-side) with dynamic Tyzenr retrieval
let cachedGeminiKey: string | null = null;
let keyCacheTime: number = 0;

async function getGeminiApiKey(): Promise<string> {
  const now = Date.now();
  // Cache the key for 10 minutes to avoid spamming the endpoint
  if (cachedGeminiKey && (now - keyCacheTime < 10 * 60 * 1000)) {
    return cachedGeminiKey;
  }

  try {
    const res = await fetch("https://webapi.tyzenr.com/keys/gemini", {
      headers: {
        "Referer": "https://pulser.tyzenr.com/"
      }
    });
    if (res.ok) {
      const text = await res.text();
      const trimmed = text.trim();
      if (trimmed && trimmed !== "Invalid Client!" && !trimmed.includes("<html")) {
        cachedGeminiKey = trimmed;
        keyCacheTime = now;
        console.log("Successfully fetched fresh Gemini API Key dynamically from webapi.tyzenr.com");
        return trimmed;
      } else {
        console.warn(`Dynamic Gemini key response invalid/expired: "${trimmed}". Falling back...`);
      }
    } else {
      console.warn(`Dynamic Gemini key retrieval status: ${res.status}. Falling back...`);
    }
  } catch (err: any) {
    console.warn("Failed to fetch dynamic Gemini key, falling back to local environment...", err.message || err);
  }

  const envKey = process.env.GEMINI_API_KEY;
  if (!envKey) {
    throw new Error("Unable to obtain Gemini API Key from either Tyzenr endpoint or local environment variables.");
  }
  return envKey;
}

const getGenAI = (apiKey: string) => {
  return new GoogleGenAI({ 
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  
  // Webhook needs raw body for signature verification
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeClient = getStripe();

    if (!stripeClient || !sig || !webhookSecret) {
      return res.status(400).send("Webhook Configuration missing");
    }

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Payment successful for session:", session.id);
      // Here you would typically update your database (Firebase)
      // Since balance is currently in localStorage (which is client-side),
      // we'll have to rely on the client checking the session status or 
      // have the server update Firebase if the user is logged in.
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API Routes
  // User state persistence routes (per-user symbols, notes, analyses)
  app.get("/api/user/state", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Missing email parameter" });
      }
      const state = await getUserState(email);
      res.json(state || {});
    } catch (error: any) {
      console.error("Error fetching user state:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/user/state", async (req, res) => {
    try {
      const { email, state } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Missing email parameter" });
      }
      if (!state) {
        return res.status(400).json({ error: "Missing state parameter" });
      }
      await saveUserState(email, state);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving user state:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { amount, currency = "usd", email } = req.body;
      const stripeClient = getStripe();
      
      if (!stripeClient) {
        return res.status(500).json({ error: "Stripe not configured" });
      }

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: `Top up Pulser Scans`,
                description: "AI-powered stock and market analysis scans",
              },
              unit_amount: Math.round(amount * 100), // amount in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: email,
        success_url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/?payment=success&amount=${amount}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/?payment=cancelled`,
        metadata: {
          email,
          amount: amount.toString()
        }
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy Gemini calls to keep API key safe
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { prompt, config = {}, model = "gemini-3.5-flash" } = req.body;
      const apiKey = await getGeminiApiKey();
      const genAI = getGenAI(apiKey);
      
      // Failsafe: if client passed nested generationConfig, flatten it for the SDK
      const cleanConfig = { ...config };
      if (cleanConfig.generationConfig) {
        Object.assign(cleanConfig, cleanConfig.generationConfig);
        delete cleanConfig.generationConfig;
      }
      
      // Prioritize gemini-2.5-flash as it is highly stable and has active quota
      const modelsToTry = [model];
      if (model === "gemini-3.5-flash" || model === "gemini-flash-latest") {
        modelsToTry.unshift("gemini-2.5-flash");
      } else if (model !== "gemini-2.5-flash") {
        modelsToTry.push("gemini-2.5-flash");
      }

      let lastError: any = null;
      for (const currentModel of modelsToTry) {
        try {
          console.log(`Analyzing market data with model: ${currentModel}`);
          const response = await genAI.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: cleanConfig
          });
          
          return res.json({ text: response.text, candidates: response.candidates });
        } catch (err: any) {
          lastError = err;
          console.warn(`Model query with ${currentModel} failed:`, err.message || err);
        }
      }
      
      throw lastError || new Error("All proxy API model attempts failed.");
    } catch (error: any) {
      console.error("AI API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Memory cache for TipRanks check
  const tipranksCache = new Map<string, boolean>();

  app.get("/api/check-url", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      // Check if it's TipRanks
      if (targetUrl.includes("tipranks.com")) {
        // Extract symbol from path, e.g. /stocks/TSLA/forecast or similar
        const match = targetUrl.match(/stocks\/([A-Za-z0-9\.\-]+)\/forecast/i) || targetUrl.match(/stocks\/([A-Za-z0-9\.\-]+)/i);
        const symbol = match ? match[1].toUpperCase() : null;
        
        if (symbol) {
          // Check cache first
          if (tipranksCache.has(symbol)) {
            const exists = tipranksCache.get(symbol);
            return res.json({ exists, is404: !exists });
          }

          try {
            const apiKey = await getGeminiApiKey();
            const genAI = getGenAI(apiKey);
            
            const response = await genAI.models.generateContent({
              model: "gemini-2.5-flash",
              contents: `Check if the website link 'https://www.tipranks.com/stocks/${symbol}/forecast' exists and is a valid active forecast page on TipRanks, or if it is a 404 error page. Reply with ONLY the word TRUE if it is valid/exists, or FALSE if it is a 404/invalid. Do not output anything else.`,
              config: {
                tools: [{ googleSearch: {} }]
              }
            });

            const text = response.text?.trim() || "FALSE";
            const exists = text.toUpperCase().includes("TRUE");
            tipranksCache.set(symbol, exists);
            
            console.log(`TipRanks coverage check for ${symbol}: ${exists} (from Gemini search grounding)`);
            return res.json({ exists, is404: !exists });
          } catch (err: any) {
            console.warn(`TipRanks Gemini-grounded check failed for ${symbol}:`, err.message || err);
            // Default to true for standard stocks, false otherwise
            const looksLikeCryptoOrIndex = symbol.includes("USD") || symbol.includes("INR") || symbol === "BTC" || symbol === "ETH";
            const exists = !looksLikeCryptoOrIndex;
            return res.json({ exists, is404: !exists, error: err.message });
          }
        }
      }

      // Standard non-TipRanks URLs check
      try {
        const urlResponse = await fetch(targetUrl, {
          method: "HEAD",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          }
        });
        
        let status = urlResponse.status;
        if (status === 405 || status >= 500) {
          const getResponse = await fetch(targetUrl, {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
          });
          status = getResponse.status;
        }

        const is404 = status === 404;
        return res.json({ exists: !is404, status, is404 });
      } catch (err: any) {
        console.warn(`Standard URL checking failed for ${targetUrl}:`, err.message || err);
        return res.json({ exists: false, is404: true, error: err.message });
      }
    } catch (error: any) {
      console.error("Route check-url error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
