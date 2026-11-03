import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Account, 
  Transaction, 
  Category, 
  PortfolioAsset, 
  FinancialGoal,
  Debt,
  DebtPayment,
  SubFundType,
  Loss,
  LossRecovery
} from '../types';
import { PRECONFIGURED_ACCOUNTS, PREDEFINED_CATEGORIES } from '../utils/constants';
import { SyncService } from './syncService';

const ACCOUNTS_STORAGE_KEY = 'finanzas_vzla_accounts';
const TRANSACTIONS_STORAGE_KEY = 'finanzas_vzla_transactions';
const CATEGORIES_STORAGE_KEY = 'finanzas_vzla_categories';
const ASSETS_STORAGE_KEY = 'finanzas_vzla_portfolio_assets';
const GOALS_STORAGE_KEY = 'finanzas_vzla_goals';
const DEBTS_STORAGE_KEY = 'finanzas_vzla_debts';
const LOSSES_STORAGE_KEY = 'finanzas_vzla_losses';
const SETUP_COMPLETED_KEY = 'finanzas_vzla_setup_completed';

export class StorageService {
  /**
   * Checks if initial setup has been performed
   */
  static isInitialSetupDone(): boolean {
    return localStorage.getItem(SETUP_COMPLETED_KEY) === 'true';
  }

  static markInitialSetupDone(): void {
    localStorage.setItem(SETUP_COMPLETED_KEY, 'true');
  }

  /**
   * Initializes default accounts if empty
   */
  static getInitialAccounts(): Account[] {
    const cached = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize accounts to guarantee new digital and physical USD fields
          return parsed.map((acc: Account) => ({
            ...acc,
            digitalUsdBalance: acc.digitalUsdBalance ?? 0,
            initialDigitalUsdBalance: acc.initialDigitalUsdBalance ?? 0,
            physicalUsdBalance: acc.physicalUsdBalance ?? 0,
            initialPhysicalUsdBalance: acc.initialPhysicalUsdBalance ?? 0,
          }));
        }
      } catch (e) {
        console.warn('Failed to parse cached accounts', e);
      }
    }

    const seeded: Account[] = PRECONFIGURED_ACCOUNTS.map((acc, index) => ({
      ...acc,
      id: `acc-${index + 1}`,
      currentBalance: acc.initialBalance,
      digitalUsdBalance: acc.digitalUsdBalance ?? 0,
      initialDigitalUsdBalance: acc.initialDigitalUsdBalance ?? 0,
      physicalUsdBalance: acc.physicalUsdBalance ?? 0,
      initialPhysicalUsdBalance: acc.initialPhysicalUsdBalance ?? 0,
      createdAt: '1970-01-01T00:00:00.000Z',
      updatedAt: '1970-01-01T00:00:00.000Z'
    }));

    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  /**
   * Initializes categories if empty
   */
  static getCategories(): Category[] {
    const cached = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse cached categories', e);
      }
    }

    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(PREDEFINED_CATEGORIES));
    return PREDEFINED_CATEGORIES;
  }

  static saveCategory(category: Category, userId?: string | null): void {
    const catToSave: Category = {
      ...category,
      updatedAt: category.updatedAt || new Date().toISOString()
    };
    const categories = this.getCategories();
    const existingIndex = categories.findIndex(c => c.id === catToSave.id);
    let updated: Category[];
    if (existingIndex >= 0) {
      updated = [...categories];
      updated[existingIndex] = catToSave;
    } else {
      updated = [catToSave, ...categories];
    }
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));

    if (userId) {
      try {
        const catRef = doc(db, `users/${userId}/categories`, catToSave.id);
        setDoc(catRef, catToSave, { merge: true });
      } catch (err) {
        console.warn('Offline category firestore save queued', err);
      }
    }
  }

  /**
   * Account Operations
   */
  static getAccounts(): Account[] {
    return this.getInitialAccounts();
  }

  static saveAccount(account: Account, userId?: string | null): void {
    const accounts = this.getAccounts();
    const idx = accounts.findIndex(a => a.id === account.id);
    let updated: Account[];
    if (idx >= 0) {
      updated = [...accounts];
      updated[idx] = { ...account, updatedAt: new Date().toISOString() };
    } else {
      updated = [...accounts, { ...account, updatedAt: new Date().toISOString() }];
    }
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    if (userId) {
      try {
        const accRef = doc(db, `users/${userId}/accounts`, account.id);
        setDoc(accRef, account, { merge: true });
      } catch (e) {
        console.warn('Offline account firestore save queued', e);
      }
    }
  }

  static batchSaveAccounts(accountsList: Account[], userId?: string | null): void {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accountsList));
    if (userId) {
      accountsList.forEach(acc => {
        try {
          const accRef = doc(db, `users/${userId}/accounts`, acc.id);
          setDoc(accRef, acc, { merge: true });
        } catch (e) {
          console.warn('Batch account save offline queued', e);
        }
      });
    }
  }

  /**
   * Transaction Operations
   */
  static getTransactions(): Transaction[] {
    const cached = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (!cached) return [];
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }

  static addTransaction(tx: Transaction, userId?: string | null): { updatedAccounts: Account[], transaction: Transaction } {
    const transactions = this.getTransactions();
    const accounts = this.getAccounts();

    // Calculate balance impacts
    const updatedAccounts = accounts.map(acc => {
      // Direct origin account
      if (acc.id === tx.accountId) {
        let newCurrent = acc.currentBalance;
        let newDigital = acc.digitalUsdBalance ?? 0;
        let newPhysical = acc.physicalUsdBalance ?? 0;

        const delta = (tx.type === 'expense' || tx.type === 'transfer') ? -tx.amount : tx.amount;

        if (tx.subFund === 'digital_usd') {
          newDigital = Number((newDigital + delta).toFixed(2));
        } else if (tx.subFund === 'physical_usd') {
          newPhysical = Number((newPhysical + delta).toFixed(2));
        } else {
          newCurrent = Number((newCurrent + delta).toFixed(2));
        }

        return {
          ...acc,
          currentBalance: newCurrent,
          digitalUsdBalance: newDigital,
          physicalUsdBalance: newPhysical,
          updatedAt: new Date().toISOString()
        };
      }

      // Destination account for transfers / currency exchanges
      if (tx.type === 'transfer' && tx.toAccountId && acc.id === tx.toAccountId) {
        const incomingAmount = tx.destinationAmount !== undefined ? tx.destinationAmount : tx.amount;
        let newCurrent = acc.currentBalance;
        let newDigital = acc.digitalUsdBalance ?? 0;
        let newPhysical = acc.physicalUsdBalance ?? 0;

        if (tx.toSubFund === 'digital_usd') {
          newDigital = Number((newDigital + incomingAmount).toFixed(2));
        } else if (tx.toSubFund === 'physical_usd') {
          newPhysical = Number((newPhysical + incomingAmount).toFixed(2));
        } else {
          newCurrent = Number((newCurrent + incomingAmount).toFixed(2));
        }

        return {
          ...acc,
          currentBalance: newCurrent,
          digitalUsdBalance: newDigital,
          physicalUsdBalance: newPhysical,
          updatedAt: new Date().toISOString()
        };
      }

      return acc;
    });

    const txWithUpdated: Transaction = {
      ...tx,
      updatedAt: tx.updatedAt || new Date().toISOString()
    };
    const updatedTxs = [txWithUpdated, ...transactions];
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTxs));
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

    if (userId) {
      try {
        const txRef = doc(db, `users/${userId}/transactions`, txWithUpdated.id);
        setDoc(txRef, txWithUpdated);
        this.batchSaveAccounts(updatedAccounts, userId);
      } catch (e) {
        console.warn('Transaction offline save queued in firestore cache', e);
      }
    }

    return { updatedAccounts, transaction: txWithUpdated };
  }

  static deleteTransaction(txId: string, userId?: string | null): Account[] {
    SyncService.recordDeletion(txId, 'transaction');
    const transactions = this.getTransactions();
    const txToDelete = transactions.find(t => t.id === txId);
    if (!txToDelete) return this.getAccounts();

    const accounts = this.getAccounts();
    // Revert balance changes
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === txToDelete.accountId) {
        let revertedCurrent = acc.currentBalance;
        let revertedDigital = acc.digitalUsdBalance ?? 0;
        let revertedPhysical = acc.physicalUsdBalance ?? 0;

        const delta = (txToDelete.type === 'expense' || txToDelete.type === 'transfer') ? txToDelete.amount : -txToDelete.amount;

        if (txToDelete.subFund === 'digital_usd') {
          revertedDigital = Number((revertedDigital + delta).toFixed(2));
        } else if (txToDelete.subFund === 'physical_usd') {
          revertedPhysical = Number((revertedPhysical + delta).toFixed(2));
        } else {
          revertedCurrent = Number((revertedCurrent + delta).toFixed(2));
        }

        return {
          ...acc,
          currentBalance: revertedCurrent,
          digitalUsdBalance: revertedDigital,
          physicalUsdBalance: revertedPhysical,
          updatedAt: new Date().toISOString()
        };
      }
      if (txToDelete.type === 'transfer' && txToDelete.toAccountId && acc.id === txToDelete.toAccountId) {
        const incomingAmount = txToDelete.destinationAmount !== undefined ? txToDelete.destinationAmount : txToDelete.amount;
        let revertedCurrent = acc.currentBalance;
        let revertedDigital = acc.digitalUsdBalance ?? 0;
        let revertedPhysical = acc.physicalUsdBalance ?? 0;

        if (txToDelete.toSubFund === 'digital_usd') {
          revertedDigital = Number((revertedDigital - incomingAmount).toFixed(2));
        } else if (txToDelete.toSubFund === 'physical_usd') {
          revertedPhysical = Number((revertedPhysical - incomingAmount).toFixed(2));
        } else {
          revertedCurrent = Number((revertedCurrent - incomingAmount).toFixed(2));
        }

        return {
          ...acc,
          currentBalance: revertedCurrent,
          digitalUsdBalance: revertedDigital,
          physicalUsdBalance: revertedPhysical,
          updatedAt: new Date().toISOString()
        };
      }
      return acc;
    });

    const updatedTxs = transactions.filter(t => t.id !== txId);
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTxs));
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

    if (userId) {
      try {
        deleteDoc(doc(db, `users/${userId}/transactions`, txId));
        this.batchSaveAccounts(updatedAccounts, userId);
      } catch (e) {
        console.warn('Delete transaction offline queued', e);
      }
    }

    return updatedAccounts;
  }

  /**
   * Portfolio & Assets
   */
  static getPortfolioAssets(): PortfolioAsset[] {
    const cached = localStorage.getItem(ASSETS_STORAGE_KEY);
    if (!cached) return [];
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }

  static savePortfolioAsset(asset: PortfolioAsset, userId?: string | null): PortfolioAsset[] {
    const assetToSave: PortfolioAsset = {
      ...asset,
      updatedAt: new Date().toISOString()
    };
    const assets = this.getPortfolioAssets();
    const idx = assets.findIndex(a => a.id === assetToSave.id);
    let updated: PortfolioAsset[];
    if (idx >= 0) {
      updated = [...assets];
      updated[idx] = assetToSave;
    } else {
      updated = [assetToSave, ...assets];
    }
    localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(updated));

    if (userId) {
      try {
        setDoc(doc(db, `users/${userId}/portfolio`, assetToSave.id), assetToSave, { merge: true });
      } catch (e) {
        console.warn('Portfolio asset offline save queued', e);
      }
    }
    return updated;
  }

  static deletePortfolioAsset(id: string, userId?: string | null): PortfolioAsset[] {
    SyncService.recordDeletion(id, 'asset');
    const assets = this.getPortfolioAssets().filter(a => a.id !== id);
    localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
    if (userId) {
      try {
        deleteDoc(doc(db, `users/${userId}/portfolio`, id));
      } catch (e) {
        console.warn('Delete asset offline queued', e);
      }
    }
    return assets;
  }

  /**
   * Financial Goals
   */
  static getGoals(): FinancialGoal[] {
    const cached = localStorage.getItem(GOALS_STORAGE_KEY);
    if (!cached) {
      // Default goal for demo / onboarding
      const defaultGoals: FinancialGoal[] = [
        {
          id: 'goal-emergency-fund',
          name: 'Fondo de Emergencia en USDT',
          targetAmountUsd: 1000,
          currentSavedUsd: 250,
          deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: 'Seguridad',
          color: '#10B981',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(defaultGoals));
      return defaultGoals;
    }
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }

  static saveGoal(goal: FinancialGoal, userId?: string | null): FinancialGoal[] {
    const goals = this.getGoals();
    const idx = goals.findIndex(g => g.id === goal.id);
    let updated: FinancialGoal[];
    if (idx >= 0) {
      updated = [...goals];
      updated[idx] = goal;
    } else {
      updated = [goal, ...goals];
    }
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updated));

    if (userId) {
      try {
        setDoc(doc(db, `users/${userId}/goals`, goal.id), goal, { merge: true });
      } catch (e) {
        console.warn('Goal offline queued', e);
      }
    }
    return updated;
  }

  static deleteGoal(id: string, userId?: string | null): FinancialGoal[] {
    SyncService.recordDeletion(id, 'goal');
    const goals = this.getGoals().filter(g => g.id !== id);
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    if (userId) {
      try {
        deleteDoc(doc(db, `users/${userId}/goals`, id));
      } catch (e) {
        console.warn('Delete goal offline queued', e);
      }
    }
    return goals;
  }

  /**
   * Debts & Debtors Management (Cuentas por Cobrar / Deudores Pendientes)
   */
  static getDebts(): Debt[] {
    const cached = localStorage.getItem(DEBTS_STORAGE_KEY);
    if (!cached) {
      return [];
    }
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }

  static saveDebt(debt: Debt, userId?: string | null): Debt[] {
    const debts = this.getDebts();
    const idx = debts.findIndex(d => d.id === debt.id);
    let updated: Debt[];
    if (idx >= 0) {
      updated = [...debts];
      updated[idx] = { ...debt, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...debt, updatedAt: new Date().toISOString() }, ...debts];
    }
    localStorage.setItem(DEBTS_STORAGE_KEY, JSON.stringify(updated));

    if (userId) {
      try {
        setDoc(doc(db, `users/${userId}/debts`, debt.id), debt, { merge: true });
      } catch (e) {
        console.warn('Debt offline queued', e);
      }
    }
    return updated;
  }

  static deleteDebt(id: string, userId?: string | null): Debt[] {
    SyncService.recordDeletion(id, 'debt');
    const debts = this.getDebts().filter(d => d.id !== id);
    localStorage.setItem(DEBTS_STORAGE_KEY, JSON.stringify(debts));
    if (userId) {
      try {
        deleteDoc(doc(db, `users/${userId}/debts`, id));
      } catch (e) {
        console.warn('Delete debt offline queued', e);
      }
    }
    return debts;
  }

  static addDebtPayment(
    debtId: string, 
    paymentData: Omit<DebtPayment, 'id'>, 
    userId?: string | null
  ): { updatedDebts: Debt[], updatedAccounts: Account[] } {
    const debts = this.getDebts();
    const debtIdx = debts.findIndex(d => d.id === debtId);
    if (debtIdx < 0) {
      return { updatedDebts: debts, updatedAccounts: this.getAccounts() };
    }

    const currentDebt = debts[debtIdx];
    const newPayment: DebtPayment = {
      ...paymentData,
      id: `debt-pay-${Date.now()}`
    };

    const newPayments = [...(currentDebt.payments || []), newPayment];
    const newRemaining = Math.max(0, Number((currentDebt.remainingAmount - newPayment.amount).toFixed(2)));
    const newStatus = newRemaining <= 0.001 ? 'paid' : 'partially_paid';

    const updatedDebt: Debt = {
      ...currentDebt,
      remainingAmount: newRemaining,
      status: newStatus,
      payments: newPayments,
      updatedAt: new Date().toISOString()
    };

    const updatedDebts = [...debts];
    updatedDebts[debtIdx] = updatedDebt;
    localStorage.setItem(DEBTS_STORAGE_KEY, JSON.stringify(updatedDebts));

    let updatedAccounts = this.getAccounts();

    // If user specified an account, register the financial transaction
    if (paymentData.receivedInAccountId) {
      const targetAcc = updatedAccounts.find(a => a.id === paymentData.receivedInAccountId);
      if (targetAcc) {
        const isPayable = currentDebt.debtType === 'payable';
        const tx: Transaction = {
          id: `tx-debt-${Date.now()}`,
          type: isPayable ? 'expense' : 'income',
          accountId: targetAcc.id,
          subFund: paymentData.receivedInSubFund || (targetAcc.currency === 'USD' ? 'digital_usd' : 'ves'),
          amount: paymentData.amount,
          currency: paymentData.currency,
          appliedRate: paymentData.appliedRate,
          categoryId: isPayable ? 'cat-pago-deuda' : 'cat-cobro-deuda',
          categoryName: isPayable ? `Pago de Deuda: ${currentDebt.debtorName}` : `Cobro: ${currentDebt.debtorName}`,
          categoryIcon: isPayable ? 'CreditCard' : 'HandCoins',
          categoryColor: isPayable ? '#EF4444' : '#10B981',
          date: paymentData.date,
          note: isPayable
            ? `Pago realizado por deuda propia: ${currentDebt.concept || 'Pendiente'}${paymentData.note ? ` - ${paymentData.note}` : ''}`
            : `Abono de deuda por cobrar: ${currentDebt.concept || 'Pendiente'}${paymentData.note ? ` - ${paymentData.note}` : ''}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const txResult = this.addTransaction(tx, userId);
        updatedAccounts = txResult.updatedAccounts;
      }
    }

    if (userId) {
      try {
        setDoc(doc(db, `users/${userId}/debts`, updatedDebt.id), updatedDebt, { merge: true });
      } catch (e) {
        console.warn('Debt payment offline queued', e);
      }
    }

    return { updatedDebts, updatedAccounts };
  }

  /**
   * Losses & Damage Management (Registro de Pérdidas, Mermas e Incobrables)
   */
  static getLosses(): Loss[] {
    const cached = localStorage.getItem(LOSSES_STORAGE_KEY);
    if (!cached) {
      return [];
    }
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }

  static saveLoss(
    loss: Loss, 
    userId?: string | null,
    deductFromAccount = false
  ): { updatedLosses: Loss[], updatedAccounts: Account[] } {
    const losses = this.getLosses();
    const idx = losses.findIndex(l => l.id === loss.id);
    let updatedLosses: Loss[];
    const isNew = idx < 0;

    if (!isNew) {
      updatedLosses = [...losses];
      updatedLosses[idx] = { ...loss, updatedAt: new Date().toISOString() };
    } else {
      updatedLosses = [{ ...loss, updatedAt: new Date().toISOString() }, ...losses];
    }
    localStorage.setItem(LOSSES_STORAGE_KEY, JSON.stringify(updatedLosses));

    let updatedAccounts = this.getAccounts();

    // If new and requested to deduct from an account, record an expense transaction
    if (isNew && deductFromAccount && loss.affectedAccountId) {
      const targetAcc = updatedAccounts.find(a => a.id === loss.affectedAccountId);
      if (targetAcc) {
        const tx: Transaction = {
          id: `tx-loss-${Date.now()}`,
          type: 'expense',
          accountId: targetAcc.id,
          subFund: loss.subFund || (targetAcc.currency === 'USD' ? 'digital_usd' : 'ves'),
          amount: loss.amount,
          currency: loss.currency,
          appliedRate: loss.appliedRate,
          categoryId: 'cat-perdidas',
          categoryName: `Pérdida / Merma: ${loss.concept}`,
          categoryIcon: 'TrendingDown',
          categoryColor: '#EF4444',
          date: loss.date,
          note: `Registro de Pérdida (${loss.category})${loss.notes ? `: ${loss.notes}` : ''}`,
          createdAt: new Date().toISOString()
        };
        const txResult = this.addTransaction(tx, userId);
        updatedAccounts = txResult.updatedAccounts;
      }
    }

    if (userId) {
      try {
        setDoc(doc(db, `users/${userId}/losses`, loss.id), loss, { merge: true });
      } catch (e) {
        console.warn('Loss offline queued', e);
      }
    }

    return { updatedLosses, updatedAccounts };
  }

  static deleteLoss(id: string, userId?: string | null): Loss[] {
    SyncService.recordDeletion(id, 'loss');
    const losses = this.getLosses().filter(l => l.id !== id);
    localStorage.setItem(LOSSES_STORAGE_KEY, JSON.stringify(losses));
    if (userId) {
      try {
        deleteDoc(doc(db, `users/${userId}/losses`, id));
      } catch (e) {
        console.warn('Delete loss offline queued', e);
      }
    }
    return losses;
  }

  static recoverLoss(
    lossId: string,
    recoveryData: Omit<LossRecovery, 'id'>,
    userId?: string | null
  ): { updatedLosses: Loss[], updatedAccounts: Account[] } {
    const losses = this.getLosses();
    const idx = losses.findIndex(l => l.id === lossId);
    if (idx < 0) {
      return { updatedLosses: losses, updatedAccounts: this.getAccounts() };
    }

    const currentLoss = losses[idx];
    const newRecovery: LossRecovery = {
      ...recoveryData,
      id: `loss-rec-${Date.now()}`
    };

    const newRecoveries = [...(currentLoss.recoveries || []), newRecovery];
    const totalRecovered = Number((newRecoveries.reduce((sum, r) => sum + r.amount, 0)).toFixed(2));
    
    let newStatus: Loss['status'] = 'partially_recovered';
    if (totalRecovered >= currentLoss.amount) {
      newStatus = 'recovered';
    } else if (totalRecovered <= 0) {
      newStatus = 'total_loss';
    }

    const updatedLoss: Loss = {
      ...currentLoss,
      recoveredAmount: totalRecovered,
      status: newStatus,
      recoveries: newRecoveries,
      updatedAt: new Date().toISOString()
    };

    const updatedLosses = [...losses];
    updatedLosses[idx] = updatedLoss;
    localStorage.setItem(LOSSES_STORAGE_KEY, JSON.stringify(updatedLosses));

    let updatedAccounts = this.getAccounts();

    // If destination account specified, register income
    if (recoveryData.receivedInAccountId) {
      const targetAcc = updatedAccounts.find(a => a.id === recoveryData.receivedInAccountId);
      if (targetAcc) {
        const tx: Transaction = {
          id: `tx-lossrec-${Date.now()}`,
          type: 'income',
          accountId: targetAcc.id,
          subFund: recoveryData.receivedInSubFund || (targetAcc.currency === 'USD' ? 'digital_usd' : 'ves'),
          amount: recoveryData.amount,
          currency: recoveryData.currency,
          categoryId: 'cat-recuperacion-perdida',
          categoryName: `Recuperación: ${currentLoss.concept}`,
          categoryIcon: 'ShieldCheck',
          categoryColor: '#10B981',
          date: recoveryData.date,
          note: `Recuperación de pérdida: ${currentLoss.concept}${recoveryData.note ? ` - ${recoveryData.note}` : ''}`,
          createdAt: new Date().toISOString()
        };
        const txResult = this.addTransaction(tx, userId);
        updatedAccounts = txResult.updatedAccounts;
      }
    }

    if (userId) {
      try {
        setDoc(doc(db, `users/${userId}/losses`, updatedLoss.id), updatedLoss, { merge: true });
      } catch (e) {
        console.warn('Recover loss offline queued', e);
      }
    }

    return { updatedLosses, updatedAccounts };
  }

  static declareDebtAsLoss(
    debtId: string,
    reason?: string,
    userId?: string | null
  ): { updatedDebts: Debt[], updatedLosses: Loss[] } {
    const debts = this.getDebts();
    const debtIdx = debts.findIndex(d => d.id === debtId);
    if (debtIdx < 0) {
      return { updatedDebts: debts, updatedLosses: this.getLosses() };
    }

    const currentDebt = debts[debtIdx];
    const updatedDebt: Debt = {
      ...currentDebt,
      status: 'uncollectible',
      notes: `${currentDebt.notes || ''} [Declarada Incobrable / Pérdida: ${new Date().toLocaleDateString('es-VE')}${reason ? ` - Motivo: ${reason}` : ''}]`.trim(),
      updatedAt: new Date().toISOString()
    };

    const updatedDebts = [...debts];
    updatedDebts[debtIdx] = updatedDebt;
    localStorage.setItem(DEBTS_STORAGE_KEY, JSON.stringify(updatedDebts));

    // Create Loss item from this uncollectible debt
    const lossItem: Loss = {
      id: `loss-from-debt-${currentDebt.id}`,
      concept: `Deuda Incobrable: ${currentDebt.debtorName} (${currentDebt.concept})`,
      category: 'uncollectible_debt',
      amount: currentDebt.remainingAmount,
      currency: currentDebt.currencyType === 'USD_USDT' ? 'USD' : 'VES',
      appliedRate: currentDebt.appliedRateAtCreation || 1,
      date: new Date().toISOString(),
      status: 'total_loss',
      recoveredAmount: 0,
      linkedDebtId: currentDebt.id,
      notes: `Deuda original: ${currentDebt.originalAmount} ${currentDebt.currencyType === 'USD_USDT' ? 'USD' : 'Bs'}. Saldo no recuperado al momento de declarar pérdida.${reason ? ` Motivo: ${reason}` : ''}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { updatedLosses } = this.saveLoss(lossItem, userId, false);

    if (userId) {
      try {
        setDoc(doc(db, `users/${userId}/debts`, updatedDebt.id), updatedDebt, { merge: true });
      } catch (e) {
        console.warn('Update uncollectible debt offline queued', e);
      }
    }

    return { updatedDebts, updatedLosses };
  }

  /**
   * Obtiene todos los datos almacenados localmente para la sincronización
   */
  static getAllData() {
    return {
      accounts: this.getAccounts(),
      transactions: this.getTransactions(),
      categories: this.getCategories(),
      portfolioAssets: this.getPortfolioAssets(),
      goals: this.getGoals(),
      debts: this.getDebts(),
      losses: this.getLosses()
    };
  }

  /**
   * Aplica la consolidación de datos resultante de la sincronización en localStorage
   */
  static applyMergedData(merged: {
    accounts?: Account[];
    transactions?: Transaction[];
    categories?: Category[];
    portfolioAssets?: PortfolioAsset[];
    goals?: FinancialGoal[];
    debts?: Debt[];
    losses?: Loss[];
  }): void {
    if (merged.accounts) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(merged.accounts));
    }
    if (merged.transactions) {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(merged.transactions));
    }
    if (merged.categories) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(merged.categories));
    }
    if (merged.portfolioAssets) {
      localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(merged.portfolioAssets));
    }
    if (merged.goals) {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(merged.goals));
    }
    if (merged.debts) {
      localStorage.setItem(DEBTS_STORAGE_KEY, JSON.stringify(merged.debts));
    }
    if (merged.losses) {
      localStorage.setItem(LOSSES_STORAGE_KEY, JSON.stringify(merged.losses));
    }

    // Si los datos fusionados contienen cuentas con saldo o transacciones, marcar configuración inicial completada
    const hasConfiguredData = 
      (merged.accounts && merged.accounts.some(a => a.currentBalance > 0 || (a.digitalUsdBalance || 0) > 0 || (a.physicalUsdBalance || 0) > 0)) ||
      (merged.transactions && merged.transactions.length > 0) ||
      (merged.debts && merged.debts.length > 0);

    if (hasConfiguredData) {
      this.markInitialSetupDone();
    }
  }

  /**
   * Sincroniza bidireccionalmente los datos con Cloud Firestore
   */
  static async syncWithFirestore(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const collections = [
        { name: 'accounts', storageKey: ACCOUNTS_STORAGE_KEY },
        { name: 'transactions', storageKey: TRANSACTIONS_STORAGE_KEY },
        { name: 'categories', storageKey: CATEGORIES_STORAGE_KEY },
        { name: 'portfolio', storageKey: ASSETS_STORAGE_KEY },
        { name: 'goals', storageKey: GOALS_STORAGE_KEY },
        { name: 'debts', storageKey: DEBTS_STORAGE_KEY },
        { name: 'losses', storageKey: LOSSES_STORAGE_KEY }
      ];

      for (const col of collections) {
        const colRef = collection(db, `users/${userId}/${col.name}`);
        const snapshot = await getDocs(colRef);
        const cloudItems: any[] = [];
        snapshot.forEach(docSnap => {
          cloudItems.push(docSnap.data());
        });

        const rawLocal = localStorage.getItem(col.storageKey);
        const localItems = rawLocal ? JSON.parse(rawLocal) : [];

        if (cloudItems.length > 0) {
          // Fusionar respetando fechas más recientes
          const itemMap = new Map();
          for (const item of [...localItems, ...cloudItems]) {
            if (!item || !item.id) continue;
            if (!itemMap.has(item.id)) {
              itemMap.set(item.id, item);
            } else {
              const existing = itemMap.get(item.id);
              const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
              const itemTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
              if (itemTime > existingTime) {
                itemMap.set(item.id, item);
              }
            }
          }
          const merged = Array.from(itemMap.values());
          localStorage.setItem(col.storageKey, JSON.stringify(merged));

          // Subir a la nube los ítems locales que no existían en Firestore
          for (const item of merged) {
            const existsInCloud = cloudItems.some(c => c.id === item.id);
            if (!existsInCloud) {
              setDoc(doc(db, `users/${userId}/${col.name}`, item.id), item, { merge: true });
            }
          }
        } else if (localItems.length > 0) {
          // Respaldar datos locales en la nube si está vacía
          for (const item of localItems) {
            if (item && item.id) {
              setDoc(doc(db, `users/${userId}/${col.name}`, item.id), item, { merge: true });
            }
          }
        }
      }

      this.markInitialSetupDone();
      return true;
    } catch (err) {
      console.warn('[StorageService] Error syncing with Firestore:', err);
      return false;
    }
  }
}
