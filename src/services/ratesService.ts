import { ExchangeRates, Currency } from '../types';

const RATES_STORAGE_KEY = 'finanzas_vzla_exchange_rates';
const RATES_OVERRIDE_KEY = 'finanzas_vzla_rates_override';

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
    return manualRates;
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
