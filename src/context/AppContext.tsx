import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { 
  Account, 
  Transaction, 
  Category, 
  PortfolioAsset, 
  FinancialGoal, 
  ExchangeRates, 
  TimeFilter, 
  Currency,
  Debt,
  DebtPayment,
  Loss,
  LossRecovery,
  SyncResult,
  AuditLogEntry,
  UnifiedActivityItem,
  AppUser,
  RegisteredUser
} from '../types';
import { StorageService } from '../services/storageService';
import { RatesService } from '../services/ratesService';
import { SyncService } from '../services/syncService';
import { BiometricService } from '../services/biometricService';
import { auth, onAuthStateChanged, User } from '../services/firebase';
import { usePwaInstall } from '../hooks/usePwaInstall';

export type ViewType = 'dashboard' | 'transactions' | 'accounts' | 'debts' | 'losses' | 'portfolio' | 'projections' | 'advisor' | 'history';

interface AppContextType {
  // Navigation & View
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;

  // Connectivity & Auth
  isOnline: boolean;
  user: AppUser | null;
  registeredUsers: RegisteredUser[];
  login: (username: string, password: string) => { success: boolean; message?: string };
  register: (username: string, password: string) => { success: boolean; message?: string };
  deleteUser: (uid: string) => { success: boolean; message?: string };
  logout: () => void;

  // Biometrics & Security Lock
  isAppLocked: boolean;
  setIsAppLocked: (locked: boolean) => void;
  isBiometricSupported: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnrolled: (username?: string) => boolean;
  loginWithBiometric: (username?: string) => Promise<{ success: boolean; message?: string; isNotEnrolled?: boolean }>;
  enrollBiometric: (username: string) => Promise<{ success: boolean; message?: string }>;
  unlockWithBiometric: () => Promise<{ success: boolean; message?: string }>;
  unlockWithPassword: (password: string) => { success: boolean; message?: string };
  unlockDirectly: () => void;

  // Data states
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  portfolioAssets: PortfolioAsset[];
  goals: FinancialGoal[];
  debts: Debt[];
  losses: Loss[];
  auditLogs: AuditLogEntry[];
  unifiedActivities: UnifiedActivityItem[];
  rates: ExchangeRates;

  // Modals
  isTxModalOpen: boolean;
  setIsTxModalOpen: (open: boolean) => void;
  isAccountModalOpen: boolean;
  setIsAccountModalOpen: (open: boolean) => void;
  isRatesModalOpen: boolean;
  setIsRatesModalOpen: (open: boolean) => void;
  isInitialSetupModalOpen: boolean;
  setIsInitialSetupModalOpen: (open: boolean) => void;
  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (open: boolean) => void;
  isAssetModalOpen: boolean;
  setIsAssetModalOpen: (open: boolean) => void;
  isGoalModalOpen: boolean;
  setIsGoalModalOpen: (open: boolean) => void;
  isDebtModalOpen: boolean;
  setIsDebtModalOpen: (open: boolean) => void;
  isDebtPaymentModalOpen: boolean;
  setIsDebtPaymentModalOpen: (open: boolean) => void;
  activeDebtForPayment: Debt | null;
  setActiveDebtForPayment: (debt: Debt | null) => void;
  isLossModalOpen: boolean;
  setIsLossModalOpen: (open: boolean) => void;
  isLossRecoveryModalOpen: boolean;
  setIsLossRecoveryModalOpen: (open: boolean) => void;
  activeLossForRecovery: Loss | null;
  setActiveLossForRecovery: (loss: Loss | null) => void;
  // Layout scale / width preference
  isWideLayout: boolean;
  setIsWideLayout: (wide: boolean) => void;
  toggleWideLayout: () => void;

  // PWA Install State & Methods
  isInstallable: boolean;
  isInstalled: boolean;
  isPwaModalOpen: boolean;
  setIsPwaModalOpen: (open: boolean) => void;
  triggerInstall: () => Promise<void>;

  // Sincronización Local & Offline-First (Última modificación por fecha)
  isSyncing: boolean;
  lastSyncTime: string | null;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;
  syncWithServer: (customUrl?: string, options?: { silent?: boolean }) => Promise<SyncResult>;

  // Actions
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;

  saveAccount: (account: Account) => void;
  deleteAccount: (accountId: string) => void;
  batchSaveAccounts: (accounts: Account[]) => void;

  saveCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;
  editingCategory: Category | null;
  setEditingCategory: (cat: Category | null) => void;

  savePortfolioAsset: (asset: PortfolioAsset) => void;
  deletePortfolioAsset: (id: string) => void;
  saveGoal: (goal: FinancialGoal) => void;
  deleteGoal: (id: string) => void;

  saveDebt: (debt: Debt) => void;
  updateDebt: (debt: Debt) => void;
  deleteDebt: (id: string) => void;
  revertDebt: (id: string) => void;
  editingDebt: Debt | null;
  setEditingDebt: (debt: Debt | null) => void;
  addDebtPayment: (debtId: string, payment: Omit<DebtPayment, 'id'>) => void;
  deleteDebtPayment: (debtId: string, paymentId: string) => void;

  saveLoss: (loss: Loss, deductFromAccount?: boolean) => void;
  updateLoss: (loss: Loss) => void;
  deleteLoss: (id: string) => void;
  revertLoss: (id: string) => void;
  editingLoss: Loss | null;
  setEditingLoss: (loss: Loss | null) => void;
  recoverLoss: (lossId: string, recoveryData: Omit<LossRecovery, 'id'>) => void;
  deleteLossRecovery: (lossId: string, recoveryId: string) => void;
  declareDebtAsLoss: (debtId: string, reason?: string) => void;
  revertItem: (item: UnifiedActivityItem) => Promise<{ success: boolean; message: string }>;
  refreshRates: () => Promise<void>;
  setManualRates: (bcv: number, usdt: number) => void;
  clearManualRates: () => void;

  // Calculated Metrics
  totalNetWorthUsdBcv: number;
  totalNetWorthUsdUsdt: number;
  totalLiquidVes: number;
  totalLiquidUsd: number;
  vesRatioPercent: number;
  usdRatioPercent: number;
  filteredTransactions: Transaction[];
  totalPendingDebtsUsd: number;
  totalPendingDebtsVes: number;
  activeDebtorsCount: number;
  totalReceivableUsd: number;
  totalReceivableVes: number;
  activeReceivableCount: number;
  totalPayableUsd: number;
  totalPayableVes: number;
  activePayableCount: number;
  netDebtBalanceUsd: number;
  netDebtBalanceVes: number;
  totalLossesUsd: number;
  totalLossesVes: number;
  monthlyLossesUsd: number;
  lossesCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('monthly');

  // Network status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => StorageService.getRegisteredUsers());
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const cached = localStorage.getItem('finanzas_vzla_auth_session');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.uid && parsed?.username) {
          return parsed;
        }
      }
      // Si no hay sesión explícita, comprobar si hay un último usuario activo que fue desbloqueado hoy
      const lastUser = BiometricService.getLastActiveUser();
      if (lastUser) {
        const allUsers = StorageService.getRegisteredUsers();
        const matched = allUsers.find(u => u.username.toLowerCase() === lastUser.toLowerCase());
        if (matched && BiometricService.isDeviceUnlockedToday(matched.username)) {
          const restored: AppUser = {
            uid: matched.uid,
            username: matched.username,
            displayName: matched.username,
            email: `${matched.username.toLowerCase()}@finanzas.vzla`,
            loginAt: new Date().toISOString()
          };
          localStorage.setItem('finanzas_vzla_auth_session', JSON.stringify(restored));
          return restored;
        }
      }
    } catch (e) {
      console.warn('Error reading cached auth session', e);
    }
    return null;
  });

  // Biometric & Security Lock States
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    try {
      const sessionUnlocked = sessionStorage.getItem('finanzas_vzla_unlocked_session');
      if (sessionUnlocked === 'true') return false;

      const wasLocked = sessionStorage.getItem('finanzas_vzla_session_locked');

      const cached = localStorage.getItem('finanzas_vzla_auth_session');
      const lastUsername = BiometricService.getLastActiveUser();
      let targetUser = '';
      if (cached) {
        try { targetUser = JSON.parse(cached)?.username || ''; } catch {}
      }
      if (!targetUser) targetUser = lastUsername || '';

      // Si el dispositivo ya fue desbloqueado el día de hoy para el usuario activo, NO bloquear al abrir/recargar
      if (targetUser && BiometricService.isDeviceUnlockedToday(targetUser)) {
        return false;
      }

      if (wasLocked === 'true') return true;

      if (targetUser && BiometricService.isEnrolled(targetUser) && BiometricService.isAutoLockEnabled()) {
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);
  const isBiometricSupported = BiometricService.isSupported();

  useEffect(() => {
    BiometricService.isAvailable().then(avail => setIsBiometricAvailable(avail));
  }, []);

  // Eventos de ciclo de vida para bloquear la aplicación al salir / minimizar / cerrar
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // El usuario minimizó la app, cambió de app o bloqueó la pantalla del teléfono
        if (BiometricService.isAutoLockEnabled()) {
          sessionStorage.setItem('finanzas_vzla_session_locked', 'true');
          setIsAppLocked(true);
        }
      } else if (document.visibilityState === 'visible') {
        // Al volver, si estaba marcado como bloqueado, asegurar pantalla de bloqueo
        if (sessionStorage.getItem('finanzas_vzla_session_locked') === 'true') {
          setIsAppLocked(true);
        }
      }
    };

    const handlePageHide = () => {
      if (BiometricService.isAutoLockEnabled()) {
        sessionStorage.setItem('finanzas_vzla_session_locked', 'true');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [user]);

  // Core Data
  const [accounts, setAccounts] = useState<Account[]>(() => StorageService.getAccounts(user?.uid));
  const [transactions, setTransactions] = useState<Transaction[]>(() => StorageService.getTransactions(user?.uid));
  const [categories, setCategories] = useState<Category[]>(() => StorageService.getCategories(user?.uid));
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>(() => StorageService.getPortfolioAssets(user?.uid));
  const [goals, setGoals] = useState<FinancialGoal[]>(() => StorageService.getGoals(user?.uid));
  const [debts, setDebts] = useState<Debt[]>(() => StorageService.getDebts(user?.uid));
  const [losses, setLosses] = useState<Loss[]>(() => StorageService.getLosses(user?.uid));
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => StorageService.getAuditLogs(user?.uid));
  const [rates, setRates] = useState<ExchangeRates>(() => RatesService.getCachedRates());

  const reloadDataForUser = (targetUserId?: string | null) => {
    setAccounts(StorageService.getAccounts(targetUserId));
    setTransactions(StorageService.getTransactions(targetUserId));
    setCategories(StorageService.getCategories(targetUserId));
    setPortfolioAssets(StorageService.getPortfolioAssets(targetUserId));
    setGoals(StorageService.getGoals(targetUserId));
    setDebts(StorageService.getDebts(targetUserId));
    setLosses(StorageService.getLosses(targetUserId));
    setAuditLogs(StorageService.getAuditLogs(targetUserId));
  };

  const login = (usernameInput: string, passwordInput: string): { success: boolean; message?: string } => {
    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    const currentUsers = StorageService.getRegisteredUsers();
    setRegisteredUsers(currentUsers);

    // Buscar coincidencia en usuarios registrados
    const matched = currentUsers.find(
      u => u.username.toLowerCase() === cleanUser.toLowerCase() && u.password === cleanPass
    );

    if (matched) {
      // 1. Cerrar cualquier sesión previa y limpiar desbloqueos de otros usuarios
      BiometricService.clearAllDeviceUnlockedToday();

      const appUser: AppUser = {
        uid: matched.uid,
        username: matched.username,
        displayName: matched.username,
        email: `${matched.username.toLowerCase()}@finanzas.vzla`,
        loginAt: new Date().toISOString()
      };

      localStorage.setItem('finanzas_vzla_auth_session', JSON.stringify(appUser));
      sessionStorage.removeItem('finanzas_vzla_session_locked');
      sessionStorage.setItem('finanzas_vzla_unlocked_session', 'true');

      BiometricService.setLastActiveUser(matched.username);
      BiometricService.markDeviceUnlockedToday(matched.username);

      setUser(appUser);
      setIsAppLocked(false);
      reloadDataForUser(appUser.uid);
      return { success: true };
    }

    return { success: false, message: 'Usuario o contraseña incorrectos. Verifica tus credenciales.' };
  };

  const register = (usernameInput: string, passwordInput: string): { success: boolean; message?: string } => {
    const res = StorageService.registerUser(usernameInput, passwordInput);
    if (!res.success || !res.user) {
      return { success: false, message: res.message || 'Error al registrar usuario.' };
    }

    const updatedUsers = StorageService.getRegisteredUsers();
    setRegisteredUsers(updatedUsers);

    // CRITICAL: Al crear un usuario nuevo se cierra la sesión en los demás usuarios registrados.
    // Solo se mantiene la sesión del nuevo usuario iniciado con sus credenciales.
    BiometricService.clearAllDeviceUnlockedToday();
    sessionStorage.removeItem('finanzas_vzla_session_locked');
    sessionStorage.setItem('finanzas_vzla_unlocked_session', 'true');

    // Iniciar sesión automáticamente con el nuevo usuario registrado (sus cuentas inician en 0)
    const appUser: AppUser = {
      uid: res.user.uid,
      username: res.user.username,
      displayName: res.user.username,
      email: `${res.user.username.toLowerCase()}@finanzas.vzla`,
      loginAt: new Date().toISOString()
    };

    localStorage.setItem('finanzas_vzla_auth_session', JSON.stringify(appUser));
    BiometricService.setLastActiveUser(res.user.username);
    BiometricService.markDeviceUnlockedToday(res.user.username);

    setUser(appUser);
    setIsAppLocked(false);
    reloadDataForUser(appUser.uid);
    return { success: true };
  };

  const deleteUser = (uid: string): { success: boolean; message?: string } => {
    const res = StorageService.deleteRegisteredUser(uid);
    if (!res.success) {
      return { success: false, message: res.message };
    }

    const updatedUsers = StorageService.getRegisteredUsers();
    setRegisteredUsers(updatedUsers);

    if (user?.uid === uid) {
      logout();
    }

    return { success: true };
  };

  const logout = () => {
    // Revocar cualquier desbloqueo en este dispositivo
    BiometricService.clearAllDeviceUnlockedToday();
    localStorage.removeItem('finanzas_vzla_auth_session');
    sessionStorage.removeItem('finanzas_vzla_session_locked');
    sessionStorage.removeItem('finanzas_vzla_unlocked_session');

    // Mantener BiometricService.getLastActiveUser() para que el LoginView muestre
    // al último usuario que salió y no salte a Jleonardo
    setUser(null);
    setIsAppLocked(false);

    // Evitar que queden datos privados de Jleonardo en memoria al cerrar sesión
    const lastUser = BiometricService.getLastActiveUser();
    const allUsers = StorageService.getRegisteredUsers();
    const matched = allUsers.find(u => u.username.toLowerCase() === (lastUser || '').toLowerCase());
    reloadDataForUser(matched ? matched.uid : '__logged_out__');
  };

  const loginWithBiometric = async (targetUsername?: string): Promise<{ success: boolean; message?: string; isNotEnrolled?: boolean }> => {
    const cleanUser = (targetUsername || BiometricService.getLastActiveUser() || 'Jleonardo').trim();
    if (!BiometricService.isEnrolled(cleanUser)) {
      return {
        success: false,
        isNotEnrolled: true,
        message: `La huella dactilar aún no está configurada para ${cleanUser}. Inicia sesión con la clave una vez para vincularla.`
      };
    }

    const verifyRes = await BiometricService.verifyBiometric(cleanUser);
    if (!verifyRes.success) {
      return { success: false, message: verifyRes.message || 'Error en sensor biométrico.' };
    }

    const currentUsers = StorageService.getRegisteredUsers();
    const matched = currentUsers.find(
      u => u.username.toLowerCase() === cleanUser.toLowerCase()
    );

    if (matched) {
      BiometricService.clearAllDeviceUnlockedToday();
      const appUser: AppUser = {
        uid: matched.uid,
        username: matched.username,
        displayName: matched.username,
        email: `${matched.username.toLowerCase()}@finanzas.vzla`,
        loginAt: new Date().toISOString()
      };
      localStorage.setItem('finanzas_vzla_auth_session', JSON.stringify(appUser));
      sessionStorage.removeItem('finanzas_vzla_session_locked');
      sessionStorage.setItem('finanzas_vzla_unlocked_session', 'true');
      BiometricService.setLastActiveUser(matched.username);
      BiometricService.markDeviceUnlockedToday(matched.username);
      setUser(appUser);
      setIsAppLocked(false);
      reloadDataForUser(appUser.uid);
      return { success: true };
    }

    return { success: false, message: 'Usuario no encontrado en el sistema.' };
  };

  const enrollBiometric = async (usernameInput: string): Promise<{ success: boolean; message?: string }> => {
    return await BiometricService.enrollBiometric(usernameInput);
  };

  const isBiometricEnrolled = (usernameInput?: string): boolean => {
    const target = usernameInput || user?.username || BiometricService.getLastActiveUser() || 'Jleonardo';
    return BiometricService.isEnrolled(target);
  };

  const unlockWithBiometric = async (): Promise<{ success: boolean; message?: string }> => {
    const targetUsername = user?.username || BiometricService.getLastActiveUser() || 'Jleonardo';
    const verifyRes = await BiometricService.verifyBiometric(targetUsername);
    if (verifyRes.success) {
      const currentUsers = StorageService.getRegisteredUsers();
      const matched = currentUsers.find(
        u => u.username.toLowerCase() === targetUsername.toLowerCase()
      );
      if (matched) {
        const appUser: AppUser = {
          uid: matched.uid,
          username: matched.username,
          displayName: matched.username,
          email: `${matched.username.toLowerCase()}@finanzas.vzla`,
          loginAt: new Date().toISOString()
        };
        localStorage.setItem('finanzas_vzla_auth_session', JSON.stringify(appUser));
        setUser(appUser);
        reloadDataForUser(appUser.uid);
      }
      sessionStorage.removeItem('finanzas_vzla_session_locked');
      sessionStorage.setItem('finanzas_vzla_unlocked_session', 'true');
      BiometricService.setLastActiveUser(targetUsername);
      BiometricService.markDeviceUnlockedToday(targetUsername);
      setIsAppLocked(false);
      return { success: true };
    }
    return { success: false, message: verifyRes.message || 'Verificación de huella fallida.' };
  };

  const unlockWithPassword = (passwordInput: string): { success: boolean; message?: string } => {
    const cleanPass = passwordInput.trim();
    const currentUsers = StorageService.getRegisteredUsers();
    const targetUsername = user?.username || BiometricService.getLastActiveUser() || 'Jleonardo';
    const matched = currentUsers.find(
      u => u.username.toLowerCase() === targetUsername.toLowerCase() && u.password === cleanPass
    );

    if (matched) {
      const appUser: AppUser = {
        uid: matched.uid,
        username: matched.username,
        displayName: matched.username,
        email: `${matched.username.toLowerCase()}@finanzas.vzla`,
        loginAt: new Date().toISOString()
      };
      localStorage.setItem('finanzas_vzla_auth_session', JSON.stringify(appUser));
      sessionStorage.removeItem('finanzas_vzla_session_locked');
      sessionStorage.setItem('finanzas_vzla_unlocked_session', 'true');
      BiometricService.setLastActiveUser(matched.username);
      BiometricService.markDeviceUnlockedToday(matched.username);
      setUser(appUser);
      setIsAppLocked(false);
      reloadDataForUser(appUser.uid);
      return { success: true };
    }

    return { success: false, message: 'Contraseña incorrecta. Inténtalo de nuevo.' };
  };

  const unlockDirectly = () => {
    sessionStorage.removeItem('finanzas_vzla_session_locked');
    sessionStorage.setItem('finanzas_vzla_unlocked_session', 'true');

    let activeUser = user;
    if (!activeUser) {
      const lastUsername = BiometricService.getLastActiveUser();
      const allUsers = StorageService.getRegisteredUsers();
      const matched = lastUsername 
        ? allUsers.find(u => u.username.toLowerCase() === lastUsername.toLowerCase())
        : allUsers.find(u => u.username.toLowerCase() === 'jleonardo') || allUsers[0];

      if (matched) {
        activeUser = {
          uid: matched.uid,
          username: matched.username,
          displayName: matched.username,
          email: `${matched.username.toLowerCase()}@finanzas.vzla`,
          loginAt: new Date().toISOString()
        };
        localStorage.setItem('finanzas_vzla_auth_session', JSON.stringify(activeUser));
        setUser(activeUser);
        reloadDataForUser(activeUser.uid);
      }
    }

    if (activeUser?.username) {
      BiometricService.setLastActiveUser(activeUser.username);
      BiometricService.markDeviceUnlockedToday(activeUser.username);
    }
    setIsAppLocked(false);
  };

  const deleteAccount = (accountId: string) => {
    const updated = StorageService.deleteAccount(accountId, user?.uid);
    setAccounts(updated);
    setAuditLogs(StorageService.getAuditLogs(user?.uid));
  };

  // Modal States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isInitialSetupModalOpen, setIsInitialSetupModalOpen] = useState(() => !StorageService.isInitialSetupDone());
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isDebtPaymentModalOpen, setIsDebtPaymentModalOpen] = useState(false);
  const [activeDebtForPayment, setActiveDebtForPayment] = useState<Debt | null>(null);
  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [editingLoss, setEditingLoss] = useState<Loss | null>(null);
  const [isLossRecoveryModalOpen, setIsLossRecoveryModalOpen] = useState(false);
  const [activeLossForRecovery, setActiveLossForRecovery] = useState<Loss | null>(null);

  // Sincronización Local / Offline
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => SyncService.getLastSyncTime());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Layout scale / width preference (defaults to true: ampliada)
  const [isWideLayout, setIsWideLayoutState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('finanzas_wide_layout');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const setIsWideLayout = (wide: boolean) => {
    setIsWideLayoutState(wide);
    try {
      localStorage.setItem('finanzas_wide_layout', String(wide));
    } catch {}
  };

  const toggleWideLayout = () => {
    setIsWideLayoutState(prev => {
      const next = !prev;
      try {
        localStorage.setItem('finanzas_wide_layout', String(next));
      } catch {}
      return next;
    });
  };

  // PWA Install Manager
  const {
    isInstallable,
    isInstalled,
    isInstallModalOpen: isPwaModalOpen,
    setIsInstallModalOpen: setIsPwaModalOpen,
    triggerInstall
  } = usePwaInstall();

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshRates();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth state listener & Cloud Firestore synchronization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const fbUser: AppUser = {
          uid: currentUser.uid,
          username: currentUser.displayName || 'Usuario',
          displayName: currentUser.displayName || 'Usuario',
          email: currentUser.email || undefined,
          loginAt: new Date().toISOString()
        };
        setUser(fbUser);
        localStorage.setItem('finanzas_vzla_auth_session', JSON.stringify(fbUser));
        const synced = await StorageService.syncWithFirestore(currentUser.uid);
        if (synced) {
          setAccounts(StorageService.getAccounts());
          setTransactions(StorageService.getTransactions());
          setCategories(StorageService.getCategories());
          setPortfolioAssets(StorageService.getPortfolioAssets());
          setGoals(StorageService.getGoals());
          setDebts(StorageService.getDebts());
          setLosses(StorageService.getLosses());
          setAuditLogs(StorageService.getAuditLogs());
        }
      } else {
        const localSession = localStorage.getItem('finanzas_vzla_auth_session');
        if (localSession) {
          try {
            const parsed = JSON.parse(localSession);
            if (parsed && parsed.uid) {
              StorageService.syncWithFirestore(parsed.uid).then(synced => {
                if (synced) {
                  setAccounts(StorageService.getAccounts());
                  setTransactions(StorageService.getTransactions());
                  setCategories(StorageService.getCategories());
                  setPortfolioAssets(StorageService.getPortfolioAssets());
                  setGoals(StorageService.getGoals());
                  setDebts(StorageService.getDebts());
                  setLosses(StorageService.getLosses());
                  setAuditLogs(StorageService.getAuditLogs());
                }
              });
            }
          } catch {}
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch exchange rates on mount and every 10 minutes
  const refreshRates = async () => {
    const latest = await RatesService.fetchLatestRates();
    setRates(latest);
  };

  useEffect(() => {
    refreshRates();
    const interval = setInterval(refreshRates, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const isSyncingRef = useRef(false);

  // Sincronización con el servidor local de la red
  const syncWithServer = useCallback(async (customUrl?: string, options?: { silent?: boolean }): Promise<SyncResult> => {
    if (isSyncingRef.current) {
      return { success: false, message: 'Sincronización en curso' };
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const localData = StorageService.getAllData(user?.uid);
      const result = await SyncService.syncWithLocalServer(localData, customUrl);
      if (result.success && result.mergedData) {
        StorageService.applyMergedData(result.mergedData, user?.uid);
        setAccounts(StorageService.getAccounts(user?.uid));
        setTransactions(StorageService.getTransactions(user?.uid));
        setCategories(StorageService.getCategories(user?.uid));
        setPortfolioAssets(StorageService.getPortfolioAssets(user?.uid));
        setGoals(StorageService.getGoals(user?.uid));
        setDebts(StorageService.getDebts(user?.uid));
        setLosses(StorageService.getLosses(user?.uid));
        if (result.serverTimestamp) {
          setLastSyncTime(result.serverTimestamp);
        }

        const hasConfigured = 
          result.mergedData.accounts?.some((a: Account) => a.currentBalance > 0 || (a.digitalUsdBalance || 0) > 0 || (a.physicalUsdBalance || 0) > 0) ||
          (result.mergedData.transactions?.length || 0) > 0;
        if (hasConfigured) {
          StorageService.markInitialSetupDone();
          setIsInitialSetupModalOpen(false);
        }
      }
      return result;
    } catch (e: any) {
      if (!options?.silent) {
        console.warn('Sync failed:', e);
      }
      return {
        success: false,
        message: e.message || 'Error durante la sincronización'
      };
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Gatillo de sincronización en segundo plano con debounce para no saturar la red
  const triggerBackgroundSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncWithServer(undefined, { silent: true }).catch(() => {});
    }, 1200);
  }, [syncWithServer]);

  // Sincronización automática periódica en segundo plano cada 1 hora como máximo
  useEffect(() => {
    const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hora máxima
    
    const checkHourlySync = () => {
      const lastSync = SyncService.getLastSyncTime();
      if (!lastSync) return;
      const elapsed = Date.now() - new Date(lastSync).getTime();
      if (elapsed >= ONE_HOUR_MS && !isSyncingRef.current) {
        syncWithServer(undefined, { silent: true });
      }
    };

    // Revisar periódicamente cada 5 minutos si ya transcurrió 1 hora
    const interval = setInterval(checkHourlySync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  // Sincronización automática silenciosa al montar la app, volver de segundo plano o recuperar red
  useEffect(() => {
    // Sincronizar inmediatamente al iniciar para traer últimos movimientos de otros dispositivos
    syncWithServer(undefined, { silent: true }).catch(() => {});

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncWithServer(undefined, { silent: true }).catch(() => {});
      }
    };

    const handleOnline = () => {
      syncWithServer(undefined, { silent: true }).catch(() => {});
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [syncWithServer]);

  // Sincronización instantánea entre pestañas del mismo navegador en la computadora
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('finanzas_vzla_')) {
        setAccounts(StorageService.getAccounts());
        setTransactions(StorageService.getTransactions());
        setCategories(StorageService.getCategories());
        setPortfolioAssets(StorageService.getPortfolioAssets());
        setGoals(StorageService.getGoals());
        setDebts(StorageService.getDebts());
        setLosses(StorageService.getLosses());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Actions: guardan localmente y sincronizan automáticamente en segundo plano
  const addTransaction = (tx: Transaction) => {
    const result = StorageService.addTransaction(tx, user?.uid);
    setAccounts(result.updatedAccounts);
    setTransactions(StorageService.getTransactions(user?.uid));
    triggerBackgroundSync();
  };

  const updateTransaction = (tx: Transaction) => {
    const result = StorageService.updateTransaction(tx, user?.uid);
    setAccounts(result.updatedAccounts);
    setTransactions(StorageService.getTransactions(user?.uid));
    triggerBackgroundSync();
  };

  const deleteTransaction = (id: string) => {
    const updatedAccounts = StorageService.deleteTransaction(id, user?.uid);
    setAccounts(updatedAccounts);
    setTransactions(StorageService.getTransactions(user?.uid));
    triggerBackgroundSync();
  };

  const saveAccount = (account: Account) => {
    StorageService.saveAccount(account, user?.uid);
    setAccounts(StorageService.getAccounts(user?.uid));
    triggerBackgroundSync();
  };

  const batchSaveAccounts = (newAccounts: Account[]) => {
    StorageService.batchSaveAccounts(newAccounts, user?.uid);
    setAccounts(newAccounts);
    StorageService.markInitialSetupDone();
    triggerBackgroundSync();
  };

  const saveCategory = (cat: Category) => {
    StorageService.saveCategory(cat, user?.uid);
    setCategories(StorageService.getCategories(user?.uid));
    setTransactions(StorageService.getTransactions(user?.uid));
    triggerBackgroundSync();
  };

  const deleteCategory = (categoryId: string) => {
    const updated = StorageService.deleteCategory(categoryId, user?.uid);
    setCategories(updated);
    triggerBackgroundSync();
  };

  const savePortfolioAsset = (asset: PortfolioAsset) => {
    const updated = StorageService.savePortfolioAsset(asset, user?.uid);
    setPortfolioAssets(updated);
    triggerBackgroundSync();
  };

  const deletePortfolioAsset = (id: string) => {
    const updated = StorageService.deletePortfolioAsset(id, user?.uid);
    setPortfolioAssets(updated);
    triggerBackgroundSync();
  };

  const saveGoal = (goal: FinancialGoal) => {
    const updated = StorageService.saveGoal(goal, user?.uid);
    setGoals(updated);
    triggerBackgroundSync();
  };

  const deleteGoal = (id: string) => {
    const updated = StorageService.deleteGoal(id, user?.uid);
    setGoals(updated);
    triggerBackgroundSync();
  };

  // Debt Actions
  const saveDebt = (debt: Debt) => {
    const updated = StorageService.saveDebt(debt, user?.uid);
    setDebts(updated);
    triggerBackgroundSync();
  };

  const updateDebt = (debt: Debt) => {
    const updated = StorageService.saveDebt(debt, user?.uid);
    setDebts(updated);
    triggerBackgroundSync();
  };

  const deleteDebt = (id: string) => {
    const updated = StorageService.deleteDebt(id, user?.uid);
    setDebts(updated);
    triggerBackgroundSync();
  };

  const addDebtPayment = (debtId: string, payment: Omit<DebtPayment, 'id'>) => {
    const result = StorageService.addDebtPayment(debtId, payment, user?.uid);
    setDebts(result.updatedDebts);
    setAccounts(result.updatedAccounts);
    if (payment.receivedInAccountId) {
      setTransactions(StorageService.getTransactions());
    }
    triggerBackgroundSync();
  };

  // Loss Actions
  const saveLoss = (loss: Loss, deductFromAccount = false) => {
    const result = StorageService.saveLoss(loss, user?.uid, deductFromAccount);
    setLosses(result.updatedLosses);
    setAccounts(result.updatedAccounts);
    if (deductFromAccount && loss.affectedAccountId) {
      setTransactions(StorageService.getTransactions());
    }
    triggerBackgroundSync();
  };

  const updateLoss = (loss: Loss) => {
    const result = StorageService.saveLoss(loss, user?.uid, false);
    setLosses(result.updatedLosses);
    setAccounts(result.updatedAccounts);
    triggerBackgroundSync();
  };

  const deleteLoss = (id: string) => {
    const updated = StorageService.deleteLoss(id, user?.uid);
    setLosses(updated);
    triggerBackgroundSync();
  };

  const recoverLoss = (lossId: string, recoveryData: Omit<LossRecovery, 'id'>) => {
    const result = StorageService.recoverLoss(lossId, recoveryData, user?.uid);
    setLosses(result.updatedLosses);
    setAccounts(result.updatedAccounts);
    if (recoveryData.receivedInAccountId) {
      setTransactions(StorageService.getTransactions());
    }
    triggerBackgroundSync();
  };

  const declareDebtAsLoss = (debtId: string, reason?: string) => {
    const result = StorageService.declareDebtAsLoss(debtId, reason, user?.uid);
    setDebts(result.updatedDebts);
    setLosses(result.updatedLosses);
    triggerBackgroundSync();
  };

  const deleteDebtPayment = (debtId: string, paymentId: string) => {
    const res = StorageService.deleteDebtPayment(debtId, paymentId, user?.uid);
    setDebts(res.updatedDebts);
    setAccounts(res.updatedAccounts);
    setTransactions(res.updatedTransactions);
    triggerBackgroundSync();
  };

  const revertDebt = (debtId: string) => {
    const res = StorageService.revertDebt(debtId, user?.uid);
    setDebts(res.updatedDebts);
    setAccounts(res.updatedAccounts);
    setTransactions(res.updatedTransactions);
    triggerBackgroundSync();
  };

  const deleteLossRecovery = (lossId: string, recoveryId: string) => {
    const res = StorageService.deleteLossRecovery(lossId, recoveryId, user?.uid);
    setLosses(res.updatedLosses);
    setAccounts(res.updatedAccounts);
    setTransactions(res.updatedTransactions);
    triggerBackgroundSync();
  };

  const revertLoss = (lossId: string) => {
    const res = StorageService.revertLoss(lossId, user?.uid);
    setLosses(res.updatedLosses);
    setAccounts(res.updatedAccounts);
    setTransactions(res.updatedTransactions);
    setDebts(res.updatedDebts);
    triggerBackgroundSync();
  };

  const revertItem = async (item: UnifiedActivityItem): Promise<{ success: boolean; message: string }> => {
    try {
      let result: { success: boolean; message: string };
      switch (item.revertType) {
        case 'transaction': {
          const updatedAccs = StorageService.deleteTransaction(item.entityId, user?.uid);
          setAccounts(updatedAccs);
          setTransactions(StorageService.getTransactions());
          result = { success: true, message: 'Movimiento eliminado y saldo restaurado correctamente.' };
          break;
        }
        case 'debt_payment': {
          if (!item.parentEntityId) throw new Error('ID de deuda no encontrado');
          deleteDebtPayment(item.parentEntityId, item.entityId);
          result = { success: true, message: 'Abono eliminado y saldo restituido a la cuenta.' };
          break;
        }
        case 'debt': {
          revertDebt(item.entityId);
          result = { success: true, message: 'Deuda eliminada y abonos revertidos correctamente.' };
          break;
        }
        case 'loss': {
          revertLoss(item.entityId);
          result = { success: true, message: 'Pérdida eliminada y fondos restaurados.' };
          break;
        }
        case 'loss_recovery': {
          if (!item.parentEntityId) throw new Error('ID de pérdida no encontrado');
          deleteLossRecovery(item.parentEntityId, item.entityId);
          result = { success: true, message: 'Recuperación eliminada y saldo ajustado.' };
          break;
        }
        case 'account_adjustment': {
          const updatedAccs = StorageService.revertAccountAdjustment(item.entityId, user?.uid);
          setAccounts(updatedAccs);
          setAuditLogs(StorageService.getAuditLogs());
          result = { success: true, message: 'Ajuste de cuenta revertido al estado previo.' };
          break;
        }
        case 'goal': {
          const updatedGoals = StorageService.deleteGoal(item.entityId, user?.uid);
          setGoals(updatedGoals);
          result = { success: true, message: 'Meta financiera eliminada correctamente.' };
          break;
        }
        case 'portfolio': {
          const updatedPortfolio = StorageService.deletePortfolioAsset(item.entityId, user?.uid);
          setPortfolioAssets(updatedPortfolio);
          result = { success: true, message: 'Activo de portafolio eliminado.' };
          break;
        }
        default:
          return { success: false, message: 'Tipo de reversión no soportado.' };
      }
      triggerBackgroundSync();
      return result;
    } catch (err: any) {
      console.error('Error al revertir elemento:', err);
      return { success: false, message: err?.message || 'Error al revertir el registro.' };
    }
  };

  const unifiedActivities = useMemo(() => {
    return StorageService.getUnifiedActivityFeed(
      accounts,
      transactions,
      debts,
      losses,
      goals,
      portfolioAssets,
      auditLogs
    );
  }, [accounts, transactions, debts, losses, goals, portfolioAssets, auditLogs]);

  const setManualRates = (bcv: number, usdt: number) => {
    const updated = RatesService.setManualRates(bcv, usdt);
    setRates(updated);
  };

  const clearManualRates = () => {
    RatesService.clearManualOverride();
    refreshRates();
  };

  // Financial Calculations
  const { 
    totalNetWorthUsdBcv, 
    totalNetWorthUsdUsdt, 
    totalLiquidVes, 
    totalLiquidUsd, 
    vesRatioPercent, 
    usdRatioPercent 
  } = useMemo(() => {
    let liquidVes = 0;
    let liquidUsd = 0;

    accounts.forEach(acc => {
      if (acc.currency === 'VES') {
        liquidVes += acc.currentBalance;
        // Cuentas bancarias en VES con sub-fondos de $ digitales y $ físicos
        liquidUsd += (acc.digitalUsdBalance || 0) + (acc.physicalUsdBalance || 0);
      } else {
        liquidUsd += acc.currentBalance;
      }
    });

    // Add portfolio assets
    let portfolioUsd = 0;
    portfolioAssets.forEach(a => {
      portfolioUsd += a.currentValuationUsd;
    });

    const vesConvertedBcv = rates.bcv > 0 ? liquidVes / rates.bcv : 0;
    const vesConvertedUsdt = rates.usdt > 0 ? liquidVes / rates.usdt : 0;

    const netUsdBcv = liquidUsd + vesConvertedBcv + portfolioUsd;
    const netUsdUsdt = liquidUsd + vesConvertedUsdt + portfolioUsd;

    const totalInUsdt = liquidUsd + vesConvertedUsdt;
    const vesRatio = totalInUsdt > 0 ? (vesConvertedUsdt / totalInUsdt) * 100 : 0;
    const usdRatio = totalInUsdt > 0 ? (liquidUsd / totalInUsdt) * 100 : 0;

    return {
      totalNetWorthUsdBcv: Number(netUsdBcv.toFixed(2)),
      totalNetWorthUsdUsdt: Number(netUsdUsdt.toFixed(2)),
      totalLiquidVes: Number(liquidVes.toFixed(2)),
      totalLiquidUsd: Number(liquidUsd.toFixed(2)),
      vesRatioPercent: Number(vesRatio.toFixed(1)),
      usdRatioPercent: Number(usdRatio.toFixed(1))
    };
  }, [accounts, portfolioAssets, rates]);

  // Debts Calculations (Por Cobrar vs Por Pagar)
  const { 
    totalPendingDebtsUsd, 
    totalPendingDebtsVes, 
    activeDebtorsCount,
    totalReceivableUsd,
    totalReceivableVes,
    activeReceivableCount,
    totalPayableUsd,
    totalPayableVes,
    activePayableCount,
    netDebtBalanceUsd,
    netDebtBalanceVes
  } = useMemo(() => {
    let recUsd = 0;
    let recVes = 0;
    let recCount = 0;

    let payUsd = 0;
    let payVes = 0;
    let payCount = 0;

    debts.forEach(d => {
      if (d.status !== 'paid' && d.remainingAmount > 0) {
        const isPayable = d.debtType === 'payable';
        let itemUsd = 0;
        let itemVes = 0;

        if (d.currencyType === 'USD_USDT') {
          itemUsd = d.remainingAmount;
          itemVes = rates.bcv > 0 ? (d.remainingAmount * rates.bcv) : 0;
        } else {
          itemVes = d.remainingAmount;
          itemUsd = rates.bcv > 0 ? (d.remainingAmount / rates.bcv) : 0;
        }

        if (isPayable) {
          payCount++;
          payUsd += itemUsd;
          payVes += itemVes;
        } else {
          recCount++;
          recUsd += itemUsd;
          recVes += itemVes;
        }
      }
    });

    const netUsd = recUsd - payUsd;
    const netVes = recVes - payVes;

    return {
      totalPendingDebtsUsd: Number(recUsd.toFixed(2)),
      totalPendingDebtsVes: Number(recVes.toFixed(2)),
      activeDebtorsCount: recCount,
      totalReceivableUsd: Number(recUsd.toFixed(2)),
      totalReceivableVes: Number(recVes.toFixed(2)),
      activeReceivableCount: recCount,
      totalPayableUsd: Number(payUsd.toFixed(2)),
      totalPayableVes: Number(payVes.toFixed(2)),
      activePayableCount: payCount,
      netDebtBalanceUsd: Number(netUsd.toFixed(2)),
      netDebtBalanceVes: Number(netVes.toFixed(2))
    };
  }, [debts, rates]);

  // Losses Calculations
  const { totalLossesUsd, totalLossesVes, monthlyLossesUsd, lossesCount } = useMemo(() => {
    let unrecoveredUsd = 0;
    let unrecoveredVes = 0;
    let currentMonthUsd = 0;
    const now = new Date();

    losses.forEach(l => {
      const netAmount = Math.max(0, l.amount - (l.recoveredAmount || 0));
      const rate = l.appliedRate > 0 ? l.appliedRate : (rates.usdt || rates.bcv || 1);
      
      let itemUsd = 0;
      let itemVes = 0;

      if (l.currency === 'USD') {
        itemUsd = netAmount;
        itemVes = netAmount * (rates.bcv > 0 ? rates.bcv : rate);
      } else {
        itemVes = netAmount;
        itemUsd = rate > 0 ? netAmount / rate : 0;
      }

      unrecoveredUsd += itemUsd;
      unrecoveredVes += itemVes;

      const lDate = new Date(l.date);
      if (lDate.getFullYear() === now.getFullYear() && lDate.getMonth() === now.getMonth()) {
        currentMonthUsd += itemUsd;
      }
    });

    return {
      totalLossesUsd: Number(unrecoveredUsd.toFixed(2)),
      totalLossesVes: Number(unrecoveredVes.toFixed(2)),
      monthlyLossesUsd: Number(currentMonthUsd.toFixed(2)),
      lossesCount: losses.length
    };
  }, [losses, rates]);

  // Filtered transactions by time period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      if (timeFilter === 'daily') {
        return txDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'weekly') {
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (timeFilter === 'monthly') {
        return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
      }
      if (timeFilter === 'yearly') {
        return txDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, timeFilter]);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        timeFilter,
        setTimeFilter,
        isOnline,
        user,
        registeredUsers,
        login,
        register,
        deleteUser,
        logout,
        isAppLocked,
        setIsAppLocked,
        isBiometricSupported,
        isBiometricAvailable,
        isBiometricEnrolled,
        loginWithBiometric,
        enrollBiometric,
        unlockWithBiometric,
        unlockWithPassword,
        unlockDirectly,
        accounts,
        transactions,
        categories,
        portfolioAssets,
        goals,
        debts,
        losses,
        auditLogs,
        unifiedActivities,
        rates,
        isTxModalOpen,
        setIsTxModalOpen,
        isAccountModalOpen,
        setIsAccountModalOpen,
        isRatesModalOpen,
        setIsRatesModalOpen,
        isInitialSetupModalOpen,
        setIsInitialSetupModalOpen,
        isCategoryModalOpen,
        setIsCategoryModalOpen,
        isAssetModalOpen,
        setIsAssetModalOpen,
        isGoalModalOpen,
        setIsGoalModalOpen,
        isDebtModalOpen,
        setIsDebtModalOpen,
        isDebtPaymentModalOpen,
        setIsDebtPaymentModalOpen,
        activeDebtForPayment,
        setActiveDebtForPayment,
        isLossModalOpen,
        setIsLossModalOpen,
        isLossRecoveryModalOpen,
        setIsLossRecoveryModalOpen,
        activeLossForRecovery,
        setActiveLossForRecovery,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        editingTransaction,
        setEditingTransaction,
        saveAccount,
        deleteAccount,
        batchSaveAccounts,
        saveCategory,
        deleteCategory,
        editingCategory,
        setEditingCategory,
        savePortfolioAsset,
        deletePortfolioAsset,
        saveGoal,
        deleteGoal,
        saveDebt,
        updateDebt,
        deleteDebt,
        revertDebt,
        editingDebt,
        setEditingDebt,
        addDebtPayment,
        deleteDebtPayment,
        saveLoss,
        updateLoss,
        deleteLoss,
        revertLoss,
        editingLoss,
        setEditingLoss,
        recoverLoss,
        deleteLossRecovery,
        declareDebtAsLoss,
        revertItem,
        refreshRates,
        setManualRates,
        clearManualRates,
        totalNetWorthUsdBcv,
        totalNetWorthUsdUsdt,
        totalLiquidVes,
        totalLiquidUsd,
        vesRatioPercent,
        usdRatioPercent,
        filteredTransactions,
        totalPendingDebtsUsd,
        totalPendingDebtsVes,
        activeDebtorsCount,
        totalReceivableUsd,
        totalReceivableVes,
        activeReceivableCount,
        totalPayableUsd,
        totalPayableVes,
        activePayableCount,
        netDebtBalanceUsd,
        netDebtBalanceVes,
        totalLossesUsd,
        totalLossesVes,
        monthlyLossesUsd,
        lossesCount,
        isWideLayout,
        setIsWideLayout,
        toggleWideLayout,
        isInstallable,
        isInstalled,
        isPwaModalOpen,
        setIsPwaModalOpen,
        triggerInstall,
        isSyncing,
        lastSyncTime,
        isSyncModalOpen,
        setIsSyncModalOpen,
        syncWithServer
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
