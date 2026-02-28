
import React from 'react';
import { MarketAsset, PulserAnalysis, Sentiment } from '../types';
import { SENTIMENT_COLORS } from '../constants';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink, AlertCircle, Clock, Calendar } from 'lucide-react';

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
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-6 hover:border-slate-500 transition-all group relative overflow-hidden backdrop-blur-sm">
      {/* Live Indicator */}
      {analysis?.currentPrice && !isAnalyzing && (
        <div className="absolute top-0 right-0 p-2">
           <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-bl-2xl px-3 py-1 flex items-center gap-1.5 shadow-sm">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-bold text-emerald-400">REALTIME</span>
           </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <div className="flex items-baseline gap-3">
            <h3 className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">
              {asset.symbol}
            </h3>
            {analysis?.currentPrice && !isAnalyzing && (
              <span className="text-xl font-bold text-emerald-400">
                {analysis.currencySymbol}{analysis.currentPrice}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate max-w-[140px] font-medium">{asset.name}</p>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onRefresh(asset)}
            disabled={isAnalyzing}
            className="p-2 hover:bg-slate-700 rounded-xl transition-colors text-slate-500 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => onRemove(asset.id)}
            className="p-2 hover:bg-rose-500/10 rounded-xl transition-colors text-slate-500 hover:text-rose-400"
          >
            <span className="text-xs font-bold px-1">✕</span>
          </button>
        </div>
      </div>

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
        <div className="space-y-4">
          <div>
             <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">AI Confidence</span>
                <span className="text-xs font-bold text-slate-300">{analysis.confidenceScore}%</span>
             </div>
             <div className="w-full bg-slate-700/30 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ease-out rounded-full ${
                    analysis.confidenceScore > 75 ? 'bg-emerald-500' : analysis.confidenceScore > 45 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${analysis.confidenceScore}%` }}
                />
             </div>
          </div>

          <div className="relative">
            <p className="text-[13px] text-slate-400 leading-relaxed line-clamp-4 min-h-[4.5rem] italic">
              "{analysis.summary}"
            </p>
          </div>

          {analysis.sources?.length ? analysis.sources.length > 0 && (
            <div className="pt-4 border-t border-slate-700/40">
              <span className="text-[9px] text-slate-600 uppercase tracking-[0.2em] font-black block mb-2.5">Global Intelligence Sources</span>
              <div className="flex flex-wrap gap-2">
                {analysis.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-emerald-400 transition-colors bg-slate-900/40 border border-slate-700/50 px-2.5 py-1.5 rounded-lg"
                  >
                    {(source.title?.length || 0) > 15 ? source.title.substring(0, 15) + '...' : source.title}
                    <ExternalLink className="w-2 h-2 opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          
          {analysis.lastUpdated && (
            <div className="text-[9px] text-slate-600 text-right font-bold mt-2">
               SYNCED: {new Date(analysis.lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </div>
      ) : (
        <div className="h-44 flex flex-col items-center justify-center text-slate-500 space-y-4 border border-dashed border-slate-700/50 rounded-3xl bg-slate-900/10">
          <div className="relative">
            <RefreshCw className={`w-8 h-8 ${isAnalyzing ? 'animate-spin text-emerald-500' : 'opacity-10'}`} />
            {isAnalyzing && <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />}
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
              {isAnalyzing ? 'Synthesizing Markets' : 'Intelligence Offline'}
            </p>
            {isAnalyzing && <p className="text-[9px] text-slate-700 mt-1">Checking Reuters, Bloomberg, WSJ...</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketCard;
