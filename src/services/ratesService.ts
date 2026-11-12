import { ExchangeRates, Currency } from '../types';

const RATES_STORAGE_KEY = 'finanzas_vzla_exchange_rates';
const RATES_OVERRIDE_KEY = 'finanzas_vzla_rates_override';
const HISTORICAL_RATES_KEY = 'finanzas_vzla_rates_history';

// Registro histórico semilla de tasas de referencia por fecha
const SEED_HISTORICAL_RATES: Record<string, { bcv: number; usdt: number }> = {
  '2026-11-03': { bcv: 891.1054, usdt: 1004.3248 },
  '2026-11-04': { bcv: 891.1054, usdt: 1008.4556 },
  '2026-11-05': { bcv: 893.2000, usdt: 1009.0000 },
  '2026-11-06': { bcv: 895.4014, usdt: 1010.4101 },
  '2026-11-07': { bcv: 895.4014, usdt: 1020.0000 },
  '2026-11-08': { bcv: 895.4014, usdt: 1038.6451 },
  '2026-11-09': { bcv: 899.2705, usdt: 1047.3547 },
  '2026-11-10': { bcv: 899.2705, usdt: 1053.8683 },
  '2026-11-11': { bcv: 902.1500, usdt: 1071.7404 },
  '2026-11-12': { bcv: 904.4485, usdt: 1085.5000 },
};

// Realistic fallback defaults based on current rates
const DEFAULT_RATES: ExchangeRates = {
  bcv: 889.25,
  usdt: 982.80,
  lastUpdated: new Date().toISOString(),
  isManualOverride: false,
  spreadPercent: 10.52
};

export class RatesService {
  /**
   * Loads exchange rates from local cache or defaults
   */
  static getCachedRates(): ExchangeRates {
    try {
      const overrideStr = localStorage.getItem(RATES_OVERRIDE_KEY);
      if (overrideStr) {
        const parsedOverride = JSON.parse(overrideStr);
        if (parsedOverride && parsedOverride.isManualOverride) {
          return parsedOverride;
        }
      }

      const cached = localStorage.getItem(RATES_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Error reading cached rates:', e);
    }
    return DEFAULT_RATES;
  }

  /**
   * Fetches latest rates from DolarApi Venezuela
   */
  static async fetchLatestRates(): Promise<ExchangeRates> {
    // Check manual override first
    const currentCached = this.getCachedRates();
    if (currentCached.isManualOverride) {
      return currentCached;
    }

    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares', {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`DolarApi responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      let bcvRate = currentCached.bcv;
      let usdtRate = currentCached.usdt;
      let updateTime = new Date().toISOString();

      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.fuente === 'oficial' && typeof item.promedio === 'number' && item.promedio > 0) {
            bcvRate = item.promedio;
            if (item.fechaActualizacion) updateTime = item.fechaActualizacion;
          }
          if (item.fuente === 'paralelo' && typeof item.promedio === 'number' && item.promedio > 0) {
            usdtRate = item.promedio;
          }
        }
      }

      const spread = bcvRate > 0 ? ((usdtRate - bcvRate) / bcvRate) * 100 : 0;

      const updatedRates: ExchangeRates = {
        bcv: Number(bcvRate.toFixed(4)),
        usdt: Number(usdtRate.toFixed(4)),
        lastUpdated: updateTime,
        isManualOverride: false,
        spreadPercent: Number(spread.toFixed(2))
      };

      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(updatedRates));
      this.saveRateForDate(new Date().toISOString().slice(0, 10), updatedRates.bcv, updatedRates.usdt);
      return updatedRates;
    } catch (error) {
      console.warn('Network offline or DolarApi unreachable, using cached rates:', error);
      return currentCached;
    }
  }

  /**
   * Sets manual rate overrides (useful during internet outage or custom P2P spread)
   */
  static setManualRates(bcv: number, usdt: number): ExchangeRates {
    const spread = bcv > 0 ? ((usdt - bcv) / bcv) * 100 : 0;
    const manualRates: ExchangeRates = {
      bcv: Number(bcv.toFixed(4)),
      usdt: Number(usdt.toFixed(4)),
      lastUpdated: new Date().toISOString(),
      isManualOverride: true,
      spreadPercent: Number(spread.toFixed(2))
    };

    localStorage.setItem(RATES_OVERRIDE_KEY, JSON.stringify(manualRates));
    this.saveRateForDate(new Date().toISOString().slice(0, 10), manualRates.bcv, manualRates.usdt);
    return manualRates;
  }

  /**
   * Obtiene el mapa histórico de tasas por fecha
   */
  static getHistoricalRatesMap(): Record<string, { bcv: number; usdt: number }> {
    try {
      const stored = localStorage.getItem(HISTORICAL_RATES_KEY);
      const custom = stored ? JSON.parse(stored) : {};
      return { ...SEED_HISTORICAL_RATES, ...custom };
    } catch {
      return { ...SEED_HISTORICAL_RATES };
    }
  }

  /**
   * Guarda o actualiza la tasa de referencia para una fecha específica (YYYY-MM-DD)
   */
  static saveRateForDate(dateStr: string, bcv: number, usdt: number): void {
    try {
      const cleanDate = (dateStr || '').slice(0, 10);
      if (!cleanDate || !bcv || !usdt) return;
      const current = this.getHistoricalRatesMap();
      current[cleanDate] = {
        bcv: Number(bcv.toFixed(4)),
        usdt: Number(usdt.toFixed(4))
      };
      localStorage.setItem(HISTORICAL_RATES_KEY, JSON.stringify(current));
    } catch {}
  }

  /**
   * Obtiene la tasa de referencia BCV y USDT exacta para una fecha seleccionada
   */
  static getRatesForDate(
    dateInput: string | Date,
    transactions?: any[],
    debts?: any[]
  ): { bcv: number; usdt: number; isHistorical: boolean; rateDate: string } {
    const targetDateStr = typeof dateInput === 'string'
      ? dateInput.slice(0, 10)
      : (dateInput instanceof Date && !isNaN(dateInput.getTime()) ? dateInput.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    
    const todayStr = new Date().toISOString().slice(0, 10);
    const cachedLive = this.getCachedRates();

    if (targetDateStr === todayStr) {
      return {
        bcv: cachedLive.bcv,
        usdt: cachedLive.usdt,
        isHistorical: false,
        rateDate: todayStr
      };
    }

    const historyMap = this.getHistoricalRatesMap();

    // 1. Coincidencia exacta en el historial
    if (historyMap[targetDateStr]) {
      return {
        bcv: historyMap[targetDateStr].bcv,
        usdt: historyMap[targetDateStr].usdt,
        isHistorical: true,
        rateDate: targetDateStr
      };
    }

    // 2. Buscar en movimientos de esa fecha
    if (transactions && transactions.length > 0) {
      const txsOnDate = transactions.filter(t => {
        const d = (t.date || t.createdAt || '').slice(0, 10);
        return d === targetDateStr && t.appliedRate && t.appliedRate > 0;
      });
      if (txsOnDate.length > 0) {
        const foundRate = txsOnDate[0].appliedRate;
        const isBcvLike = Math.abs(foundRate - cachedLive.bcv) < Math.abs(foundRate - cachedLive.usdt);
        const estBcv = isBcvLike ? foundRate : Number((foundRate * 0.88).toFixed(4));
        const estUsdt = !isBcvLike ? foundRate : Number((foundRate * 1.12).toFixed(4));
        return {
          bcv: estBcv,
          usdt: estUsdt,
          isHistorical: true,
          rateDate: targetDateStr
        };
      }
    }

    // 3. Buscar en deudas de esa fecha
    if (debts && debts.length > 0) {
      const debtsOnDate = debts.filter(d => {
        const dt = (d.createdAt || d.updatedAt || '').slice(0, 10);
        return dt === targetDateStr && d.appliedRateAtCreation && d.appliedRateAtCreation > 0;
      });
      if (debtsOnDate.length > 0) {
        const foundRate = debtsOnDate[0].appliedRateAtCreation;
        return {
          bcv: foundRate,
          usdt: Number((foundRate * 1.11).toFixed(4)),
          isHistorical: true,
          rateDate: targetDateStr
        };
      }
    }

    // 4. Buscar la fecha anterior más cercana registrada en el mapa histórico
    const sortedDates = Object.keys(historyMap).sort();
    const precedingDates = sortedDates.filter(d => d <= targetDateStr);
    if (precedingDates.length > 0) {
      const closestDate = precedingDates[precedingDates.length - 1];
      return {
        bcv: historyMap[closestDate].bcv,
        usdt: historyMap[closestDate].usdt,
        isHistorical: true,
        rateDate: closestDate
      };
    }

    // 5. Fallback a tasas actuales en vivo
    return {
      bcv: cachedLive.bcv,
      usdt: cachedLive.usdt,
      isHistorical: false,
      rateDate: todayStr
    };
  }

  /**
   * Clears manual override and restores API sync
   */
  static clearManualOverride(): void {
    localStorage.removeItem(RATES_OVERRIDE_KEY);
  }

  /**
   * Convert between currencies using specific rate
   */
  static convert(
    amount: number,
    from: Currency,
    to: Currency,
    rateType: 'BCV' | 'USDT' = 'BCV',
    customRates?: ExchangeRates
  ): number {
    if (from === to) return amount;
    const rates = customRates || this.getCachedRates();
    const rate = rateType === 'BCV' ? rates.bcv : rates.usdt;

    if (rate <= 0) return amount;

    if (from === 'USD' && to === 'VES') {
      return Number((amount * rate).toFixed(2));
    } else {
      // VES to USD
      return Number((amount / rate).toFixed(2));
    }
  }

  /**
   * Formats a monetary value according to Venezuelan financial notation
   */
  static formatMoney(amount: number, currency: Currency): string {
    const formatted = new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

    return currency === 'USD' ? `$${formatted}` : `${formatted} Bs`;
  }
}
