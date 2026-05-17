
import React, { useState, useEffect, useCallback } from 'react';
import { MarketSymbol, AppState, PulserAnalysis, MarketType, UserProfile } from './types';
import { INITIAL_SYMBOLS } from './constants';
import { pulser } from './services/pulserAgent';
import MarketCard from './components/MarketCard';
import AddSymbolModal from './components/AddAssetModal';
import { Activity, Plus, Search, ShieldCheck, Zap, Globe, Github, Info, TrendingUp, LogIn, User, Sun, Moon, LogOut, Mail, Send, CheckCircle2, GripHorizontal, ChevronDown } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

declare global {
  interface Window {
    google: any;
  }
}

// Remove local UserProfile as it's imported from types.ts

// Scan cost constant
const SCAN_COST = 0.10;

const PROGRESS_STATUSES = [
  "Searching News & Filings...",
  "Fetching Financial Data...",
  "Fetching Price Action...",
  "Analyzing Technical Mood...",
  "Synthesizing Financial Pulse...",
  "Calculating Valuation Metrics...",
  "Finalizing Deep-Dive Snapshot..."
];

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pulser_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure balance exists even for legacy sessions
        if (parsed && typeof parsed.balance !== 'number') {
          const balances = JSON.parse(localStorage.getItem('pulser_balances') || '{}');
          parsed.balance = balances[parsed.email] || balances[`ip_${localStorage.getItem('pulser_last_ip')}`] || 10.00;
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
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
  const [userIp, setUserIp] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsLoginModalOpen(false);
        setIsSupportModalOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch IP
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        setUserIp(data.ip);
        localStorage.setItem('pulser_last_ip', data.ip);
        // Initialize guest balance if needed
        const balances = JSON.parse(localStorage.getItem('pulser_balances') || '{}');
        const ipKey = `ip_${data.ip}`;
        if (balances[ipKey] === undefined) {
          balances[ipKey] = 10.00;
          localStorage.setItem('pulser_balances', JSON.stringify(balances));
        }
      })
      .catch(() => setUserIp('local-fallback'));
  }, []);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportUserName, setSupportUserName] = useState('');
  const [supportUserEmail, setSupportUserEmail] = useState('');
  const [supportAppName, setSupportAppName] = useState('Pulser AI');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportResponse, setSupportResponse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    if (isSupportModalOpen && user) {
      setSupportUserName(user.name || '');
      setSupportUserEmail(user.email || '');
    }
  }, [isSupportModalOpen, user]);

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
        const balances = JSON.parse(localStorage.getItem('pulser_balances') || '{}');
        
        // Find balance by email OR by IP if limited
        let currentBalance = balances[decoded.email];
        if (currentBalance === undefined) {
          // Check if this IP already has a balance allocated
          const ipBalanceKey = `ip_${userIp}`;
          if (balances[ipBalanceKey] !== undefined) {
             currentBalance = balances[ipBalanceKey];
          } else {
             currentBalance = 10.00;
             balances[decoded.email] = 10.00;
             balances[ipBalanceKey] = 10.00;
             localStorage.setItem('pulser_balances', JSON.stringify(balances));
          }
        }

        // Special credit for jeanpaulva@gmail.com
        if (decoded.email === 'jeanpaulva@gmail.com') {
          const credited = localStorage.getItem('pulser_credited_jeanpaul');
          if (!credited) {
            currentBalance += 10.00;
            localStorage.setItem('pulser_credited_jeanpaul', 'true');
            balances[decoded.email] = currentBalance;
            const ipKey = `ip_${userIp}`;
            if (userIp) balances[ipKey] = currentBalance;
            localStorage.setItem('pulser_balances', JSON.stringify(balances));
          }
        }

        const profile: UserProfile = {
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
          balance: currentBalance || 10.00,
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setState((prev) => {
        const oldIndex = prev.symbols.findIndex((s) => s.id === active.id);
        const newIndex = prev.symbols.findIndex((s) => s.id === over.id);
        return {
          ...prev,
          symbols: arrayMove(prev.symbols, oldIndex, newIndex),
        };
      });
    }
  };

  const handleAnalyze = useCallback(async (symbol: MarketSymbol) => {
    // Re-read balances at start of each individual scan to ensure up-to-date data
    const currentBalances = JSON.parse(localStorage.getItem('pulser_balances') || '{}');
    const ipKey = `ip_${userIp}`;
    
    // Determine effective balance based on IP restriction
    let effectiveBalance = 0;
    if (userIp && currentBalances[ipKey] !== undefined) {
      effectiveBalance = currentBalances[ipKey];
    } else if (user) {
      effectiveBalance = user.balance;
    } else {
      // Fallback if IP not loaded yet
      effectiveBalance = 10.00; 
    }

    // Check balance
    if (effectiveBalance < SCAN_COST) {
      setState(prev => ({
        ...prev,
        analyses: {
          ...prev.analyses,
          [symbol.id]: { 
            ...(prev.analyses[symbol.id] || {}), 
            isAnalyzing: false,
            summary: `Insufficient balance ($${SCAN_COST.toFixed(2)} required per scan). Please recharge or login to refresh.`
          } as PulserAnalysis
        }
      }));
      return;
    }

    // Deduct balance immediately when the scan starts
    const newBalance = Math.max(0, effectiveBalance - SCAN_COST);
    const updatedBalances = { ...currentBalances };
    if (userIp) updatedBalances[ipKey] = newBalance;
    if (user) updatedBalances[user.email] = newBalance;
    localStorage.setItem('pulser_balances', JSON.stringify(updatedBalances));

    if (user) {
      setUser(prev => prev ? { ...prev, balance: newBalance } : null);
    }

    setState(prev => ({
      ...prev,
      analyses: {
        ...prev.analyses,
        [symbol.id]: { 
          ...(prev.analyses[symbol.id] || {}), 
          isAnalyzing: true,
          status: PROGRESS_STATUSES[0]
        } as PulserAnalysis
      }
    }));

    // Rotate status messages every 2.5 seconds
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      statusIndex = (statusIndex + 1) % PROGRESS_STATUSES.length;
      setState(prev => {
        const current = prev.analyses[symbol.id];
        if (!current || !current.isAnalyzing) return prev;
        return {
          ...prev,
          analyses: {
            ...prev.analyses,
            [symbol.id]: {
              ...current,
              status: PROGRESS_STATUSES[statusIndex]
            }
          }
        };
      });
    }, 2500);

    try {
      const result = await pulser.analyzeSymbol(symbol);
      clearInterval(statusInterval);
      setState(prev => ({
        ...prev,
        analyses: {
          ...prev.analyses,
          [symbol.id]: { ...result, status: undefined }
        }
      }));
    } catch (error: any) {
      clearInterval(statusInterval);
      console.error(`Analysis failed for ${symbol.symbol}:`, error);
      setState(prev => ({
        ...prev,
        analyses: {
          ...prev.analyses,
          [symbol.id]: { 
            ...(prev.analyses[symbol.id] || {}), 
            isAnalyzing: false,
            status: undefined,
            summary: "Market connection pulse failed. Please verify engine connectivity."
          } as PulserAnalysis
        }
      }));
    }
  }, [user, userIp]);

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
    setState(prev => ({
      ...prev,
      symbols: [symbol, ...prev.symbols]
    }));
    // Ensure we don't scroll to bottom by explicitly scrolling to top where the new item is prepended
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleSupportSubmit = async () => {
    if (!supportMessage.trim()) return;
    
    setIsSendingSupport(true);
    try {
      const response = await fetch('https://webapi.tyzenr.com/common/contact/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Email': supportUserEmail || user?.email || '',
          'Name': supportUserName || user?.name || ''
        },
        body: JSON.stringify({
          App: supportAppName,
          Name: supportUserName || user?.name || '',
          Email: supportUserEmail || user?.email || '',
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
    setSupportUserName('');
    setSupportUserEmail('');
    setSupportAppName('Pulser AI');
    setSupportResponse(null);
  };

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isUserMenuOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.user-menu-container')) {
          setIsUserMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pulser_user');
    setIsUserMenuOpen(false);
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
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white/10 border-white/20'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-white'}`}>AI Engine ON</span>
            </div>

            {user ? (
              <div className="relative user-menu-container">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-2 pl-1.5 pr-3 py-1 border rounded-full transition-all hover:bg-white/10 ${isUserMenuOpen ? 'bg-white/15 ring-2 ring-emerald-500/30' : 'bg-white/5 border-white/20'}`}
                >
                  <img src={user?.picture || ''} alt={user?.name || 'User'} className="w-7 h-7 rounded-full border border-emerald-400/30 shadow-sm" />
                  <span className={`text-xs font-bold hidden sm:inline text-white truncate max-w-[100px]`}>
                    {(user?.name || 'User').split(' ')[0]}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && user && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={`absolute right-0 mt-3 w-48 rounded-[1.5rem] border shadow-2xl overflow-hidden z-50 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-black/50' : 'bg-white border-slate-200 shadow-slate-200/50'}`}
                    >
                      <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-slate-100'}`}>
                        <p className={`text-[10px] font-black uppercase text-slate-500 tracking-widest`}>Account</p>
                        <p className={`text-xs font-bold truncate mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>{user?.email}</p>
                        <div className={`mt-2 p-2 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-slate-400">Balance</span>
                            <motion.span 
                              key={user?.balance}
                              initial={{ scale: 1.2, color: '#10b981' }}
                              animate={{ scale: 1, color: (user?.balance || 0) > SCAN_COST ? '#10b981' : '#f43f5e' }}
                              className="text-xs font-black"
                            >
                              ${(user?.balance || 0).toFixed(2)}
                            </motion.span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[9px] font-black uppercase text-slate-400">Scans</span>
                            <span className={`text-xs font-black ${(user?.balance || 0) > SCAN_COST ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {Math.floor((user?.balance || 0) / SCAN_COST)} Left
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => { setIsUserMenuOpen(false); setIsSupportModalOpen(true); }}
                          className={`w-full mt-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                            Math.floor((user?.balance || 0) / SCAN_COST) > 10 
                              ? (theme === 'dark' ? 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                              : Math.floor((user?.balance || 0) / SCAN_COST) > 0
                                ? (theme === 'dark' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100')
                                : (theme === 'dark' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 hover:bg-rose-100')
                          }`}
                        >
                          Recharge ($10 / 100 Scans)
                        </button>
                      </div>
                      
                      <div className="p-2">
                        <button 
                          onClick={handleLogout}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${theme === 'dark' ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}`}
                        >
                          <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
                            <LogOut className="w-3.5 h-3.5" />
                          </div>
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
              <Activity className="w-4 h-4" /> <span className="hidden sm:inline">SCAN ALL</span>
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
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl border-t border-l font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap shadow-2xl active:scale-95 ${
                theme === 'dark' 
                  ? 'bg-blue-600 hover:bg-blue-500 border-white/10 shadow-blue-900/40 text-white hover:brightness-110' 
                  : 'bg-blue-600 hover:bg-blue-700 border-white/20 shadow-blue-500/30 text-white hover:brightness-110'
              }`}
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
              {filteredSymbols.map((symbol, index) => (
                <MarketCard 
                  key={symbol.id}
                  symbol={symbol}
                  analysis={state.analyses[symbol.id]}
                  onRefresh={handleAnalyze}
                  onRefreshPrice={handleRefreshPrice}
                  onRemove={handleRemoveSymbol}
                  showHint={index === 0 && Object.keys(state.analyses).length === 0 && searchQuery === ''}
                />
              ))}
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={state.symbols.map(s => s.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {state.symbols.map((symbol, index) => (
                    <MarketCard 
                      key={symbol.id}
                      symbol={symbol}
                      analysis={state.analyses[symbol.id]}
                      onRefresh={handleAnalyze}
                      onRefreshPrice={handleRefreshPrice}
                      onRemove={handleRemoveSymbol}
                      isSortable={true}
                      showHint={index === 0 && Object.keys(state.analyses).length === 0}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {filteredSymbols.length === 0 && (
          <div className={`col-span-full py-24 flex flex-col items-center justify-center rounded-[3rem] border border-dashed ${theme === 'dark' ? 'text-slate-500 bg-slate-900/30 border-slate-800' : 'text-slate-400 bg-slate-100/50 border-slate-200'}`}>
            <Globe className="w-16 h-16 mb-6 opacity-10" />
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Market Silence</p>
            <p className="text-sm max-w-xs text-center mt-2 text-slate-500">No symbols matching your search. Add a new ticker symbol to start the pulse scan.</p>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="mt-8 bg-blue-600 text-white border-t border-l border-white/20 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 active:scale-95"
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
                  Login with Google to unlock tracking and advanced AI insights. Each account is limited to 100 scans, bound by your IP address.
                </p>
              </div>

              <div id="google-login-btn" className="flex justify-center py-4"></div>

              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-emerald-500 dark:hover:text-white uppercase tracking-widest transition-colors"
              >
                Close
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
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Name</label>
                      <input 
                        type="text"
                        placeholder="Name"
                        value={supportUserName}
                        onChange={(e) => setSupportUserName(e.target.value)}
                        disabled={isSendingSupport}
                        className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Email</label>
                      <input 
                        type="email"
                        placeholder="Email"
                        value={supportUserEmail}
                        onChange={(e) => setSupportUserEmail(e.target.value)}
                        disabled={isSendingSupport}
                        className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">App</label>
                    <input 
                      type="text"
                      placeholder="App"
                      value={supportAppName}
                      onChange={(e) => setSupportAppName(e.target.value)}
                      disabled={isSendingSupport}
                      className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Message</label>
                    <textarea 
                      placeholder="Describe your issue or feedback here..."
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      disabled={isSendingSupport}
                      className={`w-full h-32 p-4 rounded-2xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>
                </div>
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
