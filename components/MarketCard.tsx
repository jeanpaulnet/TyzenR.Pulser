
import React from 'react';
import { MarketAsset, PulserAnalysis, Sentiment } from '../types';
import { SENTIMENT_COLORS } from '../constants';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

interface MarketCardProps {
  asset: MarketAsset;
  analysis?: PulserAnalysis;
  onRefresh: (asset: MarketAsset) => void;
  onRemove: (id: string) => void;
}

const MarketCard: React.FC<MarketCardProps> = ({ asset, analysis, onRefresh, onRemove }) => {
  const isAnalyzing = analysis?.isAnalyzing;
  const rec = analysis?.recommendation || Sentiment.NEUTRAL;
  const colorClass = SENTIMENT_COLORS[rec];

  const getIcon = () => {
    if (isAnalyzing) return <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />;
    switch (rec) {
      case Sentiment.BUY: return <TrendingUp className="w-5 h-5" />;
      case Sentiment.SELL: return <TrendingDown className="w-5 h-5" />;
      case Sentiment.HOLD: return <Minus className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-slate-500 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
            {asset.symbol}
          </h3>
          <p className="text-sm text-slate-400 truncate max-w-[150px]">{asset.name}</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => onRefresh(asset)}
            disabled={isAnalyzing}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => onRemove(asset.id)}
            className="p-2 hover:bg-rose-500/20 rounded-lg transition-colors text-slate-400 hover:text-rose-400"
          >
            <span className="text-xs font-bold">X</span>
          </button>
        </div>
      </div>

      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-semibold mb-6 ${colorClass}`}>
        {getIcon()}
        {isAnalyzing ? 'Analyzing...' : rec}
      </div>

      {analysis && !isAnalyzing ? (
        <div className="space-y-4">
          <div>
             <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Confidence</span>
                <span className="text-sm font-medium">{analysis.confidenceScore}%</span>
             </div>
             <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    analysis.confidenceScore > 70 ? 'bg-emerald-500' : analysis.confidenceScore > 40 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${analysis.confidenceScore}%` }}
                />
             </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
            {analysis.summary}
          </p>

          {analysis.sources.length > 0 && (
            <div className="pt-4 border-t border-slate-700/50">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2">Sources</span>
              <div className="flex flex-wrap gap-2">
                {analysis.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-2 py-1 rounded"
                  >
                    {source.title.substring(0, 15)}... <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-[10px] text-slate-500 text-right mt-2">
             Updated: {new Date(analysis.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center text-slate-500 space-y-2 border-2 border-dashed border-slate-700/50 rounded-xl">
          <RefreshCw className={`w-8 h-8 ${isAnalyzing ? 'animate-spin' : 'opacity-20'}`} />
          <p className="text-xs">{isAnalyzing ? 'Pulser is scanning markets...' : 'Awaiting manual scan'}</p>
        </div>
      )}
    </div>
  );
};

export default MarketCard;
