import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  Sun, 
  Moon, 
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  UserPlus,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { RegisteredUser } from '../../types';

export const LoginView: React.FC = () => {
  const { login, register, deleteUser, registeredUsers } = useApp();
  const { isDark, toggleTheme } = useTheme();

  // Mode: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form
  const [username, setUsername] = useState('Jleonardo');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // States & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // User management modal
  const [showManageUsers, setShowManageUsers] = useState(false);
  const [userToDelete, setUserToDelete] = useState<RegisteredUser | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = login(username, password);
      if (!result.success) {
        setErrorMessage(result.message || 'Usuario o contraseña incorrectos.');
        setIsLoading(false);
      }
    }, 300);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = regUsername.trim();
    const cleanPass = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanUser || cleanUser.length < 3) {
      setErrorMessage('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setErrorMessage('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setErrorMessage('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = register(cleanUser, cleanPass);
      if (!result.success) {
        setErrorMessage(result.message || 'Error al registrar nuevo usuario.');
        setIsLoading(false);
      } else {
        setSuccessMessage(`¡Usuario ${cleanUser} creado exitosamente con cuentas en 0!`);
      }
    }, 350);
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    const res = deleteUser(userToDelete.uid);
    if (!res.success) {
      setErrorMessage(res.message || 'No se pudo eliminar el usuario.');
    } else {
      if (username.toLowerCase() === userToDelete.username.toLowerCase()) {
        setUsername('Jleonardo');
        setPassword('');
      }
    }
    setUserToDelete(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors select-none relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-500/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm transition-all active:scale-95"
          title="Cambiar tema"
        >
          {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 relative z-10 transition-all">
        
        {/* Brand Header */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 shadow-xl border border-slate-700/50 mb-3 relative">
            <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 bg-clip-text text-transparent">
              $
            </span>
            {/* Venezuelan Tricolor Bar */}
            <div className="absolute -bottom-1 left-2.5 right-2.5 flex h-1 rounded-full overflow-hidden">
              <span className="w-1/3 bg-amber-400"></span>
              <span className="w-1/3 bg-blue-600"></span>
              <span className="w-1/3 bg-rose-600"></span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Finanzas<span className="text-emerald-500">VZLA</span>
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              PWA
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
            Control multimoneda, patrimonio y cuentas financieras
          </p>
        </div>

        {/* Tab Switcher: Iniciar Sesión vs Registrar Usuario */}
        <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mb-5 border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nuevo Registro</span>
          </button>
        </div>

        {/* Alert Feedback Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: LOGIN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Quick user selector pills */}
            {registeredUsers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Usuarios en este equipo:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowManageUsers(prev => !prev)}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Users className="w-3 h-3" />
                    <span>{showManageUsers ? 'Ocultar' : 'Gestionar'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {registeredUsers.map(u => {
                    const isSelected = username.toLowerCase() === u.username.toLowerCase();
                    return (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => {
                          setUsername(u.username);
                          setPassword('');
                          setErrorMessage(null);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                            : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <User className="w-3 h-3" />
                        <span>{u.username}</span>
                        {u.isDefaultAdmin && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 font-extrabold">
                            Admin
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List to manage / delete users if toggled */}
            {showManageUsers && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <span className="font-bold text-[11px] text-slate-600 dark:text-slate-300 block">
                  Eliminar o seleccionar cuentas de usuario:
                </span>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {registeredUsers.map(u => (
                    <div key={u.uid} className="py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">
                            {u.username}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {u.isDefaultAdmin ? 'Cuenta Principal' : 'Usuario Personal'}
                          </p>
                        </div>
                      </div>

                      {u.isDefaultAdmin ? (
                        <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          Protegida
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setUserToDelete(u)}
                          className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title={`Eliminar usuario ${u.username}`}
                        >
                          <Trash2 className="w-3 h-3 text-rose-500" />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-11 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER NEW USER FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            
            {/* Informational banner: starts at 0 */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Cuentas Nuevas desde Cero (0.00)</span>
              </div>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 leading-relaxed">
                Este nuevo usuario tendrá su propio espacio independiente. Sus cuentas iniciarán en 0.00 y podrá añadir más bancos, efectivo o billeteras personalizadas.
              </p>
            </div>

            {/* New Username Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Nombre de Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ej: Pedro, Maria, Empresa..."
                  value={regUsername}
                  onChange={(e) => {
                    setRegUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* New Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  placeholder="Mínimo 4 caracteres"
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-11 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(prev => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                  title={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  placeholder="Repite tu contraseña"
                  value={regConfirmPassword}
                  onChange={(e) => {
                    setRegConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creando usuario...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Registrar y Comenzar en 0</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Badge */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Acceso Privado & Cifrado Local Offline-First</span>
          </div>
        </div>

      </div>

      {/* CONFIRMATION MODAL: DELETE USER */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Cuenta de Usuario</span>
              </div>
              <button 
                onClick={() => setUserToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p>
                ¿Deseas eliminar al usuario <strong>{userToDelete.username}</strong>?
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                Esta acción eliminará de forma permanente todas las cuentas financieras, movimientos y registros creados para este usuario.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all active:scale-95"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Version Info */}
      <div className="mt-6 text-center text-[11px] text-slate-500 dark:text-slate-400">
        Finanzas Venezuela PWA v1.0 • Multi-Usuario Local
      </div>

    </div>
  );
};
