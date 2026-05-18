
import React from 'react';
import { createPortal } from 'react-dom';
import { MarketSymbol, PulserAnalysis, MarketType } from '../types';
import { X, TrendingUp, BarChart, Info, Users, Zap, Search, Activity, Target, ExternalLink, Newspaper, RefreshCw, Clock, Share2, Check } from 'lucide-react';
import { BarChart as ReChartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, AreaChart, Area } from 'recharts';

interface SnapshotModalProps {
  symbol: MarketSymbol;
  analysis?: PulserAnalysis;
  onClose: () => void;
  onRefresh: () => void;
}

const SnapshotModal: React.FC<SnapshotModalProps> = ({ symbol, analysis, onClose, onRefresh }) => {
  const snapshot = analysis?.snapshot;

  // Sort growth data chronologically
  const growthData = [...(snapshot?.growthData || [])].sort((a, b) => {
    // Basic sorting for years
    return a.year.localeCompare(b.year);
  });
  const peers = snapshot?.peers || [];
  const expansionPlans = snapshot?.expansionPlans || [];

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lookedUpExchangeSymbol, setLookedUpExchangeSymbol] = React.useState<string | null>(null);
  const [showCopied, setShowCopied] = React.useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Pulser AI - ${symbol.symbol} Snapshot`,
          text: `Check out the AI-powered market pulse and snapshot for ${symbol.symbol} on Pulser AI.`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  React.useEffect(() => {
    const lookupSymbol = async () => {
      try {
        const stock = symbol.symbol;
        const country = symbol.region || 'GLOBAL';
        const response = await fetch(`https://webapi.tyzenr.com/pulser/symbol/lookup/${stock}/${country}`);
        if (response.ok) {
          const data = await response.text();
          if (data && data.includes(':')) {
            setLookedUpExchangeSymbol(data.trim());
          }
        }
      } catch (error) {
        console.error('Symbol lookup failed:', error);
      }
    };

    lookupSymbol();
  }, [symbol]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // We don't set isRefreshing to false here because the component 
      // should re-render with analysis.isAnalyzing=true from props
      // and hide this whole view. But as a fallback:
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const hasData = !!snapshot;

  const getTradingViewExchangeSymbol = () => {
    if (lookedUpExchangeSymbol) return lookedUpExchangeSymbol;
    
    let tvTicker = snapshot?.tradingViewTicker;
    
    if (!tvTicker) {
      const base = symbol.symbol.split(/[.\-]/)[0];
      // Common overrides
      const overrides: Record<string, string> = {
        'NVIDIA': 'NVDA',
        'GOOGLE': 'GOOGL',
        'RELIANCE': 'RELIANCE',
        'TATASTEEL': 'TATASTEEL'
      };
      tvTicker = overrides[base.toUpperCase()] || base;
    }

    const exchange = symbol.region === 'INDIA' 
      ? (symbol.symbol.endsWith('.BO') ? 'BSE' : 'NSE') 
      : (symbol.type === MarketType.CRYPTO ? 'BINANCE' : 'NASDAQ');

    return `${exchange}:${tvTicker}`;
  };

  const exchangeSymbol = getTradingViewExchangeSymbol();

  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const theme = isDarkMode ? 'dark' : 'light';

  const PriceChart: React.FC<{ analysis?: PulserAnalysis; theme: 'light' | 'dark' }> = ({ analysis, theme }) => {
    const [range, setRange] = React.useState<'1M' | '1Y' | '5Y'>('1Y');
    const historicalData = React.useMemo(() => {
      const data = analysis?.snapshot?.historicalData?.[range] || [];
      return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [analysis, range]);

    const ranges: { label: string; value: '1M' | '1Y' | '5Y' }[] = [
      { label: '1M', value: '1M' },
      { label: '1Y', value: '1Y' },
      { label: '5Y', value: '5Y' }
    ];

    const currencySymbol = analysis?.currencySymbol || (symbol.region === 'INDIA' ? '₹' : '$');

    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Price Chart</h3>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {ranges.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                  range === r.value 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[150px] w-full">
          {historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "rgba(71, 85, 105, 0.2)" : "rgba(226, 232, 240, 0.5)"} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 'bold' }}
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    if (range === '1M') return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                  }}
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 'bold' }}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `${currencySymbol}${val.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', 
                    border: 'none', 
                    borderRadius: '12px', 
                    color: theme === 'dark' ? '#fff' : '#1e293b',
                    fontSize: '11px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: any) => [`${currencySymbol}${value.toLocaleString()}`, 'Price']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2">
              <Activity className="w-8 h-8 opacity-20 animate-pulse" />
              <p className="italic opacity-60">Syncing historical Google Finance data...</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getRatingColor = (rating: string) => {
    const r = rating.toLowerCase();
    if (r.includes('buy') || r.includes('outperform') || r.includes('overweight') || r.includes('positive')) return 'text-emerald-500';
    if (r.includes('sell') || r.includes('underperform') || r.includes('underweight') || r.includes('negative')) return 'text-rose-500';
    return 'text-slate-500 dark:text-slate-400';
  };

  const getRatingBadgeClass = (rating: string) => {
    const r = rating.toLowerCase();
    if (r.includes('buy') || r.includes('outperform') || r.includes('overweight') || r.includes('positive')) return 'bg-emerald-500/10 border-emerald-500/20';
    if (r.includes('sell') || r.includes('underperform') || r.includes('underweight') || r.includes('negative')) return 'bg-rose-500/10 border-rose-500/20';
    return 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800/40';
  };

  const isPulserDomain = typeof window !== 'undefined' && window.location.hostname === 'pulser.tyzenr.com';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 pointer-events-auto">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-7xl h-[98vh] max-h-[98vh] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        {/* Loading Overlay */}
        {(analysis?.isAnalyzing || isRefreshing) && (
          <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-md px-6 text-center animate-in fade-in duration-500">
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <Activity className="absolute inset-0 m-auto w-10 h-10 text-indigo-500 animate-pulse" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{analysis?.status || "Pulsing Intelligence..."}</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
              Synchronizing with global markets and synthesizing deep-dive metrics for {symbol.symbol}.
            </p>
          </div>
        )}

        {!hasData && !analysis?.isAnalyzing && !isRefreshing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-6 text-center">
            <Search className="w-16 h-16 text-indigo-500 mb-4 opacity-50" />
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">No Deep-Dive Data</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              This symbol requires a fresh intelligence pulse to generate a comprehensive snapshot.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
              >
                Close
              </button>
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-8 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    REFRESHING...
                  </>
                ) : (
                  'REFRESH NOW'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-8 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
               <Activity className="text-white w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                {symbol.symbol} 
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing || analysis?.isAnalyzing}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-indigo-500 disabled:opacity-50"
                  title="Refresh Intelligence Pulse"
                >
                  <RefreshCw className={`w-4 h-4 ${(isRefreshing || analysis?.isAnalyzing) ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
                {analysis?.fromCache && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-lg">
                    <Clock className="w-2.5 h-2.5 text-amber-500" />
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">24H CACHE</span>
                  </div>
                )}
                <span className="text-slate-400 dark:text-slate-500 font-medium text-xs truncate hidden sm:inline">— {symbol.name}</span>
                {snapshot?.marketCap && (
                  <div className="ml-2 px-2 py-0.5 bg-slate-500/10 dark:bg-slate-500/20 rounded-lg border border-slate-500/20 flex items-center gap-2">
                    <span className="text-[7px] text-slate-400 uppercase font-black tracking-tighter">MCAP</span>
                    <span className={`text-[11px] font-black ${
                      (snapshot.marketCap.toUpperCase().includes('T') || 
                       snapshot.marketCap.toUpperCase().includes('TRILLION') ||
                       (parseFloat(snapshot.marketCap.replace(/[^0-9.]/g, '')) >= 1000 && snapshot.marketCap.toUpperCase().includes('B')))
                      ? 'text-rose-500' 
                      : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {snapshot.marketCap}
                    </span>
                  </div>
                )}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
              <span className="text-sm font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-[0.3em]">
                PULSER AI
              </span>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 pt-0 bg-slate-50/30 dark:bg-slate-950/20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1 */}
            <div className="space-y-6">
              {/* Value Investing */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Value Investing</h3>
                  </div>
                  <div className="px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl border border-indigo-500/20 flex items-center gap-2">
                    <span className="text-[8px] text-indigo-400 dark:text-indigo-400 uppercase font-black">CMP</span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {analysis?.currencySymbol || (symbol.region === 'INDIA' ? '₹' : '$')}{snapshot?.cmp || analysis?.currentPrice || '—'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-black mb-0.5">PE Ratio</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{snapshot?.peRatio || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-black mb-0.5">PB Ratio</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{snapshot?.pbRatio || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-black mb-0.5">Growth 3Y</p>
                    <p className="text-sm font-bold text-blue-500">{snapshot?.growthRate3Y || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-black mb-0.5">Growth 5Y</p>
                    <p className="text-sm font-bold text-blue-500">{snapshot?.growthRate5Y || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-black mb-0.5">ROE</p>
                    <p className="text-sm font-bold text-emerald-500">{snapshot?.roe || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-black mb-0.5">ROCE</p>
                    <p className="text-sm font-bold text-emerald-500">{snapshot?.roce || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-black mb-0.5">Debt / Equity</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{snapshot?.debtToEquity || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-black mb-0.5">Margin of Safety</p>
                    <p className="text-sm font-bold text-emerald-500">{snapshot?.marginOfSafety || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[9px] text-emerald-500 uppercase font-black mb-0.5">52W High</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{snapshot?.high52w || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[9px] text-rose-500 uppercase font-black mb-0.5">52W Low</p>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{snapshot?.low52w || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Technical Analysis with 200D MA */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Technical Analysis</h3>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center">
                       <span className="text-[8px] font-black text-slate-400 uppercase">200 MA</span>
                       <span className="text-[10px] font-bold text-indigo-500">{snapshot?.ma200 || '—'}</span>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center">
                       <span className="text-[8px] font-black text-slate-400 uppercase">100 MA</span>
                       <span className="text-[10px] font-bold text-indigo-500">{snapshot?.ma100 || '—'}</span>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center">
                       <span className="text-[8px] font-black text-slate-400 uppercase">50 MA</span>
                       <span className="text-[10px] font-bold text-indigo-500">{snapshot?.ma50 || '—'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className="text-xs font-medium text-slate-500">RSI (14)</span>
                    <span className="text-xs font-bold text-amber-500">{snapshot?.rsi || '—'}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] leading-relaxed text-slate-500 italic mb-3">
                      {snapshot?.technicalCommentary || '"Technical data pending fresh pulse scan."'}
                    </p>
                    <a 
                      href={`https://www.tradingview.com/symbols/${exchangeSymbol}/technicals/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 py-2.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                    >
                      More Technicals <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-slate-500/10 rounded-xl text-slate-500">
                    <Info className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 capitalize">About</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {snapshot?.about || `${symbol.name} is an asset being tracked for pulse sentiment. Background data pending update.`}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                   <div>
                      <p className="text-[9px] uppercase font-black text-slate-400">Founded</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{snapshot?.founded || '—'}</p>
                   </div>
                   <div>
                      <p className="text-[9px] uppercase font-black text-slate-400">Employees</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{snapshot?.employees || '—'}</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-6">
              {/* Price Chart */}
              <PriceChart analysis={analysis} theme={theme} />

              {/* Growth Chart with bars */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-auto lg:min-h-[180px]">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                      <BarChart className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Growth Chart</h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">REVENUE & PROFIT (BILLIONS {symbol.region === 'INDIA' ? '₹' : '$'})</span>
                </div>
                
                <div className="w-full h-[154px] mt-0">
                  {growthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsBarChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155 opacity-20" />
                        <XAxis 
                          dataKey="year" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: 'none', 
                            borderRadius: '12px', 
                            color: '#fff',
                            fontSize: '12px'
                          }}
                          cursor={{ fill: 'rgba(51, 65, 85, 0.1)' }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          iconSize={10}
                          wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingBottom: '15px' }}
                        />
                        <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]} barSize={20}>
                          {growthData.map((entry, index) => (
                            <Cell key={`cell-profit-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </ReChartsBarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
                      Revenue trend data unavailable
                    </div>
                  )}
                </div>
              </div>

              {/* Expansion Plans */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                    <Target className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Expansion Plans</h3>
                </div>
                <div className="space-y-3">
                  {expansionPlans.length > 0 ? expansionPlans.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{item.plan}</p>
                        <p className="text-[9px] font-bold text-purple-500 uppercase mt-1">{item.date}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-500 italic">Strategic roadmap data pending.</p>
                  )}
                </div>
              </div>

              </div>

            {/* Column 3 */}
            <div className="space-y-6">
              {/* Analyst Views */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                      <Search className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Analyst Views</h3>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  {snapshot?.analystViews && snapshot.analystViews.length > 0 ? snapshot.analystViews.slice(0, 3).map((view, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border transition-colors ${getRatingBadgeClass(view.rating)}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-black uppercase text-indigo-500">{view.firm}</span>
                        <span className="text-[9px] font-bold text-slate-400">{view.date}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold capitalize ${getRatingColor(view.rating)}`}>{view.rating}</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">{view.targetPrice}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-500 italic">No recent analyst projections found.</p>
                  )}
                </div>
                
                <a 
                  href={`https://www.tipranks.com/stocks/${symbol.symbol}/forecast`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  TIPRANKS FORECAST <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Peers & PE */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Peers & Comparison</h3>
                </div>
                <div className="space-y-3">
                  {peers.length > 0 ? (
                    <>
                      <div className="space-y-2">
                        {peers.map((peer, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex justify-between items-center group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{peer.name}</p>
                              <p className="text-[9px] text-slate-500 font-medium">{peer.marketCap}</p>
                            </div>
                            <div className="flex gap-4 text-right">
                              <div>
                                <p className="text-[8px] uppercase font-black text-slate-400">P/E</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{peer.pe}</p>
                              </div>
                              <div>
                                <p className="text-[8px] uppercase font-black text-slate-400">P/B</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{peer.pb || '—'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {snapshot?.peerComparison && (
                        <div className="mt-4 p-4 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-2xl border border-indigo-500/10">
                          <p className="text-[10px] font-black uppercase text-indigo-500 mb-2">Peer Comparison Analysis</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            {snapshot.peerComparison}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 italic pb-2">Competitor metrics pending.</p>
                  )}
                </div>
              </div>

              {/* Latest News Section */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col gap-1 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
                      <Newspaper className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Latest Intelligence</h3>
                  </div>
                  <p className="text-[9px] font-black uppercase text-rose-500 tracking-tighter opacity-80">Focus: Last 48 Hours</p>
                </div>
                <div className="space-y-3">
                  {snapshot?.news && snapshot.news.length > 0 ? snapshot.news.map((item, idx) => (
                    <a 
                      key={idx} 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ExternalLink className="w-2.5 h-2.5 text-indigo-500" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {item.title}
                      </p>
                      <div className="mt-2 flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {item.date}
                        </span>
                        {/* Optional: Add "NEW" tag if date mentions "hours ago" or "today" */}
                        {(item.date.toLowerCase().includes('hour') || item.date.toLowerCase().includes('today') || item.date.toLowerCase().includes('1 day')) && (
                          <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-md text-[8px] animate-pulse">NEW</span>
                        )}
                      </div>
                    </a>
                  )) : (
                    <p className="text-xs text-slate-500 italic px-2">No recent headlines found for this asset within the last 48 hours.</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
           <div className="flex flex-col gap-0.5">
             <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">
               Analyzed using Pulser AI Global Search grounding • Synced: {analysis?.lastUpdated ? new Date(analysis.lastUpdated).toLocaleString() : 'Just now'}
             </p>
             {isPulserDomain && (
               <p className="text-[9px] font-black tracking-widest text-indigo-500 uppercase">
                 pulser.tyzenr.com
               </p>
             )}
           </div>
           <div className="flex gap-4">
              <button 
                onClick={handleShare}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  showCopied 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-500/20'
                }`}
              >
                {showCopied ? (
                  <>
                    <Check className="w-3 h-3" /> COPIED
                  </>
                ) : (
                  <>
                    <Share2 className="w-3 h-3" /> SHARE
                  </>
                )}
              </button>
              <button 
                onClick={onClose}
                className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-80 transition-all"
              >
                CLOSE
              </button>
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SnapshotModal;
