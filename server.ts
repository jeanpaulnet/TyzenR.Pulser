import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { DateTime } from "luxon";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// --- Cache & Store ---
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const aiCache = new Map<string, CacheEntry<any>>();
const priceCache = new Map<string, CacheEntry<any>>();

const AI_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// --- Market Hours Utility ---
function isMarketOpen(region: string, symbolType: string): boolean {
  if (symbolType === 'CRYPTO') return true;

  const now = DateTime.now();
  
  if (region === 'INDIA') {
    const ist = now.setZone('Asia/Kolkata');
    // Mon-Fri
    if (ist.weekday > 5) return false;
    const start = ist.set({ hour: 9, minute: 15, second: 0 });
    const end = ist.set({ hour: 15, minute: 30, second: 0 });
    return ist >= start && ist <= end;
  }

  if (region === 'US') {
    const et = now.setZone('America/New_York');
    // Mon-Fri
    if (et.weekday > 5) return false;
    const start = et.set({ hour: 9, minute: 30, second: 0 });
    const end = et.set({ hour: 16, minute: 0, second: 0 });
    return et >= start && et <= end;
  }

  // Commodities: Usually 24/5. Simplification for now.
  if (symbolType === 'COMMODITY') {
    const et = now.setZone('America/New_York');
    if (et.weekday === 6) return false; // Saturday
    if (et.weekday === 7 && et.hour < 18) return false; // Sunday before 6pm ET
    if (et.weekday === 5 && et.hour > 17) return false; // Friday after 5pm ET
    return true;
  }

  return true;
}

// --- AI Logic ---
async function fetchPriceOnly(symbol: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on the server.");
  
  const genAI = new GoogleGenAI(apiKey);
  // Use a faster model for price-only check
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `Get the ABSOLUTE LATEST live trading price for "${symbol.name}" (Ticker: ${symbol.symbol}) in ${symbol.region}. 
    Use the Google Search tool. Return ONLY the numerical price and the currency symbol. 
    JSON format: {"currentPrice": "string", "currencySymbol": "string"}`;

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          currentPrice: { type: Type.STRING },
          currencySymbol: { type: Type.STRING }
        }
      }
    }
  });

  const text = response.response.text();
  return JSON.parse(text);
}

async function analyzeSymbol(symbol: any, forceRefresh = false) {
  const cacheKey = `ai_${symbol.id}`;
  const now = Date.now();

  if (!forceRefresh) {
    const cached = aiCache.get(cacheKey);
    if (cached && (now - cached.timestamp < AI_CACHE_TTL)) {
      console.log(`[AI Cache] Hit for ${symbol.symbol}`);
      return cached.data;
    }
  }

  console.log(`[AI Cache] Miss/Refresh for ${symbol.symbol}`);
  
  // Logic from pulserAgent.ts
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on the server.");
  
  const genAI = new GoogleGenAI(apiKey);
  const prompt = `Conduct an exhaustive market pulse scan for "${symbol.name}" (Ticker: ${symbol.symbol}) in the ${symbol.region} ${symbol.type} market. 
    
    CURRENT DATE/TIME: ${new Date().toISOString()}

    CRITICAL INSTRUCTIONS:
    1. REAL-TIME PRICE: You MUST obtain the absolute latest, live trading price by performing a direct web search via the Google Search tool. DO NOT rely on internal training data or stale information. For ${symbol.symbol}, prioritize data with the most recent timestamp (within the last few minutes if possible).
    2. SOURCES: Cross-reference across multiple top-tier financial platforms (e.g., Google Finance, Yahoo Finance, Investing.com, or CoinMarketCap/Binance for Crypto) to verify accuracy.
    3. CURRENCY: For Stocks, Indexes, and Crypto, always provide the price in USD ($) unless the asset is explicitly from the Indian market (in which case use ₹). For Commodities, always use USD ($).
    
    CRITICAL OBJECTIVES:
    1. CURRENT PRICE: Retrieve the numerical price as obtained from the step above.
    2. SENTIMENT AGGREGATION: Scan recent 24h news (Bloomberg, FT, Reuters, WSJ, CNBC) and technical indicators.
    3. DUAL-HORIZON RECOMMENDATION:
       - SHORT-TERM (Next 7-14 Days): Focus on momentum, recent news triggers, and macro events.
       - LONG-TERM (Next 12 Months): Focus on fundamentals, competitive moat, and sector cycles.
    4. SNAPSHOT DEEP-DIVE:
       - Value Metrics: Intrinsic Value (DCF), ROE, ROCE, PE Ratio, PB Ratio, Growth Rate (3Y & 5Y CAGR), Debt/Equity, and Margin of Safety.
       - Technicals: 200, 100, and 50-Day Moving Averages, RSI (14), and a brief technical setup summary.
       - Growth: Revenue (billions) and Growth (%) for the last 5 periods (years/quarters), ordered chronologically.
       - Business: Strategic expansion plans, company background, founding date, and employee scale.
       - Peers: Top 3 competitors with their current TTM P/E ratios and Market Cap.
       - News: 5 latest recent news headlines with their corresponding source URLs.
    
    SYSTEM INSTRUCTIONS:
    - Return valid JSON matching the specified schema.
    - Be objective. If uncertainty is high, favor NEUTRAL/HOLD.
    - Provide a concise summary (max 60 words) explaining the primary drivers of the current price and sentiment.`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro', // Using 1.5 Pro on server for better Tool use stability
  });

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          shortTermTrend: { type: Type.STRING },
          longTermTrend: { type: Type.STRING },
          currentPrice: { type: Type.STRING },
          currencySymbol: { type: Type.STRING },
          confidenceScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          snapshot: {
            type: Type.OBJECT,
            properties: {
              intrinsicValue: { type: Type.STRING },
              roe: { type: Type.STRING },
              roce: { type: Type.STRING },
              pbRatio: { type: Type.STRING },
              peRatio: { type: Type.STRING },
              growthRate3Y: { type: Type.STRING },
              growthRate5Y: { type: Type.STRING },
              debtToEquity: { type: Type.STRING },
              marginOfSafety: { type: Type.STRING },
              ma200: { type: Type.STRING },
              ma100: { type: Type.STRING },
              ma50: { type: Type.STRING },
              rsi: { type: Type.STRING },
              technicalCommentary: { type: Type.STRING },
              growthData: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    year: { type: Type.STRING },
                    revenue: { type: Type.NUMBER },
                    growth: { type: Type.NUMBER }
                  }
                }
              },
              expansionPlans: { type: Type.ARRAY, items: { type: Type.STRING } },
              about: { type: Type.STRING },
              founded: { type: Type.STRING },
              employees: { type: Type.STRING },
              peers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    pe: { type: Type.STRING },
                    marketCap: { type: Type.STRING }
                  }
                }
              },
              news: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING },
                    date: { type: Type.STRING }
                  }
                }
              }
            }
          }
        },
        required: ["shortTermTrend", "longTermTrend", "confidenceScore", "summary", "currentPrice", "currencySymbol", "snapshot"]
      }
    }
  });

  const text = response.response.text();
  const result = JSON.parse(text);

  const analysisPayload = {
    symbolId: symbol.id,
    shortTermTrend: result.shortTermTrend.toUpperCase(),
    longTermTrend: result.longTermTrend.toUpperCase(),
    confidenceScore: result.confidenceScore,
    summary: result.summary,
    currentPrice: result.currentPrice.toString().replace(/["']/g, '').trim(),
    currencySymbol: result.currencySymbol,
    snapshot: result.snapshot,
    sources: [], // Handling sources differently if needed
    lastUpdated: new Date().toISOString(),
    isAnalyzing: false,
  };

  aiCache.set(cacheKey, { data: analysisPayload, timestamp: now });
  // Also prime the price cache
  priceCache.set(`price_${symbol.id}`, { data: { price: analysisPayload.currentPrice, symbol: symbol.symbol }, timestamp: now });

  return analysisPayload;
}

// --- API Routes ---

app.post("/api/analyze", async (req, res) => {
  const { symbol, forceRefresh } = req.body;
  try {
    const result = await analyzeSymbol(symbol, forceRefresh);
    res.json(result);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/price", async (req, res) => {
  const { symbol } = req.body;
  const cacheKey = `price_${symbol.id}`;
  const now = Date.now();

  // 1. Check if market is open
  const open = isMarketOpen(symbol.region, symbol.type);
  
  // 2. Check cache
  const cached = priceCache.get(cacheKey);
  
  // If we have a cached price and the market is closed, just return it.
  // If market is open, check if cache is older than 5 mins.
  if (cached) {
    const isCacheFresh = (now - cached.timestamp < PRICE_CACHE_TTL);
    if (!open || isCacheFresh) {
      console.log(`[Price Cache] Hit for ${symbol.symbol} (Fresh or Closed)`);
      return res.json({ ...cached.data, source: open ? 'cache_hit' : 'cache_closed' });
    }
  }

  // 3. Fetch fresh price
  console.log(`[Price Cache] Miss/Live fetch for ${symbol.symbol}`);
  try {
    const result = await fetchPriceOnly(symbol);
    const priceData = { price: result.currentPrice.toString().replace(/["']/g, '').trim(), symbol: symbol.symbol };
    priceCache.set(cacheKey, { data: priceData, timestamp: now });
    res.json({ ...priceData, source: 'live' });
  } catch (error: any) {
    console.error("Price fetch error:", error);
    // If live fetch fails, fallback to stale cache if available
    if (cached) {
      res.json({ ...cached.data, source: 'cache_stale_fallback' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

async function startServer() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
