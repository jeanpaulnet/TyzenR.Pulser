
import { GoogleGenAI, Type } from "@google/genai";
import { MarketAsset, Sentiment, PulserAnalysis } from "../types";

export class PulserAgent {
  /**
   * Analyzes market sentiment (Short & Long Term) using search-grounded AI.
   */
  async analyzeAsset(asset: MarketAsset): Promise<PulserAnalysis> {
    // The API key is provided by the user.
    const ai = new GoogleGenAI({ apiKey: "AIzaSyDn1KPwDGidRH10AD52FVsbEpM5SwrkJSA" });

    const prompt = `Conduct an exhaustive market pulse scan for "${asset.name}" (Ticker: ${asset.symbol}) in the ${asset.region} ${asset.type} market. 
    
    CRITICAL OBJECTIVES:
    1. CURRENT PRICE: Retrieve the absolute latest trading price with currency symbol.
    2. SENTIMENT AGGREGATION: Scan recent 24h news (Bloomberg, FT, Reuters, WSJ, CNBC) and technical charts.
    3. DUAL-HORIZON RECOMMENDATION:
       - SHORT-TERM (Next 7-14 Days): Focus on momentum, earnings news, and macro events.
       - LONG-TERM (Next 12 Months): Focus on fundamentals, competitive moat, and sector cycles.
    
    SYSTEM INSTRUCTIONS:
    - Return valid JSON matching the specified schema.
    - Be objective. If there is high uncertainty, favor HOLD.
    - Provide a concise summary (max 60 words) explaining the 'Why' behind the trends.`;

    try {
      // Use gemini-3-pro-preview for best-in-class financial reasoning and grounding.
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
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
                description: "Currency sign ($, ₹, £, etc)."
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
      
      // Extract grounding metadata to provide transparency into AI's sources as required.
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => ({
          title: chunk.web?.title || 'Market Source',
          uri: chunk.web?.uri || '#'
        }))
        .filter((s: any) => s.uri && s.uri !== '#')
        .slice(0, 5) || [];

      return {
        assetId: asset.id,
        shortTermTrend: (result.shortTermTrend?.toUpperCase() as Sentiment) || Sentiment.NEUTRAL,
        longTermTrend: (result.longTermTrend?.toUpperCase() as Sentiment) || Sentiment.NEUTRAL,
        confidenceScore: result.confidenceScore || 50,
        summary: result.summary || "Scan complete. Sentiment levels are stable.",
        currentPrice: result.currentPrice,
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
      
      console.error(`Intelligence Error [${asset.symbol}]:`, error);
      return {
        assetId: asset.id,
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
