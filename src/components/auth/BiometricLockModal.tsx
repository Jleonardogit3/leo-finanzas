import React, { useState } from 'react';
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
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BiometricService } from '../../services/biometricService';

export const BiometricLockModal: React.FC = () => {
  const { 
    isAppLocked, 
    user, 
    unlockWithBiometric, 
    unlockWithPassword, 
    unlockDirectly,
    logout,
    isBiometricSupported,
    enrollBiometric
  } = useApp();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const lastActiveUser = BiometricService.getLastActiveUser();
  const currentUsername = user?.username || lastActiveUser || 'Jleonardo';
  const isUnlockedToday = BiometricService.isDeviceUnlockedToday(currentUsername);
  const isEnrolledOnThisOrigin = BiometricService.isEnrolledOnCurrentOrigin(currentUsername);

  // Si el dispositivo ya fue verificado hoy, desbloquear silenciosamente y nunca mostrar el modal
  React.useEffect(() => {
    if (isAppLocked && isUnlockedToday) {
      unlockDirectly();
    }
  }, [isAppLocked, isUnlockedToday, unlockDirectly]);

  if (!isAppLocked || isUnlockedToday) return null;

  // Escanear huella únicamente cuando el usuario presiona el botón manualmente
  const handleTriggerBiometric = async () => {
    if (isScanning || isEnrolling) return;
    setIsScanning(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      // Si aún no está vinculado en este dominio específico (ej. en Vercel o teléfono)
      if (!isEnrolledOnThisOrigin) {
        setIsScanning(false);
        handleEnrollDeviceBiometric();
        return;
      }

      const res = await unlockWithBiometric();
      if (!res.success) {
        if (res.message && (res.message.includes('cancelada') || res.message.includes('no registrada'))) {
          setErrorMessage('Huella no reconocida en este dominio. Puedes vincularla con el botón de abajo o desbloquear directamente.');
        } else {
          setErrorMessage(res.message || 'Huella no reconocida.');
        }
        if (!isUnlockedToday) {
          setShowPasswordFallback(true);
        }
      }
    } catch {
      setErrorMessage('Error con el sensor de huella. Puedes ingresar directamente o usar tu clave.');
      if (!isUnlockedToday) {
        setShowPasswordFallback(true);
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Vincular huella directamente en este teléfono / dominio web
  const handleEnrollDeviceBiometric = async () => {
    setIsEnrolling(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const res = await enrollBiometric(currentUsername);
      if (res.success) {
        setSuccessNotice('¡Huella vinculada con éxito en este teléfono!');
        setTimeout(async () => {
          await unlockWithBiometric();
        }, 600);
      } else {
        setErrorMessage(res.message || 'No se completó la vinculación de huella.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al vincular huella.');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Desbloqueo rápido si el dispositivo ya fue verificado hoy
  const handleDirectUnlockToday = () => {
    unlockDirectly();
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
    } else {
      BiometricService.markDeviceUnlockedToday(currentUsername);
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

        <p className="text-xs text-slate-400 mb-4">
          Sesión protegida de <strong className="text-emerald-400 font-bold">{currentUsername}</strong>
        </p>

        {/* Success message */}
        {successNotice && (
          <div className="w-full mb-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 text-left animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 text-left animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Botón de desbloqueo rápido si ya se verificó hoy en este dispositivo */}
        {isUnlockedToday && (
          <div className="w-full mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 text-left space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-300">
                  Dispositivo verificado hoy
                </p>
                <p className="text-[11px] text-slate-400">
                  No necesitas volver a escribir tu contraseña hoy en este teléfono.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDirectUnlockToday}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Desbloquear Inmediatamente</span>
            </button>
          </div>
        )}

        {/* Botón de Huella Dactilar (se activa ÚNICAMENTE al presionar el botón) */}
        {isBiometricSupported && (
          <div className="my-2 flex flex-col items-center w-full">
            <button
              type="button"
              onClick={handleTriggerBiometric}
              disabled={isScanning || isEnrolling}
              className={`relative group p-6 rounded-full transition-all duration-300 active:scale-95 flex items-center justify-center ${
                isScanning || isEnrolling
                  ? 'bg-emerald-500/20 ring-4 ring-emerald-500/40 text-emerald-300 scale-105' 
                  : 'bg-gradient-to-br from-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              }`}
              title="Presiona para escanear huella"
            >
              <Fingerprint className={`w-14 h-14 transition-transform ${isScanning ? 'scale-110 animate-pulse' : 'group-hover:scale-105'}`} />
            </button>

            <button
              type="button"
              onClick={handleTriggerBiometric}
              className="mt-3 text-xs font-bold text-slate-200 hover:text-emerald-400 transition-colors"
            >
              {isScanning 
                ? 'Coloca tu huella en el sensor...' 
                : isEnrolling 
                  ? 'Vinculando huella con tu sensor...' 
                  : 'Presiona aquí para usar Huella Dactilar'}
            </button>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Acceso seguro sin contraseñas
            </span>

            {/* Opción explícita para registrar o vincular huella en este teléfono */}
            <button
              type="button"
              onClick={handleEnrollDeviceBiometric}
              disabled={isEnrolling}
              className="mt-2.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Vincular / Registrar huella en este teléfono</span>
            </button>
          </div>
        )}

        {/* Password Fallback Toggle (solo si no fue desbloqueado hoy o si el usuario quiere usar clave) */}
        {!isUnlockedToday && (
          !showPasswordFallback ? (
            <button
              type="button"
              onClick={() => setShowPasswordFallback(true)}
              className="mt-4 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 py-1 px-3 rounded-xl hover:bg-slate-800/60"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>O ingresar con contraseña</span>
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
          )
        )}

        {/* Log out / Switch User */}
        <div className="mt-5 pt-3.5 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] text-slate-500">
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
