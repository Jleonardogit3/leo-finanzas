import React from 'react';
import { 
  X, 
  Download, 
  Monitor, 
  Smartphone, 
  Apple, 
  CheckCircle2, 
  Sparkles, 
  WifiOff, 
  Zap,
  ArrowRight
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  isInstallable,
  isInstalled
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Instalar Aplicación (PWA)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Finanzas Venezuela en tu PC, Mac o Teléfono
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits Strip */}
        <div className="grid grid-cols-3 gap-2 my-5">
          <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-center">
            <Zap className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">Ultrarrápida</span>
            <span className="text-[10px] text-slate-600 dark:text-slate-400">Carga inmediata</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40 text-center">
            <WifiOff className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">100% Offline</span>
            <span className="text-[10px] text-slate-600 dark:text-slate-400">Funciona sin internet</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/40 text-center">
            <Sparkles className="w-4 h-4 text-purple-500 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">Sin Barras</span>
            <span className="text-[10px] text-slate-600 dark:text-slate-400">Ventana nativa</span>
          </div>
        </div>

        {/* Quick Action Button if browser supports 1-click install */}
        {isInstalled ? (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>¡Excelente! La aplicación ya está instalada en tu equipo.</span>
          </div>
        ) : isInstallable ? (
          <button
            onClick={() => {
              onInstall();
              onClose();
            }}
            className="w-full mb-5 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Download className="w-5 h-5" />
            <span>Instalar Ahora con 1 Clic</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        ) : null}

        {/* Manual Instructions per platform */}
        <div className="space-y-3.5 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block text-[11px]">
            Instrucciones según tu navegador:
          </span>

          {/* PC (Chrome, Edge, Brave) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 mt-0.5">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                En PC (Google Chrome / Microsoft Edge / Brave)
              </span>
              <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                1. Busca el ícono <strong className="text-emerald-500">⊕ (Instalar)</strong> en el extremo derecho de la barra de direcciones de tu navegador.
                <br />
                2. O haz clic en el menú <strong className="text-slate-800 dark:text-slate-200">⋮ (tres puntos)</strong> &gt; <strong className="text-slate-800 dark:text-slate-200">"Instalar Finanzas Venezuela"</strong>.
              </p>
            </div>
          </div>

          {/* Android */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-800/40 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                En Teléfono Android (Google Chrome)
              </span>
              <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Al conectarte mediante IP local (HTTP), Chrome no muestra descarga directa de 1 clic, pero <strong>se instala en 2 toques</strong>:
              </p>
              <ol className="list-decimal list-inside text-slate-700 dark:text-slate-300 mt-1.5 space-y-1 font-medium">
                <li>Toca el menú <strong className="text-emerald-500">⋮ (tres puntos de Chrome)</strong> arriba a la derecha en la barra del navegador.</li>
                <li>Selecciona <strong className="text-emerald-500">"Agregar a la pantalla principal"</strong> o <strong className="text-emerald-500">"Instalar aplicación"</strong>.</li>
                <li>Presiona <strong>"Instalar"</strong> o <strong>"Añadir"</strong>.</li>
              </ol>
              <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 mt-1.5 font-semibold">
                ✓ Se creará el ícono en tu pantalla de inicio y abrirá en pantalla completa como una app nativa, funcionando sin internet.
              </p>
            </div>
          </div>

          {/* iOS / iPhone */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5">
              <Apple className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                En iPhone o iPad (Safari)
              </span>
              <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Toca el botón <strong className="text-blue-500">Compartir</strong> (ícono de cuadro con flecha hacia arriba) en la barra inferior de Safari y elige <strong className="text-blue-500">"Añadir a pantalla de inicio (+)"</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
