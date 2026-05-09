
import React from 'react';
import { createPortal } from 'react-dom';
import { MarketSymbol, PulserAnalysis } from '../types';
import { X, TrendingUp, BarChart, Info, Users, Zap, Search, Activity, Target, ExternalLink, Newspaper } from 'lucide-react';
import { BarChart as ReChartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

  const hasData = !!snapshot;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-10 pointer-events-auto">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-7xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        {!hasData && !analysis?.isAnalyzing && (
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
                onClick={() => {
                  onRefresh();
                  onClose();
                }}
                className="px-8 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
              >
                REFRESH NOW
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
               <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                {symbol.symbol} <span className="text-slate-400 dark:text-slate-500 font-medium text-lg">— {symbol.name}</span>
              </h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Deep-Dive Market Snapshot</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 dark:bg-slate-950/20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1 */}
            <div className="space-y-6">
              {/* Value Investing */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Value Investing</h3>
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
                      href={`https://www.tradingview.com/symbols/${symbol.region === 'INDIA' ? 'NSE' : (symbol.type === 'CRYPTO' ? 'BINANCE' : 'NASDAQ')}:${symbol.symbol.replace('.NS', '')}/technicals/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 py-2.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                    >
                      More Analysis <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-6">
              {/* Growth Chart with bars */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full lg:min-h-[400px]">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                      <BarChart className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Growth Chart</h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">REVENUE (BILLIONS {symbol.region === 'INDIA' ? '₹' : '$'})</span>
                </div>
                
                <div className="flex-1 w-full min-h-[250px]">
                  {growthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsBarChart data={growthData}>
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
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={40}>
                          {growthData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === growthData.length - 1 ? '#8b5cf6' : '#3b82f6'} />
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
                  {expansionPlans.length > 0 ? expansionPlans.map((plan, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                      <p className="text-xs text-slate-600 dark:text-slate-400">{plan}</p>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-500 italic">Strategic roadmap data pending.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-6">
              {/* About Company */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-slate-500/10 rounded-xl text-slate-500">
                    <Info className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">About Company</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {snapshot?.about || `${symbol.name} is a market asset being tracked for pulse sentiment. Background data pending update.`}
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

              {/* Peers & PE */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Peers & Comparison</h3>
                </div>
                <div className="space-y-3">
                  {peers.length > 0 ? peers.map((peer, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex justify-between items-center group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{peer.name}</p>
                        <p className="text-[9px] text-slate-500 font-medium">{peer.marketCap}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase font-black text-slate-400 mb-0.5">P/E Ratio</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{peer.pe}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-500 italic pb-2">Competitor metrics pending.</p>
                  )}
                </div>
              </div>

              {/* Latest News Section */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
                    <Newspaper className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Latest Intelligence</h3>
                </div>
                <div className="space-y-3">
                  {snapshot?.news && snapshot.news.length > 0 ? snapshot.news.map((item, idx) => (
                    <a 
                      key={idx} 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                    >
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {item.title}
                      </p>
                      <div className="mt-2 flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                        <span>{item.date}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  )) : (
                    <p className="text-xs text-slate-500 italic">No recent headlines found for this asset.</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
           <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">
             Analyzed using Pulser AI Global Search grounding • Synced: {analysis?.lastUpdated ? new Date(analysis.lastUpdated).toLocaleString() : 'Just now'}
           </p>
           <div className="flex gap-4">
              <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">Export PDF</button>
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
