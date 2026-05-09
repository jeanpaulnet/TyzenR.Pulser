
export enum MarketType {
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  COMMODITY = 'COMMODITY',
  INDEX = 'INDEX'
}

export enum Sentiment {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
  NEUTRAL = 'NEUTRAL'
}

export interface MarketSymbol {
  id: string;
  symbol: string;
  name: string;
  type: MarketType;
  region: 'US' | 'INDIA' | 'GLOBAL';
}

export interface PulserAnalysis {
  symbolId: string;
  shortTermTrend: Sentiment;
  longTermTrend: Sentiment;
  confidenceScore: number; // 0-100
  summary: string;
  sources: { title: string; uri: string }[];
  lastUpdated: string;
  isAnalyzing: boolean;
  currentPrice?: string;
  currencySymbol?: string;
  // Snapshot Data
  snapshot?: {
    intrinsicValue?: string;
    roe?: string;
    debtToEquity?: string;
    marginOfSafety?: string;
    ma200?: string;
    rsi?: string;
    technicalCommentary?: string;
    growthData?: { year: string; revenue: number; growth: number }[];
    expansionPlans?: string[];
    about?: string;
    founded?: string;
    employees?: string;
    peers?: { name: string; pe: string; marketCap: string }[];
  };
}

export interface AppState {
  symbols: MarketSymbol[];
  analyses: Record<string, PulserAnalysis>;
}
