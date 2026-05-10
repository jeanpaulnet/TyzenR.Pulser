
import React, { useState } from 'react';
import { MarketType, MarketSymbol } from '../types';
import { Plus, X, Globe, Landmark, Coins, LineChart } from 'lucide-react';

interface AddSymbolModalProps {
  onAdd: (symbol: MarketSymbol) => void;
  onClose: () => void;
}

const AddSymbolModal: React.FC<AddSymbolModalProps> = ({ onAdd, onClose }) => {
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<MarketType>(MarketType.STOCK);
  const [region, setRegion] = useState<'US' | 'INDIA' | 'GLOBAL'>('US');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSymbol = symbol.trim().toUpperCase();
    
    if (!trimmedSymbol) {
      setError('Please enter a valid symbol (e.g., AAPL or RELIANCE.NS)');
      return;
    }

    if (trimmedSymbol.includes(' ')) {
      setError('Symbols cannot contain spaces');
      return;
    }

    if (type === MarketType.STOCK && region === 'INDIA' && !trimmedSymbol.includes('.')) {
      setError('India stocks usually require a suffix (e.g., RELIANCE.NS)');
      // Not returning here, just a warning? No, the user said "if invalid, don't close".
      // But some might be valid without. Let's be strict if they selected INDIA.
      return;
    }

    setError(null);
    onAdd({
      id: Date.now().toString(),
      symbol: trimmedSymbol,
      name: trimmedSymbol,
      type,
      region
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <Plus className="w-5 h-5 text-blue-500" /> Add New Symbol
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Market Symbol</label>
              <input
                type="text"
                required
                placeholder={region === 'INDIA' ? 'e.g. RELIANCE.NS, TATASTEEL.NS' : 'e.g. AAPL, BTC, GOLD'}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
              {error && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-lg">
                  <Globe className="w-3 h-3 text-rose-500" />
                  <p className="text-[10px] text-rose-500 font-bold">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Type</label>
                <div className="relative">
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value as MarketType)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 focus:outline-none text-slate-800 dark:text-white appearance-none cursor-pointer"
                  >
                    <option value={MarketType.STOCK}>Stock / Equity</option>
                    <option value={MarketType.CRYPTO}>Crypto Currency</option>
                    <option value={MarketType.COMMODITY}>Commodity</option>
                    <option value={MarketType.INDEX}>Market Index</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Region</label>
                <select 
                   value={region}
                   onChange={(e) => setRegion(e.target.value as any)}
                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 focus:outline-none text-slate-800 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="US">USA (Wall St)</option>
                  <option value="INDIA">India (NSE/BSE)</option>
                  <option value="GLOBAL">Global / Forex</option>
                </select>
              </div>
            </div>

            {region === 'INDIA' && (
              <div className="p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-xl">
                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block mb-1.5">India Guide</span>
                <p className="text-[10px] text-orange-700/70 dark:text-orange-400/70 leading-relaxed">
                  Use <span className="font-bold">.NS</span> for National Stock Exchange or <span className="font-bold">.BO</span> for Bombay Stock Exchange.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS'].map(hint => (
                    <button 
                      key={hint}
                      type="button"
                      onClick={() => setSymbol(hint)}
                      className="text-[9px] font-bold bg-white dark:bg-orange-950 px-2 py-1 rounded-md border border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 transition-colors"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
             <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-blue-600 font-semibold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 text-white"
            >
              Add Symbol
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSymbolModal;
