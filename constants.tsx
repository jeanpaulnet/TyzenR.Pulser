
import { MarketAsset, MarketType } from './types';

export const APP_URL = 'https://pulser.tyzenr.com';

export const INITIAL_ASSETS: MarketAsset[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', type: MarketType.STOCK, region: 'US' },
  { id: '3', symbol: 'BTC', name: 'Bitcoin', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { id: '4', symbol: 'GOLD', name: 'Gold Spot', type: MarketType.COMMODITY, region: 'GLOBAL' },
  { id: '5', symbol: 'SILVER', name: 'Silver Spot', type: MarketType.COMMODITY, region: 'GLOBAL' },
];

export const SENTIMENT_COLORS = {
  BUY: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  SELL: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  HOLD: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  NEUTRAL: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};
