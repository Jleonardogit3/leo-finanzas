export default function handler(req, res) {
  // Configuración de cabeceras CORS
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

  res.status(200).json({
    online: true,
    service: 'Finanzas Vzla Serverless API (Vercel)',
    version: 1,
    localWifiIp: '192.168.1.121',
    localEthIp: '172.16.10.23',
    appPort: '8085',
    cloudDeployed: true,
    serverTime: new Date().toISOString()
  });
}

