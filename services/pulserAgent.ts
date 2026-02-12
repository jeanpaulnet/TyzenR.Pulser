
import { GoogleGenAI, Type } from "@google/genai";
import { MarketAsset, Sentiment, PulserAnalysis } from "../types";

export class PulserAgent {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzeAsset(asset: MarketAsset): Promise<PulserAnalysis> {
    const prompt = `Analyze the current market sentiment for "${asset.name}" (${asset.symbol}) in the ${asset.region} ${asset.type} market. 
    1. Scan the latest news, financial reports, and social sentiment from the last 24-48 hours.
    2. Provide a recommendation: BUY, SELL, or HOLD.
    3. Provide a confidence score between 0 and 100.
    4. Summarize the key drivers behind this sentiment in 3-4 concise bullet points.
    
    Output must be strictly JSON format.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendation: { type: Type.STRING, description: "BUY, SELL, or HOLD" },
              confidenceScore: { type: Type.NUMBER },
              summary: { type: Type.STRING },
            },
            required: ["recommendation", "confidenceScore", "summary"]
          }
        },
      });

      const result = JSON.parse(response.text || '{}');
      
      // Extract grounding sources
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => ({
          title: chunk.web?.title || 'Market Source',
          uri: chunk.web?.uri || '#'
        }))
        .filter((s: any) => s.uri !== '#')
        .slice(0, 5) || [];

      return {
        assetId: asset.id,
        recommendation: (result.recommendation?.toUpperCase() as Sentiment) || Sentiment.NEUTRAL,
        confidenceScore: result.confidenceScore || 50,
        summary: result.summary || "No recent high-impact news found.",
        sources: sources,
        lastUpdated: new Date().toISOString(),
        isAnalyzing: false,
      };
    } catch (error) {
      console.error(`Error analyzing ${asset.symbol}:`, error);
      return {
        assetId: asset.id,
        recommendation: Sentiment.NEUTRAL,
        confidenceScore: 0,
        summary: "Analysis failed. Please check your connection or try again later.",
        sources: [],
        lastUpdated: new Date().toISOString(),
        isAnalyzing: false,
      };
    }
  }
}

export const pulser = new PulserAgent();
