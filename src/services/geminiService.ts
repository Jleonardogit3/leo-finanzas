import { GoogleGenAI } from '@google/genai';
import { 
  Account, 
  Transaction, 
  ExchangeRates, 
  FinancialGoal, 
  AIAdvisorReport 
} from '../types';
import { RatesService } from './ratesService';

const GEMINI_API_KEY_STORAGE = 'finanzas_vzla_gemini_api_key';

export class GeminiService {
  /**
   * Gets stored API key or env variable
   */
  static getApiKey(): string {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE) || import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  static setApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  }

  /**
   * Prepares the anonymized structured financial summary
   */
  static prepareFinancialSummary(
    accounts: Account[],
    transactions: Transaction[],
    rates: ExchangeRates,
    goals: FinancialGoal[]
  ) {
    // Current month calculations
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthlyTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    // Income and Expense normalized to USD (using BCV and USDT rates)
    let totalIncomeUsd = 0;
    let totalExpenseUsd = 0;
    const categoryTotals: Record<string, number> = {};

    monthlyTxs.forEach(t => {
      const amountUsd = RatesService.convert(t.amount, t.currency, 'USD', 'USDT', rates);
      if (t.type === 'income') {
        totalIncomeUsd += amountUsd;
      } else if (t.type === 'expense') {
        totalExpenseUsd += amountUsd;
        categoryTotals[t.categoryName] = (categoryTotals[t.categoryName] || 0) + amountUsd;
      }
    });

    // Liquidity breakdown in native currencies
    let vesLiquidTotal = 0;
    let usdLiquidTotal = 0;

    accounts.forEach(acc => {
      if (acc.currency === 'VES') {
        vesLiquidTotal += acc.currentBalance;
      } else {
        usdLiquidTotal += acc.currentBalance;
      }
    });

    const vesInUsd = RatesService.convert(vesLiquidTotal, 'VES', 'USD', 'USDT', rates);
    const totalLiquidUsd = usdLiquidTotal + vesInUsd;
    
    const vesPercent = totalLiquidUsd > 0 ? (vesInUsd / totalLiquidUsd) * 100 : 0;
    const usdPercent = totalLiquidUsd > 0 ? (usdLiquidTotal / totalLiquidUsd) * 100 : 0;

    const netSavings = totalIncomeUsd - totalExpenseUsd;
    const savingsRate = totalIncomeUsd > 0 ? (netSavings / totalIncomeUsd) * 100 : 0;

    // Determine devaluation risk
    let devaluationRisk: 'BAJO' | 'MODERADO' | 'ALTO' | 'CRÍTICO' = 'BAJO';
    if (vesPercent > 50) devaluationRisk = 'CRÍTICO';
    else if (vesPercent > 30) devaluationRisk = 'ALTO';
    else if (vesPercent > 15) devaluationRisk = 'MODERADO';

    return {
      monthlyIncomeUsd: Number(totalIncomeUsd.toFixed(2)),
      monthlyExpenseUsd: Number(totalExpenseUsd.toFixed(2)),
      netSavingsUsd: Number(netSavings.toFixed(2)),
      savingsRatePercent: Number(savingsRate.toFixed(1)),
      categoryBreakdown: categoryTotals,
      totalNetWorthUsdEquivalent: Number(totalLiquidUsd.toFixed(2)),
      vesLiquidityVES: Number(vesLiquidTotal.toFixed(2)),
      vesLiquidityInUsd: Number(vesInUsd.toFixed(2)),
      usdLiquidityUSD: Number(usdLiquidTotal.toFixed(2)),
      vesRatioPercent: Number(vesPercent.toFixed(1)),
      usdRatioPercent: Number(usdPercent.toFixed(1)),
      devaluationRisk,
      currentExchangeRates: {
        bcv: rates.bcv,
        usdt: rates.usdt,
        brechaPercent: rates.spreadPercent
      },
      goalsStatus: goals.map(g => ({
        meta: g.name,
        targetUsd: g.targetAmountUsd,
        savedUsd: g.currentSavedUsd,
        progressPercent: Number(((g.currentSavedUsd / (g.targetAmountUsd || 1)) * 100).toFixed(1)),
        deadline: g.deadline
      }))
    };
  }

  /**
   * Generates AI financial advisory report using Gemini API or expert heuristic engine
   */
  static async generateAdvisorReport(
    accounts: Account[],
    transactions: Transaction[],
    rates: ExchangeRates,
    goals: FinancialGoal[],
    userQuestion?: string
  ): Promise<AIAdvisorReport> {
    const summary = this.prepareFinancialSummary(accounts, transactions, rates, goals);
    const apiKey = this.getApiKey();

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        
        const systemPrompt = `Eres un Asesor Financiero Senior de alto nivel especializado en la economía de Venezuela.
Tu objetivo es ayudar al usuario a optimizar su flujo de caja, recortar gastos innecesarios, protegerse agresivamente contra la devaluación del Bolívar (VES) y la inflación en dólares, y cumplir sus metas patrimoniales.

CONOCIMIENTO CLAVE DEL CONTEXTO VENEZOLANO:
- Monedas: Bolívares (VES), Dólares en efectivo ($) y Cripto/Binance USDT.
- Tasa Oficial BCV vs Tasa Paralelo/USDT: Brecha cambiaria actual: ${summary.currentExchangeRates.brechaPercent}%.
- Regla de oro de liquidez: No mantener más del 10-15% del patrimonio en bolívares por más de 72-96 horas, usándolos solo para gastos operativos inmediatos (servicios públicos, pagos móviles pequeños, gasolina, etc.).
- Compras inteligentes: Aprovechar comercios con precios indexados a tasa BCV pagando en Bolívares, y mantener el ahorro base en USDT o USD físico.

DATOS FINANCIEROS DEL USUARIO (TOTALMENTE ANÓNIMOS):
${JSON.stringify(summary, null, 2)}

${userQuestion ? `PREGUNTA ESPECÍFICA DEL USUARIO: "${userQuestion}"` : ''}

INSTRUCCIÓN: Responde ESTRICTAMENTE en formato JSON con la siguiente estructura válida (sin markdown, solo JSON parseable):
{
  "devaluationRiskLevel": "${summary.devaluationRisk}",
  "vesLiquidityRatio": ${summary.vesRatioPercent},
  "usdLiquidityRatio": ${summary.usdRatioPercent},
  "savingsRatePercent": ${summary.savingsRatePercent},
  "executiveSummary": "Párrafo conciso con el diagnóstico global de salud financiera y exposición cambiaria.",
  "cashflowDiagnosis": [
    "Punto clave 1 sobre ingresos vs egresos",
    "Punto clave 2 sobre tasa de ahorro y brecha"
  ],
  "overbudgetAlerts": [
    "Alerta de gasto excesivo o advertencia sobre rubros específicos"
  ],
  "devaluationHedgeStrategies": [
    "Estrategia práctica 1 para proteger el capital en Bolívares",
    "Estrategia práctica 2 para maximizar el poder adquisitivo con la brecha actual"
  ],
  "goalsActionPlan": [
    "Acción concreta para acelerar las metas financieras"
  ]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: systemPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const rawText = response.text || '';
        // Clean JSON formatting if enclosed in code blocks
        const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        return {
          timestamp: new Date().toISOString(),
          devaluationRiskLevel: parsed.devaluationRiskLevel || summary.devaluationRisk,
          vesLiquidityRatio: summary.vesRatioPercent,
          usdLiquidityRatio: summary.usdRatioPercent,
          savingsRatePercent: summary.savingsRatePercent,
          executiveSummary: parsed.executiveSummary || 'Diagnóstico financiero generado exitosamente.',
          cashflowDiagnosis: parsed.cashflowDiagnosis || [],
          overbudgetAlerts: parsed.overbudgetAlerts || [],
          devaluationHedgeStrategies: parsed.devaluationHedgeStrategies || [],
          goalsActionPlan: parsed.goalsActionPlan || []
        };
      } catch (error) {
        console.warn('Gemini API call failed, falling back to expert Venezuelan heuristic engine:', error);
      }
    }

    // Expert Heuristic Fallback Engine (Immediate, Zero latency, no API key required)
    return this.generateHeuristicReport(summary);
  }

  /**
   * High-accuracy Venezuelan financial rule engine
   */
  private static generateHeuristicReport(summary: ReturnType<typeof GeminiService.prepareFinancialSummary>): AIAdvisorReport {
    const isHighVes = summary.vesRatioPercent > 20;
    const isNegativeSavings = summary.netSavingsUsd < 0;
    const topCategories = Object.entries(summary.categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const overbudgetAlerts: string[] = [];
    if (topCategories.length > 0) {
      const [topCat, amount] = topCategories[0];
      const pctOfExpenses = summary.monthlyExpenseUsd > 0 ? ((amount / summary.monthlyExpenseUsd) * 100).toFixed(0) : '0';
      overbudgetAlerts.push(`La categoría "${topCat}" representa el ${pctOfExpenses}% de tus egresos totales ($${amount.toFixed(2)} USD). Audita si hay consumos hormiga o gastos no planificados.`);
    }
    if (isNegativeSavings) {
      overbudgetAlerts.push(`Déficit mensual: Tus egresos superan tus ingresos por $${Math.abs(summary.netSavingsUsd).toFixed(2)} USD. Estás descapitalizando liquidez.`);
    } else {
      overbudgetAlerts.push(`Tasa de ahorro saludable: Estás reteniendo el ${summary.savingsRatePercent}% de tus ingresos netos este mes.`);
    }

    const devaluationHedgeStrategies: string[] = [];
    if (isHighVes) {
      devaluationHedgeStrategies.push(`Alerta de devaluación: Mantienes el ${summary.vesRatioPercent}% de tu patrimonio en Bolívares. Con la brecha actual del ${summary.currentExchangeRates.brechaPercent}%, mantén en Bs solo lo que gastarás en las próximas 48-72 horas y pasa el excedente a USDT en Binance o efectivo.`);
    } else {
      devaluationHedgeStrategies.push(`Excelente cobertura cambiaria: Tu exposición en Bolívares es apenas del ${summary.vesRatioPercent}%, manteniendo el ${summary.usdRatioPercent}% en divisas estables (USD/USDT).`);
    }
    devaluationHedgeStrategies.push(`Arbitraje de compra: Al comprar en comercios que facturen formalmente a tasa BCV (${summary.currentExchangeRates.bcv} Bs/$), es preferible cambiar USDT a Bs por P2P al momento exacto de pagar para aprovechar la brecha del ${summary.currentExchangeRates.brechaPercent}%.`);

    const goalsActionPlan: string[] = [];
    if (summary.goalsStatus.length > 0) {
      const activeGoal = summary.goalsStatus[0];
      const remaining = activeGoal.targetUsd - activeGoal.savedUsd;
      const suggestedMonthly = summary.netSavingsUsd > 0 ? (summary.netSavingsUsd * 0.5).toFixed(2) : '35.00';
      goalsActionPlan.push(`Para la meta "${activeGoal.meta}" (Faltan $${remaining.toFixed(2)} USD), te sugerimos destinar $${suggestedMonthly} USD de tu flujo neto mensual para alcanzarla en la fecha límite.`);
    } else {
      goalsActionPlan.push('Crea una primera meta de "Fondo de Emergencia" de al menos 3 a 6 meses de gastos fijos en USDT o dólares en efectivo.');
    }

    return {
      timestamp: new Date().toISOString(),
      devaluationRiskLevel: summary.devaluationRisk,
      vesLiquidityRatio: summary.vesRatioPercent,
      usdLiquidityRatio: summary.usdRatioPercent,
      savingsRatePercent: summary.savingsRatePercent,
      executiveSummary: `Tu patrimonio líquido estimado es de $${summary.totalNetWorthUsdEquivalent.toFixed(2)} USD. Tienes un nivel de riesgo de devaluación ${summary.devaluationRisk} con ${summary.vesRatioPercent}% en VES y ${summary.usdRatioPercent}% en USD/USDT. Flujo de caja neto: ${summary.netSavingsUsd >= 0 ? '+' : ''}$${summary.netSavingsUsd.toFixed(2)} USD.`,
      cashflowDiagnosis: [
        `Ingresos del mes: $${summary.monthlyIncomeUsd.toFixed(2)} USD | Egresos del mes: $${summary.monthlyExpenseUsd.toFixed(2)} USD.`,
        `Balance neto: ${summary.netSavingsUsd >= 0 ? '+' : ''}$${summary.netSavingsUsd.toFixed(2)} USD con una tasa de ahorro del ${summary.savingsRatePercent}%.`
      ],
      overbudgetAlerts,
      devaluationHedgeStrategies,
      goalsActionPlan
    };
  }
}
