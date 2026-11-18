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

  const hasCloudStorage = Boolean(process.env.GITHUB_TOKEN);

  res.status(200).json({
    online: true,
    service: 'Finanzas Vzla Sync API',
    version: 1,
    cloudDeployed: true,
    hasCloudStorage,
    storageType: hasCloudStorage ? 'github_cloud' : 'disk_readonly',
    serverTime: new Date().toISOString()
  });
}
