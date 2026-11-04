import React, { useState, useEffect } from 'react';
import { X, Tag, Check, Pencil, Trash2, Plus, Palette, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Category } from '../../types';
import { AVAILABLE_CATEGORY_COLORS } from '../../utils/constants';

export const CategoryModal: React.FC = () => {
  const { 
    isCategoryModalOpen, 
    setIsCategoryModalOpen, 
    categories, 
    saveCategory,
    deleteCategory,
    editingCategory,
    setEditingCategory
  } = useApp();

  // Active view: 'list' | 'form'
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income' | 'both'>('expense');
  const [color, setColor] = useState('#F97316');
  const [icon, setIcon] = useState('Tag');

  // Filter for existing list
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');

  // Load editing category into form
  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setType(editingCategory.type);
      setColor(editingCategory.color || '#F97316');
      setIcon(editingCategory.icon || 'Tag');
      setActiveTab('form');
    } else {
      setName('');
      setType('expense');
      setColor('#F97316');
      setIcon('Tag');
    }
  }, [editingCategory, isCategoryModalOpen]);

  if (!isCategoryModalOpen) return null;

  const handleStartEdit = (cat: Category) => {
    setEditingCategory(cat);
    setActiveTab('form');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setName('');
    setType('expense');
    setColor('#F97316');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCategory) {
      const updatedCat: Category = {
        ...editingCategory,
        name: name.trim(),
        type,
        color,
        icon,
        updatedAt: new Date().toISOString()
      };
      saveCategory(updatedCat);
      setEditingCategory(null);
    } else {
      const newCategory: Category = {
        id: `cat-custom-${Date.now()}`,
        name: name.trim(),
        icon,
        color,
        type,
        isPredefined: false,
        updatedAt: new Date().toISOString()
      };
      saveCategory(newCategory);
    }

    setName('');
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (cat: Category) => {
    if (window.confirm(`¿Estás seguro de eliminar la categoría "${cat.name}"?`)) {
      deleteCategory(cat.id);
      if (editingCategory?.id === cat.id) {
        handleCancelEdit();
      }
    }
  };

  // Filter categories for the list tab
  const displayedCategories = categories.filter(c => {
    if (filterType === 'expense') return c.type === 'expense' || c.type === 'both';
    if (filterType === 'income') return c.type === 'income' || c.type === 'both';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-500" />
              <span>{editingCategory ? 'Modificar Categoría' : 'Categorías de Gastos e Ingresos'}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Personaliza los nombres, colores y tipo de movimiento
            </p>
          </div>
          <button 
            onClick={() => {
              setEditingCategory(null);
              setIsCategoryModalOpen(false);
            }}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between Editor and Category Manager */}
        <div className="flex p-1 mt-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'form'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {editingCategory ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{editingCategory ? 'Editar Datos' : 'Nueva Categoría'}</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'list'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Gestionar Existentes ({categories.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 mt-3 pr-1 space-y-4">
          
          {/* TAB 1: FORM */}
          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Editing Banner */}
              {editingCategory && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: editingCategory.color || '#F97316' }} 
                    />
                    <span>Modificando: <strong>{editingCategory.name}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-2 py-0.5 rounded-lg bg-amber-200/50 dark:bg-amber-900/50 text-[11px] font-bold hover:bg-amber-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Salud, Mascotas, Gasolina, Educación..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  autoFocus
                />
              </div>

              {/* Movement Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Aplica Para *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      type === 'expense'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      type === 'income'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('both')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      type === 'both'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Ambos
                  </button>
                </div>
              </div>

              {/* Color Swatches */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Seleccionar Color
                  </label>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span 
                      className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-[10px] uppercase">{color}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  {AVAILABLE_CATEGORY_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full transition-transform relative ${
                        color === c 
                          ? 'scale-125 ring-2 ring-offset-2 ring-slate-800 dark:ring-offset-slate-900 shadow-md' 
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {color === c && (
                        <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto drop-shadow" />
                      )}
                    </button>
                  ))}

                  {/* Custom Color Input */}
                  <div className="relative flex items-center ml-1">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-7 h-7 rounded-full cursor-pointer opacity-0 absolute inset-0 z-10"
                      title="Elegir color personalizado"
                    />
                    <div 
                      className="w-7 h-7 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      title="Color personalizado"
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: LIST AND MANAGEMENT */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              
              {/* Sub-filter: Todos, Gastos, Ingresos */}
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                {(['all', 'expense', 'income'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilterType(f)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      filterType === f
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'Todas' : f === 'expense' ? 'Gastos' : 'Ingresos'}
                  </button>
                ))}
              </div>

              {/* Category rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-850 space-y-1">
                {displayedCategories.map(cat => (
                  <div key={cat.id} className="py-2.5 flex items-center justify-between gap-2 group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span 
                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs" 
                        style={{ backgroundColor: cat.color || '#10B981' }} 
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {cat.name}
                        </p>
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                          cat.type === 'expense'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : cat.type === 'income'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          {cat.type === 'expense' ? 'Gasto' : cat.type === 'income' ? 'Ingreso' : 'Ambos'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        title={`Editar categoría ${cat.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title={`Eliminar categoría ${cat.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
