
import { MarketAsset, MarketType } from './types';

export const APP_URL = 'https://futurecaps.buzz';

export const INITIAL_ASSETS: MarketAsset[] = [
  { id: '0', symbol: 'NIFTY', name: 'NIFTY 50', type: MarketType.INDEX, region: 'INDIA' },
  { id: '1', symbol: 'NIFTY_PE', name: 'NIFTY PE Ratio', type: MarketType.INDEX, region: 'INDIA' },
];

export const SENTIMENT_COLORS = {
  BUY: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  SELL: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  HOLD: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  NEUTRAL: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};
