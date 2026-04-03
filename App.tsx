
import React, { useState, useEffect, useCallback } from 'react';
import { MarketAsset, AppState, PulserAnalysis, MarketType } from './types';
import { INITIAL_ASSETS } from './constants';
import { pulser } from './services/pulserAgent';
import MarketCard from './components/MarketCard';
import AddAssetModal from './components/AddAssetModal';
import { Activity, Plus, Search, ShieldCheck, Zap, Globe, Github, Info, TrendingUp, LogIn, User } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

declare global {
  interface Window {
    google: any;
  }
}

interface UserProfile {
  email: string;
  name: string;
  picture: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pulser_user');
    return saved ? JSON.parse(saved) : null;
  });

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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Persistence
  useEffect(() => {
    localStorage.setItem('pulser_state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('pulser_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pulser_user');
    }
  }, [user]);

  // Google Login Initialization
  useEffect(() => {
    const handleCredentialResponse = async (response: any) => {
      try {
        const decoded: any = jwtDecode(response.credential);
        const profile: UserProfile = {
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
        };
        setUser(profile);
        setIsLoginModalOpen(false);

        // Send post message to the requested endpoint
        try {
          await fetch(`https://webapi.tyzenr.com/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              app: 'pulser', 
              action: 'login', 
              email: profile.email 
            })
          });
        } catch (err) {
          console.error('Failed to sync login:', err);
        }
      } catch (err) {
        console.error('Login failed:', err);
      }
    };

    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "875002260614-gj79e389kmlespuqtnm52hf8rfnv4k8i.apps.googleusercontent.com",
          callback: handleCredentialResponse,
        });
      }
    };

    // Check if script is loaded, if not wait a bit
    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initGoogle();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  const handleLoginClick = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
      // Also render the button in the modal
      const btn = document.getElementById('google-login-btn');
      if (btn) {
        window.google.accounts.id.renderButton(btn, { theme: 'outline', size: 'large' });
      }
    }
  };

  useEffect(() => {
    if (isLoginModalOpen && window.google) {
      const btn = document.getElementById('google-login-btn');
      if (btn) {
        window.google.accounts.id.renderButton(btn, { theme: 'outline', size: 'large', width: 280 });
      }
    }
  }, [isLoginModalOpen]);

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
    if (state.assets.length >= 2 && !user) {
      setIsLoginModalOpen(true);
      return;
    }
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
              <h1 className="text-2xl font-bold tracking-tight text-white">Pulser AI</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center md:text-left">AI Market Sentiment Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-slate-300">Engine Active</span>
            </div>

            {user ? (
              <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
                <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full border border-emerald-500/30" />
                <span className="text-xs font-bold text-slate-200 hidden sm:inline">{user.name.split(' ')[0]}</span>
                <button 
                  onClick={() => { setUser(null); localStorage.removeItem('pulser_user'); }}
                  className="text-[10px] font-bold text-slate-500 hover:text-rose-400 uppercase tracking-widest ml-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 px-4 py-2 rounded-full font-bold text-xs hover:bg-slate-800 transition-all"
              >
                <LogIn className="w-4 h-4" /> Login
              </button>
            )}

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
          {window.location.hostname.includes('futurecaps.buzz') && (
            <button 
              onClick={() => window.open('https://futurecaps.com/free?ref=1-pulser', '_blank')}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-yellow-400/20 w-full md:w-auto"
            >
              <TrendingUp className="w-4 h-4" /> Get a Free Multibagger
            </button>
          )}

          <div className={`relative w-full ${window.location.hostname.includes('futurecaps.buzz') ? 'md:w-96' : 'md:flex-1'}`}>
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
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl border border-blue-500 text-white font-bold text-xs transition-all whitespace-nowrap shadow-lg shadow-blue-600/20"
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
                className="mt-8 bg-blue-500/10 text-blue-500 border border-blue-500/20 px-6 py-2 rounded-full font-bold hover:bg-blue-500 hover:text-white transition-all"
              >
                Track New Asset
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 px-4 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[11px] text-slate-500 italic leading-relaxed max-w-3xl mx-auto">
            Disclaimer: AI scanning multiple websites & providing Action Insights. These will be used for personal trading/investing purposes by the experienced person. Website is not accountable for any loss incurred unless you shared the profit with us.
          </p>
        </div>
      </footer>

      {isAddModalOpen && (
        <AddAssetModal 
          onAdd={handleAddAsset} 
          onClose={() => setIsAddModalOpen(false)} 
        />
      )}

      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-6">
              <div className="bg-emerald-500/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                <User className="w-8 h-8 text-emerald-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Login Required</h2>
                <p className="text-sm text-slate-400">
                  You can track up to 2 assets for free. Login with Google to unlock unlimited tracking and advanced AI insights.
                </p>
              </div>

              <div id="google-login-btn" className="flex justify-center py-4"></div>

              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
