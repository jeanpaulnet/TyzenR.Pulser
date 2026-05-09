
import React from 'react';
import { createPortal } from 'react-dom';
import { MarketSymbol, PulserAnalysis } from '../types';
import { X, TrendingUp, BarChart, Info, Users, Zap, Search, Activity, Target } from 'lucide-react';
import { BarChart as ReChartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SnapshotModalProps {
  symbol: MarketSymbol;
  analysis?: PulserAnalysis;
  onClose: () => void;
}

const SnapshotModal: React.FC<SnapshotModalProps> = ({ symbol, analysis, onClose }) => {
  const snapshot = analysis?.snapshot;

  // Fallbacks for data
  const growthData = snapshot?.growthData || [];
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
              This symbol requires a fresh intelligence pulse to generate a snapshot. Please close this modal and click "Refresh" on the card.
            </p>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 transition-all"
            >
              Back to Dashboard
            </button>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Intrinsic Value</p>
                    <p className="text-lg font-bold text-emerald-500">{snapshot?.intrinsicValue || '—'}</p>
                    <p className="text-[9px] text-slate-500">Fair Value Estimate</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[10px] text-slate-400 uppercase font-black mb-1">ROE</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{snapshot?.roe || '—'}</p>
                    <p className="text-[9px] text-slate-500">Efficiency Ratio</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Debt / Equity</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{snapshot?.debtToEquity || '—'}</p>
                    <p className="text-[9px] text-emerald-500">Leverage Level</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Margin of Safety</p>
                    <p className="text-lg font-bold text-emerald-500">{snapshot?.marginOfSafety || '—'}</p>
                    <p className="text-[9px] text-slate-500">Capital Risk Buffer</p>
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
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className="text-xs font-medium text-slate-500">200 Day MA</span>
                    <span className="text-xs font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-full">{snapshot?.ma200 || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className="text-xs font-medium text-slate-500">RSI (14)</span>
                    <span className="text-xs font-bold text-amber-500">{snapshot?.rsi || '—'}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] leading-relaxed text-slate-500 italic">
                      {snapshot?.technicalCommentary || '"Technical data pending fresh pulse scan."'}
                    </p>
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
