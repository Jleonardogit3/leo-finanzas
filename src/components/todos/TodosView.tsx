import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Tag, 
  Trash2, 
  Edit3, 
  CreditCard, 
  DollarSign, 
  Calculator, 
  Zap, 
  Home, 
  Briefcase, 
  AlertTriangle,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TodoItem, TodoCategory, TodoPriority } from '../../types';

export const TodosView: React.FC = () => {
  const { 
    todos, 
    openTodoModal, 
    toggleTodoStatus, 
    deleteTodo, 
    convertTodoToExpense,
    rates,
    pendingTodosCount,
    completedTodosCount,
    pendingPurchasesCount,
    pendingTasksCount,
    totalEstimatedBudgetUsd,
    totalEstimatedBudgetVes
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bcvRate = rates.bcv > 0 ? rates.bcv : 1;
  const totalTodosCount = todos.length;
  const completionPercent = totalTodosCount > 0 ? Math.round((completedTodosCount / totalTodosCount) * 100) : 0;

  // Filter and sort todos
  const filteredTodos = useMemo(() => {
    return todos.filter(item => {
      // Status filter
      if (statusFilter === 'pending' && item.status !== 'pending') return false;
      if (statusFilter === 'completed' && item.status !== 'completed') return false;

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Priority filter
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesNotes = item.notes?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesNotes) return false;
      }

      return true;
    }).sort((a, b) => {
      // Pending first
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      // For pending items: sort by priority (high > medium > low)
      if (a.status === 'pending') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const pA = priorityOrder[a.priority || 'medium'];
        const pB = priorityOrder[b.priority || 'medium'];
        if (pA !== pB) return pA - pB;
      }
      // Newest first
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [todos, statusFilter, categoryFilter, priorityFilter, searchTerm]);

  const handleDelete = (id: string) => {
    deleteTodo(id);
    setDeletingId(null);
  };

  const getCategoryDetails = (cat: TodoCategory) => {
    switch (cat) {
      case 'purchase':
        return { label: 'Compra', icon: ShoppingBag, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
      case 'task':
        return { label: 'Tarea', icon: CheckSquare, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
      case 'service':
        return { label: 'Servicio', icon: Zap, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'home':
        return { label: 'Hogar', icon: Home, color: 'text-teal-500 bg-teal-500/10 border-teal-500/20' };
      case 'work':
        return { label: 'Trabajo', icon: Briefcase, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
      default:
        return { label: 'Otro', icon: Tag, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
    }
  };

  const getPriorityBadge = (p: TodoPriority) => {
    switch (p) {
      case 'high':
        return { label: 'Alta', color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' };
      case 'medium':
        return { label: 'Media', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'low':
        return { label: 'Baja', color: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30' };
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Compras & Cosas por Hacer
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Planifica lo que quieres comprar con precios estimados en USD y Bs, y administra tus pendientes
          </p>
        </div>

        <button
          onClick={() => openTodoModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 active:scale-95 transition-all self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nueva Compra o Tarea</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Presupuesto Estimado */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Presupuesto Pendiente
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            ${totalEstimatedBudgetUsd.toFixed(2)} <span className="text-xs font-semibold text-slate-400">USD</span>
          </div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
            ~Bs. {totalEstimatedBudgetVes.toLocaleString('es-VE', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            A tasa BCV: Bs. {bcvRate.toFixed(2)}
          </span>
        </div>

        {/* Card 2: Compras Planificadas */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Compras Planificadas
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {pendingPurchasesCount}
          </div>
          <span className="text-xs text-slate-500 block mt-0.5">
            Artículos por adquirir
          </span>
        </div>

        {/* Card 3: Tareas & Servicios */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tareas & Servicios
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {pendingTasksCount}
          </div>
          <span className="text-xs text-slate-500 block mt-0.5">
            Pendientes por realizar
          </span>
        </div>

        {/* Card 4: Completadas */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Progreso Realizado
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {completedTodosCount}
            </span>
            <span className="text-xs font-bold text-slate-400">
              de {totalTodosCount} ({completionPercent}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        
        {/* Row 1: Search and Status Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por artículo, tarea o nota..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>

          {/* Status Tabs (Pendientes, Completadas, Todas) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold self-start md:self-auto shrink-0">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Pendientes</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px]">
                {pendingTodosCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                statusFilter === 'completed'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Completadas</span>
              <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-[10px]">
                {completedTodosCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Todas</span>
              <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-[10px]">
                {totalTodosCount}
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Filters (Categoría, Prioridad) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          
          <div className="flex items-center gap-1.5 text-slate-500 font-bold mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Categoría Pills */}
          {[
            { id: 'all', label: 'Todas las categorías' },
            { id: 'purchase', label: 'Compras' },
            { id: 'task', label: 'Tareas' },
            { id: 'service', label: 'Servicios' },
            { id: 'home', label: 'Hogar' },
            { id: 'work', label: 'Trabajo' }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-2.5 py-1 rounded-xl font-semibold border transition-all ${
                categoryFilter === c.id
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {c.label}
            </button>
          ))}

          {/* Prioridad Selector */}
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[11px] text-slate-400 font-medium">Prioridad:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">Todas</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
        </div>

      </div>

      {/* Todo Items List */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {statusFilter === 'completed'
                ? 'No tienes compras ni tareas completadas'
                : 'No se encontraron compras ni tareas pendientes'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {statusFilter === 'completed'
                ? 'Cuando marques pendientes como realizados, aparecerán aquí con su registro.'
                : 'Registra tus próximas compras con precios estimados o cosas por hacer para tener un control claro de tus gastos futuros.'}
            </p>
            <button
              onClick={() => openTodoModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Registrar mi primera compra o tarea</span>
            </button>
          </div>
        ) : (
          filteredTodos.map(todo => {
            const isCompleted = todo.status === 'completed';
            const catDetails = getCategoryDetails(todo.category);
            const CatIcon = catDetails.icon;
            const priorityBadge = getPriorityBadge(todo.priority);

            // Calculations for prices in USD and VES
            const hasPrice = todo.estimatedPrice !== undefined && todo.estimatedPrice > 0;
            const price = todo.estimatedPrice || 0;
            const priceInUsd = todo.currency === 'USD' ? price : (price / bcvRate);
            const priceInVes = todo.currency === 'VES' ? price : (price * bcvRate);

            // Target date checking
            const hasTargetDate = !!todo.targetDate;
            const isOverdue = hasTargetDate && !isCompleted && new Date(todo.targetDate!).getTime() < new Date().setHours(0,0,0,0);

            return (
              <div
                key={todo.id}
                className={`p-4 sm:p-4.5 rounded-2xl sm:rounded-3xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    
                    {/* Toggle Checkbox Button */}
                    <button
                      type="button"
                      onClick={() => toggleTodoStatus(todo.id)}
                      className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/10'
                      }`}
                      title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-transparent hover:text-emerald-500 transition-colors" />
                      )}
                    </button>

                    {/* Content details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Title */}
                        <span className={`text-sm font-bold text-slate-900 dark:text-white ${
                          isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                        }`}>
                          {todo.title}
                        </span>

                        {/* Category Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${catDetails.color}`}>
                          <CatIcon className="w-3 h-3" />
                          <span>{catDetails.label}</span>
                        </span>

                        {/* Priority Badge */}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${priorityBadge.color}`}>
                          {priorityBadge.label}
                        </span>

                        {/* Target date badge */}
                        {hasTargetDate && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                            isOverdue
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            <span>{todo.targetDate}</span>
                            {isOverdue && <span className="font-black text-[9px] uppercase tracking-wide">Vencido</span>}
                          </span>
                        )}
                      </div>

                      {/* Notes snippet */}
                      {todo.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {todo.notes}
                        </p>
                      )}

                    </div>
                  </div>

                  {/* Right: Estimated Price & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                    
                    {/* Price Tag */}
                    {hasPrice && (
                      <div className="text-left sm:text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          ${priceInUsd.toFixed(2)} <span className="text-[10px] font-semibold text-slate-400">USD</span>
                        </div>
                        <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          ~Bs. {priceInVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                      
                      {/* Convert to Expense Transaction button */}
                      <button
                        type="button"
                        onClick={() => convertTodoToExpense(todo)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1 active:scale-95"
                        title="Registrar esta compra como un gasto en mis cuentas"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Registrar Gasto</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => openTodoModal(todo)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      {deletingId === todo.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => handleDelete(todo.id)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors"
                          >
                            Eliminar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="p-1 text-[10px] text-slate-400 hover:text-slate-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(todo.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                    </div>

                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

