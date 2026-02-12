
import { MarketAsset, MarketType } from './types';

export const INITIAL_ASSETS: MarketAsset[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', type: MarketType.STOCK, region: 'US' },
  { id: '2', symbol: 'RELIANCE.NS', name: 'Reliance Industries', type: MarketType.STOCK, region: 'INDIA' },
  { id: '3', symbol: 'BTC', name: 'Bitcoin', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { id: '10', symbol: 'ETH', name: 'Ethereum', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { id: '11', symbol: 'SOL', name: 'Solana', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { id: '4', symbol: 'GOLD', name: 'Gold Spot', type: MarketType.COMMODITY, region: 'GLOBAL' },
  { id: '5', symbol: 'SILVER', name: 'Silver Spot', type: MarketType.COMMODITY, region: 'GLOBAL' },
  { id: '6', symbol: 'DJI', name: 'Dow Jones Industrial Average', type: MarketType.INDEX, region: 'US' },
  { id: '7', symbol: '^NSEI', name: 'Nifty 50', type: MarketType.INDEX, region: 'INDIA' },
  { id: '8', symbol: '^GSPC', name: 'S&P 500 Index', type: MarketType.INDEX, region: 'US' },
  { id: '9', symbol: '^CNXSC', name: 'Nifty Smallcap 100', type: MarketType.INDEX, region: 'INDIA' },
  { id: '12', symbol: '^NSEMDCP100', name: 'Nifty Midcap 100', type: MarketType.INDEX, region: 'INDIA' },
];

export const SENTIMENT_COLORS = {
  BUY: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  SELL: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  HOLD: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  NEUTRAL: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};
