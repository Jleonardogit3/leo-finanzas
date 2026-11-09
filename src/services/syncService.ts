import { 
  Account, 
  Transaction, 
  Category, 
  PortfolioAsset, 
  FinancialGoal, 
  Debt, 
  Loss, 
  DeletedItem, 
  SyncResult 
} from '../types';

const SYNC_SERVER_URL_KEY = 'finanzas_vzla_sync_server_url';
const LAST_SYNC_TIME_KEY = 'finanzas_vzla_last_sync_time';
const DELETED_ITEMS_KEY = 'finanzas_vzla_deleted_items';
export const ACTIVE_CLOUD_TUNNEL = 'https://guitar-archived-gotta-possession.trycloudflare.com';

export class SyncService {
  /**
   * Obtiene la URL del servidor de sincronización configurado o detecta el actual
   */
  static getSyncServerUrl(): string {
    const saved = localStorage.getItem(SYNC_SERVER_URL_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
    // En el navegador, la ruta relativa apunta al mismo host/puerto actual
    return window.location.origin;
  }

  static setSyncServerUrl(url: string): void {
    if (!url || !url.trim()) {
      localStorage.removeItem(SYNC_SERVER_URL_KEY);
    } else {
      localStorage.setItem(SYNC_SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
    }
  }

  static getLastSyncTime(): string | null {
    return localStorage.getItem(LAST_SYNC_TIME_KEY);
  }

  static setLastSyncTime(isoString: string): void {
    localStorage.setItem(LAST_SYNC_TIME_KEY, isoString);
  }

  /**
   * Registra un elemento eliminado para evitar que resucite en sincronización
   */
  static recordDeletion(id: string, type: DeletedItem['type']): void {
    try {
      const existing = this.getDeletedItems();
      const now = new Date().toISOString();
      const updated = [
        ...existing.filter(item => item.id !== id),
        { id, type, deletedAt: now }
      ];
      // Guardar máximo últimos 500 registros de eliminación
      localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(updated.slice(-500)));
    } catch (e) {
      console.warn('Error recording deletion tombstone', e);
    }
  }

  static getDeletedItems(): DeletedItem[] {
    try {
      const raw = localStorage.getItem(DELETED_ITEMS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static clearDeletedItems(): void {
    localStorage.removeItem(DELETED_ITEMS_KEY);
  }

  /**
   * Comprueba si el servidor local está disponible en la red
   */
  static async pingServer(customUrl?: string): Promise<{ online: boolean; serverInfo?: any }> {
    const baseUrl = customUrl || this.getSyncServerUrl();
    const endpoint = `${baseUrl}/api/status`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 segundos de timeout

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const info = await res.json();
        return { online: true, serverInfo: info };
      }
    } catch {
      // Intento con túnel en la nube si el endpoint inicial falló
    }

    if (!customUrl && baseUrl !== ACTIVE_CLOUD_TUNNEL) {
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 4000);
        const res2 = await fetch(`${ACTIVE_CLOUD_TUNNEL}/api/status`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller2.signal
        });
        clearTimeout(timeoutId2);
        if (res2.ok) {
          const info2 = await res2.json();
          return { online: true, serverInfo: info2 };
        }
      } catch {}
    }

    return { online: false };
  }

  /**
   * Ejecuta la sincronización bidireccional completa con el servidor local
   */
  static async syncWithLocalServer(localData: {
    accounts: Account[];
    transactions: Transaction[];
    categories: Category[];
    portfolioAssets: PortfolioAsset[];
    goals: FinancialGoal[];
    debts: Debt[];
    losses: Loss[];
  }, customServerUrl?: string): Promise<SyncResult> {
    const baseUrl = customServerUrl || this.getSyncServerUrl();
    const endpoint = `${baseUrl}/api/sync`;

    // Preparar payload con timestamps de modificación y registros eliminados
    const deletedItems = this.getDeletedItems();
    const payload = {
      accounts: localData.accounts.map(a => ({
        ...a,
        updatedAt: a.updatedAt || a.createdAt || '1970-01-01T00:00:00.000Z'
      })),
      transactions: localData.transactions.map(t => ({
        ...t,
        updatedAt: t.updatedAt || t.createdAt || '1970-01-01T00:00:00.000Z'
      })),
      categories: localData.categories.map(c => ({
        ...c,
        updatedAt: c.updatedAt || '1970-01-01T00:00:00.000Z'
      })),
      portfolioAssets: localData.portfolioAssets.map(p => ({
        ...p,
        updatedAt: p.updatedAt || '1970-01-01T00:00:00.000Z'
      })),
      goals: localData.goals.map(g => ({
        ...g,
        updatedAt: g.updatedAt || g.createdAt || '1970-01-01T00:00:00.000Z'
      })),
      debts: localData.debts.map(d => ({
        ...d,
        updatedAt: d.updatedAt || d.createdAt || '1970-01-01T00:00:00.000Z'
      })),
      losses: localData.losses.map(l => ({
        ...l,
        updatedAt: l.updatedAt || l.createdAt || '1970-01-01T00:00:00.000Z'
      })),
      deletedItems,
      clientTimestamp: new Date().toISOString()
    };

    const trySyncEndpoint = async (targetEndpoint: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout para respuesta rápida

      try {
        const res = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Error en servidor (${res.status}): ${res.statusText}`);
        }

        const responseData = await res.json();
        if (!responseData.success) {
          throw new Error(responseData.error || 'Respuesta fallida de sincronización');
        }

        // Marcar fecha de última sincronización
        const serverTimestamp = responseData.serverTimestamp || new Date().toISOString();
        this.setLastSyncTime(serverTimestamp);

        // Limpiar tumbas de eliminación antiguas
        this.clearDeletedItems();

        return {
          success: true,
          isOffline: false,
          message: '¡Sincronización completada con éxito! Se mantuvo la versión más reciente por fecha de cada registro.',
          serverTimestamp,
          stats: responseData.stats,
          mergedData: responseData.mergedData
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    try {
      return await trySyncEndpoint(endpoint);
    } catch (primaryErr: any) {
      // Si el endpoint primario falló y no estábamos ya apuntando explícitamente al túnel en la nube
      if (!customServerUrl && baseUrl !== ACTIVE_CLOUD_TUNNEL) {
        try {
          return await trySyncEndpoint(`${ACTIVE_CLOUD_TUNNEL}/api/sync`);
        } catch (secondaryErr: any) {
          console.warn('SyncService warning (túnel en la nube tampoco respondió):', secondaryErr.message);
        }
      }

      console.warn('SyncService warning (servidor local fuera de alcance o dispositivo sin red):', primaryErr.message);
      const isNetError = !navigator.onLine || primaryErr.name === 'AbortError' || String(primaryErr).includes('fetch') || String(primaryErr).includes('Network');
      return {
        success: false,
        isOffline: isNetError,
        message: isNetError 
          ? 'No se pudo conectar con el servidor local ni la nube. Comprueba la conexión.' 
          : (primaryErr.message || 'Error de comunicación durante la sincronización')
      };
    }
  }

  /**
   * Exporta toda la base de datos local en un archivo JSON descargable
   */
  static exportBackupJson(data: any): void {
    const filename = `finanzas-vzla-backup-${new Date().toISOString().split('T')[0]}.json`;
    const jsonStr = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      data
    }, null, 2);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
