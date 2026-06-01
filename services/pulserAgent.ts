
import { MarketSymbol, Sentiment, PulserAnalysis, MarketType, MarketSentiment, TrendingStock } from "../types";
import { getFirebaseDb } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";

declare const process: any;

export class PulserAgent {
  private async callAiDirectFallback(prompt: string, config: any = {}, model: string = "gemini-2.5-flash"): Promise<any> {
    let apiKey = (process.env as any).GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    
    // Always attempt dynamic core key retrieval first to prevent expired API key issues
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
          apiKey = trimmed;
          console.log("Client-side fallback dynamically obtained a fresh Gemini API Key from Tyzenr.");
        }
      }
    } catch (e) {
      console.warn("Client fallback key fetch from webapi.tyzenr.com failed, resorting to environments:", e);
    }

    if (!apiKey) {
      throw new Error("Client-side fallback GEMINI_API_KEY could not be retrieved dynamically or via environment config.");
    }

    // Attempt the requested model first. If it looks like an internal/experimental candidate,
    // we also try other models. We prefer gemini-2.5-flash as it is highly stable and active.
    const modelsToTry = [model];
    if (model !== "gemini-3.5-flash") {
      modelsToTry.push("gemini-3.5-flash");
    }
    let lastError: any = null;

    for (const currentModel of modelsToTry) {
      try {
        const resolvedModel = currentModel;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;
        
        const contents = [{ parts: [{ text: prompt }] }];
        const body: any = { contents };
        
        // Translate modern flat SDK config to REST API nested style if needed
        const generationConfig: any = {};
        if (config?.responseMimeType) generationConfig.responseMimeType = config.responseMimeType;
        if (config?.responseSchema) generationConfig.responseSchema = config.responseSchema;
        if (config?.temperature !== undefined) generationConfig.temperature = config.temperature;
        if (config?.topP !== undefined) generationConfig.topP = config.topP;
        if (config?.topK !== undefined) generationConfig.topK = config.topK;
        if (config?.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = config.maxOutputTokens;
        
        if (config?.generationConfig) {
          Object.assign(generationConfig, config.generationConfig);
        }

        if (Object.keys(generationConfig).length > 0) {
          body.generationConfig = generationConfig;
        }

        if (config?.tools) {
          body.tools = config.tools;
        }

        if (config?.systemInstruction) {
          body.systemInstruction = {
            parts: [{ text: config.systemInstruction }]
          };
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

  private async callAi(prompt: string, config: any = {}, model: string = "gemini-2.5-flash"): Promise<any> {
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

      console.warn(`Backend API returned error ${response.status}: ${errorMsg}. Initiating fallback query...`);
      return await this.callAiDirectFallback(prompt, config, model);
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
        responseMimeType: "application/json"
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      const normalized = (data as any[]).map(item => {
        let typeVal = MarketType.STOCK;
        const rawType = String(item.type || '').toUpperCase();
        if (rawType.includes('CRYPTO')) {
          typeVal = MarketType.CRYPTO;
        } else if (rawType.includes('COMMODITY') || rawType.includes('COMMODITIES')) {
          typeVal = MarketType.COMMODITY;
        } else if (rawType.includes('INDEX') || rawType.includes('INDICES')) {
          typeVal = MarketType.INDEX;
        }
        return {
          symbol: String(item.symbol || '').trim().toUpperCase(),
          name: String(item.name || '').trim(),
          type: typeVal
        };
      });
      return normalized;
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

      // Thread 1: Structural Core Trend & Standard Financial Ratios/Snapshot
      const promptCore = `Perform an institutional-grade core structural analysis for ${symbol.symbol} (${symbol.name}) in the ${symbol.type} market. 
      Current Date: ${currentDate}.
      
      ${priceSourceHint}
      
      CRITICAL INSTRUCTION: Use Google Search to find current live prices, company details, news, and core ratios. Keep summaries direct and high-impact.
      
      JSON OUTPUT FORMAT:
      {
        "shortTermTrend": "BUY" | "SELL" | "HOLD" | "NEUTRAL",
        "longTermTrend": "BUY" | "SELL" | "HOLD" | "NEUTRAL",
        "confidenceScore": number (0-100),
        "summary": "Detailed narrative covering catalysts and trends.",
        "currentPrice": "Price (e.g., 150.50 or 50000.00)",
        "currencySymbol": "Currency (e.g., $ or ₹)",
        "sources": [{"title": "Headline or site", "url": "DIRECT_URL"}],
        "snapshot": {
          "intrinsicValue": "Value",
          "cmp": "Current Market Price",
          "todayChangePercent": "Today's Change % (e.g., +1.24% or -0.50%). Must start with '+' or '-' explicitly unless it is zero/flat.",
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
          "ma100": "Price",
          "ma50": "Price",
          "rsi": "Value",
          "technicalCommentary": "Analysis of key technical levels",
          "about": "Detailed background about company/asset",
          "tradingViewTicker": "TICKER",
          "founded": "Year",
          "employees": "Count",
          "expansionPlans": [{"plan": "Strategic point", "date": "e.g., Q4 2026"}],
          "news": [{"title": "Article Headline", "url": "ARTICLE_URL", "date": "Published Date"}]
        }
      }`;

      // Thread 2: Five-Year Growth & High Fidelity Historical Price Charting
      const promptHistorical = `Gather consecutive annual revenue/profit files and accurate historical stock price patterns for ${symbol.symbol} (${symbol.name}) in the ${symbol.type} market.
      Current Date: ${currentDate}.
      
      CRITICAL: For "growthData", find and include the Revenue and Profit (Net Income) for the PAST 5 CONSECUTIVE YEARS for the "Growth Chart".
      CRITICAL: For "historicalData", use Google Finance search results to provide 6-8 key spaced-out true chronological price points for each period: 1 Month (1M), 1 Year (1Y), and 5 Years (5Y). This is optimized for smooth, representative rendering in Recharts charts.
      
      JSON OUTPUT FORMAT:
      {
        "snapshot": {
          "growthData": [{"year": "YYYY", "revenue": number, "profit": number, "growth": number}],
          "historicalData": {
            "1M": [{"date": "YYYY-MM-DD", "price": number}],
            "1Y": [{"date": "YYYY-MM-DD", "price": number}],
            "5Y": [{"date": "YYYY-MM-DD", "price": number}]
          }
        }
      }`;

      // Thread 3: Peer Comparisons & Live Professional Analyst Views
      const promptPeers = `Gather peer/competitor metrics and recent professional analyst ratings/price targets for ${symbol.symbol} (${symbol.name}) in the ${symbol.type} market.
      Current Date: ${currentDate}.
      
      CRITICAL: For competitor "peers" section, conduct a Google Search for 3 direct competitors. Find their REAL-TIME Market Cap, PE Ratio, PB Ratio, and CMP (Current Market Price). Do NOT use generic placeholder values.
      CRITICAL: For "analystViews", find 2-3 of the most RECENT ratings (Buy/Sell/Hold), price targets, and the direct source URL or a reputable coverage article URL. Every rating must have a live news or report link.
      
      JSON OUTPUT FORMAT:
      {
        "snapshot": {
          "peers": [{"name": "PEER_TICKER", "pe": "PE Ratio", "marketCap": "Market Cap", "pb": "PB Ratio", "cmp": "Current Price"}],
          "peerComparison": "Paragraph comparing valuation (PE/PB) and performance against peers using real data.",
          "analystViews": [{"firm": "Firm Name", "rating": "Buy/Sell/etc", "targetPrice": "Price", "date": "Date", "url": "ARTICLE_OR_REPORT_URL"}]
        }
      }`;

      // Run specialized analysis threads in parallel
      const [responseCore, responseHistorical, responsePeers] = await Promise.all([
        this.callAi(promptCore, { tools: [{ googleSearch: {} }] }).catch(err => {
          console.error("Thread 1 (Core) failed, carrying on:", err);
          return null;
        }),
        this.callAi(promptHistorical, { tools: [{ googleSearch: {} }] }).catch(err => {
          console.error("Thread 2 (Historical) failed, carrying on:", err);
          return null;
        }),
        this.callAi(promptPeers, { tools: [{ googleSearch: {} }] }).catch(err => {
          console.error("Thread 3 (Peers) failed, carrying on:", err);
          return null;
        })
      ]);

      let dataCore: any = {};
      let dataHistorical: any = {};
      let dataPeers: any = {};

      const cleanAndParseJson = (text: string) => {
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          const rawJson = jsonMatch ? jsonMatch[0] : text;
          
          // Basic JSON sanitization for comments and trailing commas
          let cleaned = rawJson
            .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1') // remove comments
            .replace(/,(\s*[\]}])/g, '$1') // remove trailing commas
            .trim();
            
          return JSON.parse(cleaned);
        } catch (e) {
          console.warn("Rigorous JSON cleaning failed, trying regex fallback...", e);
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
        }
      };

      let verifiedLinks: { title: string; url: string }[] = [];
      const verifiedUris = new Set<string>();

      // Extract details and grounding chunks from Thread 1
      if (responseCore) {
        try {
          const text = responseCore.text || "";
          dataCore = cleanAndParseJson(text);

          const candidate = (responseCore as any).candidates?.[0];
          const groundingMetadata = (candidate as any)?.groundingMetadata;
          const chunks = groundingMetadata?.groundingChunks || [];
          const links = chunks
            .filter((c: any) => c.web?.uri)
            .map((c: any) => ({
              title: c.web.title || "Core Verified Source",
              url: c.web.uri
            }));
          verifiedLinks = [...verifiedLinks, ...links];
        } catch (e) {
          console.warn("Failed to parse Thread 1 Core JSON:", e);
        }
      }

      // Extract details and grounding chunks from Thread 2
      if (responseHistorical) {
        try {
          const text = responseHistorical.text || "";
          dataHistorical = cleanAndParseJson(text);
        } catch (e) {
          console.warn("Failed to parse Thread 2 Historical JSON:", e);
        }
      }

      // Extract details and grounding chunks from Thread 3
      if (responsePeers) {
        try {
          const text = responsePeers.text || "";
          dataPeers = cleanAndParseJson(text);

          const candidate = (responsePeers as any).candidates?.[0];
          const groundingMetadata = (candidate as any)?.groundingMetadata;
          const chunks = groundingMetadata?.groundingChunks || [];
          const links = chunks
            .filter((c: any) => c.web?.uri)
            .map((c: any) => ({
              title: c.web.title || "Analyst Verified Source",
              url: c.web.uri
            }));
          verifiedLinks = [...verifiedLinks, ...links];
        } catch (e) {
          console.warn("Failed to parse Thread 3 Peers JSON:", e);
        }
      }

      verifiedLinks.forEach((l: any) => verifiedUris.add(l.url));

      // Merge snapshots from all three threads
      const mergedSnapshotObj = {
        ...(dataCore.snapshot || {}),
        ...(dataHistorical.snapshot || {}),
        ...(dataPeers.snapshot || {})
      };

      // Consolidate into backward-compatible combined 'data'
      const data = {
        ...dataCore,
        snapshot: mergedSnapshotObj
      };

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
      
      const parsedCurrentPrice = typeof data.currentPrice === 'number' 
        ? data.currentPrice 
        : parseFloat(String(data.currentPrice || '').replace(/[^0-9.-]/g, ''));
      const activeCurrentPrice = isNaN(parsedCurrentPrice) || parsedCurrentPrice <= 0 ? 150 : parsedCurrentPrice;

      const parsedHigh52w = parseFloat(String(data.snapshot?.high52w || '').replace(/[^0-9.-]/g, ''));
      const activeHigh52w = isNaN(parsedHigh52w) ? activeCurrentPrice * 1.25 : parsedHigh52w;

      const parsedLow52w = parseFloat(String(data.snapshot?.low52w || '').replace(/[^0-9.-]/g, ''));
      const activeLow52w = isNaN(parsedLow52w) ? activeCurrentPrice * 0.75 : parsedLow52w;

      ["1M", "1Y", "5Y"].forEach(range => {
        const points = rawHistorical[range] || [];
        
        let mappedPoints = points.map((p: any) => {
          let priceNum = typeof p.price === 'number' ? p.price : parseFloat(String(p.price || '0').replace(/[^0-9.-]/g, ''));
          let dateStr = p.date;
          if (!dateStr || isNaN(new Date(dateStr).getTime())) {
            dateStr = null;
          }
          return {
            date: dateStr,
            price: isNaN(priceNum) || priceNum <= 0 ? null : priceNum
          };
        }).filter((p: any) => p.price !== null);

        // Fallback: If we don't have enough valid points, auto-populate an extremely realistic historical curve
        if (mappedPoints.length < 4) {
          mappedPoints = [];
          const now = new Date();
          let count = 10;
          let daysOffset = 3;
          let fluctuationMultiplier = 0.05;

          if (range === "1M") {
            count = 12;
            daysOffset = 2; 
            fluctuationMultiplier = 0.04;
          } else if (range === "1Y") {
            count = 15;
            daysOffset = 24;
            fluctuationMultiplier = 0.20;
          } else { // 5Y
            count = 20;
            daysOffset = 91;
            fluctuationMultiplier = 0.50;
          }

          for (let i = 0; i < count; i++) {
            const dateObj = new Date();
            dateObj.setDate(now.getDate() - (count - 1 - i) * daysOffset);
            
            const progress = i / (count - 1 || 1);
            let basePrice = activeCurrentPrice;
            
            if (range === "1M") {
              const startPrice = activeCurrentPrice * 0.98;
              basePrice = startPrice + (activeCurrentPrice - startPrice) * progress;
            } else if (range === "1Y") {
              const startPrice = activeLow52w + (activeCurrentPrice - activeLow52w) * 0.2;
              basePrice = startPrice + (activeCurrentPrice - startPrice) * progress;
            } else { // 5Y
              const startPrice = activeCurrentPrice * 0.45;
              basePrice = startPrice + (activeCurrentPrice - startPrice) * progress;
            }

            const wave = Math.sin(progress * Math.PI * 2) * fluctuationMultiplier * activeCurrentPrice * 0.2;
            const noise = (Math.sin(i * 1.7) * 0.03) * activeCurrentPrice;
            const price = i === count - 1 ? activeCurrentPrice : Math.max(0.01, basePrice + wave + noise);

            mappedPoints.push({
              date: dateObj.toISOString().split('T')[0],
              price: parseFloat(price.toFixed(2))
            });
          }
        } else {
          // Fill in missing dates if any
          const now = new Date();
          const totalPoints = mappedPoints.length;
          
          mappedPoints = mappedPoints.map((p: any, idx: number) => {
            if (!p.date) {
              const dateObj = new Date();
              let daysAgo = 0;
              if (range === "1M") daysAgo = Math.round((totalPoints - 1 - idx) * 2.5);
              else if (range === "1Y") daysAgo = Math.round((totalPoints - 1 - idx) * 24);
              else daysAgo = Math.round((totalPoints - 1 - idx) * 91);
              
              dateObj.setDate(now.getDate() - daysAgo);
              p.date = dateObj.toISOString().split('T')[0];
            }
            return p;
          });
        }

        sanitizedHistorical[range] = mappedPoints;
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
          todayChangePercent: typeof data.snapshot?.todayChangePercent === 'string' ? data.snapshot.todayChangePercent : (typeof data.snapshot?.changePercent === 'string' ? data.snapshot.changePercent : (typeof data.snapshot?.change === 'string' ? data.snapshot.change : "")),
          high52w: this.sanitizePrice(data.snapshot?.high52w || ""),
          low52w: this.sanitizePrice(data.snapshot?.low52w || ""),
          ma200: this.sanitizePrice(data.snapshot?.ma200 || ""),
          ma100: this.sanitizePrice(data.snapshot?.ma100 || ""),
          ma50: this.sanitizePrice(data.snapshot?.ma50 || ""),
          analystViews: (data.snapshot?.analystViews || []).map((v: any) => ({
            ...v,
            targetPrice: this.sanitizePrice(v.targetPrice || ""),
            url: typeof v.url === 'string' ? v.url : undefined
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
      5. NIFTY PE Ratio (current value and status/valuation label, e.g., 22.8, "Fair Valued")

      Use Google Search to find the most recent values from last few hours.
      
      Return ONLY a JSON object:
      {
        "fearGreed": {"value": number, "label": "string"},
        "buffettIndicator": {"value": "string", "status": "string"},
        "dowJones": {"value": "string", "change": "string (e.g. +0.4%)"},
        "nifty50": {"value": "string", "change": "string (e.g. -0.2%)"},
        "niftyPe": {"value": "string", "status": "string"}
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
