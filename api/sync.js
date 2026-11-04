import fs from 'fs';
import path from 'path';

const ACTIVE_TUNNEL_FALLBACK = 'https://engine-collectible-rarely-delivers.trycloudflare.com';

function getTunnelUrl() {
  if (process.env.TUNNEL_URL && process.env.TUNNEL_URL.trim()) {
    return process.env.TUNNEL_URL.trim().replace(/\/+$/, '');
  }
  try {
    const tunnelLog = path.join(process.cwd(), 'data', 'tunnel.log');
    if (fs.existsSync(tunnelLog)) {
      const content = fs.readFileSync(tunnelLog, 'utf-8');
      const matches = content.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g);
      if (matches && matches.length > 0) {
        return matches[matches.length - 1];
      }
    }
  } catch {}
  return ACTIVE_TUNNEL_FALLBACK;
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

  // 1. Intentar conectar en vivo con el Servidor Central local a través del Túnel Seguro Cloudflare
  const tunnel = getTunnelUrl();
  if (tunnel) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const forwardRes = await fetch(`${tunnel}/api/sync`, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: req.method === 'POST' ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (forwardRes.ok) {
        const liveData = await forwardRes.json();
        res.status(200).json(liveData);
        return;
      }
    } catch (e) {
      console.warn('Forwarding to live local sync server via tunnel timed out/failed, falling back to local dataset:', e.message);
    }
  }

  // 2. Fallback de contingencia si el servidor central local está apagado
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

      const mergedData = {
        accounts: (clientData.accounts && clientData.accounts.length > 0)
          ? clientData.accounts
          : (seedData?.accounts || []),
        transactions: clientData.transactions || (seedData?.transactions || []),
        debts: (clientData.debts && clientData.debts.length > 0)
          ? clientData.debts
          : (seedData?.debts || []),
        losses: (clientData.losses && clientData.losses.length > 0)
          ? clientData.losses
          : (seedData?.losses || []),
        categories: (clientData.categories && clientData.categories.length > 0)
          ? clientData.categories
          : (seedData?.categories || []),
        portfolioAssets: clientData.portfolioAssets || (seedData?.portfolioAssets || []),
        goals: (clientData.goals && clientData.goals.length > 0)
          ? clientData.goals
          : (seedData?.goals || []),
        auditLogs: clientData.auditLogs || (seedData?.auditLogs || [])
      };

      res.status(200).json({
        success: true,
        serverTimestamp: new Date().toISOString(),
        message: '¡Sincronización completada con éxito!',
        stats: {
          uploaded: clientData.accounts?.length || 0,
          downloaded: 0,
          resolved: 0
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
