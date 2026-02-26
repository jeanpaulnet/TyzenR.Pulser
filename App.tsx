
import React, { useState, useEffect, useCallback } from 'react';
import { MarketAsset, AppState, PulserAnalysis, MarketType } from './types';
import { INITIAL_ASSETS } from './constants';
import { pulser } from './services/pulserAgent';
import MarketCard from './components/MarketCard';
import AddAssetModal from './components/AddAssetModal';
import { Activity, Plus, Search, ShieldCheck, Zap, Globe, Github, Info } from 'lucide-react';

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
    setState(prev => ({
      ...prev,
      analyses: {
        ...prev.analyses,
        [asset.id]: { ...(prev.analyses[asset.id] || {}), isAnalyzing: true } as PulserAnalysis
      }
    }));

    try {
      const result = await pulser.analyzeAsset(asset);
      setState(prev => ({
        ...prev,
        analyses: {
          ...prev.analyses,
          [asset.id]: result
        }
      }));
    } catch (error: any) {
      console.error(`Analysis failed for ${asset.symbol}:`, error);
      setState(prev => ({
        ...prev,
        analyses: {
          ...prev.analyses,
          [asset.id]: { 
            ...(prev.analyses[asset.id] || {}), 
            isAnalyzing: false,
            summary: "Market connection pulse failed. Please verify engine connectivity."
          } as PulserAnalysis
        }
      }));
    }
  }, []);

  const handleScanAll = async () => {
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
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-emerald-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-600/40">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Pulser</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center md:text-left">AI Market Agent from News</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-slate-300">Engine Active</span>
            </div>

            <button 
              onClick={handleScanAll}
              className="flex items-center gap-2 bg-white text-slate-950 px-5 py-2.5 rounded-full font-bold text-sm hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
            >
              <Activity className="w-4 h-4" /> <span className="hidden sm:inline">Scan All</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {['ALL', ...Object.values(MarketType)].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  filterType === type 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
            <div className="w-px h-6 bg-slate-800 mx-2" />
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl border border-slate-700 text-emerald-400 font-bold text-xs transition-all whitespace-nowrap"
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
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-500 bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-800">
              <Globe className="w-16 h-16 mb-6 opacity-10" />
              <p className="text-xl font-bold text-slate-400">Market Silence</p>
              <p className="text-sm max-w-xs text-center mt-2 text-slate-600">No assets matching your search. Add a new ticker symbol to start the pulse scan.</p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="mt-8 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-6 py-2 rounded-full font-bold hover:bg-emerald-500 hover:text-white transition-all"
              >
                Track New Asset
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <div className="flex justify-center gap-8 text-slate-600">
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-emerald-400 transition-colors text-xs font-bold uppercase tracking-widest">
               <Info className="w-3 h-3" /> Billing Info
             </a>
             <a href="https://pulser.tyzenr.com" className="flex items-center gap-2 hover:text-emerald-400 transition-colors text-xs font-bold uppercase tracking-widest">
               <Globe className="w-3 h-3" /> Live Markets
             </a>
             <a href="https://pulser.tyzenr.com" className="flex items-center gap-2 hover:text-emerald-400 transition-colors text-xs font-bold uppercase tracking-widest">
               <Github className="w-3 h-3" /> Repository
             </a>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase">
              Pulser Intelligence Engine • Powered by Gemini 3 Pro
            </p>
            <p className="text-[10px] text-slate-700 italic max-w-2xl leading-relaxed">
              Disclaimer: Pulser leverages high-fidelity AI models for sentiment scanning. Analysis results are not financial advice. 
              The system utilizes real-time search grounding to minimize hallucination and maximize precision.
            </p>
          </div>
        </div>
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
