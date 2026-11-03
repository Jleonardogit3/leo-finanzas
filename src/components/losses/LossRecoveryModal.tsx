import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  ArrowRight, 
  Wallet,
  DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SubFundType } from '../../types';
import { RatesService } from '../../services/ratesService';
import { BankLogo } from '../common/BankLogo';

export const LossRecoveryModal: React.FC = () => {
  const { 
    isLossRecoveryModalOpen, 
    setIsLossRecoveryModalOpen, 
    activeLossForRecovery, 
    recoverLoss, 
    accounts, 
    rates 
  } = useApp();

  const [amountStr, setAmountStr] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [targetSubFund, setTargetSubFund] = useState<SubFundType>('ves');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isLossRecoveryModalOpen && activeLossForRecovery) {
      const remaining = Math.max(0, activeLossForRecovery.amount - (activeLossForRecovery.recoveredAmount || 0));
      setAmountStr(remaining.toString());
      setTargetAccountId(accounts.length > 0 ? accounts[0].id : '');
      setDate(new Date().toISOString().slice(0, 10));
      setNote('');
      setIsSuccess(false);
    }
  }, [isLossRecoveryModalOpen, activeLossForRecovery, accounts]);

  if (!isLossRecoveryModalOpen || !activeLossForRecovery) return null;

  const currentLoss = activeLossForRecovery;
  const remainingUnrecovered = Math.max(0, currentLoss.amount - (currentLoss.recoveredAmount || 0));
  const selectedTargetAccount = accounts.find(a => a.id === targetAccountId);
  const currentRecoveryAmount = parseFloat(amountStr) || 0;

  const handleFullRecover = () => {
    setAmountStr(remainingUnrecovered.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRecoveryAmount <= 0) return;

    recoverLoss(currentLoss.id, {
      amount: currentRecoveryAmount,
      currency: currentLoss.currency,
      date: new Date(date).toISOString(),
      note: note.trim() || undefined,
      receivedInAccountId: targetAccountId || undefined,
      receivedInSubFund: selectedTargetAccount?.type === 'bank_ves' ? targetSubFund : undefined
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setIsLossRecoveryModalOpen(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>Registrar Recuperación de Pérdida</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Incidente: <span className="font-bold text-slate-800 dark:text-slate-200">{currentLoss.concept}</span>
            </p>
          </div>
          <button 
            onClick={() => setIsLossRecoveryModalOpen(false)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Info Box */}
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-rose-800 dark:text-rose-300">
              Saldo Pendiente por Recuperar:
            </span>
            <button
              type="button"
              onClick={handleFullRecover}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Recuperar Total
            </button>
          </div>
          <div className="text-xl font-black text-rose-900 dark:text-rose-200">
            {currentLoss.currency === 'USD' 
              ? `$${remainingUnrecovered.toFixed(2)} USD` 
              : `${remainingUnrecovered.toLocaleString()} Bs`}
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
            Monto original perdido: {currentLoss.currency === 'USD' ? `$${currentLoss.amount.toFixed(2)}` : `${currentLoss.amount.toLocaleString()} Bs`}
            {currentLoss.recoveredAmount > 0 && ` • Ya recuperado: ${currentLoss.currency === 'USD' ? `$${currentLoss.recoveredAmount.toFixed(2)}` : `${currentLoss.recoveredAmount.toLocaleString()} Bs`}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Recovery Amount */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Monto Recuperado ({currentLoss.currency}) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                max={remainingUnrecovered}
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full text-2xl font-black px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-600 dark:text-slate-400">
                {currentLoss.currency}
              </span>
            </div>
          </div>

          {/* Deposit Account */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Acreditar dinero recuperado en Cuenta:
            </label>
            <div className="flex items-center gap-2">
              {selectedTargetAccount && <BankLogo name={selectedTargetAccount.name} size="md" />}
              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">(No acreditar automáticamente en cuentas)</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Subfund */}
            {selectedTargetAccount?.type === 'bank_ves' && (
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Sub-fondo de acreditación en {selectedTargetAccount.name}:
                </label>
                <select
                  value={targetSubFund}
                  onChange={(e) => setTargetSubFund(e.target.value as SubFundType)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700"
                >
                  <option value="ves">🏦 Cuenta en Bolívares (VES)</option>
                  <option value="digital_usd">💻 Cuenta en $ Digitales (USD)</option>
                  <option value="physical_usd">💵 $ Físicos (USD)</option>
                </select>
              </div>
            )}
          </div>

          {/* Date and Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Nota
              </label>
              <input
                type="text"
                placeholder="Reembolso de seguro, devolución..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsLossRecoveryModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSuccess}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Recuperado!</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirmar Recuperación</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
