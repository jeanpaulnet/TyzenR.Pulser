import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import cors from "cors";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

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

// Gemini Helper (Server-side)
const getGenAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing");
  return new GoogleGenAI({ 
    apiKey: key,
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
                name: `Top up Pulser Credits (${amount} units)`,
                description: "AI-powered stock and market analysis credits",
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
      const genAI = getGenAI();
      
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
