import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  FileText, 
  ShieldAlert, 
  AlertTriangle,
  Coins,
  PackageX,
  Flame,
  Wrench,
  Wallet,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Loss, LossCategory, Currency, SubFundType } from '../../types';
import { RatesService } from '../../services/ratesService';
import { BankLogo } from '../common/BankLogo';

const CATEGORIES: { id: LossCategory; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'damage_merchandise', label: 'Merma / Mercancía', icon: PackageX, color: '#F97316', desc: 'Productos vencidos, dañados o rotos' },
  { id: 'theft_scam', label: 'Robo o Estafa', icon: ShieldAlert, color: '#EF4444', desc: 'Phishing, estafa o sustracción de dinero' },
  { id: 'uncollectible_debt', label: 'Deuda Incobrable', icon: AlertTriangle, color: '#EAB308', desc: 'Dinero prestado que no se podrá cobrar' },
  { id: 'crypto_trading', label: 'Trading o Cripto', icon: Coins, color: '#8B5CF6', desc: 'Liquidación, mal trade o desliste' },
  { id: 'devaluation', label: 'Devaluación Cambiaria', icon: TrendingDown, color: '#EC4899', desc: 'Pérdida por salto brusco de tasa de cambio' },
  { id: 'operational', label: 'Avería / Operativo', icon: Wrench, color: '#64748B', desc: 'Daños por bajones de luz o multas' },
  { id: 'other', label: 'Otro Imprevisto', icon: Flame, color: '#DC2626', desc: 'Cualquier otra pérdida extraordinaria' },
];

export const LossModal: React.FC = () => {
  const { 
    isLossModalOpen, 
    setIsLossModalOpen, 
    accounts, 
    rates, 
    saveLoss 
  } = useApp();

  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState<LossCategory>('damage_merchandise');
  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [affectedAccountId, setAffectedAccountId] = useState('');
  const [subFund, setSubFund] = useState<SubFundType>('ves');
  const [deductFromAccount, setDeductFromAccount] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isLossModalOpen) {
      setConcept('');
      setCategory('damage_merchandise');
      setAmountStr('');
      setCurrency('USD');
      setAffectedAccountId('');
      setSubFund('ves');
      setDeductFromAccount(false);
      setDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setIsSuccess(false);
    }
  }, [isLossModalOpen]);

  if (!isLossModalOpen) return null;

  const currentAmount = parseFloat(amountStr) || 0;
  const selectedAccount = accounts.find(a => a.id === affectedAccountId);

  // Live conversions
  const previewUsd = currency === 'USD' 
    ? currentAmount 
    : (rates.bcv > 0 ? currentAmount / rates.bcv : 0);

  const previewVes = currency === 'VES' 
    ? currentAmount 
    : currentAmount * rates.bcv;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || currentAmount <= 0) return;

    const newLoss: Loss = {
      id: `loss-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      concept: concept.trim(),
      category,
      amount: currentAmount,
      currency,
      appliedRate: currency === 'USD' ? rates.usdt : rates.bcv,
      date: new Date(date).toISOString(),
      status: 'total_loss',
      recoveredAmount: 0,
      affectedAccountId: affectedAccountId || undefined,
      subFund: selectedAccount?.type === 'bank_ves' ? subFund : undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveLoss(newLoss, deductFromAccount && !!affectedAccountId);
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      setIsLossModalOpen(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Registrar Pérdida o Merma
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Audita imprevistos, desvalorización, mercancía rota o deudas incobrables
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsLossModalOpen(false)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Concept / Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Motivo o Concepto de la Pérdida *
            </label>
            <input
              type="text"
              placeholder="Ej: Mercancía descompuesta, Estafa por transferencia, Daño de motor..."
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
              autoFocus
            />
          </div>

          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Categoría del Incidente
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(c => {
                const Icon = c.icon;
                const isSelected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: c.color }} />
                      <span className="truncate">{c.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight line-clamp-1">
                      {c.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount and Currency */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Monto Perdido *
              </label>
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    currency === 'USD' 
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('VES')}
                  className={`px-3 py-1 rounded-md transition-all ${
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
                className="w-full text-2xl font-black px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-600 dark:text-slate-400">
                {currency === 'USD' ? 'USD' : 'Bs'}
              </span>
            </div>

            {/* Live Dual Reference */}
            {currentAmount > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  {currency === 'USD' ? `Equivalente en Bolívares (BCV ${rates.bcv} Bs):` : `Equivalente en Dólares (BCV ${rates.bcv} Bs):`}
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {currency === 'USD' 
                    ? `${previewVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs`
                    : `$${previewUsd.toFixed(2)} USD`}
                </span>
              </div>
            )}
          </div>

          {/* Account affected (Optional) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Cuenta Bancaria o Billetera (Opcional)
              </label>
              <div className="flex items-center gap-2">
                {selectedAccount && <BankLogo name={selectedAccount.name} size="md" />}
                <select
                  value={affectedAccountId}
                  onChange={(e) => setAffectedAccountId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">(Ninguna / Pérdida no monetaria o merma física)</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency} • Saldo: {RatesService.formatMoney(acc.currentBalance, acc.currency)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-fondo selector if Venezuelan bank */}
            {selectedAccount?.type === 'bank_ves' && (
              <div className="pt-1">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Sub-fondo afectado:
                </label>
                <select
                  value={subFund}
                  onChange={(e) => setSubFund(e.target.value as SubFundType)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700"
                >
                  <option value="ves">🏦 Cuenta Bolívares (VES)</option>
                  <option value="digital_usd">💻 Cuenta $ Digitales</option>
                  <option value="physical_usd">💵 $ Físicos</option>
                </select>
              </div>
            )}

            {/* Deduct from account balance checkbox */}
            {affectedAccountId && (
              <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deductFromAccount}
                  onChange={(e) => setDeductFromAccount(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                  Descontar este monto automáticamente del saldo de la cuenta (genera un movimiento de Egreso)
                </span>
              </label>
            )}
          </div>

          {/* Date and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Fecha del Incidente
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Notas / Detalles
              </label>
              <input
                type="text"
                placeholder="Número de denuncia, factura o testigo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsLossModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSuccess}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Registrado!</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4" />
                  <span>Guardar Pérdida</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
