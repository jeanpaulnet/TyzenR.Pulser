import React, { useState, useRef, useEffect } from 'react';
import { MarketType, MarketSymbol } from '../types';
import { Plus, X, Globe, Landmark, Coins, LineChart, Loader2 } from 'lucide-react';
import { pulser } from '../services/pulserAgent';
import { searchLocalSymbols } from '../services/commonSymbols';

interface AddSymbolModalProps {
  onAdd: (symbol: MarketSymbol) => void;
  onClose: () => void;
  existingSymbols: MarketSymbol[];
}

interface FormColumn {
  id: string;
  symbol: string;
  companyName: string;
  type: MarketType;
  region: 'US' | 'INDIA' | 'GLOBAL';
  notes: string;
  error: string | null;
  suggestion: string | null;
  isFromSuggestion: boolean;
  searchSuggestions: { symbol: string; name: string; type: MarketType }[];
  isSearching: boolean;
  isValidating: boolean;
}

const createNewColumn = (): FormColumn => ({
  id: Math.random().toString(36).substring(2, 9),
  symbol: '',
  companyName: '',
  type: MarketType.STOCK,
  region: 'US',
  notes: '',
  error: null,
  suggestion: null,
  isFromSuggestion: false,
  searchSuggestions: [],
  isSearching: false,
  isValidating: false,
});

const AddSymbolModal: React.FC<AddSymbolModalProps> = ({ onAdd, onClose, existingSymbols }) => {
  const [columns, setColumns] = useState<FormColumn[]>([createNewColumn()]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalValidating, setGlobalValidating] = useState(false);

  useEffect(() => {
    // Lock scrolling on mounting the dialog to prevent body jumping / scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  const addColumn = () => {
    if (columns.length >= 5) {
      setGlobalError("You can add up to 5 symbols concurrently.");
      return;
    }
    setColumns(prev => [...prev, createNewColumn()]);
    setGlobalError(null);
  };

  const removeColumn = (id: string) => {
    if (columns.length > 1) {
      setColumns(prev => prev.filter(col => col.id !== id));
      setGlobalError(null);
    }
  };

  const handleUpdateColumn = (id: string, fields: Partial<FormColumn>) => {
    setColumns(prev => prev.map(col => col.id === id ? { ...col, ...fields } : col));
  };

  const handleSymbolSelect = (id: string, argSugg: { symbol: string; name: string; type: MarketType; region?: 'US' | 'INDIA' | 'GLOBAL' }) => {
    setColumns(prev => prev.map(col => col.id === id ? {
      ...col,
      symbol: argSugg.symbol,
      companyName: argSugg.name,
      type: argSugg.type,
      region: argSugg.region || col.region,
      searchSuggestions: [],
      isFromSuggestion: true,
      error: null
    } : col));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (globalValidating) return;

    setGlobalValidating(true);
    setGlobalError(null);

    let hasErrors = false;
    const updatedColumns = [...columns];

    // 0. Automatically add .NS suffix if India Stock & no dot is present, and then auto-resolve
    for (let i = 0; i < updatedColumns.length; i++) {
      const col = updatedColumns[i];
      let trimmedSymbol = col.symbol.trim();

      if (col.type === MarketType.STOCK && col.region === 'INDIA') {
        if (trimmedSymbol && !trimmedSymbol.includes('.')) {
          trimmedSymbol = trimmedSymbol + '.NS';
          col.symbol = trimmedSymbol; // update the input value so user can see it too
        }
      }

      if (trimmedSymbol && !col.isFromSuggestion) {
        const localMatches = searchLocalSymbols(trimmedSymbol, col.region);
        if (localMatches.length > 0) {
          const upper = trimmedSymbol.toUpperCase();
          const exactSymbolMatch = localMatches.find(m => m.symbol.toUpperCase() === upper);
          const exactNameMatch = localMatches.find(m => m.name.toUpperCase() === upper);
          const startsWithNameMatch = localMatches.find(m => m.name.toUpperCase().startsWith(upper));
          
          const bestMatch = exactSymbolMatch || exactNameMatch || startsWithNameMatch || localMatches[0];
          if (bestMatch) {
            updatedColumns[i] = {
              ...col,
              symbol: bestMatch.symbol,
              companyName: bestMatch.name,
              type: bestMatch.type,
              isFromSuggestion: true
            };
          }
        }
      }
    }

    // 1. Core validations
    for (let i = 0; i < updatedColumns.length; i++) {
      const col = updatedColumns[i];
      const trimmedSymbol = col.symbol.trim().toUpperCase();

      if (!trimmedSymbol) {
        updatedColumns[i] = { ...col, error: 'Please enter a valid symbol (e.g., AAPL or TCS.NS)' };
        hasErrors = true;
        continue;
      }

      if (trimmedSymbol.includes(' ')) {
        updatedColumns[i] = { ...col, error: 'Symbols cannot have spaces' };
        hasErrors = true;
        continue;
      }

      if (col.type === MarketType.STOCK && col.region === 'INDIA' && !trimmedSymbol.includes('.')) {
        updatedColumns[i] = { ...col, error: 'Indian stocks require a suffix (e.g. RELIANCE.NS)' };
        hasErrors = true;
        continue;
      }

      // Check duplicate within currently edited row fields
      const isDuplicateInCurrentInput = updatedColumns.some((other, idx) => 
        idx !== i && 
        other.symbol.trim().toUpperCase() === trimmedSymbol && 
        other.region === col.region
      );
      if (isDuplicateInCurrentInput) {
        updatedColumns[i] = { ...col, error: 'Duplicate symbol inside this entry group' };
        hasErrors = true;
        continue;
      }

      // Check duplicates again existings tracking lists
      if (existingSymbols.some(s => s.symbol === trimmedSymbol && s.region === col.region)) {
        updatedColumns[i] = { ...col, error: `Symbol is already tracked in list for ${col.region}` };
        hasErrors = true;
        continue;
      }
    }

    if (hasErrors) {
      setColumns(updatedColumns);
      setGlobalValidating(false);
      return;
    }

    try {
      const finalColumns = await Promise.all(
        updatedColumns.map(async (col) => {
          if (col.isFromSuggestion) {
            return col;
          }

          const trimmedSymbol = col.symbol.trim().toUpperCase();
          try {
            // Set validating visual spinner for this column
            setColumns(prev => prev.map(p => p.id === col.id ? { ...p, isValidating: true } : p));
            
            const validation = await pulser.validateSymbol(trimmedSymbol, col.type, col.region);
            
            if (!validation.isValid) {
              return {
                ...col,
                error: validation.reason || `Could not verify "${trimmedSymbol}" as ${col.type.toLowerCase()} in ${col.region}.`,
                suggestion: validation.suggestedSymbol || null,
                isValidating: false
              };
            }

            return {
              ...col,
              companyName: validation.name || col.companyName || trimmedSymbol,
              isValidating: false
            };
          } catch (err) {
            console.error('Validation item error:', err);
            return {
              ...col,
              error: 'Verification connection failed. Please trigger it again.',
              isValidating: false
            };
          }
        })
      );

      const anyErrors = finalColumns.some(c => c.error !== null);
      setColumns(finalColumns);

      if (anyErrors) {
        setGlobalValidating(false);
        return;
      }

      // Add all verified columns!
      finalColumns.forEach(item => {
        onAdd({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          symbol: item.symbol.trim().toUpperCase(),
          name: item.companyName || item.symbol.trim().toUpperCase(),
          type: item.type,
          region: item.region,
          notes: item.notes.trim() || undefined
        });
      });

      onClose();
    } catch (err) {
      console.error('Submission processing failed:', err);
      setGlobalError('Verification processing failed. Please check inputs and try again.');
    } finally {
      setGlobalValidating(false);
    }
  };

  const modalWidthClass = 
    columns.length === 1 ? 'max-w-md' :
    columns.length === 2 ? 'max-w-4xl' :
    'max-w-7xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 md:max-h-[90vh] flex flex-col ${modalWidthClass}`}
      >
        {/* Header containing Plus addition logic */}
        <div className="p-4 border-b bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="text-md font-extrabold flex items-center gap-2 text-white uppercase tracking-wider">
            Add Symbol
          </h2>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={addColumn}
              title="Add more symbols"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add More</span>
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Column Grid */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {globalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold animate-pulse">
                {globalError}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 items-stretch overflow-x-auto pb-4 max-h-[60vh] md:max-h-[70vh] px-1 fancy-scrollbar">
              {columns.map((column, index) => (
                <SymbolColumnPanel
                  key={column.id}
                  column={column}
                  index={index}
                  totalColumns={columns.length}
                  onUpdate={handleUpdateColumn}
                  onRemove={removeColumn}
                  onSymbolSelect={handleSymbolSelect}
                />
              ))}


            </div>
          </div>

          {/* Dialog Action buttons */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/80 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs rounded-xl border border-slate-250 dark:border-slate-800 font-extrabold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors uppercase tracking-widest cursor-pointer ml-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={globalValidating}
              className={`w-1/2 px-4 py-2.5 text-xs rounded-xl font-black text-white disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest transition-all ${
                columns.every(c => c.isFromSuggestion) 
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/10' 
                  : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/10'
              }`}
            >
              {globalValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Group...
                </>
              ) : (
                columns.length > 1 ? 'Add Symbols' : 'Add Symbol'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Panel Component for each distinct column
const SymbolColumnPanel: React.FC<{
  column: FormColumn;
  index: number;
  totalColumns: number;
  onUpdate: (id: string, fields: Partial<FormColumn>) => void;
  onRemove: (id: string) => void;
  onSymbolSelect: (id: string, suggestion: { symbol: string; name: string; type: MarketType; region?: 'US' | 'INDIA' | 'GLOBAL' }) => void;
}> = ({ column, index, totalColumns, onUpdate, onRemove, onSymbolSelect }) => {
  const {
    id,
    symbol,
    companyName,
    type,
    region,
    notes,
    error,
    suggestion,
    isFromSuggestion,
    searchSuggestions,
    isSearching,
    isValidating,
  } = column;

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCurrentTypeValue = () => {
    if (type === MarketType.STOCK) {
      if (region === 'INDIA') return 'INDIA_STOCK';
      return 'AMERICA_STOCK';
    }
    return type; // 'CRYPTO' | 'COMMODITY' | 'INDEX'
  };

  const getAPIWordFromType = () => {
    const currentVal = getCurrentTypeValue();
    if (currentVal === 'AMERICA_STOCK') return 'america';
    if (currentVal === 'INDIA_STOCK') return 'india';
    return currentVal.toLowerCase(); // 'crypto' | 'commodity' | 'index'
  };

  const handleTypeSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    let newType = MarketType.STOCK;
    let newRegion: 'US' | 'INDIA' | 'GLOBAL' = 'US';

    if (val === 'AMERICA_STOCK') {
      newType = MarketType.STOCK;
      newRegion = 'US';
    } else if (val === 'INDIA_STOCK') {
      newType = MarketType.STOCK;
      newRegion = 'INDIA';
    } else if (val === 'CRYPTO') {
      newType = MarketType.CRYPTO;
      newRegion = 'GLOBAL';
    } else if (val === 'COMMODITY') {
      newType = MarketType.COMMODITY;
      newRegion = 'GLOBAL';
    } else if (val === 'INDEX') {
      newType = MarketType.INDEX;
      newRegion = 'GLOBAL';
    }

    // Automatically append .NS if they switched to/are choosing an Indian stock
    let updatedSymbol = symbol;
    if (newType === MarketType.STOCK && newRegion === 'INDIA') {
      const trimmed = symbol.trim();
      if (trimmed && !trimmed.includes('.')) {
        updatedSymbol = trimmed + '.NS';
      }
    }

    onUpdate(id, { type: newType, region: newRegion, symbol: updatedSymbol, error: null });
  };

  // 1. Instant local search match mapping
  useEffect(() => {
    const trimmed = symbol.trim();
    if (trimmed.length > 0) {
      const localResults = searchLocalSymbols(trimmed, region);
      const upper = trimmed.toUpperCase();
      
      const exactMatch = localResults.find(r => 
        r.symbol.toUpperCase() === upper ||
        r.name.toUpperCase() === upper ||
        (upper.length >= 3 && r.name.toUpperCase().startsWith(upper))
      );

      onUpdate(id, {
        searchSuggestions: localResults,
        companyName: exactMatch ? exactMatch.name : (isFromSuggestion ? companyName : ''),
        type: exactMatch ? exactMatch.type : type,
        isFromSuggestion: exactMatch ? true : isFromSuggestion,
        error: null
      });
    } else {
      onUpdate(id, {
        searchSuggestions: [],
        companyName: isFromSuggestion ? companyName : '',
        error: null
      });
    }
  }, [symbol, region]);

  // 3. Click outside handler to dismiss search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onUpdate(id, { searchSuggestions: [] });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [id, onUpdate]);

  // 2. Debounced API search suggestions for manual queries
  useEffect(() => {
    const trimmed = symbol.trim();
    if (trimmed.length < 2) return;

    // Skip AI query search loop if we have an exact match locally
    const localResults = searchLocalSymbols(trimmed, region);
    const hasExactLocalMatch = localResults.some(r => r.symbol.toUpperCase() === trimmed.toUpperCase());
    if (hasExactLocalMatch) {
      return;
    }

    const timer = setTimeout(async () => {
      onUpdate(id, { isSearching: true });
      try {
        const apiType = getAPIWordFromType();
        const url = `https://webapi.tyzenr.com/alerts/search/${apiType}/${encodeURIComponent(trimmed)}`;
        
        let results: { symbol: string; name: string; type: MarketType }[] = [];
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              results = data.map((item: any) => ({
                symbol: (item.symbol || item.ticker || item.id || '').toUpperCase(),
                name: item.name || item.title || item.companyName || item.description || '',
                type: type
              }));
            }
          }
        } catch (apiErr) {
          console.warn('Alerts API fetch failed:', apiErr);
        }

        const currentLocal = searchLocalSymbols(trimmed, region);
        const merged = [...currentLocal];
        if (results && results.length > 0) {
          results.forEach(r => {
            if (!merged.some(m => m.symbol.toUpperCase() === r.symbol.toUpperCase())) {
              merged.push({ ...r, region });
            }
          });
        }

        const upperInput = trimmed.toUpperCase();
        const match = results?.find(r => 
          r.symbol.toUpperCase() === upperInput || 
          r.name.toUpperCase() === upperInput ||
          r.name.toUpperCase().startsWith(upperInput)
        );

        onUpdate(id, {
          searchSuggestions: merged,
          companyName: match ? match.name : (isFromSuggestion ? companyName : ''),
          type: match ? match.type : type,
          isFromSuggestion: match ? (match.symbol.toUpperCase() === upperInput) : isFromSuggestion,
          isSearching: false
        });
      } catch (err) {
        console.error('Failed to look up suggestions:', err);
        onUpdate(id, { isSearching: false });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [symbol, region, type]);

  return (
    <div 
      className="flex-1 min-w-[280px] md:max-w-md bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl relative flex flex-col justify-between transition-colors shrink-0"
    >
      {totalColumns > 1 && (
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="absolute top-3 right-3 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-full transition-colors cursor-pointer"
          title="Remove this column"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="space-y-4">
        {(totalColumns > 1 || isValidating) && (
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800/80">
            {totalColumns > 1 && (
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                index === 0 
                  ? 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' 
                  : 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/40'
              }`}>
                Symbol #{index + 1}
              </span>
            )}
            {isValidating && (
              <span className="flex items-center gap-1 text-[10px] text-blue-500 font-extrabold animate-pulse ml-auto">
                <Loader2 className="w-3 h-3 animate-spin" /> Verifying
              </span>
            )}
          </div>
        )}

        <div className="relative" ref={containerRef}>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Symbol</label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              required
              placeholder={region === 'INDIA' ? 'e.g. RELIANCE.NS' : 'e.g. AAPL, BTC'}
              value={symbol}
              onChange={(e) => {
                onUpdate(id, {
                  symbol: e.target.value,
                  isFromSuggestion: false,
                  error: null
                });
              }}
              onBlur={() => {
                if (type === MarketType.STOCK && region === 'INDIA') {
                  const trimmed = symbol.trim();
                  if (trimmed && !trimmed.includes('.')) {
                    onUpdate(id, { symbol: trimmed + '.NS' });
                  }
                }
              }}
              autoComplete="off"
              className="w-full bg-slate-100/30 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 uppercase"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              </div>
            )}
          </div>

          {/* Search Autocomplete Suggestions */}
          {searchSuggestions.length > 0 && (
            <div className="absolute z-40 left-0 right-0 mt-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
              {searchSuggestions.map((sugg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSymbolSelect(id, sugg)}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">{sugg.symbol}</span>
                    <span className="text-[8px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 font-black uppercase tracking-wider">{sugg.type}</span>
                  </div>
                  <div className="text-[10px] text-slate-550 dark:text-slate-400 truncate mt-0.5">{sugg.name}</div>
                </button>
              ))}
            </div>
          )}

          {/* Matched Company Display */}
          {companyName && (
            <div className="mt-2.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl transition-all">
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Matched Entity</p>
              <div className="flex items-center gap-2">
                <div className="p-1 bg-indigo-500 rounded-lg shadow-sm">
                  <LineChart className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 truncate">{companyName}</span>
              </div>
            </div>
          )}

          {/* Error messages */}
          {error && (
            <div className="flex flex-col gap-2 mt-1.5 p-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-rose-500" />
                <p className="text-[10px] text-rose-500 font-extrabold leading-tight">
                  {error}
                </p>
              </div>
              {suggestion && (
                <div className="flex items-center justify-between pl-5 pr-1 py-1 bg-white/50 dark:bg-black/20 rounded-md">
                  <span className="text-[10px] text-slate-500 italic">Did you mean <span className="font-bold text-slate-700 dark:text-slate-305 not-italic uppercase">{suggestion}</span>?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate(id, {
                        symbol: suggestion,
                        suggestion: null,
                        error: null,
                        isFromSuggestion: false
                      });
                    }}
                    className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black uppercase rounded hover:bg-emerald-600 transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Type Select */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Type</label>
          <select 
            value={getCurrentTypeValue()}
            onChange={handleTypeSelectChange}
            className="w-full bg-slate-100/30 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none text-slate-800 dark:text-white appearance-none cursor-pointer"
          >
            <option value="AMERICA_STOCK">🇺🇸 America Stock</option>
            <option value="INDIA_STOCK">🇮🇳 India Stock</option>
            <option value="CRYPTO">🪙 Crypto</option>
            <option value="COMMODITY">📦 Commodity</option>
            <option value="INDEX">📊 Index</option>
          </select>
        </div>

        {region === 'INDIA' && (
          <div className="p-2.5 bg-orange-50/50 dark:bg-orange-500/10 border border-orange-100/80 dark:border-orange-500/20 rounded-xl">
            <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block mb-1">Guide</span>
            <p className="text-[9px] text-orange-700/80 dark:text-orange-400/80 leading-tight">
              NSE uses <span className="font-bold">.NS</span>, BSE uses <span className="font-bold">.BO</span>.
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {['RELIANCE.NS', 'TCS.NS'].map(hint => (
                <button 
                  key={hint}
                  type="button"
                  onClick={() => onUpdate(id, { symbol: hint, isFromSuggestion: false, error: null })}
                  className="text-[8px] font-black bg-white dark:bg-orange-950 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 cursor-pointer"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block flex justify-between">
            Notes
            <span className={`text-[9px] ${notes.length >= 1000 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
              {notes.length}/1000
            </span>
          </label>
          <textarea
            placeholder="Investment thesis or custom note text..."
            value={notes}
            onChange={(e) => onUpdate(id, { notes: e.target.value.slice(0, 1000) })}
            className="w-full bg-slate-100/30 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-16 resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default AddSymbolModal;
