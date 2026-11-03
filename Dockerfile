# ==========================================
# Etapa 1: Build de la Aplicación PWA
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias limpias
RUN npm ci || npm install

# Copiar el código fuente y assets
COPY . .

# Argumentos opcionales de construcción para variables de entorno
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_GEMINI_API_KEY

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Compilar la aplicación y el Service Worker de la PWA
RUN npm run build

# ==========================================
# Etapa 2: Servidor Web Nginx + Motor de Sincronización Local
# ==========================================
FROM nginx:1.27-alpine

LABEL maintainer="Antigravity Senior Engineering Team"
LABEL description="Finanzas Venezuela PWA - Contenedor con Sincronización Local y Offline-First"

# Instalar Node.js para ejecutar el motor de sincronización nativo
RUN apk add --no-cache nodejs

WORKDIR /app
RUN mkdir -p /app/data

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados de la PWA
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar el servicio de sincronización y script de entrada
COPY server /app/server
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Exponer el puerto HTTP
EXPOSE 80

# Verificación de salud del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/healthz || exit 1

# Comando de inicio integrado
ENTRYPOINT ["/app/docker-entrypoint.sh"]
