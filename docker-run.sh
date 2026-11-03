#!/bin/bash
# Script de gestión rápida de Docker para Finanzas Venezuela PWA

set -e

ACTION="${1:-start}"
PORT="${APP_PORT:-8085}"

case "$ACTION" in
  start|"up")
    echo "🚀 Iniciando Finanzas Venezuela PWA en el puerto http://localhost:$PORT ..."
    docker compose up -d --build
    echo "✅ Aplicación corriendo en segundo plano: http://localhost:$PORT"
    ;;
  stop|"down")
    echo "🛑 Deteniendo contenedor de Finanzas Venezuela PWA..."
    docker compose down
    echo "✅ Contenedor detenido correctamente."
    ;;
  restart)
    echo "🔄 Reiniciando aplicación..."
    docker compose restart
    echo "✅ Reinicio completado."
    ;;
  logs)
    docker compose logs -f
    ;;
  status)
    docker compose ps
    ;;
  *)
    echo "Uso: $0 {start|stop|restart|logs|status}"
    exit 1
    ;;
esac
