/**
 * Finanzas Venezuela PWA - Servidor Local de Sincronización
 * Arquitectura Offline-First con resolución de conflictos por fecha (Last-Write-Wins)
 * 
 * Funciona de forma nativa con Node.js sin dependencias externas.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.SYNC_PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Asegurar que la carpeta de datos exista
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('[SyncServer] Error creando directorio de datos:', err);
  }
}

// Estructura por defecto de la base de datos central
const DEFAULT_DATABASE = {
  version: 1,
  serverCreatedAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  accounts: [],
  transactions: [],
  debts: [],
  losses: [],
  categories: [],
  portfolioAssets: [],
  goals: [],
  todos: [],
  auditLogs: [],
  deletedItems: [] // { id: string, type: string, deletedAt: string }
};

/**
 * Lee la base de datos central de disco
 */
function readDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    saveDatabase(DEFAULT_DATABASE);
    return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[SyncServer] Error leyendo base de datos, usando default:', err);
    return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
  }
}

/**
 * Guarda la base de datos central en disco de forma atómica
 */
function saveDatabase(data) {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('[SyncServer] Error guardando base de datos:', err);
    return false;
  }
}

/**
 * Algoritmo de resolución de conflictos por fecha más reciente (Last-Write-Wins)
 * Fusiona dos colecciones respetando updatedAt y tumbas de eliminación (deletedItems).
 */
function mergeCollections(serverList = [], clientList = [], deletedItemsMap = new Map()) {
  const itemMap = new Map();
  let uploaded = 0;
  let downloaded = 0;
  let resolved = 0;

  // 1. Cargar items del servidor en el mapa
  for (const sItem of serverList) {
    if (!sItem || !sItem.id) continue;
    
    // Verificar si fue eliminado
    const deletionTime = deletedItemsMap.get(sItem.id);
    const itemUpdateTime = new Date(sItem.updatedAt || sItem.createdAt || 0).getTime();
    if (deletionTime && deletionTime >= itemUpdateTime) {
      continue; // Item eliminado
    }

    itemMap.set(sItem.id, sItem);
  }

  // 2. Evaluar items del cliente
  for (const cItem of clientList) {
    if (!cItem || !cItem.id) continue;

    // Verificar si fue eliminado
    const deletionTime = deletedItemsMap.get(cItem.id);
    const clientUpdateTime = new Date(cItem.updatedAt || cItem.createdAt || 0).getTime();
    if (deletionTime && deletionTime >= clientUpdateTime) {
      continue; // Item eliminado
    }

    if (!itemMap.has(cItem.id)) {
      // Item nuevo procedente del cliente
      itemMap.set(cItem.id, cItem);
      uploaded++;
    } else {
      // Conflicto de existencia: Comparamos fechas de modificación
      const sItem = itemMap.get(cItem.id);
      const serverUpdateTime = new Date(sItem.updatedAt || sItem.createdAt || 0).getTime();

      if (clientUpdateTime > serverUpdateTime) {
        // La versión del cliente es más reciente
        itemMap.set(cItem.id, cItem);
        uploaded++;
        resolved++;
      } else if (clientUpdateTime < serverUpdateTime) {
        // La versión del servidor es más reciente
        downloaded++;
        resolved++;
      } else {
        // Si las fechas son idénticas, desempatar favoreciendo registros con saldo o contenido real
        const clientHasData = (cItem.currentBalance > 0 || (cItem.digitalUsdBalance || 0) > 0 || (cItem.physicalUsdBalance || 0) > 0 || (cItem.initialBalance > 0));
        const serverHasData = (sItem.currentBalance > 0 || (sItem.digitalUsdBalance || 0) > 0 || (sItem.physicalUsdBalance || 0) > 0 || (sItem.initialBalance > 0));
        if (clientHasData && !serverHasData) {
          itemMap.set(cItem.id, cItem);
          uploaded++;
          resolved++;
        }
      }
    }
  }

  return {
    merged: Array.from(itemMap.values()),
    stats: { uploaded, downloaded, resolved }
  };
}

/**
 * Fusiona tumbas de eliminación (deletedItems) conservando las más recientes
 */
function mergeDeletedItems(serverDeleted = [], clientDeleted = []) {
  const map = new Map();
  for (const d of [...serverDeleted, ...clientDeleted]) {
    if (!d || !d.id) continue;
    const existing = map.get(d.id);
    const dTime = new Date(d.deletedAt || 0).getTime();
    if (!existing || dTime > new Date(existing.deletedAt || 0).getTime()) {
      map.set(d.id, d);
    }
  }
  return Array.from(map.values());
}

/**
 * Procesa la sincronización global bidireccional
 */
function performFullSync(clientPayload) {
  const serverDb = readDatabase();
  const serverTimestamp = new Date().toISOString();

  // Fusionar lista de eliminados
  const mergedDeleted = mergeDeletedItems(
    serverDb.deletedItems || [],
    clientPayload.deletedItems || []
  );

  // Mapa rápido de ID -> timestamp de eliminación
  const deletedMap = new Map();
  mergedDeleted.forEach(d => {
    deletedMap.set(d.id, new Date(d.deletedAt).getTime());
  });

  // Colecciones a fusionar
  const collections = [
    'accounts',
    'transactions',
    'debts',
    'losses',
    'categories',
    'portfolioAssets',
    'goals',
    'todos',
    'auditLogs'
  ];

  const mergedDb = {
    ...serverDb,
    lastUpdated: serverTimestamp,
    deletedItems: mergedDeleted
  };

  const totalStats = {
    uploaded: 0,
    downloaded: 0,
    resolved: 0
  };

  for (const col of collections) {
    const serverItems = serverDb[col] || [];
    const clientItems = clientPayload[col] || [];
    const result = mergeCollections(serverItems, clientItems, deletedMap);
    
    if (col === 'transactions') {
      mergedDb[col] = result.merged.sort((a, b) => {
        const timeB = new Date(b.date || b.createdAt || 0).getTime();
        const timeA = new Date(a.date || a.createdAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    } else if (col === 'debts') {
      mergedDb[col] = result.merged.sort((a, b) => {
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
    } else if (col === 'losses') {
      mergedDb[col] = result.merged.sort((a, b) => {
        const timeB = new Date(b.date || b.createdAt || 0).getTime();
        const timeA = new Date(a.date || a.createdAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    } else if (col === 'todos') {
      mergedDb[col] = result.merged.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'pending' ? -1 : 1;
        }
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        return timeB - timeA;
      });
    } else {
      mergedDb[col] = result.merged;
    }
    totalStats.uploaded += result.stats.uploaded;
    totalStats.downloaded += result.stats.downloaded;
    totalStats.resolved += result.stats.resolved;
  }

  // Guardar en disco
  saveDatabase(mergedDb);

  return {
    success: true,
    serverTimestamp,
    stats: totalStats,
    mergedData: {
      accounts: mergedDb.accounts,
      transactions: mergedDb.transactions,
      debts: mergedDb.debts,
      losses: mergedDb.losses,
      categories: mergedDb.categories,
      portfolioAssets: mergedDb.portfolioAssets,
      goals: mergedDb.goals,
      auditLogs: mergedDb.auditLogs,
      deletedItems: mergedDb.deletedItems
    }
  };
}

/**
 * Extrae la URL activa del túnel de Cloudflare desde el archivo de log o variable de entorno
 */
function getActiveTunnelUrl() {
  if (process.env.TUNNEL_URL && process.env.TUNNEL_URL.trim()) {
    return process.env.TUNNEL_URL.trim();
  }
  const tunnelLog = path.join(DATA_DIR, 'tunnel.log');
  if (fs.existsSync(tunnelLog)) {
    try {
      const content = fs.readFileSync(tunnelLog, 'utf-8');
      const matches = content.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g);
      if (matches && matches.length > 0) {
        return matches[matches.length - 1];
      }
    } catch (err) {
      console.warn('[SyncServer] Error leyendo tunnel.log:', err);
    }
  }
  return null;
}

// Configurar servidor HTTP
const server = http.createServer((req, res) => {
  // Configuración de CORS universal para red local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Endpoint de estado / ping
  if (pathname === '/api/status' || pathname === '/api/sync/ping') {
    const db = readDatabase();
    const activeTunnel = getActiveTunnelUrl();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'Finanzas Venezuela Local Sync Server',
      serverTime: new Date().toISOString(),
      lastUpdated: db.lastUpdated || db.serverCreatedAt,
      tunnelUrl: activeTunnel,
      localWifiIp: process.env.HOST_WIFI_IP || '192.168.1.121',
      localEthIp: process.env.HOST_ETH_IP || '172.16.10.23',
      containerIp: process.env.STATIC_CONTAINER_IP || '172.28.0.10',
      appPort: process.env.APP_PORT || '8085',
      detectedHost: req.headers.host,
      totalRecords: {
        accounts: (db.accounts || []).length,
        transactions: (db.transactions || []).length,
        debts: (db.debts || []).length,
        losses: (db.losses || []).length
      }
    }));
    return;
  }

  // Endpoint GET: Obtener datos actuales del servidor
  if (req.method === 'GET' && (pathname === '/api/sync' || pathname === '/api/sync/')) {
    const db = readDatabase();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      serverTimestamp: new Date().toISOString(),
      data: db
    }));
    return;
  }

  // Endpoint POST: Sincronizar datos con resolución Last-Write-Wins
  if (req.method === 'POST' && (pathname === '/api/sync' || pathname === '/api/sync/')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Protección contra payloads excesivos (50MB límite)
      if (body.length > 50 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const clientPayload = JSON.parse(body || '{}');
        const syncResult = performFullSync(clientPayload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(syncResult));
      } catch (err) {
        console.error('[SyncServer] Error procesando payload de sincronización:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'JSON inválido o error en sincronización' }));
      }
    });
    return;
  }

  // Ruta 404 para otras solicitudes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Iniciar servidor si se ejecuta directamente
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.info(`[SyncServer] 🚀 Servidor de sincronización local activo en http://0.0.0.0:${PORT}`);
    console.info(`[SyncServer] Base de datos persistente en: ${DB_FILE}`);
  });
}

module.exports = {
  server,
  performFullSync,
  readDatabase,
  saveDatabase,
  getActiveTunnelUrl
};
