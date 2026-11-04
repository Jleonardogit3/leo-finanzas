import React, { useState, useEffect } from 'react';
import { 
  X, 
  HandCoins, 
  PlusCircle, 
  Calendar, 
  Phone, 
  DollarSign, 
  Calculator, 
  FileText,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Debt, DebtCurrencyType, DebtType } from '../../types';

export const DebtModal: React.FC = () => {
  const { 
    isDebtModalOpen, 
    setIsDebtModalOpen, 
    saveDebt, 
    updateDebt,
    editingDebt,
    setEditingDebt,
    rates 
  } = useApp();

  const [debtType, setDebtType] = useState<DebtType>('receivable');
  const [debtorName, setDebtorName] = useState('');
  const [phone, setPhone] = useState('');
  const [concept, setConcept] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [currencyType, setCurrencyType] = useState<DebtCurrencyType>('USD_USDT');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isDebtModalOpen) {
      if (editingDebt) {
        setDebtType(editingDebt.debtType || 'receivable');
        setDebtorName(editingDebt.debtorName);
        setPhone(editingDebt.phone || '');
        setConcept(editingDebt.concept);
        setAmountStr(editingDebt.originalAmount.toString());
        setCurrencyType(editingDebt.currencyType);
        setDueDate(editingDebt.dueDate ? editingDebt.dueDate.slice(0, 10) : '');
        setNotes(editingDebt.notes || '');
      } else {
        setDebtType('receivable');
        setDebtorName('');
        setPhone('');
        setConcept('');
        setAmountStr('');
        setCurrencyType('USD_USDT');
        setDueDate('');
        setNotes('');
      }
    }
  }, [isDebtModalOpen, editingDebt]);

  if (!isDebtModalOpen) return null;

  const currentAmount = parseFloat(amountStr) || 0;
  const isPayable = debtType === 'payable';

  // Conversion previews
  const previewVesAtBcv = (currencyType === 'USD_USDT' && rates.bcv > 0)
    ? (currentAmount * rates.bcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  const previewVesAtUsdt = (currencyType === 'USD_USDT' && rates.usdt > 0)
    ? (currentAmount * rates.usdt).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  const previewUsdAtBcv = (currencyType === 'VES_BCV' && rates.bcv > 0)
    ? (currentAmount / rates.bcv).toFixed(2)
    : '0.00';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorName.trim() || currentAmount <= 0) return;

    const appliedRate = currencyType === 'VES_BCV' ? rates.bcv : rates.usdt;

    if (editingDebt) {
      const totalPaid = editingDebt.payments 
        ? editingDebt.payments.reduce((sum, p) => sum + p.amount, 0)
        : 0;
      const newRemaining = Math.max(0, currentAmount - totalPaid);
      let newStatus = editingDebt.status;
      if (newRemaining <= 0) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partially_paid';
      } else {
        newStatus = 'pending';
      }

      const updatedDebt: Debt = {
        ...editingDebt,
        debtType,
        debtorName: debtorName.trim(),
        phone: phone.trim() || undefined,
        concept: concept.trim() || (isPayable ? 'Deuda Pendiente por Pagar' : 'Préstamo / Cuenta por Cobrar'),
        originalAmount: currentAmount,
        currencyType,
        appliedRateAtCreation: editingDebt.appliedRateAtCreation || appliedRate,
        remainingAmount: newRemaining,
        status: newStatus,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString()
      };

      updateDebt(updatedDebt);
    } else {
      const newDebt: Debt = {
        id: `debt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        debtType,
        debtorName: debtorName.trim(),
        phone: phone.trim() || undefined,
        concept: concept.trim() || (isPayable ? 'Deuda Pendiente por Pagar' : 'Préstamo / Cuenta por Cobrar'),
        originalAmount: currentAmount,
        currencyType,
        appliedRateAtCreation: appliedRate,
        remainingAmount: currentAmount,
        status: 'pending',
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        payments: []
      };

      saveDebt(newDebt);
    }

    setEditingDebt(null);
    setIsDebtModalOpen(false);

    // Reset fields
    setDebtorName('');
    setPhone('');
    setConcept('');
    setAmountStr('');
    setDueDate('');
    setNotes('');
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
                  <span>{editingDebt ? 'Editar Deuda por Pagar' : 'Registrar Deuda por Pagar (Yo Debo)'}</span>
                </>
              ) : (
                <>
                  <HandCoins className="w-5 h-5 text-amber-500" />
                  <span>{editingDebt ? 'Editar Cuenta por Cobrar' : 'Registrar Cuenta por Cobrar (Me Deben)'}</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {editingDebt 
                ? 'Modifica los montos, deudor o condiciones acordadas'
                : (isPayable 
                  ? 'Dinero que tienes pendiente de pagar a otra persona o comercio'
                  : 'Dinero que otras personas o clientes te deben a ti')
              }
            </p>
          </div>
          <button 
            onClick={() => {
              setEditingDebt(null);
              setIsDebtModalOpen(false);
            }}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Selector de Tipo: Me deben (Por Cobrar) vs Yo debo (Por Pagar) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Tipo de Deuda *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setDebtType('receivable')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  debtType === 'receivable'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>Me Deben (Por Cobrar)</span>
              </button>

              <button
                type="button"
                onClick={() => setDebtType('payable')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  debtType === 'payable'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-200" />
                <span>Yo Debo (Por Pagar)</span>
              </button>
            </div>
          </div>

          {/* Name and Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                {isPayable ? 'Persona o Comercio a quien le debo *' : 'Nombre de la Persona que me debe *'}
              </label>
              <input
                type="text"
                placeholder={isPayable ? "Ej: Proveedor Juan, Amigo Pedro..." : "Ej: Carlos Gómez, Tienda ABC..."}
                value={debtorName}
                onChange={(e) => setDebtorName(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 ${
                  isPayable ? 'focus:ring-rose-500' : 'focus:ring-amber-500'
                }`}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Teléfono / WhatsApp (Opcional)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="0414-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 ${
                    isPayable ? 'focus:ring-rose-500' : 'focus:ring-amber-500'
                  }`}
                />
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </div>

          {/* Concept / Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Concepto o Motivo del Pendiente *
            </label>
            <input
              type="text"
              placeholder={isPayable 
                ? "Ej: Préstamo que me hicieron, Compra a crédito, Servicio técnico pendiente..." 
                : "Ej: Venta de mercancía, Préstamo personal, Trabajo de diseño..."
              }
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 ${
                isPayable ? 'focus:ring-rose-500' : 'focus:ring-amber-500'
              }`}
              required
            />
          </div>

          {/* Currency Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Modalidad de Moneda
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setCurrencyType('USD_USDT')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  currencyType === 'USD_USDT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Dólares ($ / USDT)</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrencyType('VES_BCV')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  currencyType === 'VES_BCV'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Bolívares (Tasa BCV)</span>
              </button>
            </div>
          </div>

          {/* Amount Card with Live Venezuelan Dual Conversions */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              {isPayable ? 'Monto que Debo Pagar' : 'Monto que me Deben'} {currencyType === 'USD_USDT' ? 'en Dólares ($)' : 'en Bolívares (Bs)'} *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className={`w-full text-2xl font-black px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 placeholder:text-slate-400 ${
                  isPayable ? 'focus:ring-rose-500' : 'focus:ring-amber-500'
                }`}
                required
              />
              <span className="absolute right-4 top-3 text-sm font-black text-slate-600 dark:text-slate-400">
                {currencyType === 'USD_USDT' ? '$ USD' : 'Bs VES'}
              </span>
            </div>

            {/* Live Equivalence Box */}
            {currentAmount > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Equivalente en Tasa BCV ({rates.bcv} Bs/$):</span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">
                    {currencyType === 'USD_USDT' ? `${previewVesAtBcv} Bs` : `$${previewUsdAtBcv} USD`}
                  </span>
                </div>

                {currencyType === 'USD_USDT' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Equivalente en USDT ({rates.usdt} Bs/$):</span>
                    </span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      {previewVesAtUsdt} Bs
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Due Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Fecha Límite / Vencimiento
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 ${
                    isPayable ? 'focus:ring-rose-500' : 'focus:ring-amber-500'
                  }`}
                />
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-600 dark:text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Nota o Detalle Adicional
              </label>
              <input
                type="text"
                placeholder={isPayable ? "Ej: Acordé pagar quincenal..." : "Ej: Acordó pagar la mitad el 15..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 ${
                  isPayable ? 'focus:ring-rose-500' : 'focus:ring-amber-500'
                }`}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 ${
                isPayable
                  ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-rose-600/30'
                  : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-600/30'
              }`}
            >
              {editingDebt ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              <span>
                {editingDebt 
                  ? 'Guardar Modificación' 
                  : (isPayable ? 'Guardar Deuda por Pagar' : 'Guardar Deudor Pendiente')
                }
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
