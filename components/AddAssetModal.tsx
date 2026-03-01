
import React, { useState } from 'react';
import { MarketType, MarketAsset } from '../types';
import { Plus, X, Globe, Landmark, Coins, LineChart } from 'lucide-react';

interface AddAssetModalProps {
  onAdd: (asset: MarketAsset) => void;
  onClose: () => void;
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ onAdd, onClose }) => {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<MarketType>(MarketType.STOCK);
  const [region, setRegion] = useState<'US' | 'INDIA' | 'GLOBAL'>('US');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !name) return;

    const formattedSymbol = symbol.startsWith('$') ? symbol.toUpperCase() : `$${symbol.toUpperCase()}`;

    onAdd({
      id: Date.now().toString(),
      symbol: formattedSymbol,
      name,
      type,
      region
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" /> Add New Asset
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder:text-slate-600"
              />
              <p className="text-[10px] text-slate-500 mt-1">Use .NS for NSE India (e.g. INF_Y.NS)</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Asset Name</label>
              <input
                type="text"
                required
                placeholder="Full name (e.g. Apple Inc.)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder:text-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Type</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as MarketType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 focus:outline-none text-white appearance-none cursor-pointer"
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
                   className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 focus:outline-none text-white appearance-none cursor-pointer"
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
              className="flex-1 px-6 py-3 rounded-xl border border-slate-700 font-semibold hover:bg-slate-800 transition-colors text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-blue-600 font-semibold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 text-white"
            >
              Add Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;
