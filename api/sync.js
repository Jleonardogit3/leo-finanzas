import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // CORS
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
      service: 'Finanzas Vzla Cloud Sync',
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

