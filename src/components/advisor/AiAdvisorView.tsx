import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Key, 
  Send, 
  HelpCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GeminiService } from '../../services/geminiService';
import { AIAdvisorReport } from '../../types';

export const AiAdvisorView: React.FC = () => {
  const { accounts, transactions, rates, goals } = useApp();

  const [report, setReport] = useState<AIAdvisorReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(() => GeminiService.getApiKey());
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const fetchAdvice = async (question?: string) => {
    setLoading(true);
    try {
      const res = await GeminiService.generateAdvisorReport(
        accounts,
        transactions,
        rates,
        goals,
        question
      );
      setReport(res);
    } catch (e) {
      console.error('Advisor error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvice();
  }, [accounts, rates]);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    GeminiService.setApiKey(apiKeyInput);
    setShowApiKeyModal(false);
    fetchAdvice();
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    fetchAdvice(userQuestion);
    setUserQuestion('');
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRÍTICO': return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
      case 'ALTO': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'MODERADO': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Asesor Financiero IA (Google Gemini)
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Diagnóstico predictivo, protección cambiaria y optimización de caja en Venezuela
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 flex items-center gap-1.5 transition-colors"
            title="Configurar clave API de Gemini"
          >
            <Key className="w-3.5 h-3.5 text-purple-500" />
            <span>{apiKeyInput ? 'Clave API Configurada' : 'Configurar Clave API'}</span>
          </button>

          <button
            onClick={() => fetchAdvice()}
            disabled={loading}
            className={`p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all ${
              loading ? 'animate-spin' : 'active:scale-95'
            }`}
            title="Regenerar análisis con IA"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Diagnosis Banner */}
      {report && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 text-white border border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Bot className="w-4 h-4" />
                Diagnóstico Global de Inteligencia Financiera
              </span>
              <p className="text-sm sm:text-base font-semibold text-slate-100 mt-1 max-w-2xl">
                {report.executiveSummary}
              </p>
            </div>

            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2">
              <span className="text-[11px] text-slate-400">Riesgo de Devaluación:</span>
              <span className={`px-3 py-1 rounded-xl font-black text-xs border ${getRiskColor(report.devaluationRiskLevel)}`}>
                {report.devaluationRiskLevel}
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-1">
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-750">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Exposición en VES</span>
              <span className={`text-lg font-black ${report.vesLiquidityRatio > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {report.vesLiquidityRatio}%
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-750">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Dolarización (USD/USDT)</span>
              <span className="text-lg font-black text-emerald-400">
                {report.usdLiquidityRatio}%
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-750">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tasa de Ahorro</span>
              <span className={`text-lg font-black ${report.savingsRatePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {report.savingsRatePercent}%
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-750">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Brecha Cambiaria</span>
              <span className="text-lg font-black text-rose-400">
                +{rates.spreadPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Structured Advice Cards Grid */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Diagnóstico del Flujo de Caja */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Diagnóstico del Flujo de Caja
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {report.cashflowDiagnosis.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 2: Alertas de Sobrepresupuesto */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Alertas de Sobrepresupuesto
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {report.overbudgetAlerts.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 3: Estrategia Antidevaluación Venezolana */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                3. Estrategia Antidevaluación (VES vs USD)
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {report.devaluationHedgeStrategies.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 4: Plan de Acción para Metas */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                4. Plan de Acción Recomendado
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {report.goalsActionPlan.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}

      {/* Interactive AI Chat Prompt */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-500" />
          Hazle una Consulta Financiera Directa a Gemini
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
          Pregunta sobre arbitraje cambiario, compra de dólares, presupuestos familiares o cómo proteger tus ingresos este mes.
        </p>

        <form onSubmit={handleAskQuestion} className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: ¿Me conviene cambiar 50.000 Bs a USDT hoy o usarlos en compras a tasa BCV?"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading || !userQuestion.trim()}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Consultar</span>
          </button>
        </form>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-500" />
                Configurar Google Gemini API Key
              </h3>
              <button 
                onClick={() => setShowApiKeyModal(false)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveApiKey} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Tu API Key de Gemini:
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Puedes obtener una clave gratuita en Google AI Studio (ai.google.dev). Se guarda de forma local en tu navegador.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md"
                >
                  Guardar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
