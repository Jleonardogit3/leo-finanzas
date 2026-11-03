import React, { useState, useEffect } from 'react';
import { X, CheckCircle, HandCoins, ArrowRight, Wallet, Check, CreditCard } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Currency, SubFundType } from '../../types';
import { RatesService } from '../../services/ratesService';
import { BankLogo } from '../common/BankLogo';

export const DebtPaymentModal: React.FC = () => {
  const { 
    isDebtPaymentModalOpen, 
    setIsDebtPaymentModalOpen, 
    activeDebtForPayment, 
    addDebtPayment,
    accounts,
    rates 
  } = useApp();

  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [targetSubFund, setTargetSubFund] = useState<SubFundType>('ves');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');

  useEffect(() => {
    if (activeDebtForPayment) {
      const baseCurr = activeDebtForPayment.currencyType === 'USD_USDT' ? 'USD' : 'VES';
      setCurrency(baseCurr);
      setAmountStr(activeDebtForPayment.remainingAmount.toString());
      if (accounts.length > 0) {
        setTargetAccountId(accounts[0].id);
        setTargetSubFund('ves');
      }
    }
  }, [activeDebtForPayment, accounts]);

  if (!isDebtPaymentModalOpen || !activeDebtForPayment) return null;

  const isPayable = activeDebtForPayment.debtType === 'payable';
  const currentPaymentAmount = parseFloat(amountStr) || 0;
  const isUSD = activeDebtForPayment.currencyType === 'USD_USDT';

  // Live conversion reference for the payment
  const equivBcvBs = (isUSD && rates.bcv > 0) 
    ? (currentPaymentAmount * rates.bcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  const equivBcvUsd = (!isUSD && rates.bcv > 0)
    ? (currentPaymentAmount / rates.bcv).toFixed(2)
    : '0.00';

  const handleFullPay = () => {
    setAmountStr(activeDebtForPayment.remainingAmount.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPaymentAmount <= 0) return;

    addDebtPayment(activeDebtForPayment.id, {
      amount: currentPaymentAmount,
      currency,
      date: new Date(date).toISOString(),
      note: note.trim() || undefined,
      appliedRate: isUSD ? rates.usdt : rates.bcv,
      receivedInAccountId: targetAccountId || undefined,
      receivedInSubFund: targetSubFund
    });

    setIsDebtPaymentModalOpen(false);
    setAmountStr('');
    setNote('');
  };

  const selectedTargetAccount = accounts.find(a => a.id === targetAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {isPayable ? (
                <>
                  <CreditCard className="w-5 h-5 text-rose-500" />
                  <span>Registrar Pago de mi Deuda</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span>Registrar Abono o Cobro</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isPayable ? 'Acreedor: ' : 'Deudor: '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{activeDebtForPayment.debtorName}</span>
            </p>
          </div>
          <button 
            onClick={() => setIsDebtPaymentModalOpen(false)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Debt Current Status Box */}
        <div className={`mt-4 p-3.5 rounded-2xl border ${
          isPayable 
            ? 'bg-rose-500/10 border-rose-500/20' 
            : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-bold ${isPayable ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'}`}>
              {isPayable ? 'Saldo Pendiente por Pagar:' : 'Saldo Pendiente Actual:'}
            </span>
            <button
              type="button"
              onClick={handleFullPay}
              className={`text-[11px] font-bold hover:underline ${
                isPayable ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isPayable ? 'Pagar Totalidad' : 'Cobrar Totalidad'}
            </button>
          </div>
          <div className={`text-xl font-black ${isPayable ? 'text-rose-900 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200'}`}>
            {isUSD ? `$${activeDebtForPayment.remainingAmount.toFixed(2)} USD` : `${RatesService.formatMoney(activeDebtForPayment.remainingAmount, 'VES')}`}
          </div>
          <p className={`text-[11px] mt-0.5 ${isPayable ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {isUSD 
              ? `≈ ${(activeDebtForPayment.remainingAmount * rates.bcv).toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs a tasa BCV del día`
              : `≈ $${(rates.bcv > 0 ? (activeDebtForPayment.remainingAmount / rates.bcv).toFixed(2) : '0.00')} USD a tasa BCV`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              {isPayable ? 'Monto a Pagar' : 'Monto a Abonar'} ({isUSD ? 'USD' : 'Bs'}) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                max={activeDebtForPayment.remainingAmount}
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className={`w-full text-2xl font-black px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 ${
                  isPayable ? 'focus:ring-rose-500' : 'focus:ring-emerald-500'
                }`}
                required
                autoFocus
              />
              <span className="absolute right-4 top-3 text-sm font-black text-slate-600 dark:text-slate-400">
                {isUSD ? '$' : 'Bs'}
              </span>
            </div>

            {/* Dual live reference */}
            {currentPaymentAmount > 0 && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 font-medium px-1">
                {isUSD 
                  ? `Equivalente en Pago Móvil (Tasa BCV ${rates.bcv} Bs/$): ${equivBcvBs} Bs`
                  : `Equivalente en Dólares (Tasa BCV ${rates.bcv} Bs/$): $${equivBcvUsd} USD`}
              </p>
            )}
          </div>

          {/* Account selector (Debitar de si es pagar, Acreditar si es cobrar) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {isPayable ? 'Debitar dinero de Cuenta (Origen del pago):' : 'Acreditar dinero en Cuenta:'}
            </label>
            <div className="flex items-center gap-2">
              {selectedTargetAccount && <BankLogo name={selectedTargetAccount.name} size="md" />}
              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 ${
                  isPayable ? 'focus:ring-rose-500' : 'focus:ring-emerald-500'
                }`}
              >
                <option value="">{isPayable ? '(No debitar automáticamente de cuentas)' : '(No acreditar automáticamente en cuentas)'}</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* If target account is a bank, select which subfund */}
            {selectedTargetAccount?.type === 'bank_ves' && (
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isPayable ? 'Sub-fondo del cual se debita en' : 'Sub-fondo de acreditación en'} {selectedTargetAccount.name}:
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

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              {isPayable ? 'Fecha del Pago' : 'Fecha del Cobro'}
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 ${
                isPayable ? 'focus:ring-rose-500' : 'focus:ring-emerald-500'
              }`}
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Nota / Referencia de Pago (Opcional)
            </label>
            <input
              type="text"
              placeholder={isPayable ? "Ej: Transferencia enviada ref 5678, Pago en efectivo..." : "Ej: Pago Móvil ref: 1234, Efectivo entregado en oficina..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 ${
                isPayable ? 'focus:ring-rose-500' : 'focus:ring-emerald-500'
              }`}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 ${
                isPayable
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isPayable ? 'Confirmar Pago Realizado' : 'Confirmar Abono / Cobro'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
