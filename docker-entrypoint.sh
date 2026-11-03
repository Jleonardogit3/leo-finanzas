#!/bin/sh
set -e
mkdir -p /app/data
chmod 777 /app/data 2>/dev/null || true

echo "🚀 Iniciando Servidor de Sincronización Local Finanzas Venezuela..."
node /app/server/syncServer.cjs &
SYNC_PID=$!

echo "🚀 Iniciando Servidor Web Nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Manejar señales de terminación limpias
trap "kill -TERM $SYNC_PID $NGINX_PID" SIGTERM SIGINT

wait -n
exit $?
