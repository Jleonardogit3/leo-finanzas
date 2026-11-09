import fs from 'fs';
import path from 'path';

const ACTIVE_TUNNEL_FALLBACK = 'https://guitar-archived-gotta-possession.trycloudflare.com';

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

  const tunnel = getTunnelUrl();
  if (tunnel) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const forwardRes = await fetch(`${tunnel}/api/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (forwardRes.ok) {
        const liveStatus = await forwardRes.json();
        res.status(200).json({
          ...liveStatus,
          cloudProxy: true,
          tunnelUrl: tunnel
        });
        return;
      }
    } catch (e) {
      console.warn('Status forwarding to tunnel timed out:', e.message);
    }
  }

  // Fallback
  res.status(200).json({
    online: true,
    service: 'Finanzas Vzla Serverless API (Vercel Fallback)',
    version: 1,
    tunnelUrl: tunnel,
    localWifiIp: '192.168.1.121',
    localEthIp: '172.16.10.23',
    appPort: '8085',
    cloudDeployed: true,
    serverTime: new Date().toISOString()
  });
}
