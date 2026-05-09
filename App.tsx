
import React, { useState, useEffect, useCallback } from 'react';
import { MarketSymbol, AppState, PulserAnalysis, MarketType } from './types';
import { INITIAL_SYMBOLS } from './constants';
import { pulser } from './services/pulserAgent';
import MarketCard from './components/MarketCard';
import AddSymbolModal from './components/AddAssetModal';
import { Activity, Plus, Search, ShieldCheck, Zap, Globe, Github, Info, TrendingUp, LogIn, User, Sun, Moon } from 'lucide-react';
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

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('pulser_theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const savedUserTheme = user ? localStorage.getItem(`pulser_theme_${user.email}`) : null;
    if (savedUserTheme) {
      setTheme(savedUserTheme as 'light' | 'dark');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`pulser_theme_${user.email}`, theme);
    }
    localStorage.setItem('pulser_theme', theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, user]);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('pulser_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          symbols: parsed.symbols || parsed.assets || INITIAL_SYMBOLS,
          analyses: parsed.analyses || {},
        };
      } catch (e) {
        return { symbols: INITIAL_SYMBOLS, analyses: {} };
      }
    }
    return { symbols: INITIAL_SYMBOLS, analyses: {} };
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
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "875002260614-gj79e389kmlespuqtnm52hf8rfnv4k8i.apps.googleusercontent.com",
          callback: handleCredentialResponse,
          ux_mode: "popup",
          auto_select: false
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

  const handleAnalyze = useCallback(async (symbol: MarketSymbol) => {
    setState(prev => ({
      ...prev,
      analyses: {
        ...prev.analyses,
        [symbol.id]: { ...(prev.analyses[symbol.id] || {}), isAnalyzing: true } as PulserAnalysis
      }
    }));

    try {
      const result = await pulser.analyzeSymbol(symbol);
      setState(prev => ({
        ...prev,
        analyses: {
          ...prev.analyses,
          [symbol.id]: result
        }
      }));
    } catch (error: any) {
      console.error(`Analysis failed for ${symbol.symbol}:`, error);
      setState(prev => ({
        ...prev,
        analyses: {
          ...prev.analyses,
          [symbol.id]: { 
            ...(prev.analyses[symbol.id] || {}), 
            isAnalyzing: false,
            summary: "Market connection pulse failed. Please verify engine connectivity."
          } as PulserAnalysis
        }
      }));
    }
  }, []);

  const handleScanAll = async () => {
    for (const symbol of state.symbols) {
      await handleAnalyze(symbol);
    }
  };

  const handleAddSymbol = (symbol: MarketSymbol) => {
    if (state.symbols.length >= 2 && !user) {
      setIsLoginModalOpen(true);
      return;
    }
    setState(prev => ({
      ...prev,
      symbols: [...prev.symbols, symbol]
    }));
    handleAnalyze(symbol);
  };

  const handleRemoveSymbol = (id: string) => {
    setState(prev => {
      const newAnalyses = { ...prev.analyses };
      delete newAnalyses[id];
      return {
        symbols: prev.symbols.filter(s => s.id !== id),
        analyses: newAnalyses
      };
    });
  };

  const filteredSymbols = state.symbols.filter(symbol => {
    const matchesSearch = symbol.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         symbol.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || symbol.type === filterType;
    return matchesSearch && matchesType;
  });

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`min-h-screen flex flex-col selection:bg-emerald-500/30 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${theme === 'dark' ? 'bg-gradient-to-r from-slate-800 to-slate-950 border-slate-800' : 'bg-gradient-to-r from-purple-600 to-indigo-700 border-purple-500'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl shadow-lg backdrop-blur-sm">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-white'}`}>Pulser AI</h1>
              <p className={`text-[10px] font-bold uppercase tracking-widest text-center md:text-left ${theme === 'dark' ? 'text-slate-500' : 'text-purple-100'}`}>AI Market Sentiment Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-yellow-400 hover:border-yellow-400/50' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white/10 border-white/20'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-white'}`}>Engine Active</span>
            </div>

            {user ? (
              <div className={`flex items-center gap-3 px-3 py-1.5 border rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white/10 border-white/20'}`}>
                <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full border border-emerald-400/30" />
                <span className={`text-xs font-bold hidden sm:inline ${theme === 'dark' ? 'text-slate-200' : 'text-white'}`}>{user.name.split(' ')[0]}</span>
                <button 
                  onClick={() => { setUser(null); localStorage.removeItem('pulser_user'); }}
                  className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${theme === 'dark' ? 'text-slate-500 hover:text-rose-400' : 'text-purple-200 hover:text-white'}`}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className={`flex items-center gap-2 border px-4 py-2 rounded-full font-bold text-xs transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
              >
                <LogIn className="w-4 h-4" /> Login
              </button>
            )}

            <button 
              onClick={handleScanAll}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95 shadow-lg ${theme === 'dark' ? 'bg-white text-slate-950 hover:bg-emerald-500 hover:text-white shadow-emerald-500/10' : 'bg-white text-purple-700 hover:bg-purple-50 shadow-purple-900/20'}`}
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
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-2xl pl-12 pr-4 py-3 transition-all placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {['ALL', ...Object.values(MarketType)].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  filterType === type 
                  ? theme === 'dark' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                  : theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
            <div className={`w-px h-6 mx-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs transition-all whitespace-nowrap shadow-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 shadow-blue-600/20 text-white' : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-500 shadow-indigo-600/20 text-white'}`}
            >
              <Plus className="w-4 h-4" /> Add Symbol
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSymbols.map(symbol => (
            <MarketCard 
              key={symbol.id}
              symbol={symbol}
              analysis={state.analyses[symbol.id]}
              onRefresh={handleAnalyze}
              onRemove={handleRemoveSymbol}
            />
          ))}

          {filteredSymbols.length === 0 && (
            <div className={`col-span-full py-24 flex flex-col items-center justify-center rounded-[3rem] border border-dashed ${theme === 'dark' ? 'text-slate-500 bg-slate-900/30 border-slate-800' : 'text-slate-400 bg-slate-100/50 border-slate-200'}`}>
              <Globe className="w-16 h-16 mb-6 opacity-10" />
              <p className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Market Silence</p>
              <p className="text-sm max-w-xs text-center mt-2 text-slate-500">No symbols matching your search. Add a new ticker symbol to start the pulse scan.</p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="mt-8 bg-blue-500/10 text-blue-500 border border-blue-500/20 px-6 py-2 rounded-full font-bold hover:bg-blue-500 hover:text-white transition-all"
              >
                Track New Symbol
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t py-8 px-4 mt-auto transition-colors ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <p className={`text-[11px] italic leading-relaxed max-w-3xl mx-auto transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            Disclaimer: AI scanning multiple websites & providing Action Insights. These will be used for personal trading/investing purposes by the experienced person. Website is not accountable for any loss incurred unless you shared the profit with us.
          </p>
        </div>
      </footer>

      {isAddModalOpen && (
        <AddSymbolModal 
          onAdd={handleAddSymbol} 
          onClose={() => setIsAddModalOpen(false)} 
        />
      )}

      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`border rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300 transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-center space-y-6">
              <div className="bg-emerald-500/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
                <User className="w-8 h-8 text-emerald-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Login Required</h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  You can track up to 2 symbols for free. Login with Google to unlock unlimited tracking and advanced AI insights.
                </p>
              </div>

              <div id="google-login-btn" className="flex justify-center py-4"></div>

              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-emerald-500 dark:hover:text-white uppercase tracking-widest transition-colors"
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
