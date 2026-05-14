
import React, { useState } from 'react';
import { MarketSymbol, MarketType, PulserAnalysis, Sentiment } from '../types';
import { SENTIMENT_COLORS } from '../constants';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink, AlertCircle, Clock, Calendar, BarChart3, Fingerprint, GripVertical, ChevronRight } from 'lucide-react';
import SnapshotModal from './SnapshotModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';

interface MarketCardProps {
  symbol: MarketSymbol;
  analysis?: PulserAnalysis;
  onRefresh: (symbol: MarketSymbol) => void;
  onRefreshPrice?: (symbol: MarketSymbol) => void;
  onRemove: (id: string) => void;
  isSortable?: boolean;
  showHint?: boolean;
}

const MarketCard: React.FC<MarketCardProps> = ({ symbol: marketSymbol, analysis, onRefresh, onRefreshPrice, onRemove, isSortable, showHint }) => {
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const isAnalyzing = analysis?.isAnalyzing;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: marketSymbol.id, disabled: !isSortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

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

  const getHeaderGradient = () => {
    switch (marketSymbol.type) {
      case 'CRYPTO':
        return 'from-purple-600 to-indigo-700 dark:from-indigo-900 dark:to-slate-900';
      case 'COMMODITY':
        return 'from-emerald-600 to-teal-700 dark:from-emerald-900 dark:to-slate-900';
      case 'INDEX':
        return 'from-slate-700 to-slate-900 dark:from-slate-900 dark:to-black';
      case 'STOCK':
        if (marketSymbol.region === 'INDIA') {
          return 'from-orange-500 to-orange-600 dark:from-orange-900 dark:to-slate-900';
        }
        return 'from-blue-600 to-indigo-700 dark:from-blue-950 dark:to-slate-900';
      default:
        return 'from-purple-600 to-indigo-700 dark:from-slate-800 dark:to-slate-900';
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] hover:border-purple-400 dark:hover:border-slate-600 transition-all group relative overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-none flex flex-col ${isDragging ? 'shadow-2xl scale-[1.02] rotate-1' : ''}`}
    >
      {/* Header Area */}
      <div 
        className={`bg-gradient-to-br ${getHeaderGradient()} px-6 py-5 relative border-b dark:border-slate-800/40`}
      >
        {/* Drag Handle */}
        {isSortable && (
          <div 
            className="absolute left-2 top-0 bottom-0 w-10 flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-white" />
          </div>
        )}

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
                {marketSymbol.symbol}
              </h3>
              {analysis?.currentPrice && !isAnalyzing && (
                <div className="flex items-center gap-1">
                  <span className="text-xl font-bold text-white pb-0.5">
                    {analysis.currencySymbol || (marketSymbol.region === 'INDIA' ? '₹' : '$')}{analysis.currentPrice}
                  </span>
                  {onRefreshPrice && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRefreshPrice(marketSymbol); }}
                      className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/50 hover:text-white"
                      title="Refresh Price Only"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-purple-100 dark:text-slate-500 truncate max-w-[140px] font-medium">{marketSymbol.name}</p>
          </div>
          
          <div className="flex items-center gap-1 relative">
            <motion.button 
              onClick={() => onRefresh(marketSymbol)}
              disabled={isAnalyzing}
              animate={showHint && !isAnalyzing ? {
                scale: [1, 1.1, 1],
                backgroundColor: [
                  'rgba(99, 102, 241, 0)',
                  'rgba(99, 102, 241, 0.2)',
                  'rgba(99, 102, 241, 0)'
                ]
              } : {}}
              transition={showHint && !isAnalyzing ? {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
              className="p-2 hover:bg-white/10 dark:hover:bg-white/5 rounded-xl transition-colors text-white/70 dark:text-slate-600 hover:text-white relative z-10"
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400' : ''}`} style={isAnalyzing ? { color: 'initial', backgroundImage: 'linear-gradient(to right, #fb7185, #fbbf24, #34d399)', WebkitBackgroundClip: 'text', backgroundClip: 'text' } : {}} />
              {showHint && !isAnalyzing && (
                <span className="absolute inset-0 rounded-xl border-2 border-indigo-500/50 animate-ping opacity-75" />
              )}
            </motion.button>
            <button 
              onClick={() => onRemove(marketSymbol.id)}
              className="p-2 hover:bg-rose-500/20 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-white/70 dark:text-slate-600 hover:text-rose-200 dark:hover:text-rose-400"
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
                  <span className="text-[10px] text-slate-500 dark:text-slate-600 uppercase tracking-widest font-black">AI Confidence</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{analysis.confidenceScore}%</span>
               </div>
               <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
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
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[9px] text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] font-black block mb-2.5">Global Intelligence Sources</span>
                <div className="flex flex-wrap gap-2">
                  {analysis.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold text-slate-600 dark:text-slate-500 hover:text-purple-600 dark:hover:text-emerald-400 transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg"
                    >
                      {(source.title?.length || 0) > 15 ? source.title.substring(0, 15) + '...' : source.title}
                      <ExternalLink className="w-2 h-2 opacity-50" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            
            {analysis.lastUpdated && (
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                 <button 
                   onClick={() => setIsSnapshotOpen(true)}
                   className="flex items-center gap-1.5 text-[9px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors bg-sky-500/10 dark:bg-sky-500/10 px-2.5 py-1.5 rounded-lg border border-sky-200 dark:border-sky-500/20"
                 >
                   <Fingerprint className="w-2.5 h-2.5" />
                   SNAPSHOT
                 </button>
                 <div className="text-[9px] text-slate-500 dark:text-slate-600 font-bold">
                    SYNCED: {new Date(analysis.lastUpdated).toLocaleTimeString()}
                 </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 flex flex-col items-center justify-center space-y-4 border border-dashed rounded-3xl bg-white/50 dark:bg-slate-950 transition-colors duration-300 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-800">
            <div className="relative">
              <RefreshCw className={`w-8 h-8 animate-spin bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent`} />
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-emerald-500/20 blur-xl rounded-full animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
                {isAnalyzing ? 'Synthesizing Markets' : 'Click Refresh to start AI Engine for this symbol'}
              </p>
              {isAnalyzing && <p className="text-[9px] text-slate-500 dark:text-slate-700 mt-1">Checking Reuters, Bloomberg, WSJ...</p>}
            </div>
          </div>
        )}
      </div>
      {isSnapshotOpen && (
        <SnapshotModal 
          symbol={marketSymbol}
          analysis={analysis}
          onClose={() => setIsSnapshotOpen(false)}
          onRefresh={() => onRefresh(marketSymbol)}
        />
      )}
    </div>
  );
};

export default MarketCard;
