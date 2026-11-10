import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckSquare, 
  ShoppingBag, 
  Zap, 
  Home, 
  Briefcase, 
  Tag, 
  Calendar, 
  DollarSign, 
  FileText, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TodoItem, TodoCategory, TodoPriority, Currency } from '../../types';

export const TodoModal: React.FC = () => {
  const { 
    isTodoModalOpen, 
    setIsTodoModalOpen, 
    editingTodo, 
    setEditingTodo, 
    saveTodo, 
    rates 
  } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TodoCategory>('purchase');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [estimatedPriceStr, setEstimatedPriceStr] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isTodoModalOpen) {
      if (editingTodo) {
        setTitle(editingTodo.title);
        setCategory(editingTodo.category || 'purchase');
        setPriority(editingTodo.priority || 'medium');
        setEstimatedPriceStr(
          editingTodo.estimatedPrice !== undefined && editingTodo.estimatedPrice > 0 
            ? editingTodo.estimatedPrice.toString() 
            : ''
        );
        setCurrency(editingTodo.currency || 'USD');
        setTargetDate(editingTodo.targetDate ? editingTodo.targetDate.slice(0, 10) : '');
        setNotes(editingTodo.notes || '');
      } else {
        setTitle('');
        setCategory('purchase');
        setPriority('medium');
        setEstimatedPriceStr('');
        setCurrency('USD');
        setTargetDate('');
        setNotes('');
      }
    }
  }, [isTodoModalOpen, editingTodo]);

  if (!isTodoModalOpen) return null;

  const priceNum = parseFloat(estimatedPriceStr) || 0;
  const bcvRate = rates.bcv > 0 ? rates.bcv : 1;

  // Real-time conversion preview
  const convertedPreview = (() => {
    if (priceNum <= 0) return null;
    if (currency === 'USD') {
      const vesEquiv = priceNum * bcvRate;
      return {
        label: `~Bs. ${vesEquiv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        rateLabel: `Tasa BCV: Bs. ${bcvRate.toFixed(2)}`
      };
    } else {
      const usdEquiv = priceNum / bcvRate;
      return {
        label: `~$${usdEquiv.toFixed(2)} USD`,
        rateLabel: `Tasa BCV: Bs. ${bcvRate.toFixed(2)}`
      };
    }
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const price = parseFloat(estimatedPriceStr);
    const todoData: TodoItem = {
      id: editingTodo ? editingTodo.id : `todo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      category,
      priority,
      estimatedPrice: !isNaN(price) && price > 0 ? Number(price.toFixed(2)) : undefined,
      currency,
      status: editingTodo ? editingTodo.status : 'pending',
      targetDate: targetDate ? targetDate : undefined,
      notes: notes.trim() || undefined,
      completedAt: editingTodo?.completedAt,
      createdAt: editingTodo?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveTodo(todoData);
  };

  const handleClose = () => {
    setIsTodoModalOpen(false);
    setEditingTodo(null);
  };

  const categoriesConfig: { id: TodoCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'purchase', label: 'Compra / Artículo', icon: ShoppingBag },
    { id: 'task', label: 'Tarea / Hacer', icon: CheckSquare },
    { id: 'service', label: 'Servicio / Factura', icon: Zap },
    { id: 'home', label: 'Hogar & Familia', icon: Home },
    { id: 'work', label: 'Trabajo / Negocio', icon: Briefcase },
    { id: 'other', label: 'Otro', icon: Tag }
  ];

  const prioritiesConfig: { id: TodoPriority; label: string; color: string; activeBg: string }[] = [
    { id: 'high', label: 'Alta', color: 'text-rose-500', activeBg: 'bg-rose-500 text-white border-rose-500' },
    { id: 'medium', label: 'Media', color: 'text-amber-500', activeBg: 'bg-amber-500 text-white border-amber-500' },
    { id: 'low', label: 'Baja', color: 'text-emerald-500', activeBg: 'bg-emerald-500 text-white border-emerald-500' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTodo ? 'Editar Compra / Pendiente' : 'Nueva Compra o Tarea'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registra lo que planeas comprar o hacer con precio estimado
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          
          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ¿Qué deseas comprar o hacer? <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Batería para el carro, Renovar internet, Comprar monitor..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Categoría
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categoriesConfig.map(cat => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500 ring-1 ring-emerald-500/30'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Prioridad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {prioritiesConfig.map(p => {
                const isSelected = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? p.activeBg
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Precio Estimado & Moneda */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Precio Estimado (Opcional)
              </label>
              <span className="text-[11px] text-slate-500">
                Tasa BCV: <strong>Bs. {bcvRate.toFixed(2)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                  {currency === 'USD' ? '$' : 'Bs'}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={estimatedPriceStr}
                  onChange={(e) => setEstimatedPriceStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-bold text-base"
                />
              </div>

              {/* Selector USD / VES */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currency === 'USD'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('VES')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currency === 'VES'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  VES (Bs)
                </button>
              </div>
            </div>

            {/* Live conversion box */}
            {convertedPreview && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs animate-in fade-in">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Equivalente estimado: <strong className="font-black">{convertedPreview.label}</strong>
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                  {convertedPreview.rateLabel}
                </span>
              </div>
            )}
          </div>

          {/* Fecha Objetivo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Fecha Objetivo / Límite (Opcional)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* Notas / Detalles */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Notas o Detalles (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tienda recomendada, especificaciones técnicas, enlaces, consideraciones..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-medium resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
            >
              {editingTodo ? 'Guardar Cambios' : 'Registrar Pendiente'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

