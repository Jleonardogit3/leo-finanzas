import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Copy, 
  Check, 
  Server, 
  ShieldCheck, 
  Download, 
  ArrowUpDown, 
  Globe, 
  QrCode,
  AlertTriangle,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SyncService } from '../../services/syncService';
import { StorageService } from '../../services/storageService';

export const SyncModal: React.FC = () => {
  const { 
    isSyncModalOpen, 
    setIsSyncModalOpen, 
    isSyncing, 
    lastSyncTime, 
    syncWithServer 
  } = useApp();

  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [customServerUrl, setCustomServerUrl] = useState(() => SyncService.getSyncServerUrl());
  const [inputUrl, setInputUrl] = useState(() => SyncService.getSyncServerUrl());
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'warning' | 'error' | null;
    message: string;
    stats?: { uploaded: number; downloaded: number; resolved: number };
  }>({ type: null, message: '' });

  const [serverInfo, setServerInfo] = useState<{
    tunnelUrl?: string | null;
    localWifiIp?: string;
    localEthIp?: string;
    containerIp?: string;
    appPort?: string;
  } | null>(null);

  // IPs detectadas y estáticas garantizadas
  const LOCAL_WIFI_IP = serverInfo?.localWifiIp || '192.168.1.121';
  const LOCAL_ETH_IP = serverInfo?.localEthIp || '172.16.10.23';
  const PORT = serverInfo?.appPort || '8085';
  const defaultTunnel = 'https://spare-limitations-textile-december.trycloudflare.com';
  const activeTunnelUrl = serverInfo?.tunnelUrl || defaultTunnel;

  const wifiUrl = `http://${LOCAL_WIFI_IP}:${PORT}`;
  const ethUrl = `http://${LOCAL_ETH_IP}:${PORT}`;

  useEffect(() => {
    if (isSyncModalOpen) {
      checkServerHealth();
    }
  }, [isSyncModalOpen]);

  const checkServerHealth = async (urlToCheck?: string) => {
    setIsCheckingServer(true);
    const targetUrl = urlToCheck || customServerUrl;
    const res = await SyncService.pingServer(targetUrl);
    setServerOnline(res.online);
    if (res.online && res.serverInfo) {
      setServerInfo(res.serverInfo);
    }
    setIsCheckingServer(false);
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedIp(url);
    setTimeout(() => setCopiedIp(null), 2500);
  };

  const handleSelectServerUrl = (url: string) => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    SyncService.setSyncServerUrl(cleanUrl);
    setCustomServerUrl(cleanUrl);
    setInputUrl(cleanUrl);
    setSyncFeedback({ type: null, message: '' });
    checkServerHealth(cleanUrl);
  };

  const handleSaveCustomUrl = () => {
    if (!inputUrl.trim()) return;
    handleSelectServerUrl(inputUrl);
    setIsEditingUrl(false);
  };

  const handleTriggerSync = async () => {
    setSyncFeedback({ type: null, message: '' });
    const result = await syncWithServer(customServerUrl);

    if (result.success) {
      setServerOnline(true);
      setSyncFeedback({
        type: 'success',
        message: result.message,
        stats: result.stats
      });
    } else if (result.isOffline) {
      setServerOnline(false);
      setSyncFeedback({
        type: 'warning',
        message: result.message
      });
    } else {
      setSyncFeedback({
        type: 'error',
        message: result.message
      });
    }
  };

  const handleExportBackup = () => {
    const allData = StorageService.getAllData();
    SyncService.exportBackupJson(allData);
  };

  if (!isSyncModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Sincronización Local & Multi-Dispositivo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arquitectura Offline-First con IPs estáticas y resolución Last-Write-Wins
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsSyncModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">

          {/* Estado de Conexión al Servidor */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-lg flex-shrink-0 ${
                serverOnline === true 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : serverOnline === false
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-slate-500/10 text-slate-400'
              }`}>
                {isCheckingServer ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                ) : serverOnline ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                  Estado del Servidor Central:
                  {isCheckingServer ? (
                    <span className="text-slate-400 text-[11px] font-normal">Comprobando...</span>
                  ) : serverOnline ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">En línea ({customServerUrl})</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">Sin conexión al servidor</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {lastSyncTime 
                    ? `Última sincronización: ${new Date(lastSyncTime).toLocaleString('es-VE')}`
                    : 'Aún no se ha realizado ninguna sincronización en este dispositivo.'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => checkServerHealth()}
                disabled={isCheckingServer}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Verificar
              </button>
            </div>
          </div>

          {/* ALERTA Y SOLUCIÓN RÁPIDA SI NO HAY CONEXIÓN */}
          {!serverOnline && !isCheckingServer && (
            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">No se pudo conectar a la dirección actual:</p>
                  <code className="font-mono text-[11px] block mt-0.5 text-amber-800 dark:text-amber-300 break-all bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                    {customServerUrl}
                  </code>
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                    Si estás en tu teléfono conectado a la red Wi-Fi de tu casa, cambia a la <strong>IP Local Fija</strong> de tu PC con un solo clic:
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 pl-6">
                <button
                  onClick={() => handleSelectServerUrl(wifiUrl)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 active:scale-95"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Usar Wi-Fi Local ({LOCAL_WIFI_IP}:{PORT})</span>
                </button>
                {activeTunnelUrl && (
                  <button
                    onClick={() => handleSelectServerUrl(activeTunnelUrl)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 active:scale-95"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Usar Túnel Global</span>
                  </button>
                )}
                <button
                  onClick={() => handleSelectServerUrl(window.location.origin)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Restablecer a Origen Actual
                </button>
              </div>
            </div>
          )}

          {/* BARRA DE CONFIGURACIÓN DEL SERVIDOR CONECTADO */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Servidor Configurado en este Dispositivo:
                </span>
                <code className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 break-all">
                  {customServerUrl}
                </code>
              </div>
              <button
                onClick={() => setIsEditingUrl(prev => !prev)}
                className="self-start sm:self-auto px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                <span>{isEditingUrl ? 'Ocultar Editor' : 'Cambiar Dirección IP/URL'}</span>
              </button>
            </div>

            {/* Formulario desplegable para cambiar la URL */}
            {isEditingUrl && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in duration-150">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                  Escribe o pega la dirección IP / Dominio del servidor:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder={`http://${LOCAL_WIFI_IP}:${PORT}`}
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleSaveCustomUrl}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
                  >
                    Guardar
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                  <span>Accesos directos:</span>
                  <button 
                    onClick={() => handleSelectServerUrl(wifiUrl)}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    Wi-Fi ({LOCAL_WIFI_IP}:{PORT})
                  </button>
                  <button 
                    onClick={() => handleSelectServerUrl(ethUrl)}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    Ethernet ({LOCAL_ETH_IP}:{PORT})
                  </button>
                  {activeTunnelUrl && (
                    <button 
                      onClick={() => handleSelectServerUrl(activeTunnelUrl)}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      Túnel HTTPS
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta de Direcciones para conectar el teléfono */}
          <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                Dirección para Conectar desde Cualquier Lugar
              </h3>
            </div>
            
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Usa el <strong>Enlace Global HTTPS</strong> para acceder desde tu teléfono usando <strong>datos móviles (Digitel, Movistar, Movilnet)</strong> o <strong>cualquier red Wi-Fi</strong> fuera de tu casa:
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {/* Opción 1: Enlace Global HTTPS */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500/50 shadow-md flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500 text-white shadow-xs flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Acceso Global (Datos Móviles & Cualquier Wi-Fi)
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        ¡Funciona en todo el mundo!
                      </span>
                    </div>
                    <code className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 select-all block py-0.5 break-all">
                      {activeTunnelUrl}
                    </code>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowQr(prev => !prev)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                      title="Ver código QR para escanear con la cámara del teléfono"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{showQr ? 'Ocultar QR' : 'Código QR'}</span>
                    </button>
                    <button
                      onClick={() => handleCopy(activeTunnelUrl)}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95"
                    >
                      {copiedIp === activeTunnelUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Enlace</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Vista del Código QR */}
                {showQr && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-700">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeTunnelUrl)}&margin=4`}
                        alt="Código QR para acceso global"
                        className="w-44 h-44 object-contain"
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-xs">
                      Apunta la <strong>cámara de tu teléfono</strong> a este código QR para abrir la app directamente con tus <strong>datos móviles (Digitel, Movistar, Movilnet)</strong> o cualquier red Wi-Fi.
                    </p>
                  </div>
                )}
              </div>

              {/* Opciones de Red Local (Wi-Fi y Ethernet con IP Estática) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Opción Wi-Fi Local */}
                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        Wi-Fi Local (IP Estática Fija)
                      </span>
                    </div>
                    <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 select-all block py-1">
                      {wifiUrl}
                    </code>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Recomendado en casa: súper rápido y sin depender de internet.
                    </p>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => handleSelectServerUrl(wifiUrl)}
                      className="flex-1 py-1 px-2 text-xs font-bold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-center"
                    >
                      Usar en este Móvil
                    </button>
                    <button
                      onClick={() => handleCopy(wifiUrl)}
                      className="p-1 px-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs"
                      title="Copiar dirección"
                    >
                      {copiedIp === wifiUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Opción Ethernet */}
                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Ethernet / LAN
                      </span>
                    </div>
                    <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 select-all block py-1">
                      {ethUrl}
                    </code>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Para computadoras o dispositivos conectados por cable.
                    </p>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => handleSelectServerUrl(ethUrl)}
                      className="flex-1 py-1 px-2 text-xs font-bold rounded-md bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 text-slate-800 dark:text-slate-200 transition-colors text-center"
                    >
                      Usar en este Móvil
                    </button>
                    <button
                      onClick={() => handleCopy(ethUrl)}
                      className="p-1 px-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs"
                      title="Copiar dirección"
                    >
                      {copiedIp === ethUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón de Sincronización Principal */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-800/20 text-center space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Sincronizar Datos Entre Dispositivos
            </h3>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Se fusionarán todos los registros (cuentas, transacciones, deudas, pérdidas, metas). Si un mismo dato se modificó en ambos dispositivos, <strong>prevalece siempre la modificación con la fecha y hora más reciente</strong>.
            </p>

            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className={`w-full max-w-xs mx-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 ${
                isSyncing 
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 hover:shadow-lg'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando registros...' : 'Sincronizar Ahora'}</span>
            </button>
          </div>

          {/* Feedback del resultado */}
          {syncFeedback.type && (
            <div className={`p-4 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                : syncFeedback.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {syncFeedback.type === 'success' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                {syncFeedback.type === 'warning' && <WifiOff className="w-4 h-4 text-amber-500" />}
                {syncFeedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                <span>{syncFeedback.message}</span>
              </div>
              {syncFeedback.stats && (
                <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Subidos al servidor: <strong>{syncFeedback.stats.uploaded}</strong></span>
                  <span>Descargados: <strong>{syncFeedback.stats.downloaded}</strong></span>
                  <span>Conflictos resueltos por fecha: <strong>{syncFeedback.stats.resolved}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Cómo funciona la sincronización bajo demanda y por fechas */}
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>Sincronización Bajo Demanda (Al Pulsar el Botón)</span>
            </div>
            <ul className="space-y-1 list-disc list-inside text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              <li><strong>Solo al pulsar "Sincronizar":</strong> Los datos se envían y reciben únicamente cuando tú presionas el botón de sincronización.</li>
              <li><strong>IPs Estáticas en Docker:</strong> El servidor opera en una subred fija (<code>172.28.0.10</code>) para evitar desconexiones accidentales al reiniciar.</li>
              <li><strong>Resolución por fecha:</strong> Prevalece siempre la versión con la fecha de modificación más reciente para cada registro sin perder transacciones.</li>
              <li><strong>Modo Sin Internet (Offline):</strong> Puedes usar la app sin conexión con total normalidad; los datos quedan a salvo en tu teléfono o PC.</li>
            </ul>
          </div>

          {/* Opciones Avanzadas & Respaldo JSON */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 font-medium transition-colors"
              title="Descargar copia de seguridad completa en JSON"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Descargar Copia de Seguridad JSON</span>
            </button>

            <span className="text-[11px] text-slate-400">
              Puerto asignado: 8085 (Docker Nginx + Node Sync API)
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 flex items-center justify-end">
          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
