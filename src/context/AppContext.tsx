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
  SyncResult
} from '../types';
import { StorageService } from '../services/storageService';
import { RatesService } from '../services/ratesService';
import { SyncService } from '../services/syncService';
import { auth, onAuthStateChanged, User } from '../services/firebase';
import { usePwaInstall } from '../hooks/usePwaInstall';

export type ViewType = 'dashboard' | 'transactions' | 'accounts' | 'debts' | 'losses' | 'portfolio' | 'projections' | 'advisor';

interface AppContextType {
  // Navigation & View
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;

  // Connectivity & Auth
  isOnline: boolean;
  user: User | null;

  // Data states
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  portfolioAssets: PortfolioAsset[];
  goals: FinancialGoal[];
  debts: Debt[];
  losses: Loss[];
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
  deleteTransaction: (id: string) => void;
  saveAccount: (account: Account) => void;
  batchSaveAccounts: (accounts: Account[]) => void;
  saveCategory: (category: Category) => void;
  savePortfolioAsset: (asset: PortfolioAsset) => void;
  deletePortfolioAsset: (id: string) => void;
  saveGoal: (goal: FinancialGoal) => void;
  deleteGoal: (id: string) => void;
  saveDebt: (debt: Debt) => void;
  deleteDebt: (id: string) => void;
  addDebtPayment: (debtId: string, payment: Omit<DebtPayment, 'id'>) => void;
  saveLoss: (loss: Loss, deductFromAccount?: boolean) => void;
  deleteLoss: (id: string) => void;
  recoverLoss: (lossId: string, recoveryData: Omit<LossRecovery, 'id'>) => void;
  declareDebtAsLoss: (debtId: string, reason?: string) => void;
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
  const [user, setUser] = useState<User | null>(null);

  // Core Data
  const [accounts, setAccounts] = useState<Account[]>(() => StorageService.getAccounts());
  const [transactions, setTransactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [categories, setCategories] = useState<Category[]>(() => StorageService.getCategories());
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>(() => StorageService.getPortfolioAssets());
  const [goals, setGoals] = useState<FinancialGoal[]>(() => StorageService.getGoals());
  const [debts, setDebts] = useState<Debt[]>(() => StorageService.getDebts());
  const [losses, setLosses] = useState<Loss[]>(() => StorageService.getLosses());
  const [rates, setRates] = useState<ExchangeRates>(() => RatesService.getCachedRates());

  // Modal States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isInitialSetupModalOpen, setIsInitialSetupModalOpen] = useState(() => !StorageService.isInitialSetupDone());
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isDebtPaymentModalOpen, setIsDebtPaymentModalOpen] = useState(false);
  const [activeDebtForPayment, setActiveDebtForPayment] = useState<Debt | null>(null);
  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
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
      setUser(currentUser);
      if (currentUser) {
        const synced = await StorageService.syncWithFirestore(currentUser.uid);
        if (synced) {
          setAccounts(StorageService.getAccounts());
          setTransactions(StorageService.getTransactions());
          setCategories(StorageService.getCategories());
          setPortfolioAssets(StorageService.getPortfolioAssets());
          setGoals(StorageService.getGoals());
          setDebts(StorageService.getDebts());
          setLosses(StorageService.getLosses());
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
      const localData = StorageService.getAllData();
      const result = await SyncService.syncWithLocalServer(localData, customUrl);
      if (result.success && result.mergedData) {
        StorageService.applyMergedData(result.mergedData);
        setAccounts(StorageService.getAccounts());
        setTransactions(StorageService.getTransactions());
        setCategories(StorageService.getCategories());
        setPortfolioAssets(StorageService.getPortfolioAssets());
        setGoals(StorageService.getGoals());
        setDebts(StorageService.getDebts());
        setLosses(StorageService.getLosses());
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

  // Actions: guardan localmente (la sincronización ocurre al pulsar el botón de Sincronizar o tras 1h máx)
  const addTransaction = (tx: Transaction) => {
    const result = StorageService.addTransaction(tx, user?.uid);
    setAccounts(result.updatedAccounts);
    setTransactions(StorageService.getTransactions());
  };

  const deleteTransaction = (id: string) => {
    const updatedAccounts = StorageService.deleteTransaction(id, user?.uid);
    setAccounts(updatedAccounts);
    setTransactions(StorageService.getTransactions());
  };

  const saveAccount = (account: Account) => {
    StorageService.saveAccount(account, user?.uid);
    setAccounts(StorageService.getAccounts());
  };

  const batchSaveAccounts = (newAccounts: Account[]) => {
    StorageService.batchSaveAccounts(newAccounts, user?.uid);
    setAccounts(newAccounts);
    StorageService.markInitialSetupDone();
  };

  const saveCategory = (cat: Category) => {
    StorageService.saveCategory(cat, user?.uid);
    setCategories(StorageService.getCategories());
  };

  const savePortfolioAsset = (asset: PortfolioAsset) => {
    const updated = StorageService.savePortfolioAsset(asset, user?.uid);
    setPortfolioAssets(updated);
  };

  const deletePortfolioAsset = (id: string) => {
    const updated = StorageService.deletePortfolioAsset(id, user?.uid);
    setPortfolioAssets(updated);
  };

  const saveGoal = (goal: FinancialGoal) => {
    const updated = StorageService.saveGoal(goal, user?.uid);
    setGoals(updated);
  };

  const deleteGoal = (id: string) => {
    const updated = StorageService.deleteGoal(id, user?.uid);
    setGoals(updated);
  };

  // Debt Actions
  const saveDebt = (debt: Debt) => {
    const updated = StorageService.saveDebt(debt, user?.uid);
    setDebts(updated);
  };

  const deleteDebt = (id: string) => {
    const updated = StorageService.deleteDebt(id, user?.uid);
    setDebts(updated);
  };

  const addDebtPayment = (debtId: string, payment: Omit<DebtPayment, 'id'>) => {
    const result = StorageService.addDebtPayment(debtId, payment, user?.uid);
    setDebts(result.updatedDebts);
    setAccounts(result.updatedAccounts);
    if (payment.receivedInAccountId) {
      setTransactions(StorageService.getTransactions());
    }
  };

  // Loss Actions
  const saveLoss = (loss: Loss, deductFromAccount = false) => {
    const result = StorageService.saveLoss(loss, user?.uid, deductFromAccount);
    setLosses(result.updatedLosses);
    setAccounts(result.updatedAccounts);
    if (deductFromAccount && loss.affectedAccountId) {
      setTransactions(StorageService.getTransactions());
    }
  };

  const deleteLoss = (id: string) => {
    const updated = StorageService.deleteLoss(id, user?.uid);
    setLosses(updated);
  };

  const recoverLoss = (lossId: string, recoveryData: Omit<LossRecovery, 'id'>) => {
    const result = StorageService.recoverLoss(lossId, recoveryData, user?.uid);
    setLosses(result.updatedLosses);
    setAccounts(result.updatedAccounts);
    if (recoveryData.receivedInAccountId) {
      setTransactions(StorageService.getTransactions());
    }
  };

  const declareDebtAsLoss = (debtId: string, reason?: string) => {
    const result = StorageService.declareDebtAsLoss(debtId, reason, user?.uid);
    setDebts(result.updatedDebts);
    setLosses(result.updatedLosses);
  };

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
        accounts,
        transactions,
        categories,
        portfolioAssets,
        goals,
        debts,
        losses,
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
        deleteTransaction,
        saveAccount,
        batchSaveAccounts,
        saveCategory,
        savePortfolioAsset,
        deletePortfolioAsset,
        saveGoal,
        deleteGoal,
        saveDebt,
        deleteDebt,
        addDebtPayment,
        saveLoss,
        deleteLoss,
        recoverLoss,
        declareDebtAsLoss,
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
