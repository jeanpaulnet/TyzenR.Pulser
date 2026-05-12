
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
   * Validates if a symbol exists in the chosen market/region.
   */
  async validateSymbol(symbol: string, type: string, region: string): Promise<{ isValid: boolean; name?: string; reason?: string }> {
    try {
      const apiKey = await this.getApiKey();
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Quick verification: Does the market symbol "${symbol}" exist in the ${region} region as a ${type}? 
      Use Google Search to confirm. 
      If it exists, return EXACTLY this JSON: {"isValid": true, "name": "Company/Asset Full Name"}
      If it does not exist or is highly likely incorrect, return: {"isValid": false, "reason": "Short explanation why it might be invalid (e.g., symbol not found on NSE/BSE, or incorrect crypto pair)"}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { isValid: false, reason: "Could not parse verification data" };
      
      return data;
    } catch (error) {
      console.error('Validation error:', error);
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

      const priceSourceHint = symbol.type === 'CRYPTO' 
        ? "CRITICAL: For currentPrice/CMP, strictly prioritize data from coinmarketcap.com." 
        : "For currentPrice/CMP, use real-time data from financial news or exchange sites.";

      const prompt = `Perform an institutional-grade deep dive for ${symbol.symbol} (${symbol.name}) in the ${symbol.type} market. 
      Current Date: ${currentDate}.
      
      ${priceSourceHint}
      
      CRITICAL INSTRUCTION: You MUST use the Google Search tool to find "LIVE" news from the last 24-48 hours. 
      Analyze: Recent price action catalysts, earnings reports, regulatory news, and analyst sentiment.
      
      CRITICAL: For "growthData", you MUST find and include the Revenue and Profit (Net Income) for the PAST 5 CONSECUTIVE YEARS. This is the top priority for the "Growth Chart". If exact revenue/profit isn't found in one search, look for annual reports or investor presentations.
      
      CRITICAL: For "analystViews", find the 3 most RECENT ratings (Buy/Sell/Hold) and price targets from established firms like Goldman Sachs, J.P. Morgan, Morningstar, etc.
      
      URL POLICY: All URLs in your response MUST be verifiable, live article links found in your search results. 
      Do NOT provide dead links, 404 pages, or generic homepages. EVERY link must point to a specific, active article.
      If you are unsure if a link is still live, do not include it.
      
      JSON OUTPUT FORMAT:
      {
        "shortTermTrend": "BUY" | "SELL" | "HOLD" | "NEUTRAL",
        "longTermTrend": "BUY" | "SELL" | "HOLD" | "NEUTRAL",
        "confidenceScore": number (0-100),
        "summary": "Detailed narrative covering catalysts and trends.",
        "currentPrice": "Price (e.g., 150.50 or 50000.00)",
        "currencySymbol": "Currency (e.g., $ or ₹)",
        "sources": [{"title": "Headline or Site", "url": "DIRECT_URL"}],
        "snapshot": {
          "intrinsicValue": "Value",
          "cmp": "Current Market Price",
          "high52w": "52-Week High Value",
          "low52w": "52-Week Low Value",
          "roe": "ROE%",
          "roce": "ROCE%",
          "pbRatio": "PB",
          "peRatio": "PE",
          "growthRate3Y": "3Y%",
          "growthRate5Y": "5Y%",
          "debtToEquity": "Ratio",
          "marginOfSafety": "Safety%",
          "ma200": "Price",
          "ma50": "Price",
          "rsi": "Value",
          "technicalCommentary": "Analysis of key technical levels",
          "about": "Detailed background",
          "tradingViewTicker": "TICKER",
          "founded": "Year",
          "employees": "Count",
          "peers": [{"name": "Peer", "pe": "PE", "marketCap": "MCap", "pb": "PB"}],
          "peerComparison": "Detailed paragraph comparing the company's valuation (PE/PB) and performance against these specific peers.",
          "analystViews": [{"firm": "Morningstar/Goldman", "rating": "Buy/Outperform", "targetPrice": "Price", "date": "Date"}],
          "expansionPlans": [{"plan": "Strategic point", "date": "Estimated timeline, e.g., Q4 2024"}],
          "growthData": [{"year": "2023", "revenue": 100.5, "profit": 15.2, "growth": 10.5}],
          "news": [{"title": "Article Headline", "url": "ARTICLE_URL", "date": "Published Date"}]
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

      // Extract high-quality grounding metadata
      const candidate = (response as any).candidates?.[0];
      const groundingMetadata = (candidate as any)?.groundingMetadata;
      const chunks = groundingMetadata?.groundingChunks || [];
      
      // Use grounding metadata to override/supplement links found by the model
      const verifiedLinks = chunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({
          title: c.web.title || "Verified Source",
          url: c.web.uri
        }));

      // Validation function to detect potential hallucinated or generic URLs
      const isDeadLink = (url: string) => {
        if (!url) return true;
        if (!url.startsWith('http')) return true;
        const lowUrl = url.toLowerCase();
        
        // Detect common root domains or placeholders instead of direct articles
        const placeholders = ['yahoo.com', 'reuters.com', 'bloomberg.com', 'cnbc.com', 'investing.com', 'marketwatch.com', 'google.com'];
        const isRoot = placeholders.some(p => lowUrl === `https://${p}` || lowUrl === `http://${p}` || lowUrl === `https://www.${p}` || lowUrl === `http://www.${p}`);
        
        // Detect 404 or error markers in the URL itself
        const errorMarkers = ['/404', 'notfound', 'error-page', 'access-denied', 'page-not-found'];
        const hasErrorMarker = errorMarkers.some(m => lowUrl.includes(m));

        return isRoot || hasErrorMarker || url.length < 22; // Articles are usually long URLs
      };

      // Sanitize News (ensure links are real)
      const rawNews = data.snapshot?.news || data.news || [];
      const sanitizedNews = rawNews.map((n: any) => {
        let url = n.url || n.uri || '';
        
        // Try to find a better URL from grounding data if the provided one looks generic
        const betterLink = verifiedLinks.find((sl: any) => 
          sl.title.toLowerCase().includes(n.title.toLowerCase()) || 
          n.title.toLowerCase().includes(sl.title.toLowerCase())
        );
        
        if (betterLink) {
          url = betterLink.url;
        }

        if (isDeadLink(url)) {
          url = `https://www.google.com/search?q=${encodeURIComponent(n.title + " " + symbol.symbol)}`;
        }
        return { ...n, url };
      });

      // Sanitize Sources
      const rawSources = data.sources || [];
      const sanitizedSources = rawSources.map((s: any) => {
        let url = s.url || s.uri || '';
        if (url && !url.startsWith('http')) url = `https://${url}`;
        
        const betterLink = verifiedLinks.find((vl: any) => 
          vl.title.toLowerCase().includes(s.title.toLowerCase()) || 
          s.title.toLowerCase().includes(vl.title.toLowerCase())
        );
        if (betterLink) url = betterLink.url;

        if (isDeadLink(url)) {
          url = `https://www.google.com/search?q=${encodeURIComponent(s.title + " " + symbol.symbol)}`;
        }
        return { title: s.title, url };
      });

      return {
        symbolId: symbol.id,
        shortTermTrend: (data.shortTermTrend || Sentiment.NEUTRAL) as Sentiment,
        longTermTrend: (data.longTermTrend || Sentiment.NEUTRAL) as Sentiment,
        confidenceScore: data.confidenceScore || 50,
        summary: data.summary || "No summary available.",
        currentPrice: data.currentPrice || "0.00",
        currencySymbol: data.currencySymbol || (symbol.region === 'INDIA' ? '₹' : '$'),
        sources: [
          ...verifiedLinks,
          ...sanitizedSources,
        ].filter((v, i, a) => a.findIndex(t => t.url === v.url) === i).slice(0, 5),
        snapshot: {
          ...data.snapshot,
          news: sanitizedNews.slice(0, 3)
        },
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
   * Fetches latest price data using Gemini Search grounding.
   */
  async getLivePrice(symbol: MarketSymbol): Promise<{ price: string; currency: string; source: string }> {
    try {
      const apiKey = await this.getApiKey();
      const ai = new GoogleGenAI({ apiKey });

      const sourcePreference = symbol.type === 'CRYPTO' 
        ? "PRIORITIZE fetching the current price from coinmarketcap.com." 
        : "Use Google Finance, Yahoo Finance, or local exchange websites.";

      const prompt = `Find the CURRENT LIVE MARKET PRICE (CMP) for ${symbol.symbol} (${symbol.name}) in the ${symbol.region} ${symbol.type} market.
      ${sourcePreference}
      
      Return ONLY a JSON object:
      {"price": "number as string", "currency": "USD/INR/etc", "source": "Name of source"}
      
      If you cannot find a price, return: {"price": "0.00", "currency": "USD", "source": "Not Found"}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { price: "0.00", currency: "USD", source: "Unknown" };
      
      return {
        price: data.price,
        currency: data.currency,
        source: data.source
      };
    } catch (error) {
      console.error('Price fetch error:', error);
      return { price: "0.00", currency: "USD", source: "Error" };
    }
  }
}

export const pulser = new PulserAgent();
