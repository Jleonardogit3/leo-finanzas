import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Target, 
  PlusCircle, 
  Calendar, 
  Calculator, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RatesService } from '../../services/ratesService';

export const ProjectionsView: React.FC = () => {
  const { 
    goals, 
    transactions, 
    rates, 
    setIsGoalModalOpen, 
    deleteGoal,
    saveGoal 
  } = useApp();

  // Current month net savings calculation
  const currentMonthlyNetUsd = useMemo(() => {
    const now = new Date();
    let inc = 0;
    let exp = 0;
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        const valUsd = RatesService.convert(t.amount, t.currency, 'USD', 'USDT', rates);
        if (t.type === 'income') inc += valUsd;
        if (t.type === 'expense') exp += valUsd;
      }
    });
    const net = inc - exp;
    return net > 0 ? net : 50; // Fallback to realistic $50 baseline if no transactions yet
  }, [transactions, rates]);

  // Simulator State
  const [selectedGoalId, setSelectedGoalId] = useState<string>(() => goals[0]?.id || '');
  const [savingsRatePercent, setSavingsRatePercent] = useState<number>(50); // Allocate 50% of net cashflow by default
  const [customMonthlySavings, setCustomMonthlySavings] = useState<string>('');

  const activeGoal = goals.find(g => g.id === selectedGoalId) || goals[0];

  const simulatedMonthlyContribution = useMemo(() => {
    if (customMonthlySavings.trim()) {
      const parsed = parseFloat(customMonthlySavings);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return (currentMonthlyNetUsd * savingsRatePercent) / 100;
  }, [currentMonthlyNetUsd, savingsRatePercent, customMonthlySavings]);

  const simulationResults = useMemo(() => {
    if (!activeGoal) return null;
    const remainingUsd = Math.max(0, activeGoal.targetAmountUsd - activeGoal.currentSavedUsd);
    if (remainingUsd <= 0) {
      return {
        monthsNeeded: 0,
        estimatedDate: '¡Meta ya completada!',
        isCompleted: true
      };
    }

    if (simulatedMonthlyContribution <= 0) {
      return {
        monthsNeeded: Infinity,
        estimatedDate: 'Aporte mensual insuficiente',
        isCompleted: false
      };
    }

    const months = remainingUsd / simulatedMonthlyContribution;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + Math.round(months * 30.44));

    return {
      monthsNeeded: Number(months.toFixed(1)),
      estimatedDate: estimatedDate.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }),
      isCompleted: false
    };
  }, [activeGoal, simulatedMonthlyContribution]);

  const handleQuickAddSavings = (goalId: string, deltaUsd: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const updated = {
      ...goal,
      currentSavedUsd: Math.min(goal.targetAmountUsd, goal.currentSavedUsd + deltaUsd)
    };
    saveGoal(updated);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-emerald-500" />
            Metas Financieras & Proyecciones
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Planifica objetivos a mediano y largo plazo en dólares estables
          </p>
        </div>

        <button
          onClick={() => setIsGoalModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nueva Meta Financiera</span>
        </button>
      </div>

      {/* Simulator Card (Interactive Projection Engine) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
            Simulador de Cumplimiento de Metas
          </h3>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-slate-400">
              Crea tu primera meta financiera para activar la simulación predictiva.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            
            {/* Left Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Selecciona la Meta a Simular:
                </label>
                <select
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} (${g.targetAmountUsd} USD • Restante: ${(g.targetAmountUsd - g.currentSavedUsd).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Asignación de Flujo Neto Mensual:</span>
                  <span className="text-emerald-400 font-bold">{savingsRatePercent}% (${simulatedMonthlyContribution.toFixed(2)}/mes)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={savingsRatePercent}
                  onChange={(e) => {
                    setSavingsRatePercent(Number(e.target.value));
                    setCustomMonthlySavings('');
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Conservador (10%)</span>
                  <span>Equilibrado (50%)</span>
                  <span>Agresivo (100%)</span>
                </div>
              </div>

              <div className="pt-1">
                <label className="block text-[11px] text-slate-400 mb-1">
                  O define un aporte fijo manual ($/mes):
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder={`Ej: $${simulatedMonthlyContribution.toFixed(0)}`}
                  value={customMonthlySavings}
                  onChange={(e) => setCustomMonthlySavings(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Right Projection Result Badge */}
            {activeGoal && simulationResults && (
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Meta: {activeGoal.name}</span>
                    <span className="text-emerald-400 font-bold">
                      {((activeGoal.currentSavedUsd / activeGoal.targetAmountUsd) * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                      Fecha Estimada de Cumplimiento:
                    </span>
                    <div className="text-2xl font-black text-emerald-400 mt-0.5">
                      {simulationResults.estimatedDate}
                    </div>
                    {!simulationResults.isCompleted && (
                      <p className="text-xs text-slate-300 mt-1">
                        Se requieren aproximadamente <strong className="text-white">{simulationResults.monthsNeeded} meses</strong> ahorrando <strong className="text-emerald-400">${simulatedMonthlyContribution.toFixed(2)} USD/mes</strong>.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Equivalente en Bs:</span>
                  <span className="font-bold text-white">
                    ≈ {(simulatedMonthlyContribution * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs/mes
                  </span>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Goals Cards List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white px-1">
          Tus Metas Activas ({goals.length})
        </h3>

        {goals.length === 0 ? (
          <div className="text-center py-12 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <Target className="w-12 h-12 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No tienes metas financieras activas.
            </p>
            <button
              onClick={() => setIsGoalModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
            >
              Crear Meta de Ahorro
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map(goal => {
              const progressPct = Math.min(100, Math.round((goal.currentSavedUsd / (goal.targetAmountUsd || 1)) * 100));
              const remainingUsd = Math.max(0, goal.targetAmountUsd - goal.currentSavedUsd);

              return (
                <div 
                  key={goal.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {goal.category}
                      </span>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="p-1 rounded text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Eliminar meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {goal.name}
                    </h4>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          ${goal.currentSavedUsd.toFixed(2)} USD
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          Objetivo: ${goal.targetAmountUsd.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${progressPct}%`, backgroundColor: goal.color || '#10B981' }} 
                          className="h-full rounded-full transition-all duration-500"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mt-1.5">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{progressPct}% completado</span>
                        <span>Faltan: ${remainingUsd.toFixed(2)} USD</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Add Funds & Deadline */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(goal.deadline).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickAddSavings(goal.id, 10)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                        title="Asignar $10 al objetivo"
                      >
                        +$10
                      </button>
                      <button
                        onClick={() => handleQuickAddSavings(goal.id, 50)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                        title="Asignar $50 al objetivo"
                      >
                        +$50
                      </button>
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
