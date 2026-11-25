import fs from 'fs';
import path from 'path';

const GITHUB_REPO = process.env.GITHUB_REPO || 'Jleonardogit3/leo-finanzas';
const GITHUB_BRANCH = process.env.GITHUB_SYNC_BRANCH || 'data-sync';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Caché en memoria corta para tasas oficiales DolarApi (evita desfases entre dispositivos)
let cachedLiveRates = null;
let lastLiveRatesFetchAt = 0;

/**
 * Obtiene tasas en vivo de DolarApi con timeout corto y caché de 90s
 */
async function getCanonicalLiveRates() {
  const now = Date.now();
  if (cachedLiveRates && now - lastLiveRatesFetchAt < 90 * 1000) {
    return cachedLiveRates;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ve.dolarapi.com/v1/dolares', {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        let bcv = cachedLiveRates?.bcv || 0;
        let usdt = cachedLiveRates?.usdt || 0;
        let updateTime = new Date().toISOString();
        for (const item of data) {
          if (item.fuente === 'oficial' && typeof item.promedio === 'number' && item.promedio > 0) {
            bcv = item.promedio;
            if (item.fechaActualizacion) updateTime = item.fechaActualizacion;
          }
          if (item.fuente === 'paralelo' && typeof item.promedio === 'number' && item.promedio > 0) {
            usdt = item.promedio;
            if (item.fechaActualizacion && new Date(item.fechaActualizacion).getTime() > new Date(updateTime).getTime()) {
              updateTime = item.fechaActualizacion;
            }
          }
        }
        if (bcv > 0 && usdt > 0) {
          cachedLiveRates = {
            bcv: Number(bcv.toFixed(4)),
            usdt: Number(usdt.toFixed(4)),
            lastUpdated: updateTime,
            isManualOverride: false,
            spreadPercent: Number((((usdt - bcv) / bcv) * 100).toFixed(2))
          };
          lastLiveRatesFetchAt = now;
          return cachedLiveRates;
        }
      }
    }
  } catch {
    // Fallback al caché previo o tasas de la base central
  }
  return cachedLiveRates;
}

/**
 * Obtiene la base de datos central permanente desde la nube (GitHub branch data-sync)
 * con fallback a los datos locales si la red falla.
 */
async function fetchCentralDatabase() {
  if (GITHUB_TOKEN) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/data/database.json?ref=${GITHUB_BRANCH}&t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'User-Agent': 'FinanzasVzlaCentralSync',
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache'
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
  let diskSaved = false;
  let cloudSaved = false;
  let cloudError = null;
  let conflict = false;

  try {
    const dbPath = path.join(process.cwd(), 'data', 'database.json');
    const tempFile = `${dbPath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(mergedData, null, 2), 'utf8');
    fs.renameSync(tempFile, dbPath);
    diskSaved = true;
  } catch {
    // Entornos de solo lectura como Vercel serverless ignoran escrituras a disco
  }

  if (GITHUB_TOKEN) {
    try {
      let targetSha = currentSha;

      if (!targetSha) {
        const checkRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/data/database.json?ref=${GITHUB_BRANCH}&t=${Date.now()}`,
          {
            cache: 'no-store',
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'User-Agent': 'FinanzasVzlaCentralSync',
              'Accept': 'application/vnd.github.v3+json',
              'Cache-Control': 'no-cache'
            }
          }
        );
        if (checkRes.ok) {
          const info = await checkRes.json();
          targetSha = info.sha;
        } else if (checkRes.status !== 404) {
          cloudError = `GitHub auth/read error (${checkRes.status}): ${checkRes.statusText}`;
        }
      }

      const bodyPayload = {
        message: `sync: update central cloud database [${new Date().toISOString()}]`,
        content: Buffer.from(JSON.stringify(mergedData, null, 2)).toString('base64'),
        branch: GITHUB_BRANCH
      };
      if (targetSha) bodyPayload.sha = targetSha;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/database.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'FinanzasVzlaCentralSync',
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (putRes.ok) {
        cloudSaved = true;
      } else {
        const errBody = await putRes.text();
        if (putRes.status === 409 || putRes.status === 422) {
          conflict = true;
        }
        cloudError = `GitHub write error (${putRes.status}): ${errBody}`;
      }
    } catch (err) {
      cloudError = err.message;
      console.warn('[SyncAPI] Error updating cloud storage:', err.message);
    }
  } else {
    cloudError = 'GITHUB_TOKEN no configurado en Vercel';
  }

  return {
    saved: diskSaved || cloudSaved,
    diskSaved,
    cloudSaved,
    conflict,
    cloudError
  };
}

/**
 * Fusiona tumbas de eliminación conservando hasta los últimos 90 días / 1000 registros
 */
function mergeDeletedItems(serverDeleted = [], clientDeleted = []) {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const map = new Map();
  let newForServer = 0;

  for (const d of serverDeleted) {
    if (!d || !d.id) continue;
    const dTime = new Date(d.deletedAt || 0).getTime();
    if (dTime >= cutoff || !d.deletedAt) {
      map.set(d.id, d);
    }
  }

  for (const d of clientDeleted) {
    if (!d || !d.id) continue;
    const dTime = new Date(d.deletedAt || 0).getTime();
    const existing = map.get(d.id);
    if (!existing || dTime > new Date(existing.deletedAt || 0).getTime()) {
      map.set(d.id, d);
      newForServer++;
    }
  }

  const merged = Array.from(map.values())
    .sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime())
    .slice(0, 1000);

  return { merged, newForServer };
}

/**
 * Algoritmo Last-Write-Wins completo para fusionar datos respetando fecha más reciente,
 * tumbas de borrado y registros presentes únicamente en el servidor o en el cliente.
 */
function mergeCollections(serverList = [], clientList = [], deletedItemsMap = new Map()) {
  const itemMap = new Map();
  const clientIds = new Set();
  let uploaded = 0;
  let downloaded = 0;
  let resolved = 0;
  let deletedFromServer = 0;

  for (const sItem of serverList) {
    if (!sItem || !sItem.id) continue;
    const deletionTime = deletedItemsMap.get(sItem.id);
    const itemUpdateTime = new Date(sItem.updatedAt || sItem.createdAt || 0).getTime();
    if (deletionTime && deletionTime >= itemUpdateTime) {
      deletedFromServer++;
      continue;
    }
    itemMap.set(sItem.id, sItem);
  }

  for (const cItem of clientList) {
    if (!cItem || !cItem.id) continue;
    clientIds.add(cItem.id);
    const deletionTime = deletedItemsMap.get(cItem.id);
    const clientUpdateTime = new Date(cItem.updatedAt || cItem.createdAt || 0).getTime();
    if (deletionTime && deletionTime >= clientUpdateTime) {
      downloaded++;
      resolved++;
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

  // Cualquier registro del servidor que no existía en este cliente DEBE contarse como descargado
  for (const [id] of itemMap) {
    if (!clientIds.has(id)) {
      downloaded++;
    }
  }

  return {
    merged: Array.from(itemMap.values()),
    uploaded,
    downloaded,
    resolved,
    deletedFromServer
  };
}

/**
 * Suma de deltas por cuenta y subfondo para una lista dada de transacciones
 */
function computeTransactionDeltas(transactions = []) {
  const totalDeltas = {};
  for (const tx of transactions) {
    if (!tx) continue;
    const origSub = tx.subFund || 'ves';
    const destSub = tx.toSubFund || 'ves';
    const delta = (tx.type === 'expense' || tx.type === 'transfer') ? -tx.amount : tx.amount;
    const origKey = `${tx.accountId}_${origSub}`;
    totalDeltas[origKey] = (totalDeltas[origKey] || 0) + delta;

    if (tx.type === 'transfer' && tx.toAccountId) {
      const destKey = `${tx.toAccountId}_${destSub}`;
      const incoming = tx.destinationAmount !== undefined ? tx.destinationAmount : tx.amount;
      totalDeltas[destKey] = (totalDeltas[destKey] || 0) + incoming;
    }
  }
  return totalDeltas;
}

/**
 * Obtiene el mapa de balances base previos al historial de transacciones para un conjunto (accounts, transactions)
 */
function computeBalancesBaseMap(accounts = [], transactions = []) {
  const deltas = computeTransactionDeltas(transactions);
  const map = new Map();
  for (const acc of accounts) {
    if (!acc || !acc.id) continue;
    map.set(acc.id, {
      ves: acc.balanceBaseVes !== undefined
        ? acc.balanceBaseVes
        : Number(((acc.currentBalance ?? 0) - (deltas[`${acc.id}_ves`] || 0)).toFixed(2)),
      digital_usd: acc.balanceBaseDigitalUsd !== undefined
        ? acc.balanceBaseDigitalUsd
        : Number(((acc.digitalUsdBalance ?? 0) - (deltas[`${acc.id}_digital_usd`] || 0)).toFixed(2)),
      physical_usd: acc.balanceBasePhysicalUsd !== undefined
        ? acc.balanceBasePhysicalUsd
        : Number(((acc.physicalUsdBalance ?? 0) - (deltas[`${acc.id}_physical_usd`] || 0)).toFixed(2)),
      baseUpdatedAt: acc.balanceBaseUpdatedAt || null
    });
  }
  return map;
}

/**
 * Reconcilia la cadena cronológica completa de balances de más antiguo a más reciente
 */
function reconcileChronologicalTimeline(transactions = [], accounts = [], winningBaseByAccount = null) {
  const sorted = [...transactions].sort((a, b) => {
    const timeA = new Date(a.date || a.createdAt || 0).getTime();
    const timeB = new Date(b.date || b.createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    const createdDiff = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    if (createdDiff !== 0) return createdDiff;
    return (a.id || '').localeCompare(b.id || '');
  });

  const fallbackDeltas = computeTransactionDeltas(sorted);
  const runningBalances = {};

  for (const acc of accounts) {
    const win = winningBaseByAccount ? winningBaseByAccount.get(acc.id) : null;
    runningBalances[`${acc.id}_ves`] = win
      ? win.ves
      : Number(((acc.currentBalance ?? 0) - (fallbackDeltas[`${acc.id}_ves`] || 0)).toFixed(2));
    runningBalances[`${acc.id}_digital_usd`] = win
      ? win.digital_usd
      : Number(((acc.digitalUsdBalance ?? 0) - (fallbackDeltas[`${acc.id}_digital_usd`] || 0)).toFixed(2));
    runningBalances[`${acc.id}_physical_usd`] = win
      ? win.physical_usd
      : Number(((acc.physicalUsdBalance ?? 0) - (fallbackDeltas[`${acc.id}_physical_usd`] || 0)).toFixed(2));
  }

  const startBaseSnapshot = { ...runningBalances };

  const reconciledTxs = [];
  for (const tx of sorted) {
    const origSub = tx.subFund || 'ves';
    const destSub = tx.toSubFund || 'ves';
    const origKey = `${tx.accountId}_${origSub}`;
    const destKey = tx.toAccountId ? `${tx.toAccountId}_${destSub}` : null;

    const delta = (tx.type === 'expense' || tx.type === 'transfer') ? -tx.amount : tx.amount;
    const origBefore = runningBalances[origKey] !== undefined ? runningBalances[origKey] : 0;
    const origAfter = Number((origBefore + delta).toFixed(2));
    runningBalances[origKey] = origAfter;

    let destBefore = undefined;
    let destAfter = undefined;
    if (tx.type === 'transfer' && destKey) {
      const incoming = tx.destinationAmount !== undefined ? tx.destinationAmount : tx.amount;
      destBefore = runningBalances[destKey] !== undefined ? runningBalances[destKey] : 0;
      destAfter = Number((destBefore + incoming).toFixed(2));
      runningBalances[destKey] = destAfter;
    }

    reconciledTxs.push({
      ...tx,
      accountBalanceBefore: origBefore,
      accountBalanceAfter: origAfter,
      toAccountBalanceBefore: destBefore,
      toAccountBalanceAfter: destAfter
    });
  }

  const updatedAccounts = accounts.map(acc => {
    const ves = runningBalances[`${acc.id}_ves`];
    const dig = runningBalances[`${acc.id}_digital_usd`];
    const phy = runningBalances[`${acc.id}_physical_usd`];
    const win = winningBaseByAccount ? winningBaseByAccount.get(acc.id) : null;
    return {
      ...acc,
      currentBalance: ves !== undefined ? ves : acc.currentBalance,
      digitalUsdBalance: dig !== undefined ? dig : acc.digitalUsdBalance,
      physicalUsdBalance: phy !== undefined ? phy : acc.physicalUsdBalance,
      balanceBaseVes: startBaseSnapshot[`${acc.id}_ves`],
      balanceBaseDigitalUsd: startBaseSnapshot[`${acc.id}_digital_usd`],
      balanceBasePhysicalUsd: startBaseSnapshot[`${acc.id}_physical_usd`],
      balanceBaseUpdatedAt: (win && win.baseUpdatedAt) || acc.balanceBaseUpdatedAt || acc.createdAt || '1970-01-01T00:00:00.000Z'
    };
  });

  const sortedDesc = [...reconciledTxs].sort((a, b) => {
    const timeB = new Date(b.date || b.createdAt || 0).getTime();
    const timeA = new Date(a.date || a.createdAt || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    const createdDiff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    if (createdDiff !== 0) return createdDiff;
    return (b.id || '').localeCompare(a.id || '');
  });

  return { reconciledTransactions: sortedDesc, reconciledAccounts: updatedAccounts };
}

/**
 * Fusiona tasas actuales e históricas por fecha entre cliente, base central y DolarApi
 */
function mergeRatesAndHistory(centralDb, clientData, liveRates) {
  const mergedHistory = { ...(centralDb?.historicalRates || {}) };
  let historyUpdatedOnServer = false;

  if (clientData?.historicalRates && typeof clientData.historicalRates === 'object') {
    for (const [dateKey, vals] of Object.entries(clientData.historicalRates)) {
      if (vals && vals.bcv > 0 && vals.usdt > 0) {
        const cur = mergedHistory[dateKey];
        if (!cur) {
          mergedHistory[dateKey] = {
            bcv: Number(Number(vals.bcv).toFixed(4)),
            usdt: Number(Number(vals.usdt).toFixed(4))
          };
          historyUpdatedOnServer = true;
        }
      }
    }
  }

  const sRates = centralDb?.rates || null;
  const cRates = clientData?.rates || null;
  let effectiveRates = sRates;
  let manualRatesUploaded = false;

  if (cRates && cRates.isManualOverride) {
    const cTime = new Date(cRates.lastUpdated || 0).getTime();
    const sTime = new Date(sRates?.lastUpdated || 0).getTime();
    if (!sRates?.isManualOverride ? cTime >= sTime : cTime > sTime) {
      effectiveRates = cRates;
      manualRatesUploaded = true;
    }
  } else if (!effectiveRates?.isManualOverride) {
    const candidates = [sRates, cRates, liveRates].filter(r => r && r.bcv > 0 && r.usdt > 0 && !r.isManualOverride);
    if (candidates.length > 0) {
      candidates.sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime());
      effectiveRates = candidates[0];
    }
  }

  return { mergedRates: effectiveRates, mergedHistory, historyUpdatedOnServer, manualRatesUploaded };
}

/**
 * Firma rápida de estado para que GET /api/sync indique si hay cambios respecto al cliente
 */
function computeServerRevision(db, liveRates) {
  const txList = db?.transactions || [];
  const newestTx = txList[0];
  const ratesStamp = liveRates?.lastUpdated || db?.rates?.lastUpdated || '';
  return [
    db?.lastUpdated || 'init',
    (db?.accounts || []).length,
    txList.length,
    (db?.debts || []).length,
    (db?.losses || []).length,
    (db?.todos || []).length,
    (db?.deletedItems || []).length,
    newestTx ? `${newestTx.id}:${newestTx.updatedAt || newestTx.createdAt || ''}` : 'none',
    ratesStamp
  ].join('|');
}

/**
 * Ejecuta la fusión completa sobre una instantánea de centralDb
 */
function buildMergedSyncPayload(centralDb, clientData, liveRates) {
  const { merged: mergedDeleted, newForServer: newTombstonesCount } = mergeDeletedItems(
    centralDb?.deletedItems || [],
    clientData?.deletedItems || []
  );

  const deletedItemsMap = new Map(
    mergedDeleted.map(d => [d.id, new Date(d.deletedAt || 0).getTime()])
  );

  // Calcular bases de balance ANTES de fusionar transacciones para evitar pérdida de cambios offline concurrentes
  const serverBaseMap = computeBalancesBaseMap(centralDb?.accounts || [], centralDb?.transactions || []);
  const clientBaseMap = computeBalancesBaseMap(clientData?.accounts || [], clientData?.transactions || []);

  const accountsResult = mergeCollections(centralDb?.accounts || [], clientData.accounts || [], deletedItemsMap);
  const transactionsResult = mergeCollections(centralDb?.transactions || [], clientData.transactions || [], deletedItemsMap);
  const debtsResult = mergeCollections(centralDb?.debts || [], clientData.debts || [], deletedItemsMap);
  const lossesResult = mergeCollections(centralDb?.losses || [], clientData.losses || [], deletedItemsMap);
  const categoriesResult = mergeCollections(centralDb?.categories || [], clientData.categories || [], deletedItemsMap);
  const assetsResult = mergeCollections(centralDb?.portfolioAssets || [], clientData.portfolioAssets || [], deletedItemsMap);
  const goalsResult = mergeCollections(centralDb?.goals || [], clientData.goals || [], deletedItemsMap);
  const todosResult = mergeCollections(centralDb?.todos || [], clientData.todos || [], deletedItemsMap);
  const auditLogsResult = mergeCollections(centralDb?.auditLogs || [], clientData.auditLogs || [], deletedItemsMap);

  // Resolver la base ganadora por cuenta
  const serverAccMap = new Map((centralDb?.accounts || []).map(a => [a.id, a]));
  const clientAccMap = new Map((clientData?.accounts || []).map(a => [a.id, a]));
  const winningBaseByAccount = new Map();
  let baseUpdatedByClientCount = 0;

  for (const acc of accountsResult.merged) {
    const sAcc = serverAccMap.get(acc.id);
    const cAcc = clientAccMap.get(acc.id);
    const sBase = serverBaseMap.get(acc.id);
    const cBase = clientBaseMap.get(acc.id);

    if (sBase && cBase) {
      const sBaseTime = new Date(sAcc?.balanceBaseUpdatedAt || sAcc?.updatedAt || sAcc?.createdAt || 0).getTime();
      const cBaseTime = new Date(cAcc?.balanceBaseUpdatedAt || cAcc?.updatedAt || cAcc?.createdAt || 0).getTime();

      if (cAcc?.balanceBaseUpdatedAt && (!sAcc?.balanceBaseUpdatedAt ? cBaseTime > sBaseTime : cBaseTime > sBaseTime)) {
        winningBaseByAccount.set(acc.id, {
          ...cBase,
          baseUpdatedAt: cAcc.balanceBaseUpdatedAt
        });
        if (cBase.ves !== sBase.ves || cBase.digital_usd !== sBase.digital_usd || cBase.physical_usd !== sBase.physical_usd) {
          baseUpdatedByClientCount++;
        }
      } else if (sAcc?.balanceBaseUpdatedAt && sBaseTime >= cBaseTime) {
        winningBaseByAccount.set(acc.id, {
          ...sBase,
          baseUpdatedAt: sAcc.balanceBaseUpdatedAt
        });
      } else {
        // Migración o empate usando updatedAt más reciente únicamente si hubo ajuste sin nueva tx
        const clientAdjustedOnly = transactionsResult.uploaded === 0 && newTombstonesCount === 0 && cBaseTime > sBaseTime;
        winningBaseByAccount.set(acc.id, {
          ...(clientAdjustedOnly ? cBase : sBase),
          baseUpdatedAt: (clientAdjustedOnly ? cAcc?.updatedAt : sAcc?.updatedAt) || sAcc?.createdAt || '1970-01-01T00:00:00.000Z'
        });
        if (clientAdjustedOnly && (cBase.ves !== sBase.ves || cBase.digital_usd !== sBase.digital_usd || cBase.physical_usd !== sBase.physical_usd)) {
          baseUpdatedByClientCount++;
        }
      }
    } else if (cBase) {
      winningBaseByAccount.set(acc.id, cBase);
    } else if (sBase) {
      winningBaseByAccount.set(acc.id, sBase);
    }
  }

  // Reconciliar cadena cronológica completa de balances y preservar el orden estable de cuentas del servidor
  const existingOrder = new Map((centralDb?.accounts || []).map((a, idx) => [a.id, idx]));
  const orderedMergedAccounts = [...accountsResult.merged].sort((a, b) => {
    const ia = existingOrder.has(a.id) ? existingOrder.get(a.id) : 999999;
    const ib = existingOrder.has(b.id) ? existingOrder.get(b.id) : 999999;
    if (ia !== ib) return ia - ib;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  const { reconciledTransactions, reconciledAccounts } = reconcileChronologicalTimeline(
    transactionsResult.merged,
    orderedMergedAccounts,
    winningBaseByAccount
  );

  const {
    mergedRates,
    mergedHistory,
    historyUpdatedOnServer,
    manualRatesUploaded
  } = mergeRatesAndHistory(centralDb, clientData, liveRates);

  const totalUploaded =
    accountsResult.uploaded +
    transactionsResult.uploaded +
    debtsResult.uploaded +
    lossesResult.uploaded +
    categoriesResult.uploaded +
    assetsResult.uploaded +
    goalsResult.uploaded +
    todosResult.uploaded +
    auditLogsResult.uploaded +
    newTombstonesCount +
    baseUpdatedByClientCount +
    (manualRatesUploaded ? 1 : 0) +
    (historyUpdatedOnServer ? 1 : 0);

  const totalDeletedFromServer =
    accountsResult.deletedFromServer +
    transactionsResult.deletedFromServer +
    debtsResult.deletedFromServer +
    lossesResult.deletedFromServer +
    categoriesResult.deletedFromServer +
    assetsResult.deletedFromServer +
    goalsResult.deletedFromServer +
    todosResult.deletedFromServer;

  const totalDownloaded =
    accountsResult.downloaded +
    transactionsResult.downloaded +
    debtsResult.downloaded +
    lossesResult.downloaded +
    categoriesResult.downloaded +
    assetsResult.downloaded +
    goalsResult.downloaded +
    todosResult.downloaded;

  const totalResolved =
    accountsResult.resolved +
    transactionsResult.resolved +
    debtsResult.resolved +
    lossesResult.resolved +
    categoriesResult.resolved +
    assetsResult.resolved +
    goalsResult.resolved +
    todosResult.resolved;

  const serverNeedsSave = totalUploaded > 0 || totalDeletedFromServer > 0;
  const nowIso = new Date().toISOString();
  const effectiveLastUpdated = serverNeedsSave ? nowIso : (centralDb?.lastUpdated || nowIso);

  const mergedData = {
    version: 1,
    serverCreatedAt: centralDb?.serverCreatedAt || nowIso,
    lastUpdated: effectiveLastUpdated,
    accounts: reconciledAccounts,
    transactions: reconciledTransactions,
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
    auditLogs: auditLogsResult.merged.sort((a, b) =>
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    ).slice(0, 250),
    deletedItems: mergedDeleted,
    rates: mergedRates || undefined,
    historicalRates: mergedHistory
  };

  return {
    mergedData,
    serverNeedsSave,
    stats: {
      uploaded: totalUploaded,
      downloaded: totalDownloaded,
      resolved: totalResolved
    }
  };
}

export { buildMergedSyncPayload };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const [{ data: currentDb, source }, liveRates] = await Promise.all([
      fetchCentralDatabase(),
      getCanonicalLiveRates()
    ]);

    const { mergedRates, mergedHistory } = mergeRatesAndHistory(currentDb, null, liveRates);
    const revision = computeServerRevision(currentDb, mergedRates);

    res.status(200).json({
      online: true,
      service: 'Finanzas Vzla Servidor Web Central',
      status: 'ready',
      storageSource: source,
      lastUpdated: currentDb?.lastUpdated || null,
      revision,
      rates: mergedRates || null,
      historicalRates: mergedHistory,
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

      const [{ data: initialDb, sha: initialSha }, liveRates] = await Promise.all([
        fetchCentralDatabase(),
        getCanonicalLiveRates()
      ]);

      let centralDb = initialDb;
      let currentSha = initialSha;
      let syncOutput = buildMergedSyncPayload(centralDb, clientData, liveRates);
      let saveResult = {
        saved: false,
        cloudSaved: Boolean(currentSha),
        diskSaved: Boolean(centralDb && !GITHUB_TOKEN)
      };

      if (syncOutput.serverNeedsSave) {
        saveResult = await saveCentralDatabase(syncOutput.mergedData, currentSha);

        // Reintentar hasta 2 veces en caso de conflicto de SHA en GitHub (escritura simultánea)
        let retries = 0;
        while (saveResult.conflict && retries < 2) {
          retries++;
          const latest = await fetchCentralDatabase();
          centralDb = latest.data;
          currentSha = latest.sha;
          syncOutput = buildMergedSyncPayload(centralDb, clientData, liveRates);
          saveResult = await saveCentralDatabase(syncOutput.mergedData, currentSha);
        }

        // Si había datos nuevos que guardar en la nube y la escritura falló, devolver error para que el cliente reintente
        if (!saveResult.saved) {
          res.status(503).json({
            success: false,
            persistent: false,
            error: saveResult.cloudError || 'No se pudo guardar en el servidor central. Se reintentará automáticamente.',
            message: 'No se pudo persistir en la nube temporalmente. Tus cambios siguen en cola segura para reintentar.'
          });
          return;
        }
      }

      const isPersistent = syncOutput.serverNeedsSave
        ? Boolean(saveResult.cloudSaved || saveResult.diskSaved)
        : Boolean(saveResult.cloudSaved || saveResult.diskSaved || currentSha || !GITHUB_TOKEN);

      const revision = computeServerRevision(syncOutput.mergedData, syncOutput.mergedData.rates);

      res.status(200).json({
        success: true,
        persistent: isPersistent,
        storageSource: saveResult.cloudSaved ? 'cloud' : (saveResult.diskSaved ? 'disk' : 'memory_ephemeral'),
        serverTimestamp: syncOutput.mergedData.lastUpdated,
        revision,
        message: isPersistent
          ? '¡Sincronización completada con éxito con el servidor web central!'
          : '⚠️ Datos sincronizados temporalmente en memoria. Verifica GITHUB_TOKEN en Vercel.',
        warning: !isPersistent ? (saveResult.cloudError || 'Sin almacenamiento permanente en la nube configurado') : undefined,
        stats: syncOutput.stats,
        mergedData: syncOutput.mergedData
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        persistent: false,
        error: err.message || 'Error en el proceso de sincronización'
      });
    }
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
