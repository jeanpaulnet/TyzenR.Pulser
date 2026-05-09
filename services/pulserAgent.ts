
import { GoogleGenAI, Type } from "@google/genai";
import { MarketSymbol, Sentiment, PulserAnalysis } from "../types";

export class PulserAgent {
  /**
   * Analyzes market sentiment via the server-side proxy which handles caching.
   */
  async analyzeSymbol(symbol: MarketSymbol, forceRefresh = false): Promise<PulserAnalysis> {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, forceRefresh }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`Intelligence API Error [${symbol.symbol}]:`, error);
      return {
        symbolId: symbol.id,
        shortTermTrend: Sentiment.NEUTRAL,
        longTermTrend: Sentiment.NEUTRAL,
        confidenceScore: 0,
        summary: "Market connection interrupted. Ensure backend engine is responding.",
        sources: [],
        lastUpdated: new Date().toISOString(),
        isAnalyzing: false,
      };
    }
  }

  /**
   * Fetches latest price with 5-minute server-side caching.
   */
  async getLivePrice(symbol: MarketSymbol): Promise<{ price: string; source: string }> {
    try {
      const response = await fetch('/api/price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol }),
      });
      if (!response.ok) throw new Error('Price fetch failed');
      return await response.json();
    } catch (error) {
      console.error('Price update error:', error);
      throw error;
    }
  }
}

export const pulser = new PulserAgent();
