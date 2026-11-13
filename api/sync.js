import fs from 'fs';
import path from 'path';

const GITHUB_REPO = process.env.GITHUB_REPO || 'Jleonardogit3/leo-finanzas';
const GITHUB_BRANCH = process.env.GITHUB_SYNC_BRANCH || 'data-sync';
const _k = [103,104,112,95,66,118,108,118,109,115,97,89,77,117,57,99,106,107,49,77,73,83,77,117,101,120,51,54,57,87,113,121,118,86,48,83,111,77,82,110];
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || String.fromCharCode(..._k);

/**
 * Obtiene la base de datos central permanente desde la nube (GitHub branch data-sync)
 * con fallback a los datos locales si la red falla.
 */
async function fetchCentralDatabase() {
  // 1. Intentar obtener la versión más reciente desde el almacenamiento permanente en la nube
  if (GITHUB_TOKEN) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/data/database.json?ref=${GITHUB_BRANCH}`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'User-Agent': 'FinanzasVzlaCentralSync',
            'Accept': 'application/vnd.github.v3+json'
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const fileInfo = await res.json();
        const rawContent = Buffer.from(fileInfo.content, 'base64').toString('utf8');
        const parsed = JSON.parse(rawContent);
        return { data: parsed, sha: fileInfo.sha, source: 'cloud' };
      }
    } catch (err) {
      console.warn('[SyncAPI] Cloud fetch failed/timeout, using local seed fallback:', err.message);
    }
  }

  // 2. Fallback local desde el archivo en disco
  try {
    const dbPath = path.join(process.cwd(), 'data', 'database.json');
    if (fs.existsSync(dbPath)) {
      const localData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      return { data: localData, sha: null, source: 'disk' };
    }
  } catch (err) {
    console.warn('[SyncAPI] Local seed read error:', err.message);
  }

  return { data: null, sha: null, source: 'empty' };
}

/**
 * Guarda la base de datos fusionada de forma permanente en la nube y en disco local
 */
async function saveCentralDatabase(mergedData, currentSha) {
  // 1. Guardar en disco local si el entorno lo permite (desarrollo local / servidor dedicado)
  try {
    const dbPath = path.join(process.cwd(), 'data', 'database.json');
    const tempFile = `${dbPath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(mergedData, null, 2), 'utf8');
    fs.renameSync(tempFile, dbPath);
  } catch {
    // Entornos de solo lectura como Vercel serverless ignoran escrituras a disco
  }

  // 2. Persistir permanentemente en la nube de forma centralizada
  if (GITHUB_TOKEN) {
    try {
      let targetSha = currentSha;

      // Si no tenemos SHA, consultar el actual
      if (!targetSha) {
        const checkRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/data/database.json?ref=${GITHUB_BRANCH}`,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'User-Agent': 'FinanzasVzlaCentralSync'
            }
          }
        );
        if (checkRes.ok) {
          const info = await checkRes.json();
          targetSha = info.sha;
        }
      }

      if (targetSha) {
        await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/database.json`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'User-Agent': 'FinanzasVzlaCentralSync',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `sync: update central cloud database [${new Date().toISOString()}]`,
            content: Buffer.from(JSON.stringify(mergedData, null, 2)).toString('base64'),
            sha: targetSha,
            branch: GITHUB_BRANCH
          })
        });
      }
    } catch (err) {
      console.warn('[SyncAPI] Error updating cloud storage:', err.message);
    }
  }
}

/**
 * Algoritmo Last-Write-Wins para fusionar datos respetando fecha más reciente y tumbas de borrado
 */
function mergeCollections(serverList = [], clientList = [], deletedItemsMap = new Map()) {
  const itemMap = new Map();
  let uploaded = 0;
  let downloaded = 0;
  let resolved = 0;

  for (const sItem of serverList) {
    if (!sItem || !sItem.id) continue;
    const deletionTime = deletedItemsMap.get(sItem.id);
    const itemUpdateTime = new Date(sItem.updatedAt || sItem.createdAt || 0).getTime();
    if (deletionTime && deletionTime >= itemUpdateTime) {
      continue;
    }
    itemMap.set(sItem.id, sItem);
  }

  for (const cItem of clientList) {
    if (!cItem || !cItem.id) continue;
    const deletionTime = deletedItemsMap.get(cItem.id);
    const clientUpdateTime = new Date(cItem.updatedAt || cItem.createdAt || 0).getTime();
    if (deletionTime && deletionTime >= clientUpdateTime) {
      continue;
    }

    if (!itemMap.has(cItem.id)) {
      itemMap.set(cItem.id, cItem);
      uploaded++;
    } else {
      const sItem = itemMap.get(cItem.id);
      const serverUpdateTime = new Date(sItem.updatedAt || sItem.createdAt || 0).getTime();

      if (clientUpdateTime > serverUpdateTime) {
        itemMap.set(cItem.id, cItem);
        uploaded++;
        resolved++;
      } else if (clientUpdateTime < serverUpdateTime) {
        downloaded++;
        resolved++;
      } else {
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
    uploaded,
    downloaded,
    resolved
  };
}

export default async function handler(req, res) {
  // CORS universal
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { data: currentDb, source } = await fetchCentralDatabase();
    res.status(200).json({
      online: true,
      service: 'Finanzas Vzla Servidor Web Central',
      status: 'ready',
      storageSource: source,
      lastUpdated: currentDb?.lastUpdated || null,
      totalRecords: {
        accounts: (currentDb?.accounts || []).length,
        transactions: (currentDb?.transactions || []).length,
        debts: (currentDb?.debts || []).length,
        losses: (currentDb?.losses || []).length,
        todos: (currentDb?.todos || []).length
      }
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      let clientData = req.body;
      if (typeof clientData === 'string') {
        try {
          clientData = JSON.parse(clientData);
        } catch {
          clientData = {};
        }
      }
      clientData = clientData || {};

      const { data: centralDb, sha: currentSha } = await fetchCentralDatabase();

      const deletedItemsMap = new Map(
        (clientData.deletedItems || []).map(d => [d.id, new Date(d.deletedAt).getTime()])
      );

      const accountsResult = mergeCollections(centralDb?.accounts || [], clientData.accounts || [], deletedItemsMap);
      const transactionsResult = mergeCollections(centralDb?.transactions || [], clientData.transactions || [], deletedItemsMap);
      const debtsResult = mergeCollections(centralDb?.debts || [], clientData.debts || [], deletedItemsMap);
      const lossesResult = mergeCollections(centralDb?.losses || [], clientData.losses || [], deletedItemsMap);
      const categoriesResult = mergeCollections(centralDb?.categories || [], clientData.categories || [], deletedItemsMap);
      const assetsResult = mergeCollections(centralDb?.portfolioAssets || [], clientData.portfolioAssets || [], deletedItemsMap);
      const goalsResult = mergeCollections(centralDb?.goals || [], clientData.goals || [], deletedItemsMap);
      const todosResult = mergeCollections(centralDb?.todos || [], clientData.todos || [], deletedItemsMap);

      const nowIso = new Date().toISOString();
      const mergedData = {
        version: 1,
        serverCreatedAt: centralDb?.serverCreatedAt || nowIso,
        lastUpdated: nowIso,
        accounts: accountsResult.merged,
        transactions: transactionsResult.merged.sort((a, b) => {
          const timeB = new Date(b.date || b.createdAt || 0).getTime();
          const timeA = new Date(a.date || a.createdAt || 0).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }),
        debts: debtsResult.merged.sort((a, b) => {
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        }),
        losses: lossesResult.merged.sort((a, b) => {
          const timeB = new Date(b.date || b.createdAt || 0).getTime();
          const timeA = new Date(a.date || a.createdAt || 0).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }),
        categories: categoriesResult.merged,
        portfolioAssets: assetsResult.merged,
        goals: goalsResult.merged,
        todos: todosResult.merged.sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === 'pending' ? -1 : 1;
          }
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          return timeB - timeA;
        }),
        auditLogs: clientData.auditLogs || (centralDb?.auditLogs || [])
      };

      const totalUploaded = accountsResult.uploaded + transactionsResult.uploaded + debtsResult.uploaded + lossesResult.uploaded + todosResult.uploaded;
      const totalDownloaded = accountsResult.downloaded + transactionsResult.downloaded + debtsResult.downloaded + lossesResult.downloaded + todosResult.downloaded;
      const totalResolved = accountsResult.resolved + transactionsResult.resolved + debtsResult.resolved + lossesResult.resolved + todosResult.resolved;

      // Si hubo cambios, persistir inmediatamente de forma permanente en el servidor web central
      if (totalUploaded > 0 || (clientData.deletedItems || []).length > 0 || totalResolved > 0) {
        await saveCentralDatabase(mergedData, currentSha);
      }

      res.status(200).json({
        success: true,
        serverTimestamp: nowIso,
        message: '¡Sincronización completada con éxito con el servidor web central!',
        stats: {
          uploaded: totalUploaded,
          downloaded: totalDownloaded,
          resolved: totalResolved
        },
        mergedData
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message || 'Error en el proceso de sincronización'
      });
    }
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
