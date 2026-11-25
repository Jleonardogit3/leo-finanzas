import { 
  Account, 
  Transaction, 
  Category, 
  PortfolioAsset, 
  FinancialGoal, 
  Debt, 
  Loss,
  TodoItem,
  AuditLogEntry,
  ExchangeRates,
  DeletedItem, 
  SyncResult 
} from '../types';

const SYNC_SERVER_URL_KEY = 'finanzas_vzla_sync_server_url';
const LAST_SYNC_TIME_KEY = 'finanzas_vzla_last_sync_time';
const LAST_SERVER_SIG_KEY = 'finanzas_vzla_last_server_sig';
const DELETED_ITEMS_KEY = 'finanzas_vzla_deleted_items';
const DIRTY_REV_KEY = 'finanzas_vzla_dirty_sync_rev';

export class SyncService {
  /**
   * Obtiene la URL del servidor web de sincronización permanente
   */
  static getSyncServerUrl(): string {
    const saved = localStorage.getItem(SYNC_SERVER_URL_KEY);
    if (saved) {
      // Limpiar cualquier residuo de IPs locales o puertos antiguos para evitar datos inconsistentes
      const isLocalIp = saved.includes('192.168.') || saved.includes('172.16.') || saved.includes('localhost') || saved.includes(':8085') || saved.includes(':3001');
      if (isLocalIp) {
        localStorage.removeItem(SYNC_SERVER_URL_KEY);
      } else if (saved.trim()) {
        return saved.trim().replace(/\/+$/, '');
      }
    }
    // Servidor web oficial permanente (el mismo host y origen donde se ejecuta la app)
    return typeof window !== 'undefined' ? window.location.origin : 'https://leo-finanzas-rouge.vercel.app';
  }

  static setSyncServerUrl(url: string): void {
    if (!url || !url.trim() || (typeof window !== 'undefined' && url === window.location.origin)) {
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

  static getLastServerSignature(): string | null {
    try {
      return localStorage.getItem(LAST_SERVER_SIG_KEY);
    } catch {
      return null;
    }
  }

  static setLastServerSignature(signature: string): void {
    if (!signature) return;
    try {
      localStorage.setItem(LAST_SERVER_SIG_KEY, signature);
    } catch {}
  }

  /**
   * Cola persistente de cambios locales sin subir (offline -> online)
   */
  static getDirtyRevision(): number {
    try {
      const raw = localStorage.getItem(DIRTY_REV_KEY);
      return raw ? (parseInt(raw, 10) || 0) : 0;
    } catch {
      return 0;
    }
  }

  static markDirty(): number {
    const next = this.getDirtyRevision() + 1;
    try {
      localStorage.setItem(DIRTY_REV_KEY, String(next));
    } catch {}
    return next;
  }

  static clearDirtyIfRevisionMatches(expectedRev: number): boolean {
    const current = this.getDirtyRevision();
    if (current === expectedRev) {
      try {
        localStorage.setItem(DIRTY_REV_KEY, '0');
      } catch {}
      return true;
    }
    return false;
  }

  static hasPendingChanges(): boolean {
    return this.getDirtyRevision() > 0 || this.getDeletedItems().length > 0;
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
      this.markDirty();
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

  static clearSyncedDeletedItems(syncedSnapshot: DeletedItem[]): void {
    try {
      const syncedMap = new Map(syncedSnapshot.map(d => [d.id, d.deletedAt]));
      const remaining = this.getDeletedItems().filter(item => {
        const syncedAt = syncedMap.get(item.id);
        return !syncedAt || item.deletedAt !== syncedAt;
      });
      if (remaining.length === 0) {
        localStorage.removeItem(DELETED_ITEMS_KEY);
      } else {
        localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(remaining));
      }
    } catch {
      localStorage.removeItem(DELETED_ITEMS_KEY);
    }
  }

  static clearDeletedItems(): void {
    localStorage.removeItem(DELETED_ITEMS_KEY);
  }

  /**
   * Comprueba si el servidor está disponible en la red
   */
  static async pingServer(customUrl?: string): Promise<{ online: boolean; serverInfo?: any }> {
    const baseUrl = customUrl || this.getSyncServerUrl();
    const endpoint = `${baseUrl}/api/status?t=${Date.now()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(endpoint, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const info = await res.json();
        return { online: true, serverInfo: info };
      }
    } catch {
      // Servidor no disponible o timeout
    }

    return { online: false };
  }

  /**
   * Consulta ligera (solo lectura) para detectar si el servidor tiene datos más recientes
   * sin provocar escrituras en GitHub
   */
  static async checkServerState(customUrl?: string): Promise<{
    online: boolean;
    revision?: string;
    lastUpdated?: string | null;
    rates?: ExchangeRates | null;
    historicalRates?: Record<string, { bcv: number; usdt: number }>;
  }> {
    const baseUrl = customUrl || this.getSyncServerUrl();
    const endpoint = `${baseUrl}/api/sync?t=${Date.now()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);

      const res = await fetch(endpoint, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return {
          online: true,
          revision: data.revision,
          lastUpdated: data.lastUpdated,
          rates: data.rates || null,
          historicalRates: data.historicalRates
        };
      }
    } catch {
      // Offline o error temporal
    }

    return { online: false };
  }

  /**
   * Ejecuta la sincronización bidireccional completa con el servidor web central
   */
  static async syncWithLocalServer(localData: {
    accounts: Account[];
    transactions: Transaction[];
    categories: Category[];
    portfolioAssets: PortfolioAsset[];
    goals: FinancialGoal[];
    debts: Debt[];
    losses: Loss[];
    todos?: TodoItem[];
    auditLogs?: AuditLogEntry[];
    rates?: ExchangeRates;
    historicalRates?: Record<string, { bcv: number; usdt: number }>;
  }, customServerUrl?: string): Promise<SyncResult & { revision?: string }> {
    const baseUrl = customServerUrl || this.getSyncServerUrl();
    const endpoint = `${baseUrl}/api/sync`;

    // Preparar payload con timestamps de modificación y registros eliminados
    const deletedItemsSnapshot = this.getDeletedItems();
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
      todos: (localData.todos || []).map(td => ({
        ...td,
        updatedAt: td.updatedAt || td.createdAt || '1970-01-01T00:00:00.000Z'
      })),
      auditLogs: localData.auditLogs || [],
      rates: localData.rates,
      historicalRates: localData.historicalRates,
      deletedItems: deletedItemsSnapshot,
      clientTimestamp: new Date().toISOString()
    };

    const trySyncEndpoint = async (targetEndpoint: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      try {
        const res = await fetch(targetEndpoint, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseData = await res.json().catch(() => ({}));
        if (!res.ok || !responseData.success) {
          throw new Error(responseData.error || responseData.message || `Error en servidor (${res.status}): ${res.statusText}`);
        }

        const serverTimestamp = responseData.serverTimestamp || new Date().toISOString();
        this.setLastSyncTime(serverTimestamp);
        if (responseData.revision) {
          this.setLastServerSignature(responseData.revision);
        }

        const isPersistent = responseData.persistent !== false;
        if (isPersistent) {
          this.clearSyncedDeletedItems(deletedItemsSnapshot);
        }

        return {
          success: true,
          persistent: isPersistent,
          isOffline: false,
          message: responseData.message || '¡Sincronización completada con éxito! Se mantuvo la versión más reciente por fecha de cada registro.',
          serverTimestamp,
          revision: responseData.revision,
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
      console.warn('SyncService warning (servidor fuera de alcance o dispositivo sin red):', primaryErr.message);
      const isNetError = !navigator.onLine || primaryErr.name === 'AbortError' || String(primaryErr).includes('fetch') || String(primaryErr).includes('Network') || String(primaryErr).includes('Failed to fetch');
      return {
        success: false,
        persistent: false,
        isOffline: isNetError,
        message: isNetError 
          ? 'Sin conexión estable. Tus cambios permanecen guardados localmente para subirse automáticamente.' 
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
