import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function localSyncDevPlugin(): Plugin {
  return {
    name: 'local-sync-dev-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;

        if (pathname === '/api/status' || pathname === '/api/sync/ping') {
          try {
            const { readDatabase, getActiveTunnelUrl } = require('./server/syncServer.cjs');
            const db = readDatabase();
            const activeTunnel = typeof getActiveTunnelUrl === 'function' ? getActiveTunnelUrl() : null;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              status: 'online',
              service: 'Finanzas Venezuela Servidor Web Central',
              serverTime: new Date().toISOString(),
              lastUpdated: db.lastUpdated || db.serverCreatedAt,
              totalRecords: {
                accounts: (db.accounts || []).length,
                transactions: (db.transactions || []).length,
                debts: (db.debts || []).length,
                losses: (db.losses || []).length
              }
            }));
            return;
          } catch (e) {
            console.error('Sync middleware error:', e);
          }
        }

        if (pathname === '/api/sync' || pathname === '/api/sync/') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            try {
              const { readDatabase } = require('./server/syncServer.cjs');
              const db = readDatabase();
              const txList = db.transactions || [];
              const newestTx = txList[0];
              const revision = [
                db.lastUpdated || 'init',
                (db.accounts || []).length,
                txList.length,
                (db.debts || []).length,
                (db.losses || []).length,
                (db.todos || []).length,
                (db.deletedItems || []).length,
                newestTx ? `${newestTx.id}:${newestTx.updatedAt || newestTx.createdAt || ''}` : 'none',
                db.rates?.lastUpdated || ''
              ].join('|');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                online: true,
                success: true,
                service: 'Finanzas Venezuela Servidor Web Central',
                status: 'ready',
                storageSource: 'disk',
                lastUpdated: db.lastUpdated || null,
                revision,
                rates: db.rates || null,
                historicalRates: db.historicalRates || {},
                totalRecords: {
                  accounts: (db.accounts || []).length,
                  transactions: txList.length,
                  debts: (db.debts || []).length,
                  losses: (db.losses || []).length,
                  todos: (db.todos || []).length
                }
              }));
              return;
            } catch (e) {
              console.error('Sync GET error:', e);
            }
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const { performFullSync } = require('./server/syncServer.cjs');
                const clientPayload = JSON.parse(body || '{}');
                const result = performFullSync(clientPayload);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (e) {
                console.error('Sync POST error:', e);
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
              }
            });
            return;
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  server: {
    host: true, // Permite conexiones directas desde la IP de la red local
    port: 5173
  },
  plugins: [
    react(),
    localSyncDevPlugin(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'mask-icon.svg', 'icons/*.png', 'logos/*.png', 'logos/*.jpg'],
      manifest: {
        id: '/',
        name: 'Finanzas Venezuela - Control Multimoneda & Asesor IA',
        short_name: 'FinanzasVzla',
        description: 'Control de ingresos, gastos, deudas, pérdidas y patrimonio multimoneda (USD, BCV, USDT) para Venezuela.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'es-VE',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/ve\.dolarapi\.com\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dolar-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours fallback
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
