import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  Search, 
  Filter, 
  ArrowLeftRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  HandCoins, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  Sliders, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Coins, 
  PieChart as PieIcon, 
  Check, 
  Trash2,
  Calendar,
  History,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UnifiedActivityItem, ActivityEntityType } from '../../types';
import { RatesService } from '../../services/ratesService';

export const HistoryView: React.FC = () => {
  const { 
    unifiedActivities, 
    revertItem, 
    rates,
    setCurrentView 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ActivityEntityType>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activeItemForRevert, setActiveItemForRevert] = useState<UnifiedActivityItem | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Statistics counters
  const stats = useMemo(() => {
    let totalTxs = 0;
    let totalDebts = 0;
    let totalLosses = 0;
    let totalAdjustments = 0;

    unifiedActivities.forEach(item => {
      if (item.entityType === 'transaction') totalTxs++;
      else if (item.entityType === 'debt' || item.entityType === 'debt_payment') totalDebts++;
      else if (item.entityType === 'loss' || item.entityType === 'loss_recovery') totalLosses++;
      else if (item.entityType === 'account_adjustment') totalAdjustments++;
    });

    return {
      total: unifiedActivities.length,
      txs: totalTxs,
      debts: totalDebts,
      losses: totalLosses,
      adjustments: totalAdjustments
    };
  }, [unifiedActivities]);

  // Filtered and sorted activity list
  const filteredActivities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return unifiedActivities
      .filter(item => {
        // Type filter
        if (typeFilter !== 'all') {
          if (typeFilter === 'debt') {
            if (item.entityType !== 'debt' && item.entityType !== 'debt_payment') return false;
          } else if (typeFilter === 'loss') {
            if (item.entityType !== 'loss' && item.entityType !== 'loss_recovery') return false;
          } else if (item.entityType !== typeFilter) {
            return false;
          }
        }

        // Search query
        if (q) {
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q) || false;
          const matchAcc = item.accountName?.toLowerCase().includes(q) || false;
          const matchToAcc = item.toAccountName?.toLowerCase().includes(q) || false;
          const matchCat = item.categoryName?.toLowerCase().includes(q) || false;
          const matchAmount = item.amount?.toString().includes(q) || false;
          if (!matchTitle && !matchDesc && !matchAcc && !matchToAcc && !matchCat && !matchAmount) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date || a.createdAt).getTime();
        const timeB = new Date(b.date || b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [unifiedActivities, typeFilter, searchQuery, sortOrder]);

  const handleOpenRevertModal = (item: UnifiedActivityItem) => {
    setActiveItemForRevert(item);
  };

  const handleConfirmRevert = async () => {
    if (!activeItemForRevert) return;
    setIsReverting(true);
    try {
      const res = await revertItem(activeItemForRevert);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setActiveItemForRevert(null);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error al ejecutar reversión.' });
    } finally {
      setIsReverting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const formatSubfundLabel = (sub?: string) => {
    if (sub === 'digital_usd') return '$ Digital';
    if (sub === 'physical_usd') return '$ Físico';
    if (sub === 'ves') return 'Bs';
    return null;
  };

  const getItemVisuals = (item: UnifiedActivityItem) => {
    switch (item.badgeVariant) {
      case 'income':
        return {
          icon: ArrowUpRight,
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          amountColor: 'text-emerald-600 dark:text-emerald-400',
          prefix: '+'
        };
      case 'expense':
        return {
          icon: ArrowDownRight,
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          amountColor: 'text-rose-600 dark:text-rose-400',
          prefix: '-'
        };
      case 'transfer':
        return {
          icon: ArrowLeftRight,
          badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          amountColor: 'text-blue-600 dark:text-blue-400',
          prefix: '⇄ '
        };
      case 'debt':
        return {
          icon: HandCoins,
          badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          amountColor: 'text-amber-600 dark:text-amber-400',
          prefix: '⏳ '
        };
      case 'loss':
        return {
          icon: TrendingDown,
          badgeBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          amountColor: 'text-red-600 dark:text-red-400',
          prefix: '▼ '
        };
      case 'account':
        return {
          icon: Sliders,
          badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          amountColor: 'text-purple-600 dark:text-purple-400',
          prefix: '⚙ '
        };
      case 'goal':
        return {
          icon: TrendingUp,
          badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
          amountColor: 'text-teal-600 dark:text-teal-400',
          prefix: '🎯 '
        };
      case 'portfolio':
        return {
          icon: PieIcon,
          badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          amountColor: 'text-indigo-600 dark:text-indigo-400',
          prefix: '📈 '
        };
      default:
        return {
          icon: Clock,
          badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
          amountColor: 'text-slate-700 dark:text-slate-200',
          prefix: ''
        };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-8">
      
      {/* Toast Alert Feedback */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border shadow-lg transition-all animate-in fade-in slide-in-from-top-4 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-semibold">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 rounded-lg hover:bg-black/10">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                Historial General & Auditoría
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
                Visualiza cada movimiento, deuda, pérdida o ajuste con opción de eliminarlo y restaurar el saldo previo.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Return to Dashboard button */}
        <button
          onClick={() => setCurrentView('dashboard')}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <span>Ir al Dashboard</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-semibold">Total Registros</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Operaciones en historial</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-semibold">Movimientos</span>
            <ArrowLeftRight className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.txs}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Ingresos, gastos y transf.</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-semibold">Deudas & Pagos</span>
            <HandCoins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.debts}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Cuentas por cobrar y abonos</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-semibold">Pérdidas & Ajustes</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.losses + stats.adjustments}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Mermas y cambios de saldo</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por concepto, banco, deudor, nota o monto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Order Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
              title="Cambiar orden cronológico"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>{sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'Todos', count: stats.total },
            { id: 'transaction', label: 'Movimientos', count: stats.txs },
            { id: 'debt', label: 'Deudas & Pagos', count: stats.debts },
            { id: 'loss', label: 'Pérdidas', count: stats.losses },
            { id: 'account_adjustment', label: 'Ajustes de Cuenta', count: stats.adjustments },
            { id: 'goal', label: 'Metas', count: unifiedActivities.filter(a => a.entityType === 'goal').length },
            { id: 'portfolio', label: 'Inversiones', count: unifiedActivities.filter(a => a.entityType === 'portfolio').length },
          ].map(tab => {
            const isActive = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Activities Timeline / Feed */}
      <div className="space-y-2.5 sm:space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No hay operaciones que coincidan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Prueba cambiando el filtro de búsqueda o el tipo de registro seleccionado.
            </p>
          </div>
        ) : (
          filteredActivities.map((item) => {
            const visual = getItemVisuals(item);
            const Icon = visual.icon;
            const subLabel = formatSubfundLabel(item.subFund);
            const toSubLabel = formatSubfundLabel(item.toSubFund);
            const isVes = item.currency === 'VES';
            const convertedApprox = rates.usdt > 0 && item.amount !== undefined
              ? (isVes ? item.amount / rates.usdt : item.amount * rates.usdt)
              : 0;

            return (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left Side: Icon & Details */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${visual.badgeBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      {item.statusBadge && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.statusBadge}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                      {item.description}
                    </p>

                    {/* Metadata tags: Accounts, funds and date */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                      {item.accountName && (
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <Wallet className="w-3 h-3 text-emerald-500" />
                          {item.accountName}
                          {subLabel && <span className="text-emerald-600 dark:text-emerald-400">({subLabel})</span>}
                        </span>
                      )}

                      {item.toAccountName && (
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          → {item.toAccountName}
                          {toSubLabel && <span className="text-blue-500">({toSubLabel})</span>}
                        </span>
                      )}

                      <span>•</span>
                      <span>
                        {new Date(item.date || item.createdAt).toLocaleString('es-VE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Amount and Revert Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {item.amount !== undefined && (
                    <div className="text-left sm:text-right">
                      <div className={`text-sm sm:text-base font-black tracking-tight ${visual.amountColor}`}>
                        {visual.prefix}{RatesService.formatMoney(item.amount, item.currency || 'USD')}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isVes 
                          ? `≈ $${convertedApprox.toFixed(2)} USD` 
                          : `≈ ${convertedApprox.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs`}
                      </div>
                    </div>
                  )}

                  {/* Revert Button */}
                  <button
                    onClick={() => handleOpenRevertModal(item)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 hover:border-rose-300 dark:border-slate-700 dark:hover:border-rose-800 flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                    title="Eliminar este registro y restaurar el saldo al punto antes de la modificación"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Deshacer</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Confirmación de Reversión */}
      {activeItemForRevert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Confirmar Reversión
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Elimina la operación y restaura el estado financiero anterior
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveItemForRevert(null)}
                disabled={isReverting}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Item Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                {activeItemForRevert.title}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                {activeItemForRevert.description}
              </p>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                <span>Fecha: {new Date(activeItemForRevert.date || activeItemForRevert.createdAt).toLocaleString('es-VE')}</span>
                {activeItemForRevert.amount !== undefined && (
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {RatesService.formatMoney(activeItemForRevert.amount, activeItemForRevert.currency || 'USD')}
                  </span>
                )}
              </div>
            </div>

            {/* Impact Explanation Box */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200">
                    Impacto financiero de la reversión:
                  </div>
                  <p className="leading-relaxed">
                    {activeItemForRevert.impactExplanation}
                  </p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 pt-1">
                    Esta acción actualizará de forma atómica tus saldos locales y en la nube.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveItemForRevert(null)}
                disabled={isReverting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRevert}
                disabled={isReverting}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 active:scale-95 transition-all flex items-center gap-1.5"
              >
                {isReverting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Revirtiendo...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Sí, Eliminar y Revertir Saldo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

