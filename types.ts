
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
  notes?: string;
}

export interface PulserAnalysis {
  symbolId: string;
  shortTermTrend: Sentiment;
  longTermTrend: Sentiment;
  confidenceScore: number; // 0-100
  summary: string;
  sources: { title: string; url: string }[];
  lastUpdated: string;
  isAnalyzing: boolean;
  status?: string;
  currentPrice?: string;
  currencySymbol?: string;
  // Snapshot Data
  snapshot?: {
    intrinsicValue?: string;
    cmp?: string;
    high52w?: string;
    low52w?: string;
    roe?: string;
    roce?: string;
    pbRatio?: string;
    peRatio?: string;
    growthRate3Y?: string;
    growthRate5Y?: string;
    debtToEquity?: string;
    marketCap?: string;
    marginOfSafety?: string;
    ma200?: string;
    ma100?: string;
    ma50?: string;
    rsi?: string;
    technicalCommentary?: string;
    growthData?: { year: string; revenue: number; profit: number; growth: number }[];
    expansionPlans?: { plan: string; date: string }[];
    about?: string;
    tradingViewTicker?: string;
    founded?: string;
    employees?: string;
    peers?: { name: string; pe: string; marketCap: string; pb?: string }[];
    peerComparison?: string;
    analystViews?: { firm: string; rating: string; targetPrice: string; date: string }[];
    news?: { title: string; url: string; date: string }[];
    historicalData?: {
      "1M"?: { date: string; price: number }[];
      "1Y"?: { date: string; price: number }[];
      "5Y"?: { date: string; price: number }[];
    };
  };
}

export interface UserProfile {
  email: string;
  name: string;
  picture: string;
  balance: number;
}

export interface AppState {
  symbols: MarketSymbol[];
  analyses: Record<string, PulserAnalysis>;
}
