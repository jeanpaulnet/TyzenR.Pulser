
import { MarketSymbol, MarketType } from './types';

export const APP_URL = 'https://futurecaps.buzz';

export const INITIAL_SYMBOLS: MarketSymbol[] = [
  { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA Corp', type: MarketType.STOCK, region: 'US' },
  { id: 'aapl', symbol: 'AAPL', name: 'Apple Inc', type: MarketType.STOCK, region: 'US' },
  { id: 'nifty', symbol: 'NIFTY', name: 'NIFTY 50', type: MarketType.INDEX, region: 'INDIA' },
  { id: 'reliance', symbol: 'RELIANCE.NS', name: 'Reliance Industries', type: MarketType.STOCK, region: 'INDIA' },
  { id: 'gold', symbol: 'GOLD', name: 'Gold Spot', type: MarketType.COMMODITY, region: 'US' },
  { id: 'silver', symbol: 'SILVER', name: 'Silver Spot', type: MarketType.COMMODITY, region: 'US' },
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin', type: MarketType.CRYPTO, region: 'US' },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', type: MarketType.CRYPTO, region: 'US' },
];

export const SENTIMENT_COLORS = {
  BUY: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/30 dark:bg-emerald-500/40 border-emerald-500/40 dark:border-emerald-500/30 font-extrabold',
  SELL: 'text-rose-700 dark:text-rose-400 bg-rose-500/30 dark:bg-rose-500/40 border-rose-500/40 dark:border-rose-500/30 font-extrabold',
  HOLD: 'text-amber-700 dark:text-amber-400 bg-amber-500/30 dark:bg-amber-500/40 border-amber-500/40 dark:border-amber-500/30 font-extrabold',
  NEUTRAL: 'text-slate-700 dark:text-slate-400 bg-slate-500/30 dark:bg-slate-500/40 border-slate-500/40 dark:border-slate-500/30 font-extrabold',
};
