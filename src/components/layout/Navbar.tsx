import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Clock, 
  Wifi, 
  WifiOff, 
  TrendingUp, 
  RefreshCw, 
  SlidersHorizontal,
  PlusCircle,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  Maximize2,
  Minimize2,
  Download,
  CheckCircle2,
  ArrowUpDown,
  MoreVertical,
  Info,
  History
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { auth, googleProvider, signInWithPopup, signOut } from '../../services/firebase';

export const Navbar: React.FC = () => {
  const { mode, isDark, toggleTheme } = useTheme();
  const { 
    isOnline, 
    rates, 
    refreshRates, 
    setIsRatesModalOpen, 
    setIsTxModalOpen,
    user,
    isWideLayout,
    toggleWideLayout,
    isInstallable,
    isInstalled,
    setIsPwaModalOpen,
    triggerInstall,
    isSyncing,
    setIsSyncModalOpen,
    syncWithServer,
    setCurrentView,
    logout
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [syncFeedbackMessage, setSyncFeedbackMessage] = useState<string | null>(null);

  const handleDirectSync = async () => {
    try {
      const res = await syncWithServer();
      if (res.success) {
        setSyncFeedbackMessage('¡Sincronizado!');
        setTimeout(() => setSyncFeedbackMessage(null), 2500);
      } else {
        setIsSyncModalOpen(true);
      }
    } catch {
      setIsSyncModalOpen(true);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshRates();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleAuthLogout = async () => {
    if (window.confirm(`¿Deseas cerrar la sesión de ${user?.displayName || user?.username || 'Jleonardo'}?`)) {
      try {
        await signOut(auth);
      } catch {}
      logout();
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className={`mx-auto px-3 sm:px-6 lg:px-8 transition-all duration-300 ${isWideLayout ? 'w-full max-w-[1920px] 2xl:px-10' : 'max-w-7xl'}`}>
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-2">
          
          {/* Logo & Tricolor Brand */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 shadow-md border border-slate-700/50">
              <span className="text-base sm:text-xl font-black bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 bg-clip-text text-transparent">
                $
              </span>
              {/* Subtle Venezuelan Tricolor Dot Bar */}
              <div className="absolute -bottom-0.5 sm:-bottom-1 left-1.5 right-1.5 sm:left-2 sm:right-2 flex h-0.5 sm:h-1 rounded-full overflow-hidden">
                <span className="w-1/3 bg-amber-400"></span>
                <span className="w-1/3 bg-blue-600"></span>
                <span className="w-1/3 bg-rose-600"></span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  Finanzas<span className="text-emerald-500">VZLA</span>
                </h1>
                <span className="hidden md:inline-flex px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 hidden sm:block">
                Multimoneda • BCV & USDT • Asesor IA
              </p>
            </div>
          </div>

          {/* Rates Pill on Mobile (sm:hidden) */}
          <div 
            onClick={() => setIsRatesModalOpen(true)}
            className="flex sm:hidden items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/70 border border-slate-200/80 dark:border-slate-700/80 text-[11px] cursor-pointer shadow-xs active:scale-95 transition-all select-none"
            title="Click para ver o editar tasas"
          >
            <span className="font-semibold text-slate-500 dark:text-slate-400 text-[10px]">BCV</span>
            <span className="font-bold text-slate-900 dark:text-white">{rates.bcv.toFixed(1)}</span>
            <span className="text-slate-300 dark:text-slate-600 font-light">|</span>
            <span className="font-semibold text-emerald-500 text-[10px]">USDT</span>
            <span className="font-bold text-slate-900 dark:text-white">{rates.usdt.toFixed(1)}</span>
          </div>

          {/* Desktop Rates Ticker (BCV, USDT, Brecha) */}
          <div 
            onClick={() => setIsRatesModalOpen(true)}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition-all cursor-pointer border border-slate-200/70 dark:border-slate-700/60 shadow-sm text-xs"
            title="Click para ver detalle o editar tasas de cambio"
          >
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">BCV:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {rates.bcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[10px]">USDT:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {rates.usdt.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                </span>
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-end pl-1 border-l border-slate-300 dark:border-slate-700">
              <span className="text-[10px] text-slate-600 dark:text-slate-400">Brecha:</span>
              <span className={`font-extrabold text-[11px] flex items-center gap-0.5 ${rates.spreadPercent > 10 ? 'text-rose-500' : 'text-amber-500'}`}>
                <TrendingUp className="w-3 h-3" />
                +{rates.spreadPercent.toFixed(1)}%
              </span>
            </div>

            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 ml-0.5" />
          </div>

          {/* Mobile Tools (Sync + Theme + More Menu) */}
          <div className="flex sm:hidden items-center gap-1 relative">
            {/* Sync button with direct sync action and status indicator */}
            <button
              onClick={handleDirectSync}
              className={`relative p-1.5 rounded-xl border active:scale-95 transition-all ${
                syncFeedbackMessage 
                  ? 'bg-emerald-500 text-white border-emerald-500' 
                  : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
              }`}
              title="Sincronizar ahora con el servidor"
            >
              <ArrowUpDown className={`w-4 h-4 ${isSyncing ? 'animate-spin' : syncFeedbackMessage ? 'text-white' : 'text-emerald-500'}`} />
              <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 active:scale-95 transition-all"
              title="Cambiar tema"
            >
              {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>

            {/* 3-dots Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className={`p-1.5 rounded-xl border transition-all active:scale-95 ${
                isMobileMenuOpen 
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80'
              }`}
              title="Más opciones"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Mobile Dropdown Popup */}
            {isMobileMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                />
                <div className="absolute right-0 top-11 z-50 w-52 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Actualizar Tasas */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleManualRefresh();
                    }}
                    disabled={isRefreshing || !isOnline}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Actualizar Tasas</span>
                  </button>

                  {/* Historial & Auditoría de Operaciones */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setCurrentView('history');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <History className="w-4 h-4 text-emerald-500" />
                    <span>Historial & Cambios</span>
                  </button>

                  {/* Conexión e IPs */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsSyncModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ArrowUpDown className="w-4 h-4 text-emerald-500" />
                    <span>Conectar / IPs & Red</span>
                  </button>

                  {/* Instalar App / PWA */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (isInstallable) triggerInstall();
                      else setIsPwaModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-4 h-4 text-emerald-500" />
                    <span>{isInstalled ? 'App Instalada' : 'Instalar App (PWA)'}</span>
                  </button>

                  {/* Cerrar Sesión / Usuario */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleAuthLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span className="truncate">Cerrar Sesión ({user?.username || user?.displayName || 'Jleonardo'})</span>
                  </button>

                  {/* Estado de Red */}
                  <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 px-3 py-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Red:</span>
                    <span className={`font-bold flex items-center gap-1 ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {isOnline ? 'En línea' : 'Offline'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Desktop Right Action Tools (hidden sm:flex) */}
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
            
            {/* Online / Offline Status Badge */}
            <div 
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${
                isOnline 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50' 
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
              }`}
              title={isOnline ? 'Conectado a la red' : 'Modo Offline: Datos guardados localmente'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                  <span className="text-[11px] font-bold">Offline</span>
                </>
              )}
            </div>

            {/* Sincronización Local / Multi-Dispositivo Button */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleDirectSync}
                disabled={isSyncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                  isSyncing
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : syncFeedbackMessage
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 shadow-sm'
                }`}
                title="Sincronizar datos con el servidor local / red"
              >
                <ArrowUpDown className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : syncFeedbackMessage ? 'text-white' : 'text-emerald-500'}`} />
                <span className="hidden sm:inline">
                  {isSyncing ? 'Sincronizando...' : syncFeedbackMessage || 'Sincronizar'}
                </span>
              </button>

              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 transition-colors"
                title="Ver dirección IP y opciones de conexión"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Historial & Auditoría Button */}
            <button
              onClick={() => setCurrentView('history')}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Historial General & Auditoría de Operaciones"
            >
              <History className="w-4 h-4 text-emerald-500" />
            </button>

            {/* Refresh Rates Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || !isOnline}
              className={`p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                isRefreshing ? 'animate-spin text-emerald-500' : ''
              }`}
              title="Actualizar tasas de cambio"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button (Automatic 06:00-18:00 + Manual) */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              title={`Tema actual: ${mode === 'auto' ? 'Automático (según hora local)' : mode === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}. Click para cambiar.`}
            >
              {mode === 'auto' ? (
                <div className="relative">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  {isDark ? (
                    <Moon className="w-2.5 h-2.5 absolute -top-1 -right-1 text-indigo-400" />
                  ) : (
                    <Sun className="w-2.5 h-2.5 absolute -top-1 -right-1 text-amber-500" />
                  )}
                </div>
              ) : isDark ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {/* Wide / Standard Layout Toggle Button */}
            <button
              onClick={toggleWideLayout}
              className="hidden md:flex p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isWideLayout ? "Cambiar a vista compacta centrada (1280px)" : "Ampliar vista a pantalla ancha (Recomendado)"}
            >
              {isWideLayout ? (
                <Minimize2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* PWA Install Button */}
            {isInstalled ? (
              <button
                onClick={() => setIsPwaModalOpen(true)}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                title="Aplicación instalada como PWA en este dispositivo"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px]">App Instalada</span>
              </button>
            ) : (
              <button
                onClick={() => isInstallable ? triggerInstall() : setIsPwaModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/15 via-teal-600/15 to-emerald-600/15 hover:from-emerald-600/25 hover:to-teal-600/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold text-xs shadow-sm transition-all active:scale-95"
                title="Instalar como App en PC o Móvil (Funciona sin internet)"
              >
                <Download className="w-4 h-4 text-emerald-500 animate-bounce" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}

            {/* Desktop Quick Transaction Button */}
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar</span>
            </button>

            {/* User Profile / Logout */}
            <button
              onClick={handleAuthLogout}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700/60 text-xs font-medium transition-colors"
              title={`Sesión iniciada como ${user?.username || user?.displayName}. Click para cerrar sesión.`}
            >
              <UserIcon className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline font-bold">{user?.username || user?.displayName || 'Jleonardo'}</span>
              <LogOut className="w-3.5 h-3.5 text-rose-500 ml-0.5" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
