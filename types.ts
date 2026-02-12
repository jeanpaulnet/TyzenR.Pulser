
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

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  type: MarketType;
  region: 'US' | 'INDIA' | 'GLOBAL';
}

export interface PulserAnalysis {
  assetId: string;
  recommendation: Sentiment;
  confidenceScore: number; // 0-100
  summary: string;
  sources: { title: string; uri: string }[];
  lastUpdated: string;
  isAnalyzing: boolean;
}

export interface AppState {
  assets: MarketAsset[];
  analyses: Record<string, PulserAnalysis>;
}
