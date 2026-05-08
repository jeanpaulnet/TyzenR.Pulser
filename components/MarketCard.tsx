
import React from 'react';
import { MarketAsset, MarketType, PulserAnalysis, Sentiment } from '../types';
import { SENTIMENT_COLORS } from '../constants';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink, AlertCircle, Clock, Calendar, BarChart3 } from 'lucide-react';

interface MarketCardProps {
  asset: MarketAsset;
  analysis?: PulserAnalysis;
  onRefresh: (asset: MarketAsset) => void;
  onRemove: (id: string) => void;
}

const MarketCard: React.FC<MarketCardProps> = ({ asset, analysis, onRefresh, onRemove }) => {
  const isAnalyzing = analysis?.isAnalyzing;

  const getSentimentIcon = (rec: Sentiment) => {
    switch (rec) {
      case Sentiment.BUY: return <TrendingUp className="w-3 h-3" />;
      case Sentiment.SELL: return <TrendingDown className="w-3 h-3" />;
      case Sentiment.HOLD: return <Minus className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const TrendBadge = ({ title, trend, icon }: { title: string, trend: Sentiment, icon: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 flex-1">
      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
        {icon} {title}
      </span>
      <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold tracking-wide shadow-sm transition-all ${SENTIMENT_COLORS[trend]}`}>
        {getSentimentIcon(trend)}
        {isAnalyzing ? '...' : trend}
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] hover:border-purple-400 dark:hover:border-purple-500/50 transition-all group relative overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-2xl flex flex-col">
      {/* Header Area */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 dark:from-slate-800 dark:to-slate-900 px-6 py-5 relative border-b dark:border-slate-800/50">
        {/* Live Indicator */}
        {analysis?.currentPrice && !isAnalyzing && (
          <div className="absolute top-0 right-0 p-2">
            <div className="bg-white/20 dark:bg-emerald-500/10 border border-white/30 dark:border-emerald-500/20 rounded-bl-2xl px-3 py-1 flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-white dark:bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-white dark:text-emerald-400">REALTIME</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <h3 className="text-2xl font-black text-white group-hover:text-purple-100 dark:group-hover:text-emerald-400 transition-colors">
                {asset.symbol}
              </h3>
              {analysis?.currentPrice && !isAnalyzing && (
                <span className="text-xl font-bold text-white pb-0.5">
                  {asset.region === 'INDIA' ? '₹' : '$'}{analysis.currentPrice}
                </span>
              )}
            </div>
            <p className="text-xs text-purple-100 dark:text-slate-400 truncate max-w-[140px] font-medium">{asset.name}</p>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onRefresh(asset)}
              disabled={isAnalyzing}
              className="p-2 hover:bg-white/10 dark:hover:bg-slate-700 rounded-xl transition-colors text-white/70 dark:text-slate-500 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400' : ''}`} style={isAnalyzing ? { color: 'initial', backgroundImage: 'linear-gradient(to right, #fb7185, #fbbf24, #34d399)', WebkitBackgroundClip: 'text', backgroundClip: 'text' } : {}} />
            </button>
            <button 
              onClick={() => onRemove(asset.id)}
              className="p-2 hover:bg-rose-500/20 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-white/70 dark:text-slate-500 hover:text-rose-200 dark:hover:text-rose-400"
            >
              <span className="text-xs font-bold px-1">✕</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 pt-5 flex-1 flex flex-col">
        {/* Dual Trends */}
        <div className="flex gap-3 mb-6">
          <TrendBadge 
            title="Short Term" 
            trend={analysis?.shortTermTrend || Sentiment.NEUTRAL} 
            icon={<Clock className="w-3 h-3" />}
          />
          <TrendBadge 
            title="Long Term" 
            trend={analysis?.longTermTrend || Sentiment.NEUTRAL} 
            icon={<Calendar className="w-3 h-3" />}
          />
        </div>

        {analysis && !isAnalyzing ? (
          <div className="space-y-4 flex-1 flex flex-col">
            <div>
               <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest font-black">AI Confidence</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{analysis.confidenceScore}%</span>
               </div>
               <div className="w-full bg-slate-200 dark:bg-slate-700/30 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-700 ease-out rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500"
                    style={{ width: `${analysis.confidenceScore}%` }}
                  />
               </div>
            </div>

            <div className="relative flex-1">
              <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4 min-h-[4.5rem] italic">
                "{analysis.summary}"
              </p>
            </div>

            {analysis.sources?.length ? analysis.sources.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/40">
                <span className="text-[9px] text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] font-black block mb-2.5">Global Intelligence Sources</span>
                <div className="flex flex-wrap gap-2">
                  {analysis.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-emerald-400 transition-colors bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 px-2.5 py-1.5 rounded-lg"
                    >
                      {(source.title?.length || 0) > 15 ? source.title.substring(0, 15) + '...' : source.title}
                      <ExternalLink className="w-2 h-2 opacity-50" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            
            {analysis.lastUpdated && (
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/40">
                 <a 
                   href={`https://www.tradingview.com/symbols/${asset.region === 'INDIA' ? 'NSE' : (asset.type === MarketType.CRYPTO ? 'BINANCE' : 'NASDAQ')}-${asset.symbol.replace('.NS', '')}${asset.type === MarketType.CRYPTO && !asset.symbol.includes('USD') && !asset.symbol.includes('USDT') ? 'USDT' : ''}/technicals/`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 dark:text-emerald-400 hover:text-indigo-700 dark:hover:text-emerald-300 transition-colors bg-indigo-500/10 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-emerald-500/20"
                 >
                   <BarChart3 className="w-2.5 h-2.5" />
                   CHART
                 </a>
                 <div className="text-[9px] text-slate-500 dark:text-slate-600 font-bold">
                    SYNCED: {new Date(analysis.lastUpdated).toLocaleTimeString()}
                 </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 flex flex-col items-center justify-center space-y-4 border border-dashed rounded-3xl bg-slate-900/10 transition-colors duration-300 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/50 dark:bg-slate-900/10">
            <div className="relative">
              <RefreshCw className={`w-8 h-8 animate-spin bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent`} />
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-emerald-500/20 blur-xl rounded-full animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
                {isAnalyzing ? 'Synthesizing Markets' : 'Intelligence Offline'}
              </p>
              {isAnalyzing && <p className="text-[9px] text-slate-500 dark:text-slate-700 mt-1">Checking Reuters, Bloomberg, WSJ...</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketCard;
