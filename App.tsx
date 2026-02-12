
import React, { useState, useEffect, useCallback } from 'react';
import { MarketAsset, AppState, PulserAnalysis, MarketType } from './types';
import { INITIAL_ASSETS } from './constants';
import { pulser } from './services/pulserAgent';
import MarketCard from './components/MarketCard';
import AddAssetModal from './components/AddAssetModal';
import { Activity, Plus, Search, ShieldCheck, Zap, Globe, Github } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('pulser_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          assets: parsed.assets || INITIAL_ASSETS,
          analyses: parsed.analyses || {},
        };
      } catch (e) {
        return { assets: INITIAL_ASSETS, analyses: {} };
      }
    }
    return { assets: INITIAL_ASSETS, analyses: {} };
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Persistence
  useEffect(() => {
    localStorage.setItem('pulser_state', JSON.stringify(state));
  }, [state]);

  const handleAnalyze = useCallback(async (asset: MarketAsset) => {
    // Set loading state
    setState(prev => ({
      ...prev,
      analyses: {
        ...prev.analyses,
        [asset.id]: { ...(prev.analyses[asset.id] || {}), isAnalyzing: true } as PulserAnalysis
      }
    }));

    const result = await pulser.analyzeAsset(asset);

    setState(prev => ({
      ...prev,
      analyses: {
        ...prev.analyses,
        [asset.id]: result
      }
    }));
  }, []);

  const handleScanAll = async () => {
    // Sequence analysis to avoid rate limits and keep UX smooth
    for (const asset of state.assets) {
      await handleAnalyze(asset);
    }
  };

  const handleAddAsset = (asset: MarketAsset) => {
    setState(prev => ({
      ...prev,
      assets: [...prev.assets, asset]
    }));
    handleAnalyze(asset);
  };

  const handleRemoveAsset = (id: string) => {
    setState(prev => {
      const newAnalyses = { ...prev.analyses };
      delete newAnalyses[id];
      return {
        assets: prev.assets.filter(a => a.id !== id),
        analyses: newAnalyses
      };
    });
  };

  const filteredAssets = state.assets.filter(asset => {
    const matchesSearch = asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || asset.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/40">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Pulser <span className="text-blue-500 font-light">AI</span></h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Market Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-slate-300">Live Scanners Active</span>
            </div>
            <button 
              onClick={handleScanAll}
              className="flex items-center gap-2 bg-white text-slate-950 px-5 py-2.5 rounded-full font-bold text-sm hover:bg-blue-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-blue-500/10"
            >
              <Activity className="w-4 h-4" /> Scan Markets
            </button>
          </div>
        </div>
      </header>

      {/* Main Controls */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search symbol or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {['ALL', ...Object.values(MarketType)].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  filterType === type 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl border border-slate-700 text-blue-400 font-bold text-xs transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Asset
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssets.map(asset => (
            <MarketCard 
              key={asset.id}
              asset={asset}
              analysis={state.analyses[asset.id]}
              onRefresh={handleAnalyze}
              onRemove={handleRemoveAsset}
            />
          ))}

          {filteredAssets.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
              <Globe className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No market assets found</p>
              <p className="text-sm">Try adding a new ticker symbol from US or Indian markets.</p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="mt-6 text-blue-500 font-bold hover:underline"
              >
                Add your first asset
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 px-4 text-center">
        <div className="flex justify-center gap-6 mb-4 text-slate-600">
           <a href="#" className="hover:text-white transition-colors"><Globe className="w-5 h-5" /></a>
           <a href="#" className="hover:text-white transition-colors"><Github className="w-5 h-5" /></a>
        </div>
        <p className="text-xs text-slate-600 tracking-wider">
          &copy; {new Date().getFullYear()} PULSER AI • DATA POWERED BY GEMINI SEARCH GROUNDING
        </p>
        <p className="text-[10px] text-slate-700 mt-2 max-w-xl mx-auto italic">
          Disclaimer: Pulser AI provides sentiment analysis for informational purposes only. It is not financial advice. Always consult a certified advisor before making investment decisions.
        </p>
      </footer>

      {isAddModalOpen && (
        <AddAssetModal 
          onAdd={handleAddAsset} 
          onClose={() => setIsAddModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
