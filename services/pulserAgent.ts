
import { MarketSymbol, Sentiment, PulserAnalysis, MarketType, MarketSentiment, TrendingStock } from "../types";
import { getFirebaseDb } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";

declare const process: any;

export class PulserAgent {
  private async callAiDirectFallback(prompt: string, config: any = {}, model: string = "gemini-3-flash-preview"): Promise<any> {
    const apiKey = (process.env as any).GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Client-side fallback GEMINI_API_KEY is not configured.");
    }

    // Attempt the requested model first. If it looks like an internal/experimental candidate,
    // we also try generally available standard models like gemini-2.5-flash and gemini-1.5-flash.
    const modelsToTry = [model, "gemini-2.5-flash", "gemini-1.5-flash"];
    let lastError: any = null;

    for (const currentModel of modelsToTry) {
      try {
        // Map unreleased/internal models safely to universally supported Google API endpoints
        const resolvedModel = currentModel.replace("gemini-3-flash-preview", "gemini-2.5-flash");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;
        
        const contents = [{ parts: [{ text: prompt }] }];
        const body: any = { contents };
        
        if (config?.generationConfig) {
          body.generationConfig = config.generationConfig;
        }
        if (config?.tools) {
          body.tools = config.tools;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Direct model query (${resolvedModel}) failed with status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        return {
          text: candidateText,
          candidates: data.candidates
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`Direct fallback with model option ${currentModel} failed:`, err);
      }
    }

    throw lastError || new Error("All client-side direct API fallbacks failed.");
  }

  private async callAi(prompt: string, config: any = {}, model: string = "gemini-3-flash-preview"): Promise<any> {
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, config, model })
      });
      
      if (response.ok) {
        return await response.json();
      }

      // If backend exists but returns an error, retrieve it
      let errorMsg = 'AI request failed';
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } catch (e) {}

      // If a 404 occurs, we are likely on a static host that doesn't route /api or support the custom server container
      if (response.status === 404) {
        console.warn('Backend API returned 404. Initiating direct client-side fallback query...');
        return await this.callAiDirectFallback(prompt, config, model);
      }

      throw new Error(errorMsg);
    } catch (error: any) {
      console.error('Call AI backend server request failed, attempting direct fallback...', error);
      try {
        return await this.callAiDirectFallback(prompt, config, model);
      } catch (fallbackError: any) {
        console.error('Direct fallback also failed:', fallbackError);
        throw new Error(error.message || 'AI request failed');
      }
    }
  }

  /**
   * Provides autocomplete suggestions for a prefix/query.
   */
  async searchSuggestions(query: string, region: string): Promise<{ symbol: string; name: string; type: MarketType }[]> {
    if (!query || query.length < 2) return [];

    try {
      const prompt = `Find 5-8 highly relevant market symbols (tickers) and company names matching "${query}" for the "${region}" region.
      The user might provide a ticker OR a partial company name. 
      Include a mix of stocks and crypto if relevant.
      Return ONLY a JSON array of objects: 
      [{"symbol": "TICKER", "name": "Full Name", "type": "STOCKS" | "CRYPTO" | "INDIAN_STOCKS" | "US_STOCKS"}]
      
      CRITICAL: Use exact tickers (e.g., AAPL, MSFT, RELIANCE.NS, BTC). Use the .NS suffix for Indian NSE stocks.`;

      const response = await this.callAi(prompt, {
        generationConfig: { responseMimeType: "application/json" }
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      return data;
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  }

  /**
   * Validates if a symbol exists in the chosen market/region.
   */
  async validateSymbol(symbol: string, type: string, region: string): Promise<{ isValid: boolean; name?: string; reason?: string; suggestedSymbol?: string }> {
    try {
      const prompt = `Quick verification: Does the market symbol "${symbol}" exist in the ${region} region as a ${type}? 
      Use Google Search to confirm. 
      If it exists EXACTLY, return EXACTLY this JSON: {"isValid": true, "name": "Company/Asset Full Name"}
      If it does not exist as entered, but you found a highly likely match (e.g., the user entered a company name instead of a ticker, or missed a mandatory suffix like .NS for India), return: {"isValid": false, "suggestedSymbol": "TICKER", "name": "Company/Asset Full Name", "reason": "Found matching symbol for your input"}
      If it does not exist or is incorrect, return: {"isValid": false, "reason": "Short explanation why it might be invalid"}`;

      const response = await this.callAi(prompt, {
        tools: [{ googleSearch: {} }]
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
  private formatCurrencySymbol(currency: string, region?: string): string {
    const c = currency.trim().toUpperCase();
    if (c === 'INR' || c === '₹' || c.includes('RS') || c.includes('RUPEE')) return '₹';
    if (c === 'USD' || c === '$') return '$';
    if (c === 'GBP' || c === '£') return '£';
    if (c === 'EUR' || c === '€') return '€';
    
    // If it's already a symbol, return it
    const commonSymbols = ['$', '₹', '£', '€', '¥', '₿'];
    if (commonSymbols.includes(c)) return c;
    
    return region === 'INDIA' ? '₹' : '$';
  }

  private sanitizePrice(price: string): string {
    if (!price) return "0.00";
    // Remove common currency codes and symbols that might be prefixed/suffixed
    return price.replace(/INR|USD|GBP|EUR|RS\.?|RUPEES?|[\$₹£€]/gi, '').trim();
  }

  async analyzeSymbol(symbol: MarketSymbol): Promise<PulserAnalysis> {
    try {
      // 1. Check Global Firestore Cache (24h)
      const db = await getFirebaseDb();
      if (db) {
        try {
          // Use symbol as key to share across users
          const cacheRef = doc(db!, "analysis_cache", symbol.symbol);
          const cacheSnap = await getDoc(cacheRef);
          
          if (cacheSnap.exists()) {
            const cachedData = cacheSnap.data();
            const lastUpdated = cachedData.lastUpdated as Timestamp;
            const now = Timestamp.now();
            
            // Check if less than 4 hours old (4 * 60 * 60 seconds)
            if (now.seconds - lastUpdated.seconds < 14400) {
              console.log(`Using cached analysis for ${symbol.symbol}`);
              return {
                ...cachedData.analysis,
                symbolId: symbol.id, // Keep the specific ID for the local UI state
                isAnalyzing: false,
                lastUpdated: lastUpdated.toDate().toISOString(),
                fromCache: true // Marker for UI if needed
              };
            }
          }
        } catch (cacheError) {
          console.warn("Cache lookup failed, proceeding with fresh scan:", cacheError);
        }
      }

      const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });

      const priceSourceHint = symbol.type === 'CRYPTO' 
        ? "CRITICAL: For currentPrice/CMP, strictly prioritize data from coinmarketcap.com." 
        : "For currentPrice/CMP, use real-time data from financial news or exchange sites.";

      const prompt = `Perform an institutional-grade deep dive for ${symbol.symbol} (${symbol.name}) in the ${symbol.type} market. 
      Current Date: ${currentDate}.
      
      ${priceSourceHint}
      
      CRITICAL INSTRUCTION: You MUST use the Google Search tool for EVERYTHING. 
      Specifically for the "peers" section: Conduct a direct search for the REAL-TIME Market Cap, PE Ratio, PB Ratio, and CMP (Current Market Price) for at least 3-4 direct competitors. Do NOT use training data or placeholders. Citation of recent market data is required.
      
      Analyze: Recent price action catalysts, earnings reports, regulatory news, and analyst sentiment.
      
      CRITICAL: For "growthData", you MUST find and include the Revenue and Profit (Net Income) for the PAST 5 CONSECUTIVE YEARS. This is the top priority for the "Growth Chart". If exact revenue/profit isn't found in one search, look for annual reports or investor presentations.
      
      CRITICAL: For "historicalData", use Google Finance search results to provide 10-15 data points for each period: 1 Month (1M), 1 Year (1Y), and 5 Years (5Y). Ensure the prices and dates are accurate.
      
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
          "marketCap": "Market Cap (e.g., $2.5T or ₹15L Cr)",
          "marginOfSafety": "Safety%",
          "ma200": "Price",
          "ma50": "Price",
          "rsi": "Value",
          "technicalCommentary": "Analysis of key technical levels",
          "about": "Detailed background",
          "tradingViewTicker": "TICKER",
          "founded": "Year",
          "employees": "Count",
          "peers": [{"name": "Peer", "pe": "PE Ratio", "marketCap": "Market Cap", "pb": "PB Ratio", "cmp": "Current Price"}],
          "peerComparison": "Detailed paragraph comparing the company's valuation (PE/PB) and performance against these specific peers. Ensure CMP and Market Cap use real, current values. CRITICAL: For 'peers', you MUST conduct a specific search for the current real-time stock price (CMP), PE Ratio, Market Cap, and PB Ratio for each peer listed. Do NOT use placeholder values; the data MUST reflect the absolute latest available metrics from today's market session.",
          "analystViews": [{"firm": "Morningstar/Goldman", "rating": "Buy/Outperform", "targetPrice": "Price", "date": "Date"}],
          "expansionPlans": [{"plan": "Strategic point", "date": "Estimated timeline, e.g., Q4 2024"}],
          "growthData": [{"year": "2023", "revenue": 100.5, "profit": 15.2, "growth": 10.5}],
          "historicalData": {
            "1M": [{"date": "YYYY-MM-DD", "price": 100.5}],
            "1Y": [{"date": "YYYY-MM-DD", "price": 100.5}],
            "5Y": [{"date": "YYYY-MM-DD", "price": 100.5}]
          },
          "news": [{"title": "Article Headline", "url": "ARTICLE_URL", "date": "Published Date"}]
        }
      }`;

      const response = await this.callAi(prompt, {
        tools: [{ googleSearch: {} }]
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

      const verifiedUris = new Set(verifiedLinks.map((l: any) => l.url));

      // Validation function to detect potential hallucinated or generic URLs
      const isDeadLink = (url: string, isFromGrounding: boolean = false) => {
        if (!url) return true;
        if (!url.startsWith('http')) return true;
        const lowUrl = url.toLowerCase();
        
        // Detect common root domains or placeholders instead of direct articles
        const placeholders = [
          'yahoo.com', 'reuters.com', 'bloomberg.com', 'cnbc.com', 'investing.com', 
          'marketwatch.com', 'google.com', 'bing.com', 'facebook.com', 'twitter.com',
          'whalesbook.com' // Specifically identified by user as a source of 404s
        ];
        const isRoot = placeholders.some(p => 
          lowUrl === `https://${p}` || lowUrl === `http://${p}` || 
          lowUrl === `https://www.${p}` || lowUrl === `http://www.${p}` ||
          lowUrl.endsWith(`${p}/`) || lowUrl.endsWith(`${p}`)
        );
        
        // Detect 404 or error markers in the URL itself
        const errorMarkers = ['/404', 'notfound', 'error-page', 'access-denied', 'page-not-found', 'forbidden'];
        const hasErrorMarker = errorMarkers.some(m => lowUrl.includes(m));

        // If it's NOT in the verified URIs but looks like a deep link, it's likely hallucinated
        const articleMarkers = ['/202', '/article/', '/news/', '-', '_'];
        const looksLikeHallucinatedArticle = !isFromGrounding && 
          articleMarkers.some(m => lowUrl.includes(m)) && 
          !verifiedUris.has(url);

        return isRoot || hasErrorMarker || url.length < 22 || looksLikeHallucinatedArticle;
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

        const isFromGrounding = verifiedUris.has(url);

        if (isDeadLink(url, isFromGrounding)) {
          url = `https://www.google.com/search?q=${encodeURIComponent(n.title + " " + symbol.name)}`;
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

        const isFromGrounding = verifiedUris.has(url);

        if (isDeadLink(url, isFromGrounding)) {
          url = `https://www.google.com/search?q=${encodeURIComponent(s.title + " " + symbol.name)}`;
        }
        return { title: s.title, url };
      });

      // Sanitize Growth Data (ensure numeric values for Recharts)
      const rawGrowth = data.snapshot?.growthData || [];
      const sanitizedGrowth = rawGrowth.map((g: any) => {
        const sanitizeValue = (val: any) => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            // Remove non-numeric chars except decimal and minus
            const cleaned = val.replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };

        return {
          year: String(g.year || g.Year || ''),
          revenue: sanitizeValue(g.revenue || g.Revenue || 0),
          profit: sanitizeValue(g.profit || g.Profit || g.NetIncome || 0),
          growth: sanitizeValue(g.growth || g.Growth || 0)
        };
      }).filter((g: any) => g.year);

      // Sanitize Historical Data
      const rawHistorical = data.snapshot?.historicalData || {};
      const sanitizedHistorical: any = {};
      ["1M", "1Y", "5Y"].forEach(range => {
        const points = rawHistorical[range] || [];
        sanitizedHistorical[range] = points.map((p: any) => ({
          date: p.date,
          price: typeof p.price === 'number' ? p.price : parseFloat(String(p.price || '0').replace(/[^0-9.-]/g, ''))
        })).filter((p: any) => !isNaN(p.price) && p.price > 0);
      });

      // Sanitize Peers (ensure consistent formatting and real-time feel)
      const rawPeers = data.snapshot?.peers || [];
      const sanitizedPeers = rawPeers.map((p: any) => ({
        name: String(p.name || ''),
        pe: this.sanitizePrice(p.pe || '—'),
        marketCap: this.sanitizePrice(p.marketCap || '—'),
        pb: this.sanitizePrice(p.pb || '—'),
        cmp: this.sanitizePrice(p.cmp || '—')
      }));

      const analysisResult: PulserAnalysis = {
        symbolId: symbol.id,
        shortTermTrend: (data.shortTermTrend || Sentiment.NEUTRAL) as Sentiment,
        longTermTrend: (data.longTermTrend || Sentiment.NEUTRAL) as Sentiment,
        confidenceScore: data.confidenceScore || 50,
        summary: data.summary || "No summary available.",
        currentPrice: this.sanitizePrice(data.currentPrice || "0.00"),
        currencySymbol: this.formatCurrencySymbol(data.currencySymbol || '', symbol.region),
        sources: [
          ...verifiedLinks,
          ...sanitizedSources,
        ].filter((v, i, a) => a.findIndex(t => t.url === v.url) === i).slice(0, 5),
        snapshot: {
          ...data.snapshot,
          intrinsicValue: this.sanitizePrice(data.snapshot?.intrinsicValue || ""),
          cmp: this.sanitizePrice(data.snapshot?.cmp || data.currentPrice || ""),
          high52w: this.sanitizePrice(data.snapshot?.high52w || ""),
          low52w: this.sanitizePrice(data.snapshot?.low52w || ""),
          ma200: this.sanitizePrice(data.snapshot?.ma200 || ""),
          ma100: this.sanitizePrice(data.snapshot?.ma100 || ""),
          ma50: this.sanitizePrice(data.snapshot?.ma50 || ""),
          analystViews: (data.snapshot?.analystViews || []).map((v: any) => ({
            ...v,
            targetPrice: this.sanitizePrice(v.targetPrice || "")
          })),
          marketCap: this.sanitizePrice(data.snapshot?.marketCap || data.marketCap || '—'),
          peers: sanitizedPeers,
          growthData: sanitizedGrowth,
          historicalData: sanitizedHistorical,
          news: sanitizedNews.slice(0, 3)
        },
        lastUpdated: new Date().toISOString(),
        isAnalyzing: false
      };

      // 4. Save to Cache if Firestore is available
      if (db) {
        try {
          const cacheRef = doc(db!, "analysis_cache", symbol.symbol);
          await setDoc(cacheRef, {
            analysis: analysisResult,
            lastUpdated: serverTimestamp()
          });
        } catch (cacheSaveError) {
          console.warn("Failed to save to global cache:", cacheSaveError);
        }
      }

      return analysisResult;
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
      const sourcePreference = symbol.type === 'CRYPTO' 
        ? "PRIORITIZE fetching the current price from coinmarketcap.com." 
        : "Use Google Finance, Yahoo Finance, or local exchange websites.";

      const prompt = `Find the CURRENT LIVE MARKET PRICE (CMP) for ${symbol.symbol} (${symbol.name}) in the ${symbol.region} ${symbol.type} market.
      ${sourcePreference}
      
      Return ONLY a JSON object:
      {"price": "number as string", "currency": "USD/₹/etc", "source": "Name of source"}
      
      If you cannot find a price, return: {"price": "0.00", "currency": "USD", "source": "Not Found"}`;

      const response = await this.callAi(prompt, {
        tools: [{ googleSearch: {} }]
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { price: "0.00", currency: "USD", source: "Unknown" };
      
      return {
        price: this.sanitizePrice(data.price),
        currency: this.formatCurrencySymbol(data.currency || '', symbol.region),
        source: data.source
      };
    } catch (error) {
      console.error('Price fetch error:', error);
      return { price: "0.00", currency: "USD", source: "Error" };
    }
  }

  /**
   * Fetches global market sentiment and key indices.
   */
  async getMarketSentiment(): Promise<MarketSentiment | null> {
    try {
      const prompt = `Find the following real-time market sentiment data:
      1. Fear & Greed Index (current value and label, e.g., 72, "Greed")
      2. Warren Buffett Indicator (current percentage value of Market Cap to GDP and status, e.g., 185%, "Significantly Overvalued")
      3. Dow Jones Industrial Average (current value and today's percentage change)
      4. NIFTY 50 Index (current value and today's percentage change)

      Use Google Search to find the most recent values from last few hours.
      
      Return ONLY a JSON object:
      {
        "fearGreed": {"value": number, "label": "string"},
        "buffettIndicator": {"value": "string", "status": "string"},
        "dowJones": {"value": "string", "change": "string (e.g. +0.4%)"},
        "nifty50": {"value": "string", "change": "string (e.g. -0.2%)"}
      }`;

      const response = await this.callAi(prompt, {
        tools: [{ googleSearch: {} }]
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      if (!data) return null;

      return {
        ...data,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Market sentiment error:', error);
      return null;
    }
  }

  /**
   * Fetches the top 5 trending stocks globally and in India.
   */
  async getTrendingStocks(): Promise<TrendingStock[]> {
    try {
      const prompt = `Search for the TOP 5 most trending stocks right now (Globally and in India).
      Consider volume, social media buzz, and recent news.
      
      Return ONLY a JSON array of 5 objects:
      [
        {"symbol": "TICKER", "name": "Name", "price": "Current Price", "change": "Today Percentage Change"}
      ]`;

      const response = await this.callAi(prompt, {
        tools: [{ googleSearch: {} }]
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      return data;
    } catch (error) {
      console.error('Trending stocks error:', error);
      return [];
    }
  }
}

export const pulser = new PulserAgent();
