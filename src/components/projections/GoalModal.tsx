import React, { useState } from 'react';
import { X, Target, Check, Calendar, PlusCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FinancialGoal } from '../../types';

export const GoalModal: React.FC = () => {
  const { isGoalModalOpen, setIsGoalModalOpen, saveGoal } = useApp();

  const [name, setName] = useState('');
  const [targetAmountUsd, setTargetAmountUsd] = useState('');
  const [currentSavedUsd, setCurrentSavedUsd] = useState('0');
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState('Ahorro');
  const [color, setColor] = useState('#10B981');

  if (!isGoalModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const targetNum = parseFloat(targetAmountUsd) || 0;
    const savedNum = parseFloat(currentSavedUsd) || 0;

    const newGoal: FinancialGoal = {
      id: `goal-${Date.now()}`,
      name: name.trim(),
      targetAmountUsd: targetNum,
      currentSavedUsd: savedNum,
      deadline,
      category,
      color,
      createdAt: new Date().toISOString()
    };

    saveGoal(newGoal);
    setIsGoalModalOpen(false);
    setName('');
    setTargetAmountUsd('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-500" />
              Nueva Meta Financiera
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Establece un objetivo de ahorro y proyección
            </p>
          </div>
          <button 
            onClick={() => setIsGoalModalOpen(false)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Nombre del Objetivo
            </label>
            <input
              type="text"
              placeholder="Ej: Fondo de Emergencia, Moto, Reparación Casa, Capital Negocio..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Monto Objetivo ($ USD)
              </label>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="1000.00"
                value={targetAmountUsd}
                onChange={(e) => setTargetAmountUsd(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Saldo Ya Asignado ($ USD)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={currentSavedUsd}
                onChange={(e) => setCurrentSavedUsd(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Fecha Límite Estimada
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Categoría de la Meta
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Seguridad">Fondo de Seguridad / Emergencia</option>
              <option value="Vehículo">Transporte / Vehículo</option>
              <option value="Hogar">Hogar / Mantenimiento</option>
              <option value="Negocio">Inversión / Negocio</option>
              <option value="Educación">Educación / Carrera</option>
              <option value="Ahorro">Ahorro General</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Crear Meta</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
