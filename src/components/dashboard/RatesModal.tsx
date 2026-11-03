import React, { useState } from 'react';
import { X, TrendingUp, RefreshCw, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const RatesModal: React.FC = () => {
  const { 
    isRatesModalOpen, 
    setIsRatesModalOpen, 
    rates, 
    setManualRates, 
    clearManualRates,
    refreshRates,
    isOnline 
  } = useApp();

  const [bcvInput, setBcvInput] = useState<string>(rates.bcv.toString());
  const [usdtInput, setUsdtInput] = useState<string>(rates.usdt.toString());
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isRatesModalOpen) return null;

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    const bcvNum = parseFloat(bcvInput);
    const usdtNum = parseFloat(usdtInput);

    if (!isNaN(bcvNum) && bcvNum > 0 && !isNaN(usdtNum) && usdtNum > 0) {
      setManualRates(bcvNum, usdtNum);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsRatesModalOpen(false);
      }, 1000);
    }
  };

  const handleResetApi = async () => {
    clearManualRates();
    await refreshRates();
    setIsRatesModalOpen(false);
  };

  const calculatedSpread = () => {
    const bcvNum = parseFloat(bcvInput) || rates.bcv;
    const usdtNum = parseFloat(usdtInput) || rates.usdt;
    if (bcvNum <= 0) return 0;
    return ((usdtNum - bcvNum) / bcvNum) * 100;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Tasas de Cambio en Venezuela
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              API DolarApi Venezuela & Respaldo Offline
            </p>
          </div>
          <button 
            onClick={() => setIsRatesModalOpen(false)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {rates.isManualOverride ? (
              <span className="flex items-center gap-1.5 font-bold text-amber-500">
                <AlertTriangle className="w-4 h-4" />
                Modo Manual (Sobrescrito)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold text-emerald-500">
                <ShieldCheck className="w-4 h-4" />
                Sincronizado vía DolarApi
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">
            {new Date(rates.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Live Brecha Metric */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-rose-500/10 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Brecha Cambiaria (Spread):
            </span>
            <span className="text-base font-extrabold text-rose-500 flex items-center gap-1">
              +{calculatedSpread().toFixed(2)}%
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Diferencia entre el dólar oficial y el valor de reposición en Binance USDT.
          </p>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSaveManual} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Tasa Oficial BCV (Bs / USD)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.0001"
                min="0.01"
                value={bcvInput}
                onChange={(e) => setBcvInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                VES
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Tasa Paralelo / Binance USDT (Bs / USD)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.0001"
                min="0.01"
                value={usdtInput}
                onChange={(e) => setUsdtInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                VES
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Tasas Actualizadas!</span>
                </>
              ) : (
                <span>Aplicar Tasas Manualmente</span>
              )}
            </button>

            {rates.isManualOverride && (
              <button
                type="button"
                onClick={handleResetApi}
                disabled={!isOnline}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Sincronización Automática API</span>
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  );
};
