import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowLeftRight, 
  Plus, 
  Calendar, 
  FileText, 
  Check, 
  Wallet,
  Coins,
  DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TransactionType, Currency, Transaction, SubFundType } from '../../types';
import { RatesService } from '../../services/ratesService';
import { BankLogo } from '../common/BankLogo';

export const TransactionModal: React.FC = () => {
  const { 
    isTxModalOpen, 
    setIsTxModalOpen, 
    accounts, 
    categories, 
    rates, 
    addTransaction,
    setIsCategoryModalOpen 
  } = useApp();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [subFund, setSubFund] = useState<SubFundType>('ves');
  const [toSubFund, setToSubFund] = useState<SubFundType>('ves');
  const [customRate, setCustomRate] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Set default account and category when modal opens
  useEffect(() => {
    if (isTxModalOpen) {
      if (accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
        setCurrency(accounts[0].currency);
        setSubFund('ves');
      }
      if (categories.length > 0 && !categoryId) {
        setCategoryId(categories[0].id);
      }
      setCustomRate(rates.usdt.toString());
    }
  }, [isTxModalOpen, accounts, categories, rates]);

  // When accountId changes, auto-set currency to that account's native currency
  const handleAccountChange = (id: string) => {
    setAccountId(id);
    const selectedAcc = accounts.find(a => a.id === id);
    if (selectedAcc) {
      setSubFund('ves');
      setCurrency(selectedAcc.currency);
    }
  };

  const handleSubFundChange = (newSub: SubFundType) => {
    setSubFund(newSub);
    if (newSub === 'digital_usd' || newSub === 'physical_usd') {
      setCurrency('USD');
    } else {
      setCurrency('VES');
    }
  };

  if (!isTxModalOpen) return null;

  const currentAmount = parseFloat(amountStr) || 0;
  const sourceAccount = accounts.find(a => a.id === accountId);
  const destAccount = accounts.find(a => a.id === toAccountId);

  // Effective currency for origin and destination
  const sourceEffectiveCurrency: Currency = (sourceAccount?.type === 'bank_ves' && subFund !== 'ves') 
    ? 'USD' 
    : (sourceAccount?.currency || currency);
  
  const destEffectiveCurrency: Currency = (destAccount?.type === 'bank_ves' && toSubFund !== 'ves') 
    ? 'USD' 
    : (destAccount?.currency || 'USD');

  // Calculate dual conversion previews
  const previewUsdBcv = currency === 'VES' 
    ? (rates.bcv > 0 ? (currentAmount / rates.bcv).toFixed(2) : '0.00')
    : currentAmount.toFixed(2);

  const previewUsdUsdt = currency === 'VES' 
    ? (rates.usdt > 0 ? (currentAmount / rates.usdt).toFixed(2) : '0.00')
    : currentAmount.toFixed(2);

  const previewVesBcv = currency === 'USD' 
    ? (currentAmount * rates.bcv).toFixed(2) 
    : currentAmount.toFixed(2);

  const previewVesUsdt = currency === 'USD' 
    ? (currentAmount * rates.usdt).toFixed(2) 
    : currentAmount.toFixed(2);

  // Cross-currency transfer destination amount calculation
  const effectiveRate = parseFloat(customRate) || (rates.usdt || rates.bcv);
  let calculatedDestAmount = currentAmount;

  if (type === 'transfer' && sourceAccount && destAccount) {
    if (sourceEffectiveCurrency === 'USD' && destEffectiveCurrency === 'VES') {
      calculatedDestAmount = Number((currentAmount * effectiveRate).toFixed(2));
    } else if (sourceEffectiveCurrency === 'VES' && destEffectiveCurrency === 'USD') {
      calculatedDestAmount = effectiveRate > 0 ? Number((currentAmount / effectiveRate).toFixed(2)) : 0;
    } else {
      calculatedDestAmount = currentAmount;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAmount <= 0 || !accountId) return;
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      alert('Selecciona una cuenta de destino diferente a la de origen.');
      return;
    }

    const selectedCategory = categories.find(c => c.id === categoryId);

    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      subFund: (sourceAccount?.type === 'bank_ves') ? subFund : undefined,
      toSubFund: (destAccount?.type === 'bank_ves' && type === 'transfer') ? toSubFund : undefined,
      amount: currentAmount,
      currency,
      appliedRate: type === 'transfer' ? effectiveRate : undefined,
      destinationAmount: type === 'transfer' ? calculatedDestAmount : undefined,
      categoryId: selectedCategory?.id || 'cat-general',
      categoryName: selectedCategory?.name || (type === 'transfer' ? 'Transferencia / Cambio' : 'General'),
      categoryIcon: selectedCategory?.icon,
      categoryColor: selectedCategory?.color,
      date: new Date(date).toISOString(),
      note: note.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    addTransaction(newTx);
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      setAmountStr('');
      setNote('');
      setIsTxModalOpen(false);
    }, 600);
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Nuevo Movimiento
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Registra ingresos, gastos o cambios de divisas
            </p>
          </div>
          <button 
            onClick={() => setIsTxModalOpen(false)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Movement Type Toggle */}
        <div className="grid grid-cols-3 gap-1.5 p-1 mt-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Egreso</span>
          </button>

          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Ingreso</span>
          </button>

          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              type === 'transfer'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Cambio / Transf.</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Amount & Currency input with Dual Previews */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Monto
              </label>
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    currency === 'USD' 
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('VES')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    currency === 'VES' 
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Bs VES
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full text-2xl font-black px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                required
                autoFocus
              />
              <span className="absolute right-4 top-3 text-sm font-black text-slate-600 dark:text-slate-400">
                {currency === 'USD' ? '$' : 'Bs'}
              </span>
            </div>

            {/* Instant Dual Preview */}
            {currentAmount > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 block">Tasa BCV ({rates.bcv} Bs):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {currency === 'USD' ? `${previewVesBcv} Bs` : `$${previewUsdBcv} USD`}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 block">Tasa USDT ({rates.usdt} Bs):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    {currency === 'USD' ? `${previewVesUsdt} Bs` : `$${previewUsdUsdt} USD`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Accounts Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                {type === 'transfer' ? 'Cuenta Origen' : 'Cuenta'}
              </label>
              <div className="flex items-center gap-2">
                {sourceAccount && <BankLogo name={sourceAccount.name} size="md" />}
                <select
                  value={accountId}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency} • Saldo: {RatesService.formatMoney(acc.currentBalance, acc.currency)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-fondo selector if bank */}
              {sourceAccount?.type === 'bank_ves' && (
                <div className="mt-2 p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Fondo a debitar/acreditar:
                  </label>
                  <select
                    value={subFund}
                    onChange={(e) => handleSubFundChange(e.target.value as SubFundType)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700"
                  >
                    <option value="ves">🏦 Cuenta Bolívares (VES)</option>
                    <option value="digital_usd">💻 Cuenta $ Digitales (${sourceAccount.digitalUsdBalance || 0} USD)</option>
                    <option value="physical_usd">💵 $ Físicos (${sourceAccount.physicalUsdBalance || 0} USD)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Destination account if transfer/exchange */}
            {type === 'transfer' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5">
                  Cuenta Destino
                </label>
                <div className="flex items-center gap-2">
                  {destAccount && <BankLogo name={destAccount.name} size="md" />}
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar cuenta destino...</option>
                    {accounts.filter(a => a.id !== accountId).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency} • Saldo: {RatesService.formatMoney(acc.currentBalance, acc.currency)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination Sub-fondo selector if bank */}
                {destAccount?.type === 'bank_ves' && (
                  <div className="mt-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">
                      Fondo de acreditación destino:
                    </label>
                    <select
                      value={toSubFund}
                      onChange={(e) => setToSubFund(e.target.value as SubFundType)}
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold border border-blue-200 dark:border-blue-700"
                    >
                      <option value="ves">🏦 Cuenta Bolívares (VES)</option>
                      <option value="digital_usd">💻 Cuenta $ Digitales (${destAccount.digitalUsdBalance || 0} USD)</option>
                      <option value="physical_usd">💵 $ Físicos (${destAccount.physicalUsdBalance || 0} USD)</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transfer Exchange Rate & Converted Destination Preview */}
          {type === 'transfer' && sourceAccount && destAccount && sourceAccount.currency !== destAccount.currency && (
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  Tasa de cambio aplicada:
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-28 px-2 py-1 text-right rounded-lg bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 font-bold text-xs"
                />
              </div>
              <div className="text-xs flex items-center justify-between pt-1 border-t border-blue-200 dark:border-blue-800">
                <span className="text-slate-600 dark:text-slate-400">Monto final a recibir en destino:</span>
                <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                  {RatesService.formatMoney(calculatedDestAmount, destAccount.currency)}
                </span>
              </div>
            </div>
          )}

          {/* Category Selection (Income / Expense) */}
          {type !== 'transfer' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Categoría
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Nueva Categoría
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.type === 'both' ? 'Ingreso/Gasto' : cat.type === 'income' ? 'Ingreso' : 'Gasto'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date & Time Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Fecha y Hora
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Nota / Concepto (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Mercado semanal, Pago móvil cliente, Compra USDT..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 ${
              type === 'expense'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : type === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
            }`}
          >
            {isSuccess ? (
              <>
                <Check className="w-5 h-5 animate-bounce" />
                <span>¡Guardado Exitosamente!</span>
              </>
            ) : (
              <span>
                {type === 'expense' ? 'Registrar Egreso' : type === 'income' ? 'Registrar Ingreso' : 'Procesar Transferencia / Cambio'}
              </span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
