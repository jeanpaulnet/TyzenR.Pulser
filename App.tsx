
import React, { useState, useEffect, useCallback } from 'react';
import { MarketSymbol, AppState, PulserAnalysis, MarketType } from './types';
import { INITIAL_SYMBOLS } from './constants';
import { pulser } from './services/pulserAgent';
import MarketCard from './components/MarketCard';
import AddSymbolModal from './components/AddAssetModal';
import { Activity, Plus, Search, ShieldCheck, Zap, Globe, Github, Info, TrendingUp, LogIn, User, Sun, Moon, LogOut, Mail, Send, CheckCircle2, GripHorizontal } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { Reorder, useDragControls } from 'motion/react';

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
    return 'light';
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
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportResponse, setSupportResponse] = useState<string | null>(null);
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

        try {
          // New notification call with headers
          const domainName = window.location.hostname;
          await fetch(`https://webapi.tyzenr.com/pulser/notify/login/${domainName}`, {
            method: 'GET',
            headers: {
              'UserEmail': decoded.email || '',
              'UserId': decoded.sub || '',
              'UserName': decoded.name || ''
            }
          });
        } catch (err) {
          console.error('Failed to sync/notify login:', err);
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

  const handleRefreshPrice = useCallback(async (symbol: MarketSymbol) => {
    try {
      const { price, currency, source } = await pulser.getLivePrice(symbol);
      setState(prev => ({
        ...prev,
        analyses: {
          ...prev.analyses,
          [symbol.id]: {
            ...(prev.analyses[symbol.id] || {}),
            currentPrice: price,
            currencySymbol: currency,
            lastUpdated: new Date().toISOString(),
          } as PulserAnalysis
        }
      }));
    } catch (error) {
      console.error('Failed to refresh price:', error);
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
      symbols: [symbol, ...prev.symbols]
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

  const handleReorder = (newOrder: MarketSymbol[]) => {
    setState(prev => ({ ...prev, symbols: newOrder }));
  };

  const handleSupportSubmit = async () => {
    if (!supportMessage.trim()) return;
    
    setIsSendingSupport(true);
    try {
      const response = await fetch('https://webapi.tyzenr.com/common/contact/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'UserEmail': user?.email || '',
          'UserName': user?.name || ''
        },
        body: JSON.stringify({
          AppName: window.location.hostname,
          UserName: user?.name || '',
          UserEmail: user?.email || '',
          Message: supportMessage
        })
      });
      
      const data = await response.text();
      setSupportResponse(data);
    } catch (err) {
      console.error('Support submission failed:', err);
      setSupportResponse('Failed to send message. Please try again later.');
    } finally {
      setIsSendingSupport(false);
    }
  };

  const closeSupportModal = () => {
    setIsSupportModalOpen(false);
    setSupportMessage('');
    setSupportResponse(null);
  };

  return (
    <div className={`min-h-screen flex flex-col selection:bg-emerald-500/30 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-gradient-to-b from-white to-[#f5f5f5] text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${theme === 'dark' ? 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-950 border-zinc-800' : 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-zinc-700'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl shadow-lg backdrop-blur-sm border border-white/5">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-1">
                Pulser <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent italic inline-block pr-1">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">AI Powered Market Sentiments + Fundamentals + Technicals</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white/10 border-white/20'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-white'}`}>AI Engine ON</span>
            </div>

            {user ? (
              <div className={`flex items-center gap-3 px-3 py-1.5 border rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white/10 border-white/20'}`}>
                <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full border border-emerald-400/30" />
                <span className={`text-xs font-bold hidden sm:inline ${theme === 'dark' ? 'text-slate-200' : 'text-white'}`}>{user.name.split(' ')[0]}</span>
                <button 
                  onClick={() => { setUser(null); localStorage.removeItem('pulser_user'); }}
                  className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-purple-200 hover:text-white hover:bg-white/10'}`}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
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
        {/* Primary Controls: Add Symbol, Filters, Search */}
        <div className="flex flex-col gap-6 lg:gap-4 md:flex-row md:items-center md:justify-between">
          {/* Add Symbol - Row 1 on Mobile, Item 1 on Desktop */}
          <div className="w-full md:w-auto">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap shadow-xl active:scale-95 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 shadow-blue-600/30 text-white' : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-500 shadow-indigo-600/30 text-white'}`}
            >
              <Plus className="w-4 h-4" /> Add Symbol
            </button>
          </div>

          <div className="flex flex-col md:flex-row flex-1 gap-4 items-center justify-end">
            {/* Filters - Item 2 on Desktop */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar justify-center">
              {window.location.hostname.includes('futurecaps.buzz') && (
                <button 
                  onClick={() => window.open('https://futurecaps.com/free?ref=1-pulser', '_blank')}
                  className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-yellow-400/20 whitespace-nowrap mr-2"
                >
                  <TrendingUp className="w-3 h-3" /> Free Multibagger
                </button>
              )}
              
              {['ALL', ...Object.values(MarketType)].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    filterType === type 
                    ? theme === 'dark' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                    : theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Search Box - Item 3 on Desktop */}
            <div className={`relative w-full ${window.location.hostname.includes('futurecaps.buzz') ? 'md:w-64' : 'md:w-72'}`}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search symbols..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-2xl pl-12 pr-4 py-3 transition-all placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
              />
            </div>
          </div>
        </div>
        <div className="w-full">
          {searchQuery || filterType !== 'ALL' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSymbols.map(symbol => (
                <MarketCard 
                  key={symbol.id}
                  symbol={symbol}
                  analysis={state.analyses[symbol.id]}
                  onRefresh={handleAnalyze}
                  onRefreshPrice={handleRefreshPrice}
                  onRemove={handleRemoveSymbol}
                />
              ))}
            </div>
          ) : (
            <Reorder.Group 
              axis="y"
              values={state.symbols}
              onReorder={handleReorder}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {state.symbols.map(symbol => (
                <Reorder.Item 
                  key={symbol.id} 
                  value={symbol}
                  className="list-none cursor-default"
                  dragListener={true}
                  whileDrag={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
                >
                  <MarketCard 
                    symbol={symbol}
                    analysis={state.analyses[symbol.id]}
                    onRefresh={handleAnalyze}
                    onRefreshPrice={handleRefreshPrice}
                    onRemove={handleRemoveSymbol}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>

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
      </main>

      {/* Footer */}
      <footer className={`border-t py-12 px-4 mt-auto transition-colors ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className={`text-sm font-black tracking-widest ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                PULSER <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent inline-block pr-0.5">AI</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">© 2026 AI Intel.</span>
            </div>
            <button 
              onClick={() => setIsSupportModalOpen(true)}
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Mail className="w-4 h-4" /> Contact Support
            </button>

            <div className={`flex items-center gap-1 p-1 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <button 
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${theme === 'light' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Sun className="w-3 h-3" /> Light
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${theme === 'dark' ? 'bg-slate-800 text-blue-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Moon className="w-3 h-3" /> Dark
              </button>
            </div>
          </div>
          
          <p className={`text-[11px] italic leading-relaxed max-w-2xl text-center md:text-right transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            Disclaimer: AI scanning multiple websites & providing Action Insights. For personal trading/investing purposes by experienced personnel. Website not accountable for loss unless profit shared.
          </p>
        </div>
      </footer>

      {isAddModalOpen && (
        <AddSymbolModal 
          onAdd={handleAddSymbol} 
          onClose={() => setIsAddModalOpen(false)} 
          existingSymbols={state.symbols}
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

      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`border rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300 transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-center space-y-6">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto ${supportResponse ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                {supportResponse ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ) : (
                  <Mail className="w-8 h-8 text-blue-500" />
                )}
              </div>
              
              <div className="space-y-2">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {supportResponse ? 'Success' : 'Contact Support'}
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {supportResponse 
                    ? 'We have received your message.' 
                    : 'Have questions or feedback? Our team is here to help.'}
                </p>
              </div>

              {supportResponse ? (
                <div className={`p-4 rounded-2xl text-left text-sm font-medium border ${theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                  {supportResponse}
                </div>
              ) : (
                <textarea 
                  placeholder="Describe your issue or feedback here..."
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  disabled={isSendingSupport}
                  className={`w-full h-32 p-4 rounded-2xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                />
              )}

              <div className="flex items-center gap-3">
                {supportResponse ? (
                  <button 
                    onClick={closeSupportModal}
                    className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold transition-all hover:bg-emerald-600 active:scale-95"
                  >
                    Got it
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleSupportSubmit}
                      disabled={isSendingSupport || !supportMessage.trim()}
                      className={`flex-1 py-4 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:grayscale ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'}`}
                    >
                      {isSendingSupport ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Ok <Send className="w-4 h-4 ml-1" /></>
                      )}
                    </button>
                    <button 
                      onClick={closeSupportModal}
                      disabled={isSendingSupport}
                      className={`flex-1 py-4 rounded-2xl font-bold transition-all active:scale-95 border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
