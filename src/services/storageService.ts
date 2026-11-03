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
  LossRecovery,
  AuditLogEntry,
  UnifiedActivityItem
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
const AUDIT_LOGS_STORAGE_KEY = 'finanzas_vzla_audit_logs';
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
      const oldAcc = accounts[idx];
      const isBalanceChanged = 
        oldAcc.currentBalance !== account.currentBalance ||
        (oldAcc.digitalUsdBalance || 0) !== (account.digitalUsdBalance || 0) ||
        (oldAcc.physicalUsdBalance || 0) !== (account.physicalUsdBalance || 0);

      if (isBalanceChanged) {
        this.saveAuditLog({
          id: `audit-acc-${Date.now()}`,
          timestamp: new Date().toISOString(),
          entityType: 'account_adjustment',
          action: 'adjustment',
          title: `Ajuste de saldo: ${account.name}`,
          details: `Saldo modificado de ${oldAcc.currentBalance} a ${account.currentBalance} ${account.currency}`,
          entityId: account.id,
          amount: Math.abs(account.currentBalance - oldAcc.currentBalance),
          currency: account.currency,
          snapshotBefore: oldAcc,
          snapshotAfter: account
        }, userId);
      }

      updated = [...accounts];
      updated[idx] = { ...account, updatedAt: new Date().toISOString() };
    } else {
      updated = [...accounts, { ...account, updatedAt: new Date().toISOString() }];
      this.saveAuditLog({
        id: `audit-acc-new-${Date.now()}`,
        timestamp: new Date().toISOString(),
        entityType: 'account_adjustment',
        action: 'create',
        title: `Nueva cuenta creada: ${account.name}`,
        details: `Saldo inicial: ${account.currentBalance} ${account.currency}`,
        entityId: account.id,
        amount: account.currentBalance,
        currency: account.currency,
        snapshotBefore: null,
        snapshotAfter: account
      }, userId);
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
    const oldAccounts = this.getAccounts();
    const hasAnyChange = oldAccounts.some(oldAcc => {
      const newAcc = accountsList.find(a => a.id === oldAcc.id);
      if (!newAcc) return false;
      return oldAcc.currentBalance !== newAcc.currentBalance ||
        (oldAcc.digitalUsdBalance || 0) !== (newAcc.digitalUsdBalance || 0) ||
        (oldAcc.physicalUsdBalance || 0) !== (newAcc.physicalUsdBalance || 0);
    });

    if (hasAnyChange && oldAccounts.length > 0) {
      this.saveAuditLog({
        id: `audit-batch-acc-${Date.now()}`,
        timestamp: new Date().toISOString(),
        entityType: 'account_adjustment',
        action: 'adjustment',
        title: 'Ajuste general de saldos de cuentas',
        details: 'Modificación de saldos o fondos en configuración de cuentas',
        entityId: 'all-accounts',
        snapshotBefore: oldAccounts,
        snapshotAfter: accountsList
      }, userId);
    }

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

  static deleteDebtPayment(
    debtId: string,
    paymentId: string,
    userId?: string | null
  ): { updatedDebts: Debt[], updatedAccounts: Account[], updatedTransactions: Transaction[] } {
    SyncService.recordDeletion(paymentId, 'debt_payment' as any);
    const debts = this.getDebts();
    const debtIdx = debts.findIndex(d => d.id === debtId);
    if (debtIdx < 0) {
      return { 
        updatedDebts: debts, 
        updatedAccounts: this.getAccounts(), 
        updatedTransactions: this.getTransactions() 
      };
    }

    const currentDebt = debts[debtIdx];
    const payments = currentDebt.payments || [];
    const paymentToDelete = payments.find(p => p.id === paymentId);
    if (!paymentToDelete) {
      return { 
        updatedDebts: debts, 
        updatedAccounts: this.getAccounts(), 
        updatedTransactions: this.getTransactions() 
      };
    }

    const newPayments = payments.filter(p => p.id !== paymentId);
    const newRemaining = Number((currentDebt.remainingAmount + paymentToDelete.amount).toFixed(2));
    const newStatus = newRemaining >= currentDebt.originalAmount ? 'pending' : 'partially_paid';

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
    let updatedTransactions = this.getTransactions();

    if (paymentToDelete.receivedInAccountId) {
      const isPayable = currentDebt.debtType === 'payable';
      const delta = isPayable ? paymentToDelete.amount : -paymentToDelete.amount;

      updatedAccounts = updatedAccounts.map(acc => {
        if (acc.id === paymentToDelete.receivedInAccountId) {
          let cur = acc.currentBalance;
          let dig = acc.digitalUsdBalance ?? 0;
          let phy = acc.physicalUsdBalance ?? 0;

          if (paymentToDelete.receivedInSubFund === 'digital_usd') {
            dig = Number((dig + delta).toFixed(2));
          } else if (paymentToDelete.receivedInSubFund === 'physical_usd') {
            phy = Number((phy + delta).toFixed(2));
          } else {
            cur = Number((cur + delta).toFixed(2));
          }

          return {
            ...acc,
            currentBalance: cur,
            digitalUsdBalance: dig,
            physicalUsdBalance: phy,
            updatedAt: new Date().toISOString()
          };
        }
        return acc;
      });

      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

      // Remove matching transaction if exists
      const txIndex = updatedTransactions.findIndex(t => 
        (t.id === paymentToDelete.id) ||
        (t.accountId === paymentToDelete.receivedInAccountId && 
         t.amount === paymentToDelete.amount &&
         (t.categoryId === 'cat-cobro-deuda' || t.categoryId === 'cat-pago-deuda' || t.id.startsWith('tx-debt-')))
      );

      if (txIndex >= 0) {
        const removedTx = updatedTransactions[txIndex];
        SyncService.recordDeletion(removedTx.id, 'transaction');
        updatedTransactions = updatedTransactions.filter((_, idx) => idx !== txIndex);
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
        if (userId) {
          try {
            deleteDoc(doc(db, `users/${userId}/transactions`, removedTx.id));
          } catch (e) {
            console.warn('Delete transaction offline queued', e);
          }
        }
      }

      if (userId) {
        this.batchSaveAccounts(updatedAccounts, userId);
      }
    }

    if (userId) {
      try {
        setDoc(doc(db, `users/${userId}/debts`, updatedDebt.id), updatedDebt, { merge: true });
      } catch (e) {
        console.warn('Debt payment delete offline queued', e);
      }
    }

    return { updatedDebts, updatedAccounts, updatedTransactions };
  }

  static revertDebt(
    debtId: string,
    userId?: string | null
  ): { updatedDebts: Debt[], updatedAccounts: Account[], updatedTransactions: Transaction[] } {
    const debts = this.getDebts();
    const targetDebt = debts.find(d => d.id === debtId);
    let updatedAccounts = this.getAccounts();
    let updatedTransactions = this.getTransactions();

    if (!targetDebt) {
      return { updatedDebts: debts, updatedAccounts, updatedTransactions };
    }

    if (targetDebt.payments && targetDebt.payments.length > 0) {
      for (const p of targetDebt.payments) {
        if (p.receivedInAccountId) {
          const isPayable = targetDebt.debtType === 'payable';
          const delta = isPayable ? p.amount : -p.amount;

          updatedAccounts = updatedAccounts.map(acc => {
            if (acc.id === p.receivedInAccountId) {
              let cur = acc.currentBalance;
              let dig = acc.digitalUsdBalance ?? 0;
              let phy = acc.physicalUsdBalance ?? 0;

              if (p.receivedInSubFund === 'digital_usd') {
                dig = Number((dig + delta).toFixed(2));
              } else if (p.receivedInSubFund === 'physical_usd') {
                phy = Number((phy + delta).toFixed(2));
              } else {
                cur = Number((cur + delta).toFixed(2));
              }

              return {
                ...acc,
                currentBalance: cur,
                digitalUsdBalance: dig,
                physicalUsdBalance: phy,
                updatedAt: new Date().toISOString()
              };
            }
            return acc;
          });

          const txIdx = updatedTransactions.findIndex(t => 
            (t.id === p.id) ||
            (t.accountId === p.receivedInAccountId && 
             t.amount === p.amount && 
             (t.categoryId === 'cat-cobro-deuda' || t.categoryId === 'cat-pago-deuda' || t.id.startsWith('tx-debt-')))
          );
          if (txIdx >= 0) {
            const removedTx = updatedTransactions[txIdx];
            SyncService.recordDeletion(removedTx.id, 'transaction');
            updatedTransactions = updatedTransactions.filter((_, idx) => idx !== txIdx);
            if (userId) {
              try { deleteDoc(doc(db, `users/${userId}/transactions`, removedTx.id)); } catch (e) {}
            }
          }
        }
      }
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
      if (userId) {
        this.batchSaveAccounts(updatedAccounts, userId);
      }
    }

    const updatedDebts = this.deleteDebt(debtId, userId);
    return { updatedDebts, updatedAccounts, updatedTransactions };
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

  static deleteLossRecovery(
    lossId: string,
    recoveryId: string,
    userId?: string | null
  ): { updatedLosses: Loss[], updatedAccounts: Account[], updatedTransactions: Transaction[] } {
    SyncService.recordDeletion(recoveryId, 'loss_recovery' as any);
    const losses = this.getLosses();
    const lossIdx = losses.findIndex(l => l.id === lossId);
    if (lossIdx < 0) {
      return { 
        updatedLosses: losses, 
        updatedAccounts: this.getAccounts(), 
        updatedTransactions: this.getTransactions() 
      };
    }

    const currentLoss = losses[lossIdx];
    const recoveries = currentLoss.recoveries || [];
    const recoveryToDelete = recoveries.find(r => r.id === recoveryId);
    if (!recoveryToDelete) {
      return { 
        updatedLosses: losses, 
        updatedAccounts: this.getAccounts(), 
        updatedTransactions: this.getTransactions() 
      };
    }

    const newRecoveries = recoveries.filter(r => r.id !== recoveryId);
    const totalRecovered = Number((newRecoveries.reduce((sum, r) => sum + r.amount, 0)).toFixed(2));
    let newStatus: Loss['status'] = 'partially_recovered';
    if (totalRecovered <= 0) {
      newStatus = 'total_loss';
    } else if (totalRecovered >= currentLoss.amount) {
      newStatus = 'recovered';
    }

    const updatedLoss: Loss = {
      ...currentLoss,
      recoveredAmount: totalRecovered,
      status: newStatus,
      recoveries: newRecoveries,
      updatedAt: new Date().toISOString()
    };

    const updatedLosses = [...losses];
    updatedLosses[lossIdx] = updatedLoss;
    localStorage.setItem(LOSSES_STORAGE_KEY, JSON.stringify(updatedLosses));

    let updatedAccounts = this.getAccounts();
    let updatedTransactions = this.getTransactions();

    if (recoveryToDelete.receivedInAccountId) {
      updatedAccounts = updatedAccounts.map(acc => {
        if (acc.id === recoveryToDelete.receivedInAccountId) {
          let cur = acc.currentBalance;
          let dig = acc.digitalUsdBalance ?? 0;
          let phy = acc.physicalUsdBalance ?? 0;

          if (recoveryToDelete.receivedInSubFund === 'digital_usd') {
            dig = Number((dig - recoveryToDelete.amount).toFixed(2));
          } else if (recoveryToDelete.receivedInSubFund === 'physical_usd') {
            phy = Number((phy - recoveryToDelete.amount).toFixed(2));
          } else {
            cur = Number((cur - recoveryToDelete.amount).toFixed(2));
          }

          return {
            ...acc,
            currentBalance: cur,
            digitalUsdBalance: dig,
            physicalUsdBalance: phy,
            updatedAt: new Date().toISOString()
          };
        }
        return acc;
      });

      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

      // Remove matching transaction
      const txIndex = updatedTransactions.findIndex(t => 
        (t.id === recoveryToDelete.id) ||
        (t.accountId === recoveryToDelete.receivedInAccountId && 
         t.amount === recoveryToDelete.amount &&
         (t.categoryId === 'cat-recuperacion-perdida' || t.id.startsWith('tx-lossrec-')))
      );

      if (txIndex >= 0) {
        const removedTx = updatedTransactions[txIndex];
        SyncService.recordDeletion(removedTx.id, 'transaction');
        updatedTransactions = updatedTransactions.filter((_, idx) => idx !== txIndex);
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
        if (userId) {
          try {
            deleteDoc(doc(db, `users/${userId}/transactions`, removedTx.id));
          } catch (e) {
            console.warn('Delete transaction offline queued', e);
          }
        }
      }

      if (userId) {
        this.batchSaveAccounts(updatedAccounts, userId);
      }
    }

    if (userId) {
      try {
        setDoc(doc(db, `users/${userId}/losses`, updatedLoss.id), updatedLoss, { merge: true });
      } catch (e) {
        console.warn('Update loss offline queued', e);
      }
    }

    return { updatedLosses, updatedAccounts, updatedTransactions };
  }

  static revertLoss(
    lossId: string,
    userId?: string | null
  ): { updatedLosses: Loss[], updatedAccounts: Account[], updatedTransactions: Transaction[], updatedDebts: Debt[] } {
    const losses = this.getLosses();
    const targetLoss = losses.find(l => l.id === lossId);
    let updatedAccounts = this.getAccounts();
    let updatedTransactions = this.getTransactions();
    let updatedDebts = this.getDebts();

    if (!targetLoss) {
      return { updatedLosses: losses, updatedAccounts, updatedTransactions, updatedDebts };
    }

    // 1. If deducted from account, restore funds
    if (targetLoss.affectedAccountId) {
      updatedAccounts = updatedAccounts.map(acc => {
        if (acc.id === targetLoss.affectedAccountId) {
          let cur = acc.currentBalance;
          let dig = acc.digitalUsdBalance ?? 0;
          let phy = acc.physicalUsdBalance ?? 0;

          if (targetLoss.subFund === 'digital_usd') {
            dig = Number((dig + targetLoss.amount).toFixed(2));
          } else if (targetLoss.subFund === 'physical_usd') {
            phy = Number((phy + targetLoss.amount).toFixed(2));
          } else {
            cur = Number((cur + targetLoss.amount).toFixed(2));
          }

          return {
            ...acc,
            currentBalance: cur,
            digitalUsdBalance: dig,
            physicalUsdBalance: phy,
            updatedAt: new Date().toISOString()
          };
        }
        return acc;
      });

      const txIndex = updatedTransactions.findIndex(t => 
        (t.accountId === targetLoss.affectedAccountId && 
         t.amount === targetLoss.amount &&
         (t.categoryId === 'cat-perdidas' || t.id.startsWith('tx-loss-')))
      );

      if (txIndex >= 0) {
        const removedTx = updatedTransactions[txIndex];
        SyncService.recordDeletion(removedTx.id, 'transaction');
        updatedTransactions = updatedTransactions.filter((_, idx) => idx !== txIndex);
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
        if (userId) {
          try {
            deleteDoc(doc(db, `users/${userId}/transactions`, removedTx.id));
          } catch (e) {}
        }
      }

      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
      if (userId) {
        this.batchSaveAccounts(updatedAccounts, userId);
      }
    }

    // 2. If it had recoveries that added money to accounts, revert them
    if (targetLoss.recoveries && targetLoss.recoveries.length > 0) {
      for (const rec of targetLoss.recoveries) {
        if (rec.receivedInAccountId) {
          updatedAccounts = updatedAccounts.map(acc => {
            if (acc.id === rec.receivedInAccountId) {
              let cur = acc.currentBalance;
              let dig = acc.digitalUsdBalance ?? 0;
              let phy = acc.physicalUsdBalance ?? 0;

              if (rec.receivedInSubFund === 'digital_usd') {
                dig = Number((dig - rec.amount).toFixed(2));
              } else if (rec.receivedInSubFund === 'physical_usd') {
                phy = Number((phy - rec.amount).toFixed(2));
              } else {
                cur = Number((cur - rec.amount).toFixed(2));
              }

              return {
                ...acc,
                currentBalance: cur,
                digitalUsdBalance: dig,
                physicalUsdBalance: phy,
                updatedAt: new Date().toISOString()
              };
            }
            return acc;
          });

          const recTxIdx = updatedTransactions.findIndex(t => 
            t.accountId === rec.receivedInAccountId && 
            t.amount === rec.amount && 
            (t.categoryId === 'cat-recuperacion-perdida' || t.id.startsWith('tx-lossrec-'))
          );
          if (recTxIdx >= 0) {
            const removedTx = updatedTransactions[recTxIdx];
            SyncService.recordDeletion(removedTx.id, 'transaction');
            updatedTransactions = updatedTransactions.filter((_, idx) => idx !== recTxIdx);
            if (userId) {
              try { deleteDoc(doc(db, `users/${userId}/transactions`, removedTx.id)); } catch (e) {}
            }
          }
        }
      }
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
      if (userId) {
        this.batchSaveAccounts(updatedAccounts, userId);
      }
    }

    // 3. If linked to an uncollectible debt, restore debt status
    if (targetLoss.linkedDebtId) {
      const debtIdx = updatedDebts.findIndex(d => d.id === targetLoss.linkedDebtId);
      if (debtIdx >= 0) {
        const d = updatedDebts[debtIdx];
        const hasRemaining = d.remainingAmount > 0;
        updatedDebts[debtIdx] = {
          ...d,
          status: hasRemaining ? (d.remainingAmount < d.originalAmount ? 'partially_paid' : 'pending') : 'paid',
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(DEBTS_STORAGE_KEY, JSON.stringify(updatedDebts));
        if (userId) {
          try {
            setDoc(doc(db, `users/${userId}/debts`, d.id), updatedDebts[debtIdx], { merge: true });
          } catch (e) {}
        }
      }
    }

    // 4. Delete the loss
    const updatedLosses = this.deleteLoss(lossId, userId);

    return { updatedLosses, updatedAccounts, updatedTransactions, updatedDebts };
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
      losses: this.getLosses(),
      auditLogs: this.getAuditLogs()
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
    auditLogs?: AuditLogEntry[];
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
    if (merged.auditLogs) {
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(merged.auditLogs));
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
        { name: 'losses', storageKey: LOSSES_STORAGE_KEY },
        { name: 'audit_logs', storageKey: AUDIT_LOGS_STORAGE_KEY }
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

  /**
   * Historial y Auditoría Global de Cambios
   */
  static getAuditLogs(): AuditLogEntry[] {
    const cached = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (!cached) return [];
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }

  static saveAuditLog(entry: AuditLogEntry, userId?: string | null): AuditLogEntry[] {
    const logs = this.getAuditLogs();
    const updated = [entry, ...logs.slice(0, 199)];
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updated));
    if (userId) {
      try {
        setDoc(doc(db, `users/${userId}/audit_logs`, entry.id), entry, { merge: true });
      } catch (e) {}
    }
    return updated;
  }

  static revertAccountAdjustment(auditId: string, userId?: string | null): Account[] {
    const logs = this.getAuditLogs();
    const logIdx = logs.findIndex(l => l.id === auditId);
    if (logIdx < 0) return this.getAccounts();

    const log = logs[logIdx];
    if (!log.snapshotBefore) return this.getAccounts();

    let updatedAccounts = this.getAccounts();

    if (Array.isArray(log.snapshotBefore)) {
      updatedAccounts = log.snapshotBefore;
      this.batchSaveAccounts(updatedAccounts, userId);
    } else if (log.snapshotBefore && log.snapshotBefore.id) {
      const accIdx = updatedAccounts.findIndex(a => a.id === log.snapshotBefore.id);
      if (accIdx >= 0) {
        updatedAccounts[accIdx] = { ...log.snapshotBefore, updatedAt: new Date().toISOString() };
      } else {
        updatedAccounts.push(log.snapshotBefore);
      }
      this.batchSaveAccounts(updatedAccounts, userId);
    }

    logs[logIdx] = {
      ...log,
      reverted: true,
      revertedAt: new Date().toISOString()
    };
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs));

    return updatedAccounts;
  }

  /**
   * Genera el feed unificado de todas las actividades, movimientos, deudas, pérdidas y ajustes
   */
  static getUnifiedActivityFeed(
    accountsList?: Account[],
    txList?: Transaction[],
    debtList?: Debt[],
    lossList?: Loss[],
    goalList?: FinancialGoal[],
    assetList?: PortfolioAsset[],
    auditList?: AuditLogEntry[]
  ): UnifiedActivityItem[] {
    const accounts = accountsList || this.getAccounts();
    const transactions = txList || this.getTransactions();
    const debts = debtList || this.getDebts();
    const losses = lossList || this.getLosses();
    const goals = goalList || this.getGoals();
    const assets = assetList || this.getPortfolioAssets();
    const auditLogs = auditList || this.getAuditLogs();

    const items: UnifiedActivityItem[] = [];

    const formatMoney = (amount?: number, curr?: string) => {
      if (amount === undefined || amount === null) return '';
      if (curr === 'USD') return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
      return `${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
    };

    const formatSubfund = (sub?: SubFundType) => {
      if (sub === 'digital_usd') return ' ($ Digital)';
      if (sub === 'physical_usd') return ' ($ Físico)';
      if (sub === 'ves') return ' (Bs)';
      return '';
    };

    // 1. Transacciones
    for (const tx of transactions) {
      const acc = accounts.find(a => a.id === tx.accountId);
      const toAcc = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : null;
      const accName = acc?.name || 'Cuenta';
      const toAccName = toAcc?.name || 'Cuenta destino';

      let title = '';
      let impactExplanation = '';
      let badgeVariant: UnifiedActivityItem['badgeVariant'] = 'expense';

      if (tx.type === 'income') {
        badgeVariant = 'income';
        title = `Ingreso: ${tx.categoryName}`;
        impactExplanation = `Se descontarán -${formatMoney(tx.amount, tx.currency)} de ${accName}${formatSubfund(tx.subFund)} y se eliminará la transacción.`;
      } else if (tx.type === 'expense') {
        badgeVariant = 'expense';
        title = `Gasto: ${tx.categoryName}`;
        impactExplanation = `Se devolverán +${formatMoney(tx.amount, tx.currency)} a ${accName}${formatSubfund(tx.subFund)} y se eliminará la transacción.`;
      } else {
        badgeVariant = 'transfer';
        title = `Transferencia: ${accName} → ${toAccName}`;
        const incomingAmount = tx.destinationAmount !== undefined ? tx.destinationAmount : tx.amount;
        impactExplanation = `Se reintegrarán +${formatMoney(tx.amount, tx.currency)} a ${accName}${formatSubfund(tx.subFund)} y se descontarán -${formatMoney(incomingAmount, toAcc?.currency || tx.currency)} de ${toAccName}${formatSubfund(tx.toSubFund)}.`;
      }

      items.push({
        id: `activity-tx-${tx.id}`,
        entityId: tx.id,
        entityType: 'transaction',
        title,
        description: tx.note || (tx.type === 'transfer' ? 'Transferencia entre cuentas' : tx.categoryName),
        amount: tx.amount,
        currency: tx.currency,
        date: tx.date,
        createdAt: tx.createdAt || tx.date,
        accountName: accName,
        subFund: tx.subFund,
        toAccountName: tx.toAccountId ? toAccName : undefined,
        toSubFund: tx.toSubFund,
        categoryName: tx.categoryName,
        badgeVariant,
        impactExplanation,
        revertType: 'transaction'
      });
    }

    // 2. Deudas y Abonos
    for (const d of debts) {
      const isPayable = d.debtType === 'payable';
      const currencyLabel = d.currencyType === 'USD_USDT' ? 'USD' : 'VES';

      // Registro de creación de la deuda
      items.push({
        id: `activity-debt-${d.id}`,
        entityId: d.id,
        entityType: 'debt',
        title: isPayable ? `Deuda propia registrada: ${d.debtorName}` : `Cuenta por cobrar: ${d.debtorName}`,
        description: `Concepto: ${d.concept || 'Sin especificar'}${d.notes ? ` • ${d.notes}` : ''}`,
        amount: d.originalAmount,
        currency: currencyLabel,
        date: d.createdAt,
        createdAt: d.createdAt,
        statusBadge: d.status === 'paid' ? 'Pagada' : d.status === 'partially_paid' ? 'Abonada' : d.status === 'uncollectible' ? 'Incobrable' : 'Pendiente',
        badgeVariant: 'debt',
        impactExplanation: `Se eliminará la deuda de ${d.debtorName}. Si contenía abonos con impacto en saldos bancarios, se restaurarán.`,
        revertType: 'debt'
      });

      // Abonos individuales a la deuda
      if (d.payments && d.payments.length > 0) {
        for (const p of d.payments) {
          const acc = p.receivedInAccountId ? accounts.find(a => a.id === p.receivedInAccountId) : null;
          const accName = acc?.name || 'Sin cuenta asignada';

          const impactExplanation = isPayable
            ? (p.receivedInAccountId 
                ? `Se devolverán +${formatMoney(p.amount, p.currency)} a ${accName}${formatSubfund(p.receivedInSubFund)} y la deuda pendiente aumentará en +${formatMoney(p.amount, p.currency)}.` 
                : `Se cancelará el registro del pago y la deuda pendiente aumentará en +${formatMoney(p.amount, p.currency)}.`)
            : (p.receivedInAccountId 
                ? `Se descontarán -${formatMoney(p.amount, p.currency)} de ${accName}${formatSubfund(p.receivedInSubFund)} y la cuenta por cobrar volverá a quedar pendiente por +${formatMoney(p.amount, p.currency)}.` 
                : `Se cancelará el registro del abono y la cuenta por cobrar aumentará en +${formatMoney(p.amount, p.currency)}.`);

          items.push({
            id: `activity-debtpay-${d.id}-${p.id}`,
            entityId: p.id,
            parentEntityId: d.id,
            entityType: 'debt_payment',
            title: isPayable ? `Pago a: ${d.debtorName}` : `Abono de: ${d.debtorName}`,
            description: p.note || `Abono al concepto: ${d.concept}`,
            amount: p.amount,
            currency: p.currency,
            date: p.date,
            createdAt: p.date,
            accountName: p.receivedInAccountId ? accName : undefined,
            subFund: p.receivedInSubFund,
            badgeVariant: isPayable ? 'expense' : 'income',
            impactExplanation,
            revertType: 'debt_payment'
          });
        }
      }
    }

    // 3. Pérdidas y Recuperaciones
    for (const l of losses) {
      const acc = l.affectedAccountId ? accounts.find(a => a.id === l.affectedAccountId) : null;
      const accName = acc?.name || 'Sin cuenta afectada';

      const lossImpact = l.affectedAccountId 
        ? `Se reintegrarán +${formatMoney(l.amount, l.currency)} a ${accName}${formatSubfund(l.subFund)} y se eliminará la pérdida.`
        : `Se eliminará el registro de pérdida permanente de ${formatMoney(l.amount, l.currency)}.`;

      items.push({
        id: `activity-loss-${l.id}`,
        entityId: l.id,
        entityType: 'loss',
        title: `Pérdida: ${l.concept}`,
        description: `Categoría: ${l.category}${l.notes ? ` • ${l.notes}` : ''}`,
        amount: l.amount,
        currency: l.currency,
        date: l.date,
        createdAt: l.createdAt || l.date,
        accountName: l.affectedAccountId ? accName : undefined,
        subFund: l.subFund,
        statusBadge: l.status === 'recovered' ? 'Recuperada' : l.status === 'partially_recovered' ? 'Parcial' : 'Total',
        badgeVariant: 'loss',
        impactExplanation: lossImpact,
        revertType: 'loss'
      });

      // Recuperaciones individuales
      if (l.recoveries && l.recoveries.length > 0) {
        for (const r of l.recoveries) {
          const recAcc = r.receivedInAccountId ? accounts.find(a => a.id === r.receivedInAccountId) : null;
          const recAccName = recAcc?.name || 'Sin cuenta asignada';

          const recImpact = r.receivedInAccountId 
            ? `Se descontarán -${formatMoney(r.amount, r.currency)} de ${recAccName}${formatSubfund(r.receivedInSubFund)} y la pérdida aumentará de nuevo su saldo por recuperar.`
            : `Se cancelará la recuperación de ${formatMoney(r.amount, r.currency)}.`;

          items.push({
            id: `activity-lossrec-${l.id}-${r.id}`,
            entityId: r.id,
            parentEntityId: l.id,
            entityType: 'loss_recovery',
            title: `Recuperación: ${l.concept}`,
            description: r.note || 'Recuperación de fondo de pérdida',
            amount: r.amount,
            currency: r.currency,
            date: r.date,
            createdAt: r.date,
            accountName: r.receivedInAccountId ? recAccName : undefined,
            subFund: r.receivedInSubFund,
            badgeVariant: 'income',
            impactExplanation: recImpact,
            revertType: 'loss_recovery'
          });
        }
      }
    }

    // 4. Metas Financieras
    for (const g of goals) {
      items.push({
        id: `activity-goal-${g.id}`,
        entityId: g.id,
        entityType: 'goal',
        title: `Meta: ${g.name}`,
        description: `Objetivo: $${g.targetAmountUsd} USD • Ahorro actual: $${g.currentSavedUsd} USD`,
        amount: g.targetAmountUsd,
        currency: 'USD',
        date: g.createdAt,
        createdAt: g.createdAt,
        badgeVariant: 'goal',
        impactExplanation: `Se eliminará la meta financiera "${g.name}".`,
        revertType: 'goal'
      });
    }

    // 5. Activos de Portafolio
    for (const ast of assets) {
      items.push({
        id: `activity-portfolio-${ast.id}`,
        entityId: ast.id,
        entityType: 'portfolio',
        title: `Activo: ${ast.name}`,
        description: `Tipo: ${ast.type} • Valuación: $${ast.currentValuationUsd} USD`,
        amount: ast.currentValuationUsd,
        currency: 'USD',
        date: ast.updatedAt || new Date().toISOString(),
        createdAt: ast.updatedAt || new Date().toISOString(),
        badgeVariant: 'portfolio',
        impactExplanation: `Se eliminará el activo "${ast.name}" del portafolio.`,
        revertType: 'portfolio'
      });
    }

    // 6. Ajustes de cuentas registrados en Audit Log
    for (const log of auditLogs) {
      if (log.entityType === 'account_adjustment') {
        items.push({
          id: `activity-audit-${log.id}`,
          entityId: log.id,
          entityType: 'account_adjustment',
          title: log.title,
          description: log.details,
          amount: log.amount,
          currency: log.currency,
          date: log.timestamp,
          createdAt: log.timestamp,
          badgeVariant: 'account',
          impactExplanation: 'Se restaurará la configuración previa exacta de saldos de las cuentas.',
          revertType: 'account_adjustment',
          snapshotData: log.snapshotBefore,
          isReverted: log.reverted
        });
      }
    }

    // Ordenar de más reciente a más antiguo
    items.sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt).getTime();
      const timeB = new Date(b.date || b.createdAt).getTime();
      return timeB - timeA;
    });

    return items;
  }
}
