import React, { useState } from 'react';
import { 
  TrendingDown, 
  PlusCircle, 
  Search, 
  Filter, 
  Calendar, 
  AlertTriangle, 
  ShieldAlert, 
  PackageX, 
  Coins, 
  Flame, 
  Wrench, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  TrendingUp,
  FileText,
  DollarSign,
  Pencil
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Loss, LossCategory, LossStatus } from '../../types';
import { RatesService } from '../../services/ratesService';

export const LossesView: React.FC = () => {
  const { 
    losses, 
    rates, 
    setIsLossModalOpen, 
    setEditingLoss,
    setIsLossRecoveryModalOpen, 
    setActiveLossForRecovery, 
    deleteLoss,
    totalLossesUsd,
    totalLossesVes,
    monthlyLossesUsd,
    lossesCount
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<'all' | LossCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | LossStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getCategoryMeta = (cat: LossCategory) => {
    switch (cat) {
      case 'damage_merchandise':
        return { label: 'Merma / Mercancía', icon: PackageX, color: '#F97316', bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' };
      case 'theft_scam':
        return { label: 'Robo o Estafa', icon: ShieldAlert, color: '#EF4444', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'uncollectible_debt':
        return { label: 'Deuda Incobrable', icon: AlertTriangle, color: '#EAB308', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'crypto_trading':
        return { label: 'Trading / Cripto', icon: Coins, color: '#8B5CF6', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
      case 'devaluation':
        return { label: 'Devaluación', icon: TrendingDown, color: '#EC4899', bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' };
      case 'operational':
        return { label: 'Avería / Multa', icon: Wrench, color: '#64748B', bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' };
      default:
        return { label: 'Otro Imprevisto', icon: Flame, color: '#DC2626', bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' };
    }
  };

  const handleOpenRecovery = (loss: Loss) => {
    setActiveLossForRecovery(loss);
    setIsLossRecoveryModalOpen(true);
  };

  const handleDelete = (loss: Loss) => {
    if (confirm(`¿Estás seguro de eliminar el registro de pérdida "${loss.concept}"?`)) {
      deleteLoss(loss.id);
    }
  };

  const handleEdit = (loss: Loss) => {
    setEditingLoss(loss);
    setIsLossModalOpen(true);
  };

  // Filtered losses
  const filteredLosses = losses.filter(loss => {
    const matchesCategory = categoryFilter === 'all' || loss.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || loss.status === statusFilter;
    const matchesSearch = loss.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loss.notes && loss.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Calculate recovered totals
  const totalRecoveredUsd = losses.reduce((sum, l) => {
    const rec = l.recoveredAmount || 0;
    if (rec <= 0) return sum;
    if (l.currency === 'USD') return sum + rec;
    return sum + (rates.bcv > 0 ? rec / rates.bcv : 0);
  }, 0);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-rose-500" />
            Control de Pérdidas, Mermas e Imprevistos
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Registro y auditoría de mermas de inventario, estafas, deudas incobrables y pérdidas cambiarias
          </p>
        </div>

        <button
          onClick={() => setIsLossModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 active:scale-95 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Registrar Pérdida</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Pérdidas Netas en USD */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 text-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Pérdidas Netas (USD)
            </span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-300">
            ${totalLossesUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ≈ {(totalLossesUsd * rates.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs a tasa BCV
          </p>
        </div>

        {/* Pérdidas en Bolívares */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Equivalente en Bolívares
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400">
              BCV
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {totalLossesVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Calculado con Tasa BCV Oficial ({rates.bcv} Bs/$)
          </p>
        </div>

        {/* Pérdidas de este mes */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Este Mes
            </span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            ${monthlyLossesUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {lossesCount} {lossesCount === 1 ? 'incidente registrado' : 'incidentes registrados'}
          </p>
        </div>

        {/* Total Recuperado */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Recuperado / Mitigado
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            ${totalRecoveredUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Fondos restituidos por seguros o acuerdos
          </p>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por concepto o notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === 'all'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas ({losses.length})
            </button>
            <button
              onClick={() => setStatusFilter('total_loss')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === 'total_loss'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pérdida Total
            </button>
            <button
              onClick={() => setStatusFilter('partially_recovered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === 'partially_recovered'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Parcialmente Recuperada
            </button>
            <button
              onClick={() => setStatusFilter('recovered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === 'recovered'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Recuperada
            </button>
          </div>

        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              categoryFilter === 'all' 
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todas las Categorías
          </button>
          <button
            onClick={() => setCategoryFilter('damage_merchandise')}
            className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
              categoryFilter === 'damage_merchandise' 
                ? 'bg-orange-500 text-white' 
                : 'text-slate-600 dark:text-slate-400 hover:text-orange-500'
            }`}
          >
            📦 Merma / Mercancía
          </button>
          <button
            onClick={() => setCategoryFilter('theft_scam')}
            className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
              categoryFilter === 'theft_scam' 
                ? 'bg-rose-500 text-white' 
                : 'text-slate-600 dark:text-slate-400 hover:text-rose-500'
            }`}
          >
            🛡️ Robo o Estafa
          </button>
          <button
            onClick={() => setCategoryFilter('uncollectible_debt')}
            className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
              categoryFilter === 'uncollectible_debt' 
                ? 'bg-amber-500 text-white' 
                : 'text-slate-600 dark:text-slate-400 hover:text-amber-500'
            }`}
          >
            ⚠️ Deuda Incobrable
          </button>
          <button
            onClick={() => setCategoryFilter('crypto_trading')}
            className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
              categoryFilter === 'crypto_trading' 
                ? 'bg-purple-500 text-white' 
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-500'
            }`}
          >
            🪙 Trading / Cripto
          </button>
          <button
            onClick={() => setCategoryFilter('devaluation')}
            className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
              categoryFilter === 'devaluation' 
                ? 'bg-pink-500 text-white' 
                : 'text-slate-600 dark:text-slate-400 hover:text-pink-500'
            }`}
          >
            📉 Devaluación
          </button>
        </div>

      </div>

      {/* Losses List */}
      {filteredLosses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-rose-500/10 text-rose-500 mb-3 border border-rose-500/20">
            <TrendingDown className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {losses.length === 0 ? 'No tienes pérdidas registradas' : 'No se encontraron pérdidas con esos filtros'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {losses.length === 0 
              ? 'Llevar registro de mermas e imprevistos protege la contabilidad real de tu negocio y finanzas personales.'
              : 'Prueba cambiando el término de búsqueda o seleccionando otro filtro de estado.'}
          </p>
          {losses.length === 0 && (
            <button
              onClick={() => setIsLossModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Primera Pérdida</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLosses.map(loss => {
            const meta = getCategoryMeta(loss.category);
            const CatIcon = meta.icon;
            const isUSD = loss.currency === 'USD';
            const unrecovered = Math.max(0, loss.amount - (loss.recoveredAmount || 0));
            const isFullyRecovered = loss.status === 'recovered';
            const isPartial = loss.status === 'partially_recovered' && (loss.recoveredAmount || 0) > 0;
            const progressPercent = Math.min(100, Math.round(((loss.recoveredAmount || 0) / loss.amount) * 100));

            const equivVes = isUSD 
              ? (unrecovered * rates.bcv).toLocaleString('es-VE', { maximumFractionDigits: 0 }) 
              : unrecovered.toLocaleString('es-VE', { maximumFractionDigits: 2 });

            const equivUsd = isUSD 
              ? unrecovered.toFixed(2) 
              : (rates.bcv > 0 ? (unrecovered / rates.bcv).toFixed(2) : '0.00');

            return (
              <div 
                key={loss.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  
                  {/* Category and Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${meta.bg}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>

                    <div>
                      {isFullyRecovered ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          RECUPERADA
                        </span>
                      ) : isPartial ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          RECUPERADO ({progressPercent}%)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          PÉRDIDA TOTAL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Concept / Reason */}
                  <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {loss.concept}
                  </h4>

                  {/* Amount Showcase */}
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Pérdida Neta no Recuperada:
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {isUSD ? '$ USD' : 'Bs VES'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                        {isUSD ? `$${equivUsd} USD` : `${equivVes} Bs`}
                      </div>
                      {isPartial && (
                        <span className="text-xs text-slate-600 dark:text-slate-400 line-through">
                          de {isUSD ? `$${loss.amount.toFixed(2)}` : `${loss.amount.toLocaleString()} Bs`}
                        </span>
                      )}
                    </div>

                    {/* Dual Reference */}
                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {isUSD ? '📱 Equivalente en Bs (BCV):' : '💵 Equivalente en USD (BCV):'}
                      </span>
                      <span className="font-black text-slate-800 dark:text-slate-200">
                        {isUSD ? `${equivVes} Bs` : `$${equivUsd} USD`}
                      </span>
                    </div>
                  </div>

                  {/* Recovery Progress Bar */}
                  {isPartial && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <span>Recuperado: {isUSD ? `$${loss.recoveredAmount?.toFixed(2)}` : `${loss.recoveredAmount?.toLocaleString()} Bs`}</span>
                        <span className="font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Meta Details */}
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(loss.date).toLocaleDateString('es-VE')}
                    </span>
                    {loss.linkedDebtId && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        Deuda Incobrable
                      </span>
                    )}
                  </div>

                  {loss.notes && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40 p-2 rounded-xl italic">
                      "{loss.notes}"
                    </p>
                  )}

                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEdit(loss)}
                      className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      title="Editar registro de pérdida"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(loss)}
                      className="p-2 rounded-xl text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!isFullyRecovered && (
                    <button
                      onClick={() => handleOpenRecovery(loss)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Recuperar Fondos</span>
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
