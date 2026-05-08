
import { MarketAsset, MarketType } from './types';

export const APP_URL = 'https://futurecaps.buzz';

export const INITIAL_ASSETS: MarketAsset[] = [
  { id: '0', symbol: 'NIFTY', name: 'NIFTY 50', type: MarketType.INDEX, region: 'INDIA' },
  { id: '1', symbol: 'NIFTY_PE', name: 'NIFTY PE Ratio', type: MarketType.INDEX, region: 'INDIA' },
];

export const SENTIMENT_COLORS = {
  BUY: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/30 dark:bg-emerald-500/40 border-emerald-500/40 dark:border-emerald-500/30 font-extrabold',
  SELL: 'text-rose-700 dark:text-rose-400 bg-rose-500/30 dark:bg-rose-500/40 border-rose-500/40 dark:border-rose-500/30 font-extrabold',
  HOLD: 'text-amber-700 dark:text-amber-400 bg-amber-500/30 dark:bg-amber-500/40 border-amber-500/40 dark:border-amber-500/30 font-extrabold',
  NEUTRAL: 'text-slate-700 dark:text-slate-400 bg-slate-500/30 dark:bg-slate-500/40 border-slate-500/40 dark:border-slate-500/30 font-extrabold',
};
