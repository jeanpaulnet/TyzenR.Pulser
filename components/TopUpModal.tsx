
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Zap, Shield, AlertCircle, Loader2 } from 'lucide-react';

interface TopUpModalProps {
  onClose: () => void;
  userEmail: string;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({ onClose, userEmail }) => {
  const [amount, setAmount] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTopUp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          email: userEmail,
          currency: 'usd'
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const packOptions = [
    { amount: 5, credits: 5, label: 'Starter', icon: CreditCard },
    { amount: 10, credits: 11, label: 'Popular', icon: Zap, popular: true },
    { amount: 25, credits: 30, label: 'Pro', icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-xl">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white leading-none">Top Up Balance</h3>
              <p className="text-xs text-slate-500 mt-1">Get credits for deep AI analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 mb-6">
            {packOptions.map((pack) => (
              <button
                key={pack.amount}
                onClick={() => setAmount(pack.amount)}
                className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                  amount === pack.amount
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10'
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl transition-colors ${
                    amount === pack.amount ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <pack.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className={`font-black text-sm ${amount === pack.amount ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {pack.label} Pack
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {pack.credits} Credits • ${pack.amount}
                    </p>
                  </div>
                </div>
                {pack.popular && (
                  <span className="absolute -top-2.5 right-6 px-2 py-0.5 bg-indigo-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                    Best Value
                  </span>
                )}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  amount === pack.amount ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {amount === pack.amount && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in-50" />}
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <button
            onClick={handleTopUp}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Pay ${amount}.00 via Stripe
              </>
            )}
          </button>
          
          <p className="mt-4 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 uppercase font-black tracking-widest">
            <Shield className="w-3 h-3" />
            Secure Payment via Stripe
          </p>
        </div>
      </motion.div>
    </div>
  );
};
