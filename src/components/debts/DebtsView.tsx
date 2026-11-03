import React, { useState } from 'react';
import { 
  HandCoins, 
  PlusCircle, 
  Search, 
  Filter, 
  Calendar, 
  Phone, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  ArrowRight, 
  MessageCircle, 
  Trash2, 
  CreditCard,
  Copy,
  ChevronDown,
  ChevronUp,
  Banknote,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Scale
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Debt, DebtStatus, DebtType } from '../../types';
import { RatesService } from '../../services/ratesService';

export const DebtsView: React.FC = () => {
  const { 
    debts, 
    rates, 
    setIsDebtModalOpen, 
    setIsDebtPaymentModalOpen, 
    setActiveDebtForPayment, 
    deleteDebt,
    declareDebtAsLoss,
    totalReceivableUsd,
    totalReceivableVes,
    activeReceivableCount,
    totalPayableUsd,
    totalPayableVes,
    activePayableCount,
    netDebtBalanceUsd,
    netDebtBalanceVes
  } = useApp();

  const [typeFilter, setTypeFilter] = useState<'all' | DebtType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DebtStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedDebtId(prev => prev === id ? null : id);
  };

  const handleOpenPayment = (debt: Debt) => {
    setActiveDebtForPayment(debt);
    setIsDebtPaymentModalOpen(true);
  };

  const handleDelete = (debt: Debt) => {
    const isPayable = debt.debtType === 'payable';
    const msg = isPayable 
      ? `¿Estás seguro de eliminar el registro de deuda pendiente con ${debt.debtorName}?`
      : `¿Estás seguro de eliminar el registro de deuda de ${debt.debtorName}?`;
    if (confirm(msg)) {
      deleteDebt(debt.id);
    }
  };

  const handleDeclareAsLoss = (debt: Debt) => {
    const isUSD = debt.currencyType === 'USD_USDT';
    const amountStr = isUSD ? `$${debt.remainingAmount.toFixed(2)} USD` : `${debt.remainingAmount.toLocaleString()} Bs`;
    const reason = prompt(`¿Deseas transferir esta cuenta por cobrar de ${debt.debtorName} (${amountStr}) al módulo de Pérdidas como Deuda Incobrable?\n\nIndica el motivo o presiona Aceptar:`, 'Deudor no localizable / Pérdida asumida');
    if (reason !== null) {
      declareDebtAsLoss(debt.id, reason);
    }
  };

  const generateWhatsAppMessage = (debt: Debt) => {
    const isUSD = debt.currencyType === 'USD_USDT';
    const isPayable = debt.debtType === 'payable';
    const amountInBs = isUSD ? (debt.remainingAmount * rates.bcv).toFixed(2) : debt.remainingAmount.toFixed(2);
    const amountInUsd = isUSD ? debt.remainingAmount.toFixed(2) : (rates.bcv > 0 ? (debt.remainingAmount / rates.bcv).toFixed(2) : '0.00');

    if (isPayable) {
      return `Hola ${debt.debtorName}, te saludo cordialmente. Te comparto el estado de mi saldo pendiente por "${debt.concept}":\n\n` +
        `📌 Saldo pendiente por pagarte: ${isUSD ? `$${amountInUsd} USD` : `${amountInBs} Bs`}\n` +
        `🏛️ Tasa oficial BCV hoy: ${rates.bcv} Bs/$\n` +
        `📲 Equivalente en Bs: ${amountInBs} Bs\n\n` +
        `Te estaré informando al momento de realizar el próximo abono. ¡Muchas gracias!`;
    }

    return `Hola ${debt.debtorName}, te saludo cordialmente. Te comparto el detalle de tu saldo pendiente por "${debt.concept}":\n\n` +
      `📌 Saldo pendiente: ${isUSD ? `$${amountInUsd} USD` : `${amountInBs} Bs`}\n` +
      `🏛️ Tasa oficial BCV hoy: ${rates.bcv} Bs/$\n` +
      `📲 Equivalente para Pago Móvil / Transferencia: ${amountInBs} Bs\n\n` +
      `¡Muchas gracias!`;
  };

  const handleCopyReminder = (debt: Debt) => {
    const text = generateWhatsAppMessage(debt);
    navigator.clipboard.writeText(text);
    setCopiedId(debt.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenWhatsApp = (debt: Debt) => {
    const text = encodeURIComponent(generateWhatsAppMessage(debt));
    let cleanPhone = (debt.phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '58' + cleanPhone.slice(1);
    }
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Filtered debts
  const filteredDebts = debts.filter(debt => {
    const isPayable = debt.debtType === 'payable';
    const matchesType = typeFilter === 'all' || (typeFilter === 'payable' ? isPayable : !isPayable);
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
    const matchesSearch = debt.debtorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debt.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (debt.phone && debt.phone.includes(searchQuery));
    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-amber-500" />
            Control de Deudas: Por Cobrar y Por Pagar
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Gestiona lo que te deben otras personas y tus deudas pendientes con demás personas en Bs (BCV) y Dólares ($ / USDT)
          </p>
        </div>

        <button
          onClick={() => setIsDebtModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-md shadow-amber-600/30 flex items-center gap-1.5 active:scale-95 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Registrar Deuda</span>
        </button>
      </div>

      {/* KPI Summary Cards: Por Cobrar, Por Pagar y Balance Neto */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        
        {/* Total por Cobrar (Me deben a mí) */}
        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 truncate">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                Me Deben
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {activeReceivableCount}
              </span>
            </div>
            <div className="text-lg sm:text-3xl font-black text-emerald-400">
              ${totalReceivableUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-[10px] sm:text-xs text-slate-300 font-semibold ml-1">USD</span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
              ≈ {totalReceivableVes.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
            </p>
          </div>
          <div className="text-[10px] text-emerald-300/80 mt-2 pt-1.5 border-t border-slate-800 hidden sm:block">
            Por cobrar a terceros
          </div>
        </div>

        {/* Total por Pagar (Yo debo a otros) */}
        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1 truncate">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                Yo Debo
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {activePayableCount}
              </span>
            </div>
            <div className="text-lg sm:text-3xl font-black text-rose-400">
              ${totalPayableUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-[10px] sm:text-xs text-slate-300 font-semibold ml-1">USD</span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
              ≈ {totalPayableVes.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
            </p>
          </div>
          <div className="text-[10px] text-rose-300/80 mt-2 pt-1.5 border-t border-slate-800 hidden sm:block">
            Por pagar a terceros
          </div>
        </div>

        {/* Balance Neto de Deudas */}
        <div className="col-span-2 lg:col-span-1 p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                Balance Neto
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                netDebtBalanceUsd >= 0 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {netDebtBalanceUsd >= 0 ? 'A Tu Favor' : 'Pasivo Neto'}
              </span>
            </div>
            <div className={`text-lg sm:text-3xl font-black ${
              netDebtBalanceUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {netDebtBalanceUsd >= 0 ? '+' : ''}${netDebtBalanceUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
              ≈ {netDebtBalanceVes >= 0 ? '+' : ''}{netDebtBalanceVes.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs (Tasa BCV)
            </p>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between">
            <span>BCV: <strong>{rates.bcv} Bs</strong></span>
            <span>USDT: <strong>{rates.usdt} Bs</strong></span>
          </div>
        </div>

      </div>

      {/* Type Selector Tabs (Por Cobrar vs Por Pagar) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setTypeFilter('all')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === 'all'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Todas ({debts.length})</span>
        </button>

        <button
          onClick={() => setTypeFilter('receivable')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === 'receivable'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Me Deben / Por Cobrar ({debts.filter(d => d.debtType !== 'payable').length})</span>
        </button>

        <button
          onClick={() => setTypeFilter('payable')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === 'payable'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Yo Debo / Por Pagar ({debts.filter(d => d.debtType === 'payable').length})</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/80 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pendientes ({debts.filter(d => (typeFilter === 'all' || (typeFilter === 'payable' ? d.debtType === 'payable' : d.debtType !== 'payable')) && d.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('partially_paid')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === 'partially_paid'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Con Abonos ({debts.filter(d => (typeFilter === 'all' || (typeFilter === 'payable' ? d.debtType === 'payable' : d.debtType !== 'payable')) && d.status === 'partially_paid').length})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === 'paid'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Saldados ({debts.filter(d => (typeFilter === 'all' || (typeFilter === 'payable' ? d.debtType === 'payable' : d.debtType !== 'payable')) && d.status === 'paid').length})
          </button>
          <button
            onClick={() => setStatusFilter('uncollectible')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === 'uncollectible'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Incobrables ({debts.filter(d => (typeFilter === 'all' || (typeFilter === 'payable' ? d.debtType === 'payable' : d.debtType !== 'payable')) && d.status === 'uncollectible').length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar persona o concepto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400 shadow-sm"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
        </div>

      </div>

      {/* Debts List */}
      {filteredDebts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
            <HandCoins className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {debts.length === 0 ? 'No tienes registros de deudas todavía' : 'No se encontraron deudas con esos filtros'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {debts.length === 0
              ? 'Registra tanto el dinero que te deben como las deudas pendientes que tienes con demás personas para llevar un balance financiero exacto.'
              : 'Prueba cambiando los filtros de tipo, estado o la búsqueda.'}
          </p>
          {debts.length === 0 && (
            <button
              onClick={() => setIsDebtModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all"
            >
              Registrar Primera Deuda
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDebts.map(debt => {
            const isUSD = debt.currencyType === 'USD_USDT';
            const isPayable = debt.debtType === 'payable';
            const isExpanded = expandedDebtId === debt.id;
            const isPaid = debt.status === 'paid';
            const isPartial = debt.status === 'partially_paid';

            // Percent paid
            const paidAmount = debt.originalAmount - debt.remainingAmount;
            const progressPercent = debt.originalAmount > 0 
              ? Math.min(100, Math.round((paidAmount / debt.originalAmount) * 100))
              : 0;

            // Live conversions
            const remainingInBs = isUSD 
              ? (debt.remainingAmount * rates.bcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : debt.remainingAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const remainingInUsd = isUSD
              ? debt.remainingAmount.toFixed(2)
              : (rates.bcv > 0 ? (debt.remainingAmount / rates.bcv).toFixed(2) : '0.00');

            return (
              <div
                key={debt.id}
                className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border shadow-sm transition-all flex flex-col justify-between space-y-4 ${
                  isPayable 
                    ? 'border-rose-200/80 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-800' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  
                  {/* Top card info: Type Badge, Name, status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {/* Tipo de Deuda Badge */}
                      <div className="mb-1.5">
                        {isPayable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                            <ArrowUpRight className="w-3 h-3 text-rose-500" />
                            Yo Debo (Por Pagar)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                            Me Deben (Por Cobrar)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {debt.debtorName}
                        </h4>
                        {debt.phone && (
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {debt.phone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                        {debt.concept}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isPaid ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          SALDADO
                        </span>
                      ) : debt.status === 'uncollectible' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          INCOBRABLE
                        </span>
                      ) : isPartial ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ABONADO ({progressPercent}%)
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                          isPayable
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          <AlertCircle className="w-3 h-3" />
                          PENDIENTE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dual Amount Showcase */}
                  <div className={`mt-4 p-3.5 rounded-2xl border ${
                    isPayable 
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                  }`}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className={`text-xs font-semibold ${isPayable ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {isPayable ? 'Monto que Debo Pagar:' : 'Por Cobrar:'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {isUSD ? 'Base en $ / USDT' : 'Base en Bs (BCV)'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <div className={`text-2xl font-black ${isPayable ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {isUSD ? `$${remainingInUsd} USD` : `${remainingInBs} Bs`}
                      </div>
                      {isPartial && (
                        <span className="text-xs text-slate-600 dark:text-slate-400 line-through">
                          de {isUSD ? `$${debt.originalAmount.toFixed(2)}` : `${debt.originalAmount.toLocaleString()} Bs`}
                        </span>
                      )}
                    </div>

                    {/* Venezuelan Conversion Highlight */}
                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <span className={`text-[11px] font-semibold ${isPayable ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {isUSD ? '📱 Pago Móvil a Tasa BCV hoy:' : '💵 Equivalente en USD a Tasa BCV:'}
                      </span>
                      <span className={`font-black ${isPayable ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                        {isUSD ? `${remainingInBs} Bs` : `$${remainingInUsd} USD`}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar (if partial or payments) */}
                  {isPartial && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <span>Abonado: {isUSD ? `$${paidAmount.toFixed(2)}` : `${paidAmount.toLocaleString()} Bs`}</span>
                        <span className="font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPayable ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Date details */}
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Registrado: {new Date(debt.createdAt).toLocaleDateString('es-VE')}
                    </span>
                    {debt.dueDate && (
                      <span className={`font-semibold flex items-center gap-1 ${
                        new Date(debt.dueDate) < new Date() && !isPaid ? 'text-rose-500' : ''
                      }`}>
                        Vence: {new Date(debt.dueDate).toLocaleDateString('es-VE')}
                      </span>
                    )}
                  </div>

                  {debt.notes && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40 p-2 rounded-xl italic">
                      "{debt.notes}"
                    </p>
                  )}

                  {/* Payments History Accordion */}
                  {debt.payments && debt.payments.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => toggleExpand(debt.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      >
                        <span>Historial de Pagos / Abonos ({debt.payments.length})</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className={`mt-2 space-y-1.5 pl-2 border-l-2 ${
                          isPayable ? 'border-rose-500/40' : 'border-emerald-500/40'
                        }`}>
                          {debt.payments.map((p, idx) => (
                            <div key={p.id || idx} className="text-xs flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                              <div>
                                <span className={`font-bold ${isPayable ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {isPayable ? '-' : '+'}{p.currency === 'USD' ? `$${p.amount.toFixed(2)} USD` : `${p.amount.toLocaleString()} Bs`}
                                </span>
                                {p.note && <span className="text-[11px] text-slate-600 dark:text-slate-400 block">{p.note}</span>}
                              </div>
                              <span className="text-[10px] text-slate-600 dark:text-slate-400">
                                {new Date(p.date).toLocaleDateString('es-VE')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Card Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  
                  {/* Left: WhatsApp & Copy reminder buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenWhatsApp(debt)}
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                      title={isPayable ? "Enviar notificación de saldo por WhatsApp" : "Enviar recordatorio por WhatsApp con tasa BCV del día"}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleCopyReminder(debt)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors relative"
                      title="Copiar texto para enviar por SMS o chat"
                    >
                      <Copy className="w-4 h-4" />
                      {copiedId === debt.id && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] rounded-md font-bold whitespace-nowrap shadow-md">
                          ¡Copiado!
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(debt)}
                      className="p-2 rounded-xl text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Declare as loss (Only for receivables) */}
                    {!isPaid && !isPayable && debt.status !== 'uncollectible' && (
                      <button
                        onClick={() => handleDeclareAsLoss(debt)}
                        className="p-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Declarar como Deuda Incobrable y transferir a Pérdidas"
                      >
                        <TrendingDown className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Right: Record payment button */}
                  {!isPaid && (
                    <button
                      onClick={() => handleOpenPayment(debt)}
                      className={`px-3.5 py-1.5 rounded-xl text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all ${
                        isPayable 
                          ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' 
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{isPayable ? 'Pagar / Abonar' : 'Registrar Cobro'}</span>
                    </button>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
