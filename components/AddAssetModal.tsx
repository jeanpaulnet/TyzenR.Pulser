
import React, { useState } from 'react';
import { MarketType, MarketSymbol } from '../types';
import { Plus, X, Globe, Landmark, Coins, LineChart, Loader2 } from 'lucide-react';
import { pulser } from '../services/pulserAgent';

interface AddSymbolModalProps {
  onAdd: (symbol: MarketSymbol) => void;
  onClose: () => void;
  existingSymbols: MarketSymbol[];
}

const AddSymbolModal: React.FC<AddSymbolModalProps> = ({ onAdd, onClose, existingSymbols }) => {
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<MarketType>(MarketType.STOCK);
  const [region, setRegion] = useState<'US' | 'INDIA' | 'GLOBAL'>('US');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      return;
    }

    if (existingSymbols.some(s => s.symbol === trimmedSymbol && s.region === region)) {
      setError(`Symbol "${trimmedSymbol}" is already in your tracking list for ${region}.`);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const validation = await pulser.validateSymbol(trimmedSymbol, type, region);
      
      if (!validation.isValid) {
        setError(validation.reason || `Could not verify "${trimmedSymbol}" as a ${type.toLowerCase()} in ${region}. Please check the symbol and region.`);
        setIsValidating(false);
        return;
      }
      
      onAdd({
        id: Date.now().toString(),
        symbol: trimmedSymbol,
        name: validation.name || trimmedSymbol,
        type,
        region,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err) {
      console.error('Validation failed:', err);
      setError('Unable to verify symbol right now. Please check the symbol manually or try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-colors">
        <div className="p-4 border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Plus className="w-4 h-4 text-white/80" /> Add New Symbol
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Market Symbol</label>
              <input
                type="text"
                required
                placeholder={region === 'INDIA' ? 'e.g. RELIANCE.NS' : 'e.g. AAPL, BTC'}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
              {error && (
                <div className="flex items-center gap-2 mt-1.5 px-2 py-1.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-md">
                  <Globe className="w-3 h-3 text-rose-500" />
                  <p className="text-[10px] text-rose-500 font-bold">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Type</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as MarketType)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-sm focus:outline-none text-slate-800 dark:text-white appearance-none cursor-pointer"
                >
                  <option value={MarketType.STOCK}>Stock</option>
                  <option value={MarketType.CRYPTO}>Crypto</option>
                  <option value={MarketType.COMMODITY}>Commodity</option>
                  <option value={MarketType.INDEX}>Index</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Region</label>
                <select 
                   value={region}
                   onChange={(e) => setRegion(e.target.value as any)}
                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-sm focus:outline-none text-slate-800 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="US">USA</option>
                  <option value="INDIA">India</option>
                  <option value="GLOBAL">Global</option>
                </select>
              </div>
            </div>

            {region === 'INDIA' && (
              <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-lg">
                <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block mb-1">Guide</span>
                <p className="text-[9px] text-orange-700/70 dark:text-orange-400/70 leading-tight">
                  Use <span className="font-bold">.NS</span> (NSE) or <span className="font-bold">.BO</span> (BSE).
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['RELIANCE.NS', 'TCS.NS'].map(hint => (
                    <button 
                      key={hint}
                      type="button"
                      onClick={() => setSymbol(hint)}
                      className="text-[8px] font-bold bg-white dark:bg-orange-950 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block flex justify-between">
                Notes
                <span className={`text-[9px] ${notes.length >= 1000 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                  {notes.length}/1000
                </span>
              </label>
              <textarea
                placeholder="Investment thesis or personal notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-20 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
             <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isValidating}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-blue-600 font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/20 text-white disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                'Add Symbol'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSymbolModal;
