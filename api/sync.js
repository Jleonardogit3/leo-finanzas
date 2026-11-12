import fs from 'fs';
import path from 'path';

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
    res.status(200).json({
      online: true,
      service: 'Finanzas Vzla Cloud Sync (Fallback)',
      status: 'ready'
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

      let seedData = null;
      try {
        const dbPath = path.join(process.cwd(), 'data', 'database.json');
        if (fs.existsSync(dbPath)) {
          seedData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        }
      } catch (e) {
        console.warn('Error al leer datos base:', e);
      }

      const deletedItemsMap = new Map(
        (clientData.deletedItems || []).map(d => [d.id, new Date(d.deletedAt).getTime()])
      );

      const accountsResult = mergeCollections(seedData?.accounts || [], clientData.accounts || [], deletedItemsMap);
      const transactionsResult = mergeCollections(seedData?.transactions || [], clientData.transactions || [], deletedItemsMap);
      const debtsResult = mergeCollections(seedData?.debts || [], clientData.debts || [], deletedItemsMap);
      const lossesResult = mergeCollections(seedData?.losses || [], clientData.losses || [], deletedItemsMap);
      const categoriesResult = mergeCollections(seedData?.categories || [], clientData.categories || [], deletedItemsMap);
      const assetsResult = mergeCollections(seedData?.portfolioAssets || [], clientData.portfolioAssets || [], deletedItemsMap);
      const goalsResult = mergeCollections(seedData?.goals || [], clientData.goals || [], deletedItemsMap);
      const todosResult = mergeCollections(seedData?.todos || [], clientData.todos || [], deletedItemsMap);

      const mergedData = {
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
        auditLogs: clientData.auditLogs || (seedData?.auditLogs || [])
      };

      const totalUploaded = accountsResult.uploaded + transactionsResult.uploaded + debtsResult.uploaded + lossesResult.uploaded + todosResult.uploaded;
      const totalDownloaded = accountsResult.downloaded + transactionsResult.downloaded + debtsResult.downloaded + lossesResult.downloaded + todosResult.downloaded;
      const totalResolved = accountsResult.resolved + transactionsResult.resolved + debtsResult.resolved + lossesResult.resolved + todosResult.resolved;

      res.status(200).json({
        success: true,
        serverTimestamp: new Date().toISOString(),
        message: '¡Sincronización completada con éxito!',
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
