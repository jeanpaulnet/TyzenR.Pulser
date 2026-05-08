
import { GoogleGenAI, Type } from "@google/genai";
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
      console.error('Error fetching API key:', error);
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

      const now = new Date().toISOString();
      const prompt = `Conduct an exhaustive market pulse scan for "${symbol.name}" (Ticker: ${symbol.symbol}) in the ${symbol.region} ${symbol.type} market. 
    
    CURRENT DATE/TIME: ${now}

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
    
    SYSTEM INSTRUCTIONS:
    - Return valid JSON matching the specified schema.
    - Be objective. If uncertainty is high, favor NEUTRAL/HOLD.
    - Provide a concise summary (max 60 words) explaining the primary drivers of the current price and sentiment.`;

      // Use gemini-3.1-pro-preview for best-in-class financial reasoning and grounding.
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shortTermTrend: { 
                type: Type.STRING, 
                description: "Short-term rating: BUY, SELL, HOLD, or NEUTRAL." 
              },
              longTermTrend: { 
                type: Type.STRING, 
                description: "Long-term rating: BUY, SELL, HOLD, or NEUTRAL." 
              },
              currentPrice: {
                type: Type.STRING,
                description: "Numerical value of current price."
              },
              currencySymbol: {
                type: Type.STRING,
                description: "Currency sign (use '$' for USD, '₹' for INR)."
              },
              confidenceScore: { 
                type: Type.NUMBER,
                description: "Probability of prediction accuracy (0-100)."
              },
              summary: { 
                type: Type.STRING,
                description: "Synthesis of key market drivers."
              },
            },
            required: ["shortTermTrend", "longTermTrend", "confidenceScore", "summary", "currentPrice", "currencySymbol"]
          }
        },
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("Null response from intelligence engine.");
      
      const result = JSON.parse(jsonText);
      
      // Sanitize price - remove quotes and &quot; entities that might be returned by the AI
      const sanitizedPrice = result.currentPrice?.toString()
        .replace(/["']/g, '')
        .replace(/&quot;/g, '')
        .trim();
      
      // Extract grounding metadata to provide transparency into AI's sources as required.
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => ({
          title: chunk.web?.title || 'Market Source',
          uri: chunk.web?.uri || '#'
        }))
        .filter((s: any) => s.uri && s.uri !== '#')
        .slice(0, 5) || [];

      return {
        symbolId: symbol.id,
        shortTermTrend: (result.shortTermTrend?.toUpperCase() as Sentiment) || Sentiment.NEUTRAL,
        longTermTrend: (result.longTermTrend?.toUpperCase() as Sentiment) || Sentiment.NEUTRAL,
        confidenceScore: result.confidenceScore || 50,
        summary: result.summary || "Scan complete. Sentiment levels are stable.",
        currentPrice: sanitizedPrice,
        currencySymbol: result.currencySymbol,
        sources: sources,
        lastUpdated: new Date().toISOString(),
        isAnalyzing: false,
      };
    } catch (error: any) {
      // Re-throw if the key selection is invalid to trigger the UI dialog
      if (error?.message?.includes("Requested entity was not found")) {
        throw error;
      }
      
      console.error(`Intelligence Error [${symbol.symbol}]:`, error);
      return {
        symbolId: symbol.id,
        shortTermTrend: Sentiment.NEUTRAL,
        longTermTrend: Sentiment.NEUTRAL,
        confidenceScore: 0,
        summary: "Market connection interrupted. Ensure API engine is configured correctly.",
        sources: [],
        lastUpdated: new Date().toISOString(),
        isAnalyzing: false,
      };
    }
  }
}

export const pulser = new PulserAgent();
