import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Copy, 
  Check, 
  ShieldCheck, 
  Download, 
  ArrowUpDown, 
  Globe, 
  QrCode,
  Cloud,
  CheckCircle2
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

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'warning' | 'error' | null;
    message: string;
    stats?: { uploaded: number; downloaded: number; resolved: number };
  }>({ type: null, message: '' });

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://leo-finanzas-rouge.vercel.app';

  useEffect(() => {
    if (isSyncModalOpen) {
      checkServerHealth();
    }
  }, [isSyncModalOpen]);

  const checkServerHealth = async () => {
    setIsCheckingServer(true);
    const res = await SyncService.pingServer(appOrigin);
    setServerOnline(res.online);
    setIsCheckingServer(false);
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleTriggerSync = async () => {
    setSyncFeedback({ type: null, message: '' });
    const result = await syncWithServer(appOrigin);

    if (result.success) {
      setServerOnline(true);
      setSyncFeedback({
        type: 'success',
        message: result.message || '¡Datos sincronizados exitosamente con el servidor central!',
        stats: result.stats
      });
    } else if (result.isOffline) {
      setServerOnline(false);
      setSyncFeedback({
        type: 'warning',
        message: result.message || 'Servidor fuera de alcance temporalmente.'
      });
    } else {
      setSyncFeedback({
        type: 'error',
        message: result.message || 'Error en la sincronización.'
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
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Sincronización con Servidor Web
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Almacenamiento permanente centralizado para todos tus dispositivos
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

          {/* Estado del Servidor Central */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${
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
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                  Servidor Web Central:
                  {isCheckingServer ? (
                    <span className="text-slate-400 text-[11px] font-normal">Comprobando...</span>
                  ) : serverOnline ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">En Línea</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">Sin Conexión</span>
                  )}
                </p>
                <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block truncate">
                  {appOrigin}
                </code>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {lastSyncTime 
                    ? `Última sincronización: ${new Date(lastSyncTime).toLocaleString('es-VE')}`
                    : 'Aún no se ha realizado ninguna sincronización.'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => checkServerHealth()}
                disabled={isCheckingServer}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-650 border border-slate-300 dark:border-slate-600 transition-colors"
              >
                {isCheckingServer ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </div>

          {/* Botón de Sincronización Manual */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left w-full sm:w-auto">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-emerald-500" />
                Actualización Inmediata
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Envía tus movimientos pendientes y descarga lo nuevo registrado desde otros equipos.
              </p>
            </div>
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
            </button>
          </div>

          {/* Feedback de Sincronización */}
          {syncFeedback.type && (
            <div className={`p-3.5 rounded-xl border text-xs space-y-1 animate-fade-in ${
              syncFeedback.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200'
                : syncFeedback.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/60 text-rose-900 dark:text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {syncFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                <span>{syncFeedback.message}</span>
              </div>
              {syncFeedback.stats && (
                <p className="text-[11px] opacity-80 pt-0.5">
                  Subidos: {syncFeedback.stats.uploaded} | Descargados: {syncFeedback.stats.downloaded} | Actualizados: {syncFeedback.stats.resolved}
                </p>
              )}
            </div>
          )}

          {/* Tarjeta de Acceso Web Universal */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Acceso Universal (Móvil & PC)
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                1 solo servidor permanente
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Usa este único enlace en tu teléfono, computadora o tablet. Al estar alojado en el servidor web central, todos los dispositivos comparten exactamente los mismos datos en tiempo real:
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <code className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 select-all break-all">
                {appOrigin}
              </code>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowQr(prev => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{showQr ? 'Ocultar QR' : 'Ver QR'}</span>
                </button>
                <button
                  onClick={() => handleCopy(appOrigin)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs active:scale-95"
                >
                  {copiedUrl === appOrigin ? (
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

            {/* Código QR Desplegable */}
            {showQr && (
              <div className="pt-2 flex flex-col items-center justify-center text-center space-y-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(appOrigin)}&margin=4`}
                    alt="Código QR para acceso web"
                    className="w-40 h-40 object-contain"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                  Escanea con la cámara de tu teléfono para abrir la aplicación directamente en tu navegador móvil con tus datos sincronizados.
                </p>
              </div>
            )}
          </div>

          {/* Respaldo Manual Local */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                Copia de Seguridad
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Descarga un archivo JSON con todos tus movimientos, deudas y cuentas.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Sincronización Permanente Activa
          </span>
          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
