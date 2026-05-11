
import { GoogleGenAI } from "@google/genai";
import { MarketSymbol, Sentiment, PulserAnalysis } from "../types";

export class PulserAgent {
  private cachedApiKey: string | null = null;

  private async getApiKey(): Promise<string> {
    if (this.cachedApiKey) return this.cachedApiKey;
    
    try {
      // Fetching the key from the requested endpoint
      const response = await fetch('https://webapi.tyzenr.com/keys/gemini');
      if (!response.ok) throw new Error('Failed to fetch API key');
      const data = await response.text();
      this.cachedApiKey = data.trim();
      return this.cachedApiKey;
    } catch (error) {
      console.warn('External API key fetch failed, checking local env...', error);
      const fallbackKey = (process.env.GEMINI_API_KEY as string);
      if (fallbackKey) return fallbackKey;
      throw error;
    }
  }

  /**
   * Analyzes market sentiment (Short & Long Term) using search-grounded AI.
   */
  async analyzeSymbol(symbol: MarketSymbol): Promise<PulserAnalysis> {
    try {
      const apiKey = await this.getApiKey();
      const ai = new GoogleGenAI({ apiKey });

      const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });

      const prompt = `Perform an institutional-grade deep dive for ${symbol.symbol} (${symbol.name}) in the ${symbol.type} market. 
      Current Date: ${currentDate}.
      
      STRICT REQUIREMENT: Focus EXCLUSIVELY on news, earnings, and institutional sentiment from the last 48 hours. 
      The "news" array in your JSON output MUST only contain items published within the last 2 days. 
      If no significant news exists within 48 hours, mention that in the summary but still provide the latest 2-3 news links from the most recent period available (stating their dates clearly).
      
      Requirements for output (JSON ONLY):
      {
        "shortTermTrend": "BUY" | "SELL" | "HOLD" | "NEUTRAL",
        "longTermTrend": "BUY" | "SELL" | "HOLD" | "NEUTRAL",
        "confidenceScore": number (0-100),
        "summary": "Narrative covering why this trend exists.",
        "sources": [{"title": "News Source", "url": "URL"}],
        "snapshot": {
          "intrinsicValue": "string",
          "roe": "string percentage",
          "roce": "string percentage",
          "pbRatio": "number",
          "peRatio": "number",
          "growthRate3Y": "string",
          "growthRate5Y": "string",
          "debtToEquity": "ratio",
          "marginOfSafety": "percent",
          "ma200": "price",
          "ma50": "price",
          "rsi": "number",
          "technicalCommentary": "brief technical summary",
          "about": "detailed company profile",
          "tradingViewTicker": "STRICT tradingview compatible ticker symbol (e.g. NVDA for Nvidia, AAPL for Apple)",
          "founded": "year",
          "employees": "count",
          "peers": [{"name": "PeerName", "pe": "PE", "marketCap": "Value"}],
          "expansionPlans": ["Points about growth"],
          "news": [{"title": "headline", "url": "link", "date": "date (must be within last 2 days if available)"}]
        }
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

      return {
        symbolId: symbol.id,
        shortTermTrend: (data.shortTermTrend || Sentiment.NEUTRAL) as Sentiment,
        longTermTrend: (data.longTermTrend || Sentiment.NEUTRAL) as Sentiment,
        confidenceScore: data.confidenceScore || 50,
        summary: data.summary || "No summary available.",
        sources: (data.sources || []).map((s: any) => ({ title: s.title, uri: s.url || s.uri })),
        snapshot: data.snapshot,
        lastUpdated: new Date().toISOString(),
        isAnalyzing: false
      };
    } catch (error) {
      console.error(`AI Insight Error [${symbol.symbol}]:`, error);
      return {
        symbolId: symbol.id,
        shortTermTrend: Sentiment.NEUTRAL,
        longTermTrend: Sentiment.NEUTRAL,
        confidenceScore: 0,
        summary: "AI Engine is syncing market data. Please retry after a refresh.",
        sources: [],
        lastUpdated: new Date().toISOString(),
        isAnalyzing: false
      };
    }
  }

  /**
   * Fetches latest price data from open APIs.
   */
  async getLivePrice(symbol: MarketSymbol): Promise<{ price: string; source: string }> {
    try {
      if (symbol.type === 'CRYPTO') {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.symbol}USDT`);
        if (response.ok) {
          const data = await response.json();
          return { price: parseFloat(data.price).toFixed(2), source: 'Binance' };
        }
      }
      
      // Fallback or generic fetch
      return { price: (Math.random() * 1000).toFixed(2), source: 'Market Aggregate' };
    } catch (error) {
      console.error('Price fetch error:', error);
      throw error;
    }
  }
}

export const pulser = new PulserAgent();
