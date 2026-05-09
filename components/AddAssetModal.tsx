
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
    if (!symbol.trim()) {
      setError('Please enter a valid symbol (e.g., AAPL or RELIANCE.NS)');
      return;
    }

    setError(null);
    onAdd({
      id: Date.now().toString(),
      symbol: symbol.trim().toUpperCase(),
      name: symbol.trim().toUpperCase(),
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
                placeholder="e.g. AAPL, RELIANCE.NS, BTC"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
              {error && (
                <p className="text-[10px] text-rose-500 font-bold mt-1.5 animate-in fade-in slide-in-from-top-1">
                  {error}
                </p>
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Use .NS for NSE India (e.g. RELIANCE.NS)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Type</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as MarketType)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 focus:outline-none text-slate-800 dark:text-white appearance-none cursor-pointer"
                >
                  <option value={MarketType.STOCK}>Stock</option>
                  <option value={MarketType.CRYPTO}>Crypto</option>
                  <option value={MarketType.COMMODITY}>Commodity</option>
                  <option value={MarketType.INDEX}>Index</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Region</label>
                <select 
                   value={region}
                   onChange={(e) => setRegion(e.target.value as any)}
                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 focus:outline-none text-slate-800 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="US">USA</option>
                  <option value="INDIA">India</option>
                  <option value="GLOBAL">Global</option>
                </select>
              </div>
            </div>
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
