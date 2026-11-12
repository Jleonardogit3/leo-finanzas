import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle, HandCoins, ArrowRight, Wallet, Check, CreditCard, Calculator, DollarSign, Coins } from 'lucide-react';
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
    rates,
    transactions,
    debts
  } = useApp();

  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('VES');
  const [amountStr, setAmountStr] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [targetSubFund, setTargetSubFund] = useState<SubFundType>('ves');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [isManualRate, setIsManualRate] = useState(false);

  // Obtener tasa histórica o del día según la fecha seleccionada
  const dateRates = useMemo(() => {
    return RatesService.getRatesForDate(date, transactions, debts);
  }, [date, transactions, debts]);

  // Actualizar la tasa por defecto cuando cambia la fecha si no ha sido modificada manualmente
  useEffect(() => {
    if (!isManualRate) {
      setCustomRate(dateRates.bcv.toString());
    }
  }, [dateRates.bcv, isManualRate]);

  const bcvRate = isManualRate && parseFloat(customRate) > 0 
    ? parseFloat(customRate) 
    : (dateRates.bcv > 0 ? dateRates.bcv : (rates.bcv > 0 ? rates.bcv : 1));

  // Live calculation of debt status protected against devaluation
  const { liveUsdRemaining, liveVesRemaining, isVESIndexed } = useMemo(() => {
    if (!activeDebtForPayment) {
      return { liveUsdRemaining: 0, liveVesRemaining: 0, isVESIndexed: false };
    }

    const isVES = activeDebtForPayment.currencyType === 'VES_BCV';

    let usdOriginal = activeDebtForPayment.peggedUsdAmount || 0;
    if (!usdOriginal) {
      if (activeDebtForPayment.currencyType === 'USD_USDT') {
        usdOriginal = activeDebtForPayment.originalAmount;
      } else {
        usdOriginal = activeDebtForPayment.appliedRateAtCreation > 0
          ? activeDebtForPayment.originalAmount / activeDebtForPayment.appliedRateAtCreation
          : activeDebtForPayment.originalAmount / bcvRate;
      }
    }

    const totalPaidUsd = (activeDebtForPayment.payments || []).reduce((sum, p) => {
      if (p.currency === 'USD') return sum + p.amount;
      const rate = p.appliedRate || bcvRate;
      return sum + (p.amount / rate);
    }, 0);

    const remUsd = Math.max(0, usdOriginal - totalPaidUsd);
    const remVes = Number((remUsd * bcvRate).toFixed(2));

    return {
      liveUsdRemaining: remUsd,
      liveVesRemaining: remVes,
      isVESIndexed: isVES
    };
  }, [activeDebtForPayment, bcvRate]);

  useEffect(() => {
    if (activeDebtForPayment) {
      const initialCurr = activeDebtForPayment.currencyType === 'USD_USDT' ? 'USD' : 'VES';
      setPaymentCurrency(initialCurr);
      const initialAmount = initialCurr === 'USD' ? liveUsdRemaining.toFixed(2) : liveVesRemaining.toFixed(2);
      setAmountStr(initialAmount);

      if (accounts.length > 0) {
        setTargetAccountId(accounts[0].id);
        setTargetSubFund('ves');
      }
      setIsManualRate(false);
      setCustomRate(dateRates.bcv.toString());
    }
  }, [activeDebtForPayment, liveUsdRemaining, liveVesRemaining, accounts]);

  const selectedTargetAccount = accounts.find(a => a.id === targetAccountId);
  const isTargetUsd = selectedTargetAccount?.currency === 'USD' || 
    targetSubFund === 'digital_usd' || 
    targetSubFund === 'physical_usd';
  const currentPaymentAmount = parseFloat(amountStr) || 0;

  // Live account impact amount (calculated unconditionally before any early return)
  const { accountImpactAmount, accountImpactCurrency } = useMemo(() => {
    if (currentPaymentAmount <= 0) {
      return { accountImpactAmount: 0, accountImpactCurrency: isTargetUsd ? 'USD' : 'VES' };
    }
    if (isTargetUsd && paymentCurrency === 'VES') {
      return {
        accountImpactAmount: Number((currentPaymentAmount / bcvRate).toFixed(2)),
        accountImpactCurrency: 'USD'
      };
    }
    if (!isTargetUsd && paymentCurrency === 'USD') {
      return {
        accountImpactAmount: Number((currentPaymentAmount * bcvRate).toFixed(2)),
        accountImpactCurrency: 'VES'
      };
    }
    return {
      accountImpactAmount: currentPaymentAmount,
      accountImpactCurrency: paymentCurrency
    };
  }, [currentPaymentAmount, isTargetUsd, paymentCurrency, bcvRate]);

  // Hook rules: Early return ONLY after all hooks (useState, useMemo, useEffect) have been invoked
  if (!isDebtPaymentModalOpen || !activeDebtForPayment) return null;

  const isPayable = activeDebtForPayment.debtType === 'payable';

  const handleCurrencyChange = (newCurr: Currency) => {
    if (newCurr === paymentCurrency) return;
    setPaymentCurrency(newCurr);
    if (newCurr === 'VES') {
      const valInBs = currentPaymentAmount > 0 
        ? Number((currentPaymentAmount * bcvRate).toFixed(2)) 
        : liveVesRemaining;
      setAmountStr(valInBs.toString());
    } else {
      const valInUsd = currentPaymentAmount > 0 
        ? Number((currentPaymentAmount / bcvRate).toFixed(2)) 
        : liveUsdRemaining;
      setAmountStr(valInUsd.toString());
    }
  };

  const handleFullPay = () => {
    if (paymentCurrency === 'VES') {
      setAmountStr(liveVesRemaining.toString());
    } else {
      setAmountStr(liveUsdRemaining.toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPaymentAmount <= 0) return;

    addDebtPayment(activeDebtForPayment.id, {
      amount: currentPaymentAmount,
      currency: paymentCurrency,
      date: new Date(date).toISOString(),
      note: note.trim() || undefined,
      appliedRate: bcvRate,
      receivedInAccountId: targetAccountId || undefined,
      receivedInSubFund: targetSubFund
    });

    setIsDebtPaymentModalOpen(false);
    setAmountStr('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto"
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
              {' • '}{activeDebtForPayment.concept}
            </p>
          </div>
          <button 
            onClick={() => setIsDebtPaymentModalOpen(false)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Debt Current Status Box with Live BCV Protection */}
        <div className={`mt-4 p-4 rounded-2xl border space-y-2 ${
          isPayable 
            ? 'bg-rose-500/10 border-rose-500/25' 
            : 'bg-emerald-500/10 border-emerald-500/25'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-bold uppercase tracking-wider ${isPayable ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
              {isPayable ? 'Saldo Pendiente por Pagar:' : 'Saldo Pendiente por Cobrar:'}
            </span>
            <button
              type="button"
              onClick={handleFullPay}
              className={`text-xs font-bold px-2 py-1 rounded-lg transition-all ${
                isPayable 
                  ? 'bg-rose-600 text-white hover:bg-rose-500' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {isPayable ? 'Pagar Totalidad' : 'Cobrar Totalidad'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div className={`text-2xl font-black ${isPayable ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
              ${liveUsdRemaining.toFixed(2)} USD
            </div>
            <div className="text-base font-extrabold text-slate-800 dark:text-slate-200">
              ≈ {liveVesRemaining.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
            <span>🏛️ Tasa oficial BCV hoy: <strong>{rates.bcv} Bs/$</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Valor al día protegido</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Payment Currency Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Moneda del Pago / Abono
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => handleCurrencyChange('VES')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  paymentCurrency === 'VES'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Bolívares (Pago Móvil / VES)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCurrencyChange('USD')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  paymentCurrency === 'USD'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Dólares ($ / USD / USDT)</span>
              </button>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {isPayable ? 'Monto a Pagar' : 'Monto a Abonar'} en {paymentCurrency === 'VES' ? 'Bolívares (Bs)' : 'Dólares ($)'} *
              </label>
              <button
                type="button"
                onClick={handleFullPay}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Monto Total: {paymentCurrency === 'VES' ? `${liveVesRemaining.toLocaleString('es-VE')} Bs` : `$${liveUsdRemaining.toFixed(2)} USD`}
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
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
                {paymentCurrency === 'VES' ? 'Bs VES' : '$ USD'}
              </span>
            </div>

            {/* Dual live reference */}
            {currentPaymentAmount > 0 && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 font-semibold px-1 flex items-center justify-between">
                <span>
                  {paymentCurrency === 'VES'
                    ? `Equivalente en Dólares ($): $${(currentPaymentAmount / bcvRate).toFixed(2)} USD`
                    : `Equivalente en Pago Móvil (Bs): ${(currentPaymentAmount * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`}
                </span>
                <span className="text-[10px] text-slate-400">Tasa: {bcvRate} Bs/$</span>
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

            {/* Account Impact Callout Banner */}
            {selectedTargetAccount && currentPaymentAmount > 0 && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-900 dark:text-blue-200 font-medium">
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <Calculator className="w-3.5 h-3.5 text-blue-500" />
                  <span>Impacto real en cuenta ({selectedTargetAccount.name}):</span>
                </div>
                <p>
                  Se {isPayable ? 'debitarán' : 'acreditarán'} <strong className="font-black text-blue-600 dark:text-blue-300">
                    {accountImpactCurrency === 'USD' ? `$${accountImpactAmount.toFixed(2)} USD` : `${accountImpactAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`}
                  </strong> al valor del dólar BCV del día ({bcvRate} Bs/$).
                </p>
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

          {/* Tasa de Cambio aplicada según la fecha */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Tasa de Referencia de la Fecha
                </span>
                <span className="text-[10px] text-slate-500">
                  {dateRates.isHistorical 
                    ? `Tomada de los registros del ${dateRates.rateDate}` 
                    : 'Tasa oficial BCV del día actual'}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                dateRates.isHistorical 
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
              }`}>
                {dateRates.isHistorical ? 'Histórica' : 'En Vivo'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="any"
                  value={customRate}
                  onChange={(e) => {
                    setCustomRate(e.target.value);
                    setIsManualRate(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-black border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">
                  Bs / $
                </span>
              </div>

              {isManualRate && (
                <button
                  type="button"
                  onClick={() => {
                    setIsManualRate(false);
                    setCustomRate(dateRates.bcv.toString());
                  }}
                  className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Restablecer ({dateRates.bcv})
                </button>
              )}
            </div>
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
