import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  Lock, 
  Eye, 
  EyeOff, 
  KeyRound, 
  LogOut, 
  ShieldCheck, 
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BiometricLockModal: React.FC = () => {
  const { 
    isAppLocked, 
    user, 
    unlockWithBiometric, 
    unlockWithPassword, 
    logout,
    isBiometricSupported
  } = useApp();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Al bloquearse la app, intentar solicitar la huella automáticamente tras breve pausa
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAppLocked && isBiometricSupported) {
      setErrorMessage(null);
      setPassword('');
      setShowPasswordFallback(false);
      timer = setTimeout(() => {
        handleTriggerBiometric();
      }, 350);
    }
    return () => clearTimeout(timer);
  }, [isAppLocked]);

  if (!isAppLocked) return null;

  const handleTriggerBiometric = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setErrorMessage(null);

    try {
      const res = await unlockWithBiometric();
      if (!res.success) {
        setErrorMessage(res.message || 'Huella no reconocida. Puedes usar tu clave.');
        // Si falla la huella, mostrar opción de contraseña
        setShowPasswordFallback(true);
      }
    } catch {
      setErrorMessage('Error al verificar huella. Ingresa tu clave para desbloquear.');
      setShowPasswordFallback(true);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password.trim()) {
      setErrorMessage('Ingresa tu contraseña para continuar.');
      return;
    }

    const res = unlockWithPassword(password);
    if (!res.success) {
      setErrorMessage(res.message || 'Contraseña incorrecta.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl text-white select-none animate-in fade-in duration-200">
      
      {/* Background Security Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Lock Container */}
      <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 flex flex-col items-center text-center">
        
        {/* Venezuelan Tricolor Bar */}
        <div className="w-16 h-1.5 flex rounded-full overflow-hidden mb-6 shadow-sm">
          <span className="w-1/3 bg-amber-400"></span>
          <span className="w-1/3 bg-blue-600"></span>
          <span className="w-1/3 bg-rose-600"></span>
        </div>

        {/* Lock Icon & Title */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 shadow-inner">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-black tracking-tight text-white mb-1">
          Aplicación Bloqueada
        </h2>

        <p className="text-xs text-slate-400 mb-5">
          Sesión protegida de <strong className="text-emerald-400 font-bold">{user?.username || 'Jleonardo'}</strong>
        </p>

        {/* Error notification */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 text-left animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Biometric Fingerprint Button */}
        {isBiometricSupported && (
          <div className="my-3 flex flex-col items-center">
            <button
              type="button"
              onClick={handleTriggerBiometric}
              disabled={isScanning}
              className={`relative group p-6 rounded-full transition-all duration-300 active:scale-95 flex items-center justify-center ${
                isScanning 
                  ? 'bg-emerald-500/20 ring-4 ring-emerald-500/40 text-emerald-300 scale-105' 
                  : 'bg-gradient-to-br from-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              }`}
              title="Escanear huella dactilar"
            >
              {/* Pulsing ring indicator */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-25 pointer-events-none" />
              <Fingerprint className={`w-14 h-14 transition-transform ${isScanning ? 'scale-110 animate-pulse' : 'group-hover:scale-105'}`} />
            </button>

            <span className="mt-3 text-xs font-bold text-slate-300">
              {isScanning ? 'Coloca tu huella en el sensor...' : 'Toca para escanear tu huella'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Identificación biométrica instantánea
            </span>
          </div>
        )}

        {/* Password Fallback Toggle */}
        {!showPasswordFallback ? (
          <button
            type="button"
            onClick={() => setShowPasswordFallback(true)}
            className="mt-4 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 py-1 px-3 rounded-xl hover:bg-slate-800/60"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>O desbloquear con contraseña</span>
          </button>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="w-full mt-4 space-y-3 pt-3 border-t border-slate-800 animate-in fade-in duration-150">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña de desbloqueo"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-semibold border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5"
            >
              <span>Desbloquear con Clave</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Log out / Switch User */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Seguridad activa</span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="text-rose-400 hover:text-rose-300 font-bold transition-colors flex items-center gap-1 hover:underline"
          >
            <LogOut className="w-3 h-3" />
            <span>Cerrar sesión</span>
          </button>
        </div>

      </div>

    </div>
  );
};
