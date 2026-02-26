export type SignalType = 'BUY' | 'SELL' | 'NEUTRAL';

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
  signal?: SignalType;
  shortTerm?: SignalType;
  longTerm?: SignalType;
  price?: number;
  change?: number;
  changePercent?: number;
  summary?: string;
  isAnalyzing?: boolean;
}

export interface AppState {
  assets: MarketAsset[];
  analyses: Record<string, PulserAnalysis>;
  loading?: Record<string, boolean>;
  errors?: Record<string, string>;
}
