# 🇻🇪 Finanzas Venezuela PWA - Control Multimoneda & Asesor IA

Una **Progressive Web App (PWA) Offline-First** moderna, ágil y de alto impacto estético, diseñada específicamente para el contexto económico multimoneda de Venezuela (**USD, Tasa Oficial BCV y Binance USDT**).

Permite auditar ingresos y egresos, transferencias y arbitraje cambiario entre cuentas, proyectar metas de ahorro y recibir asesoría financiera inteligente con **Google Gemini**, incluso sin conexión a internet.

---

## 🚀 Inicio Rápido con Docker (Recomendado)

El proyecto está 100% dockerizado para ejecutarse en cualquier sistema operativo (Linux, macOS, Windows) sin necesidad de instalar Node.js:

```bash
# 1. Clonar o ingresar al proyecto:
cd /home/vit/.gemini/antigravity-ide/scratch/finanzas-vzla-pwa

# 2. Iniciar con Docker Compose:
docker compose up -d --build

# O usando el script incluido:
./docker-run.sh start
```

👉 Abre en tu navegador: **`http://localhost:8085`**

Para detener la aplicación:
```bash
docker compose down
# O: ./docker-run.sh stop
```

---

## 📱 Instalación como App Nativa (PWA Móvil)

- **Android (Chrome):** Ingresa a `http://<IP-DE-TU-PC>:8085`, pulsa el menú de 3 puntos y selecciona **"Instalar aplicación"**.
- **iOS (Safari):** Ingresa a la URL, pulsa el botón Compartir y selecciona **"Agregar a la pantalla de inicio"**.

---

## 🛠️ Desarrollo Local (Sin Docker)

Si prefieres ejecutar en modo desarrollo con Hot-Reload:

```bash
# Instalar dependencias:
npm install

# Iniciar servidor de desarrollo:
npm run dev

# Compilar para producción:
npm run build
```

---

## 📑 Documentación Completa

Para consultar la arquitectura en profundidad, flujo de datos, integración con Gemini y fórmulas financieras venezolanas, consulta el archivo:
📘 **[`MANUAL_TECNICO_Y_ARQUITECTURA.md`](./MANUAL_TECNICO_Y_ARQUITECTURA.md)**

---

## 📦 Stack Tecnológico

- **Frontend:** React 18 + Vite (TypeScript)
- **Estilos:** Tailwind CSS (Dark/Light mode automático 06:00-18:00)
- **Iconografía:** Lucide React
- **Gráficos:** Recharts
- **Offline & PWA:** Workbox Service Worker (`sw.js`) y `persistentLocalCache` de Firestore
- **Tasas:** DolarApi Venezuela API (`https://ve.dolarapi.com/v1/dolares`)
- **IA:** Google Gemini API (`@google/genai`)
- **Contenedores:** Docker multi-etapa con Nginx Alpine
