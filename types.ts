export type SignalType = 'BUY' | 'SELL' | 'NEUTRAL';

export enum Sentiment {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
  NEUTRAL = 'NEUTRAL',
}

export enum MarketType {
  STOCK = 'stock',
  CRYPTO = 'crypto',
  COMMODITY = 'commodity',
  INDEX = 'index',
}

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  type: MarketType;
  region?: string;
}

export interface PulserAnalysis {
  assetId?: string;
  signal?: SignalType;
  shortTerm?: SignalType;
  longTerm?: SignalType;
  shortTermTrend?: Sentiment;
  longTermTrend?: Sentiment;
  price?: number;
  currentPrice?: number;
  currencySymbol?: string;
  change?: number;
  changePercent?: number;
  summary?: string;
  isAnalyzing?: boolean;
  confidenceScore?: number;
  sources?: any[];
  lastUpdated?: string;
}

export interface AppState {
  assets: MarketAsset[];
  analyses: Record<string, PulserAnalysis>;
  loading?: Record<string, boolean>;
  errors?: Record<string, string>;
}
