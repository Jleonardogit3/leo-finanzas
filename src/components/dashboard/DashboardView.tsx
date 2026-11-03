import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowLeftRight, 
  Calendar,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  PlusCircle,
  Clock,
  Coins,
  DollarSign,
  HandCoins
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { RatesService } from '../../services/ratesService';
import { TimeFilter } from '../../types';

export const DashboardView: React.FC = () => {
  const { 
    totalNetWorthUsdBcv, 
    totalNetWorthUsdUsdt, 
    totalLiquidVes, 
    totalLiquidUsd, 
    vesRatioPercent, 
    usdRatioPercent,
    rates, 
    filteredTransactions,
    transactions,
    accounts,
    timeFilter, 
    setTimeFilter,
    setIsTxModalOpen,
    setIsRatesModalOpen,
    setCurrentView,
    totalPendingDebtsUsd,
    totalReceivableUsd,
    totalPayableUsd,
    activePayableCount,
    totalLossesUsd,
    activeDebtorsCount,
    lossesCount
  } = useApp();

  // Period Metrics (Income, Expense, Net)
  const { periodIncomeUsd, periodExpenseUsd, netSavingsUsd, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;

    filteredTransactions.forEach(t => {
      const valUsd = RatesService.convert(t.amount, t.currency, 'USD', 'USDT', rates);
      if (t.type === 'income') {
        inc += valUsd;
      } else if (t.type === 'expense') {
        exp += valUsd;
      }
    });

    const net = inc - exp;
    const rate = inc > 0 ? (net / inc) * 100 : 0;

    return {
      periodIncomeUsd: inc,
      periodExpenseUsd: exp,
      netSavingsUsd: net,
      savingsRate: Number(rate.toFixed(1))
    };
  }, [filteredTransactions, rates]);

  // Income vs Expense Chart Data (Monthly historical trend)
  const incomeExpenseChartData = useMemo(() => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const dataMap: Record<string, { name: string; Ingresos: number; Egresos: number }> = {};

    // Generate last 6 months buckets
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      dataMap[key] = {
        name: monthNames[d.getMonth()],
        Ingresos: 0,
        Egresos: 0
      };
    }

    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (dataMap[key]) {
        const valUsd = RatesService.convert(t.amount, t.currency, 'USD', 'USDT', rates);
        if (t.type === 'income') {
          dataMap[key].Ingresos = Number((dataMap[key].Ingresos + valUsd).toFixed(2));
        } else if (t.type === 'expense') {
          dataMap[key].Egresos = Number((dataMap[key].Egresos + valUsd).toFixed(2));
        }
      }
    });

    return Object.values(dataMap);
  }, [transactions, rates]);

  // Category Distribution Chart Data (for current filtered period)
  const categoryChartData = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {};

    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        const valUsd = RatesService.convert(t.amount, t.currency, 'USD', 'USDT', rates);
        if (!map[t.categoryName]) {
          map[t.categoryName] = {
            name: t.categoryName,
            value: 0,
            color: t.categoryColor || '#3B82F6'
          };
        }
        map[t.categoryName].value = Number((map[t.categoryName].value + valUsd).toFixed(2));
      }
    });

    const result = Object.values(map).sort((a, b) => b.value - a.value);
    // If empty, supply placeholder item
    if (result.length === 0) {
      return [{ name: 'Sin egresos registrados', value: 1, color: '#94A3B8' }];
    }
    return result;
  }, [filteredTransactions, rates]);

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-8">
      
      {/* Top Banner: Dual Net Worth & Brecha Cambiaria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Card 1: Dual Net Worth (BCV vs USDT) */}
        <div className="lg:col-span-2 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Patrimonio Total Consolidado
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Dual USD
                </span>
              </div>
              
              {/* Primary Real Val: USDT */}
              <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  ${totalNetWorthUsdUsdt.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-400">USD Real (USDT)</span>
              </div>

              {/* Secondary Val: BCV Equivalent */}
              <div className="mt-1 flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-300">
                <span>Calculado a Tasa BCV:</span>
                <span className="font-bold text-amber-300">
                  ${totalNetWorthUsdBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>

            {/* Brecha Cambiaria Ticker Badge */}
            <div 
              onClick={() => setIsRatesModalOpen(true)}
              className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 transition-all cursor-pointer flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start shadow-inner"
            >
              <div className="text-left sm:text-right">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">Brecha Cambiaria:</span>
                <div className="text-[9px] sm:text-[10px] text-slate-400">BCV: {rates.bcv} | USDT: {rates.usdt}</div>
              </div>
              <div className="flex items-center gap-1 mt-0 sm:mt-0.5 ml-2 sm:ml-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                <span className="text-base sm:text-lg font-black text-rose-400">
                  +{rates.spreadPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Currency Liquidity Balance Progress */}
          <div className="mt-3.5 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-800/80 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-xs mb-1.5 font-semibold gap-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Coins className="w-3.5 h-3.5" />
                Dólares / USDT: {usdRatioPercent}% ({totalLiquidUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} $)
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                Bolívares: {vesRatioPercent}% ({totalLiquidVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs)
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${usdRatioPercent}%` }} 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" 
                title={`USD/USDT: ${usdRatioPercent}%`}
              />
              <div 
                style={{ width: `${vesRatioPercent}%` }} 
                className="h-full bg-blue-500" 
                title={`VES: ${vesRatioPercent}%`}
              />
            </div>

            {vesRatioPercent > 20 && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Riesgo de devaluación moderado: Tienes más del 20% en bolívares.</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Period Cashflow Summary */}
        <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Flujo del Período
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Ahorro: {savingsRate}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-xs font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Ingresos</span>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5 sm:mt-1">
                  ${periodIncomeUsd.toFixed(2)}
                </div>
                <span className="text-[9px] sm:text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block truncate">
                  ≈ {(periodIncomeUsd * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
                </span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40">
                <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300 text-[11px] sm:text-xs font-medium">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Egresos</span>
                </div>
                <div className="text-base sm:text-lg font-black text-rose-700 dark:text-rose-300 mt-0.5 sm:mt-1">
                  ${periodExpenseUsd.toFixed(2)}
                </div>
                <span className="text-[9px] sm:text-[10px] text-rose-600/80 dark:text-rose-400/80 block truncate">
                  ≈ {(periodExpenseUsd * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">Balance Neto:</span>
            <span className={`text-sm sm:text-base font-black ${netSavingsUsd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netSavingsUsd >= 0 ? '+' : ''}${netSavingsUsd.toFixed(2)} USD
            </span>
          </div>
        </div>

      </div>

      {/* Quick Summary Strip: Deudas & Pérdidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
        
        {/* Deudas & Cuentas por Cobrar */}
        <div 
          onClick={() => setCurrentView('debts')}
          className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-400 dark:hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Control de Deudas (Cobrar / Pagar)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400" title="Por Cobrar">
                  +${totalReceivableUsd.toFixed(2)}
                </span>
                {totalPayableUsd > 0 && (
                  <span className="text-base font-black text-rose-500 dark:text-rose-400" title="Por Pagar (Lo que debo)">
                    / -${totalPayableUsd.toFixed(2)}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-bold">USD</span>
              </div>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">
                {activeDebtorsCount} por cobrar {activePayableCount > 0 ? `• ${activePayableCount} por pagar` : ''}
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
            Ver &rarr;
          </span>
        </div>

        {/* Pérdidas & Mermas */}
        <div 
          onClick={() => setCurrentView('losses')}
          className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-rose-400 dark:hover:border-rose-500/50 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Pérdidas & Mermas
              </span>
              <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                ${totalLossesUsd.toFixed(2)} USD
              </div>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">
                {lossesCount > 0 ? `${lossesCount} incidentes registrados` : 'Sin pérdidas registradas'}
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition-transform">
            Auditar &rarr;
          </span>
        </div>

      </div>

      {/* Period Filter Selector (Diaria, Semanal, Mensual, Anual) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Auditoría Temporal
          </h2>
        </div>

        <div className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/50 dark:border-slate-700 text-xs font-semibold">
          {(['daily', 'weekly', 'monthly', 'yearly'] as TimeFilter[]).map((filter) => {
            const labels: Record<TimeFilter, string> = {
              daily: 'Diaria',
              weekly: 'Semanal',
              monthly: 'Mensual',
              yearly: 'Anual'
            };
            const isActive = timeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {labels[filter]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts Section: Income vs Expense & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Income vs Expenses Bars */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Comparativo Ingresos vs Egresos
              </h3>
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-400">Valores en USD</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeExpenseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderColor: '#334155', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(val: number) => [`$${val.toFixed(2)} USD`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Ingresos" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Egresos" fill="#F43F5E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Expense Distribution Donut Chart */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-purple-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Distribución de Gastos por Categoría
              </h3>
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-400">Período Seleccionado</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderColor: '#334155', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(val: number) => [`$${val.toFixed(2)} USD`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Recent Movements List */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Últimos Movimientos
            </h3>
          </div>
          <button
            onClick={() => setCurrentView('transactions')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Ver todos ({transactions.length})
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              No tienes movimientos registrados todavía.
            </p>
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              Registrar Primer Movimiento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {recentTransactions.map((tx) => {
              const account = accounts.find(a => a.id === tx.accountId);
              const toAccount = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : null;
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isIncome 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                        : isTransfer 
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    }`}>
                      {isIncome ? <ArrowUpRight className="w-4 h-4" /> : isTransfer ? <ArrowLeftRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {tx.categoryName}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <span>{account?.name || 'Cuenta'}</span>
                        {toAccount && <span>→ {toAccount.name}</span>}
                        <span>• {new Date(tx.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs sm:text-sm font-black ${
                      isIncome 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : isTransfer
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}{RatesService.formatMoney(tx.amount, tx.currency)}
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">
                      {tx.currency === 'VES' 
                        ? `≈ $${(tx.amount / (rates.usdt || 1)).toFixed(2)} USD` 
                        : `≈ ${(tx.amount * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
