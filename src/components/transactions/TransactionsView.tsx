import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Trash2, 
  PlusCircle, 
  Calendar,
  Wallet,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RatesService } from '../../services/ratesService';
import { TimeFilter, TransactionType } from '../../types';

export const TransactionsView: React.FC = () => {
  const { 
    transactions, 
    accounts, 
    categories, 
    rates, 
    deleteTransaction, 
    setIsTxModalOpen,
    timeFilter,
    setTimeFilter 
  } = useApp();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  // Filter transactions
  const filteredList = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      // Search query filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCat = t.categoryName.toLowerCase().includes(q);
        const matchNote = t.note?.toLowerCase().includes(q) || false;
        if (!matchCat && !matchNote) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) {
        return false;
      }

      // Account filter
      if (selectedAccount !== 'all' && t.accountId !== selectedAccount && t.toAccountId !== selectedAccount) {
        return false;
      }

      // Time period filter
      const txDate = new Date(t.date);
      if (timeFilter === 'daily') {
        return txDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'weekly') {
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (timeFilter === 'monthly') {
        return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
      }
      if (timeFilter === 'yearly') {
        return txDate.getFullYear() === now.getFullYear();
      }

      return true;
    });
  }, [transactions, search, typeFilter, selectedAccount, timeFilter]);

  const handleDelete = (id: string, concept: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el movimiento "${concept}"? El saldo de la cuenta será recalculado automáticamente.`)) {
      deleteTransaction(id);
    }
  };

  const handleExportCsv = () => {
    if (filteredList.length === 0) return;
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Cuenta Origen', 'Cuenta Destino', 'Monto', 'Moneda', 'Monto USD (USDT)', 'Nota'];
    const rows = filteredList.map(t => {
      const acc = accounts.find(a => a.id === t.accountId)?.name || '';
      const toAcc = t.toAccountId ? accounts.find(a => a.id === t.toAccountId)?.name : '';
      const valUsd = RatesService.convert(t.amount, t.currency, 'USD', 'USDT', rates);
      return [
        new Date(t.date).toLocaleString('es-VE'),
        t.type,
        t.categoryName,
        acc,
        toAcc || '',
        t.amount,
        t.currency,
        valUsd,
        `"${t.note || ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `movimientos_finanzas_vzla_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-emerald-500" />
            Historial de Movimientos
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Auditoría de ingresos, gastos y cambios de divisas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {filteredList.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 flex items-center gap-1.5 transition-colors"
              title="Exportar movimientos a CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          )}

          <button
            onClick={() => setIsTxModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Movimiento</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        
        {/* Search Bar & Account Select */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por categoría, nota o concepto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todas las cuentas</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Movement Type & Time Period Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {/* Movement Type Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'expense', label: 'Egresos' },
              { id: 'income', label: 'Ingresos' },
              { id: 'transfer', label: 'Cambios/Transf.' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  typeFilter === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold self-start sm:self-auto">
            {(['daily', 'weekly', 'monthly', 'yearly'] as TimeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  timeFilter === f
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {f === 'daily' ? 'Día' : f === 'weekly' ? 'Semana' : f === 'monthly' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Movements Table / List */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No se encontraron movimientos con los filtros seleccionados.
            </p>
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
            >
              Registrar Nuevo Movimiento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredList.map((tx) => {
              const account = accounts.find(a => a.id === tx.accountId);
              const toAccount = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : null;
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';

              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${
                      isIncome 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                        : isTransfer 
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    }`}>
                      {isIncome ? <ArrowUpRight className="w-5 h-5" /> : isTransfer ? <ArrowLeftRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {tx.categoryName}
                        </span>
                        {tx.note && (
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 hidden sm:inline italic">
                            "{tx.note}"
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {account?.name}
                        </span>
                        {toAccount && (
                          <span className="text-blue-500 font-semibold">
                            → {toAccount.name}
                          </span>
                        )}
                        <span>• {new Date(tx.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
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

                    <button
                      onClick={() => handleDelete(tx.id, tx.categoryName)}
                      className="p-2 rounded-xl text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Eliminar movimiento y revertir saldo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
