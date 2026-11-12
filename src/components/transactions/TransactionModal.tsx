import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowLeftRight, 
  Plus, 
  Calendar, 
  FileText, 
  Check, 
  Wallet,
  Coins,
  DollarSign,
  ArrowDown,
  Receipt,
  Smartphone,
  CreditCard,
  HandCoins
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TransactionType, Currency, Transaction, SubFundType, Debt, DebtCurrencyType } from '../../types';
import { RatesService } from '../../services/ratesService';
import { BankLogo } from '../common/BankLogo';

// Safe date helpers that never throw RangeError on invalid input
const safeFormatDateTime = (dateVal: string | undefined | null): string => {
  if (!dateVal) {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
};

const safeToISO = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch {}
  return new Date().toISOString();
};

export const TransactionModal: React.FC = () => {
  const { 
    isTxModalOpen, 
    setIsTxModalOpen, 
    accounts, 
    categories, 
    rates, 
    addTransaction,
    updateTransaction,
    editingTransaction,
    setEditingTransaction,
    setIsCategoryModalOpen,
    transactions,
    debts,
    saveDebt
  } = useApp();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [subFund, setSubFund] = useState<SubFundType>('ves');
  const [toSubFund, setToSubFund] = useState<SubFundType>('ves');
  const [customRate, setCustomRate] = useState<string>('');
  const [isManualCustomRate, setIsManualCustomRate] = useState<boolean>(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [categoryError, setCategoryError] = useState<boolean>(false);
  const [date, setDate] = useState<string>(() => safeFormatDateTime(new Date().toISOString()));
  const [note, setNote] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Pago Móvil en Egresos: 0,30% de cobro bancario
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'normal' | 'pago_movil'>('normal');
  const [pagoMovilCommissionPercentStr, setPagoMovilCommissionPercentStr] = useState<string>('0.30');
  const [pagoMovilCommissionCustomBs, setPagoMovilCommissionCustomBs] = useState<string>('');
  const [isManualPmBs, setIsManualPmBs] = useState<boolean>(false);

  // Asignación de Deudas en nuevo movimiento
  const [isAssigningDebt, setIsAssigningDebt] = useState<boolean>(false);
  const [debtPersonName, setDebtPersonName] = useState<string>('');
  const [debtConcept, setDebtConcept] = useState<string>('');
  const [debtCurrencyType, setDebtCurrencyType] = useState<DebtCurrencyType>('VES_BCV');
  const [debtDeductFromAccount, setDebtDeductFromAccount] = useState<boolean>(true);

  // Transfer commission state (0.30% • Min Bs. 14.00)
  const [applyCommission, setApplyCommission] = useState<boolean>(true);
  const [commissionAmountStr, setCommissionAmountStr] = useState<string>('14.00');
  const [isManualCommission, setIsManualCommission] = useState<boolean>(false);

  // Binance transfer commissions state (Bank: 2.45% or 1.5%, Binance: 4.1% fixed)
  const [bankCommissionPercentStr, setBankCommissionPercentStr] = useState<string>('2.45');
  const [isManualBankPercent, setIsManualBankPercent] = useState<boolean>(false);
  const [applyBinanceTransferCommissions, setApplyBinanceTransferCommissions] = useState<boolean>(true);

  // Bank FX Purchase (Bs -> USD / Dólares Electrónicos): 0.5% standard commission
  const [fxCommissionPercentStr, setFxCommissionPercentStr] = useState<string>('0.5');
  const [isManualFxPercent, setIsManualFxPercent] = useState<boolean>(false);
  const [fxCommissionCustomBs, setFxCommissionCustomBs] = useState<string>('');
  const [isManualFxBs, setIsManualFxBs] = useState<boolean>(false);
  const [applyFxCommission, setApplyFxCommission] = useState<boolean>(true);
  const [isManualFxRate, setIsManualFxRate] = useState<boolean>(false);

  // Tasas de referencia según la fecha seleccionada (BCV y USDT del día o históricas)
  const dateRates = useMemo(() => {
    return RatesService.getRatesForDate(date, transactions, debts);
  }, [date, transactions, debts]);

  // Filter categories by movement type (memoized to avoid new array reference on every render):
  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      if (type === 'expense') return c.type === 'expense' || c.type === 'both';
      if (type === 'income') return c.type === 'income' || c.type === 'both';
      return true;
    });
  }, [categories, type]);

  // Handle type change: deja en blanco la categoría para que el usuario la seleccione obligatoriamente
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategoryId('');
    setCategoryError(false);
  };

  // Unified effect: Synchronize modal fields when opened, either loading editing data or resetting for a new transaction
  useEffect(() => {
    if (!isTxModalOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(editingTransaction.amount !== undefined && editingTransaction.amount !== null ? editingTransaction.amount.toString() : '');
      setCurrency(editingTransaction.currency || 'USD');
      setAccountId(editingTransaction.accountId || (accounts[0]?.id || ''));
      setToAccountId(editingTransaction.toAccountId || '');
      setSubFund(editingTransaction.subFund || 'ves');
      setToSubFund(editingTransaction.toSubFund || 'ves');
      setCustomRate(
        editingTransaction.appliedRate 
          ? editingTransaction.appliedRate.toString() 
          : (rates?.usdt ? rates.usdt.toString() : '0')
      );
      setIsManualCustomRate(true);
      setCategoryId(editingTransaction.categoryId || '');
      setCategoryError(false);
      setDate(safeFormatDateTime(editingTransaction.date));
      setNote(editingTransaction.note || '');
      setApplyCommission(false); // Do not double-apply commission when editing an existing transaction
      setIsManualCommission(false);
      setExpensePaymentMethod('normal');
      setIsAssigningDebt(false);
      setDebtPersonName('');
      setDebtConcept('');
    } else {
      setType('expense');
      setAmountStr('');
      setNote('');
      const firstAcc = accounts[0];
      setAccountId(firstAcc?.id || '');
      setCurrency(firstAcc?.currency || 'VES');
      setSubFund('ves');
      setToAccountId('');
      setToSubFund('ves');
      
      // Categoría vacía por defecto para obligar al usuario a elegir una
      setCategoryId('');
      setCategoryError(false);
      
      setExpensePaymentMethod('normal');
      setPagoMovilCommissionPercentStr('0.30');
      setIsManualPmBs(false);
      setPagoMovilCommissionCustomBs('');

      setIsAssigningDebt(false);
      setDebtPersonName('');
      setDebtConcept('');
      setDebtCurrencyType('VES_BCV');
      setDebtDeductFromAccount(true);

      setIsManualCustomRate(false);
      setCustomRate(rates?.usdt ? rates.usdt.toString() : '0');
      setDate(safeFormatDateTime(new Date().toISOString()));
      setApplyCommission(true);
      setIsManualCommission(false);
    }
  }, [isTxModalOpen, editingTransaction]);

  // Actualizar tasa automática según la fecha seleccionada si no está en modo manual
  useEffect(() => {
    if (!isManualCustomRate && dateRates) {
      setCustomRate(dateRates.usdt.toString());
    }
  }, [dateRates, isManualCustomRate]);

  // When accountId changes, auto-set currency to that account's native currency
  const handleAccountChange = (id: string) => {
    setAccountId(id);
    const selectedAcc = accounts.find(a => a.id === id);
    if (selectedAcc) {
      setSubFund('ves');
      setCurrency(selectedAcc.currency);
    }
  };

  const handleSubFundChange = (newSub: SubFundType) => {
    setSubFund(newSub);
    if (newSub === 'digital_usd' || newSub === 'physical_usd') {
      setCurrency('USD');
    } else {
      setCurrency('VES');
    }
  };

  const currentAmount = parseFloat(amountStr) || 0;
  const sourceAccount = accounts.find(a => a.id === accountId);
  const destAccount = accounts.find(a => a.id === toAccountId);

  // Effective currency for origin and destination
  const sourceEffectiveCurrency: Currency = (sourceAccount?.type === 'bank_ves' && subFund !== 'ves') 
    ? 'USD' 
    : (sourceAccount?.currency || currency);
  
  const destEffectiveCurrency: Currency = (destAccount?.type === 'bank_ves' && toSubFund !== 'ves') 
    ? 'USD' 
    : (destAccount?.currency || 'USD');

  // Calculate dual conversion previews
  const previewUsdBcv = currency === 'VES' 
    ? (rates.bcv > 0 ? (currentAmount / rates.bcv).toFixed(2) : '0.00')
    : currentAmount.toFixed(2);

  const previewUsdUsdt = currency === 'VES' 
    ? (rates.usdt > 0 ? (currentAmount / rates.usdt).toFixed(2) : '0.00')
    : currentAmount.toFixed(2);

  const previewVesBcv = currency === 'USD' 
    ? (currentAmount * rates.bcv).toFixed(2) 
    : currentAmount.toFixed(2);

  const previewVesUsdt = currency === 'USD' 
    ? (currentAmount * rates.usdt).toFixed(2) 
    : currentAmount.toFixed(2);

  // Check if transfer is from electronic USD in supported bank to Binance
  const sourceName = (sourceAccount?.name || '').toLowerCase();
  const isVenezuela = sourceName.includes('venezuela');
  const isTesoro = sourceName.includes('tesoro');
  const isBnc = sourceName.includes('bnc') || sourceName.includes('nacional de crédito') || sourceName.includes('nacional de credito');
  const isMercantil = sourceName.includes('mercantil');
  const isProvincial = sourceName.includes('provincial') || sourceName.includes('bbva');
  const isSupportedBank = isVenezuela || isTesoro || isBnc || isMercantil || isProvincial;

  const isDestBinance = (destAccount?.name || '').toLowerCase().includes('binance') || destAccount?.type === 'wallet_crypto';

  // Transfer is from electronic USD (digital_usd) in a supported bank to Binance
  const isBankToBinanceTransfer = type === 'transfer' &&
    isSupportedBank &&
    (subFund === 'digital_usd' || (sourceAccount?.currency === 'USD' && subFund !== 'ves' && subFund !== 'physical_usd')) &&
    isDestBinance;

  // Binance P2P Transfer: Transfer from Binance ($ / USDT) to a bank in Bolívares (VES)
  const isSourceBinance = (sourceAccount?.name || '').toLowerCase().includes('binance') || sourceAccount?.type === 'wallet_crypto';
  const isDestBankInBs = Boolean(destAccount && ((destAccount.type === 'bank_ves' && toSubFund === 'ves') || destAccount.currency === 'VES'));
  const isBinanceToBankP2P = type === 'transfer' && isSourceBinance && isDestBankInBs;

  // Trigger for Bank Currency Exchange: Bolívares (VES) -> Dollars / Electronic Dollars (USD)
  const isVesToUsdBankExchange = type === 'transfer' &&
    sourceEffectiveCurrency === 'VES' &&
    destEffectiveCurrency === 'USD' &&
    !isBankToBinanceTransfer &&
    !isBinanceToBankP2P;

  // Auto-set BCV rate for Bank Currency Purchases
  useEffect(() => {
    if (isVesToUsdBankExchange && !isManualFxRate) {
      if (rates.bcv) {
        setCustomRate(rates.bcv.toString());
      }
    }
  }, [isVesToUsdBankExchange, isManualFxRate, rates.bcv]);

  // Auto-switch toSubFund when source and dest are the same bank account
  useEffect(() => {
    if (type === 'transfer' && toAccountId === accountId && destAccount?.type === 'bank_ves') {
      if (subFund === toSubFund) {
        if (subFund === 'ves') {
          setToSubFund('digital_usd');
        } else {
          setToSubFund('ves');
        }
      }
    }
  }, [type, toAccountId, accountId, subFund, toSubFund, destAccount]);

  // Auto-set currency to USD and default P2P rate when transferring Binance -> Bank (Bs)
  useEffect(() => {
    if (isBinanceToBankP2P) {
      if (currency !== 'USD') {
        setCurrency('USD');
      }
      if (!customRate || customRate === '0') {
        setCustomRate(rates.usdt ? rates.usdt.toString() : (rates.bcv ? rates.bcv.toString() : ''));
      }
      if (toSubFund !== 'ves') {
        setToSubFund('ves');
      }
    }
  }, [isBinanceToBankP2P, currency, customRate, toSubFund, rates]);

  // Auto-set default bank commission percent when bank changes (Provincial: 1.5%, others: 2.45%)
  useEffect(() => {
    if (!isManualBankPercent && isBankToBinanceTransfer) {
      if (isProvincial) {
        setBankCommissionPercentStr('1.5');
      } else {
        setBankCommissionPercentStr('2.45');
      }
    }
  }, [isBankToBinanceTransfer, isProvincial, isManualBankPercent]);

  // Commission calculations for Bank -> Binance USD transfers
  const bankCommPercent = parseFloat(bankCommissionPercentStr) || 0;
  const binanceCommPercent = 4.1; // 4.1% fijo de Binance por el depósito

  const bankCommissionUsd = Number(((currentAmount * bankCommPercent) / 100).toFixed(2));
  const binanceCommissionUsd = Number(((currentAmount * binanceCommPercent) / 100).toFixed(2));
  const totalCommissionsUsd = Number((bankCommissionUsd + binanceCommissionUsd).toFixed(2));

  // Amount arriving at Binance after Binance's 4.1% deposit fee
  const netDestAmountToBinance = Math.max(0, Number((currentAmount - binanceCommissionUsd).toFixed(2)));

  // Cross-currency transfer destination amount calculation
  const effectiveRate = parseFloat(customRate) || (isVesToUsdBankExchange ? (rates.bcv || rates.usdt || 1) : (rates.usdt || rates.bcv || 1));

  // Base calculations for VES -> USD FX Exchange
  let fxBaseVesAmount = 0;
  let fxBaseUsdAmount = 0;
  if (isVesToUsdBankExchange) {
    if (currency === 'USD') {
      fxBaseUsdAmount = currentAmount;
      fxBaseVesAmount = Number((currentAmount * effectiveRate).toFixed(2));
    } else {
      fxBaseVesAmount = currentAmount;
      fxBaseUsdAmount = effectiveRate > 0 ? Number((currentAmount / effectiveRate).toFixed(2)) : 0;
    }
  }

  const fxCommPercent = parseFloat(fxCommissionPercentStr) || 0;
  const autoFxCommissionBs = Number(((fxBaseVesAmount * fxCommPercent) / 100).toFixed(2));
  const fxCommissionBs = isManualFxBs ? (parseFloat(fxCommissionCustomBs) || 0) : autoFxCommissionBs;
  const totalVesDebited = applyFxCommission ? Number((fxBaseVesAmount + fxCommissionBs).toFixed(2)) : fxBaseVesAmount;

  let calculatedDestAmount = currentAmount;

  if (type === 'transfer' && sourceAccount && destAccount) {
    if (isBankToBinanceTransfer && applyBinanceTransferCommissions) {
      calculatedDestAmount = netDestAmountToBinance;
    } else if (isBinanceToBankP2P) {
      calculatedDestAmount = Number((currentAmount * effectiveRate).toFixed(2));
    } else if (isVesToUsdBankExchange) {
      calculatedDestAmount = fxBaseUsdAmount;
    } else if (sourceEffectiveCurrency === 'USD' && destEffectiveCurrency === 'VES') {
      calculatedDestAmount = Number((currentAmount * effectiveRate).toFixed(2));
    } else if (sourceEffectiveCurrency === 'VES' && destEffectiveCurrency === 'USD') {
      calculatedDestAmount = effectiveRate > 0 ? Number((currentAmount / effectiveRate).toFixed(2)) : 0;
    } else {
      calculatedDestAmount = currentAmount;
    }
  }

  // Calculate if the transfer is eligible for VES bank / Pago Móvil commission
  const isVesTransfer = type === 'transfer' && !isBankToBinanceTransfer && !isBinanceToBankP2P && !isVesToUsdBankExchange && (
    currency === 'VES' || 
    sourceAccount?.currency === 'VES' || 
    (sourceAccount?.type === 'bank_ves' && subFund === 'ves')
  );

  // Amount in VES for commission base
  const effectiveVesAmount = currency === 'VES' 
    ? currentAmount 
    : (currentAmount * (rates.usdt || rates.bcv || 1));

  // Automatic commission: 0.30% with minimum of Bs. 14.00
  // Formula: Math.max(14.00, Number((effectiveVesAmount * 0.003).toFixed(2)))
  const defaultCommission = effectiveVesAmount > 0
    ? Math.max(14.00, Number((effectiveVesAmount * 0.003).toFixed(2)))
    : 14.00;

  useEffect(() => {
    if (!isManualCommission && isVesTransfer) {
      setCommissionAmountStr(defaultCommission.toFixed(2));
    }
  }, [defaultCommission, isManualCommission, isVesTransfer]);

  // Pago Móvil para egresos en Bolívares
  const isVesExpense = type === 'expense' && (
    currency === 'VES' || 
    sourceAccount?.currency === 'VES' || 
    (sourceAccount?.type === 'bank_ves' && subFund === 'ves')
  );

  const pmPercent = parseFloat(pagoMovilCommissionPercentStr) || 0.30;
  const autoPmCommissionBs = Number(((currentAmount * pmPercent) / 100).toFixed(2));
  const pmCommissionBs = isManualPmBs ? (parseFloat(pagoMovilCommissionCustomBs) || 0) : autoPmCommissionBs;
  const totalExpenseWithPm = expensePaymentMethod === 'pago_movil' ? Number((currentAmount + pmCommissionBs).toFixed(2)) : currentAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAmount <= 0 || !accountId) return;

    if (type !== 'transfer' && !categoryId && !isAssigningDebt) {
      setCategoryError(true);
      alert('Por favor selecciona una categoría obligatoriamente para este movimiento.');
      return;
    }

    if (isAssigningDebt) {
      if (!debtPersonName.trim()) {
        alert('Por favor ingresa el nombre de la persona para la deuda / préstamo.');
        return;
      }
      if (!debtConcept.trim()) {
        alert('Por favor ingresa el concepto de la deuda / préstamo.');
        return;
      }

      const appliedRateForDebt = debtCurrencyType === 'VES_BCV' ? dateRates.bcv : dateRates.usdt;
      const peggedUsdAmount = debtCurrencyType === 'USD_USDT'
        ? currentAmount
        : (appliedRateForDebt > 0 ? Number((currentAmount / appliedRateForDebt).toFixed(4)) : currentAmount);

      const debtDirection = type === 'expense' ? 'receivable' : 'payable';

      const newDebt: Debt = {
        id: `debt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        debtorName: debtPersonName.trim(),
        concept: debtConcept.trim(),
        originalAmount: currentAmount,
        currencyType: debtCurrencyType,
        appliedRateAtCreation: appliedRateForDebt,
        peggedUsdAmount: peggedUsdAmount,
        remainingAmount: currentAmount,
        status: 'pending',
        debtType: debtDirection,
        notes: note.trim() || undefined,
        createdAt: safeToISO(date),
        updatedAt: safeToISO(date),
        payments: []
      };
      saveDebt(newDebt);

      if (!debtDeductFromAccount) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setIsTxModalOpen(false);
        }, 300);
        return;
      }
    }

    const isSameAccountSubFundTransfer = type === 'transfer' && accountId === toAccountId && subFund !== toSubFund;
    if (type === 'transfer' && (!toAccountId || (toAccountId === accountId && !isSameAccountSubFundTransfer))) {
      alert('Selecciona una cuenta o fondo de destino diferente al de origen.');
      return;
    }

    const selectedCategory = categories.find(c => c.id === categoryId);

    const finalTxAmount = isVesToUsdBankExchange ? fxBaseVesAmount : currentAmount;
    const finalTxCurrency = isVesToUsdBankExchange ? 'VES' : (isBinanceToBankP2P ? 'USD' : currency);
    const finalDestAmount = isVesToUsdBankExchange ? fxBaseUsdAmount : calculatedDestAmount;
    const finalCategoryId = selectedCategory?.id || (
      isAssigningDebt ? 'cat-prestamos' : isBinanceToBankP2P ? 'cat-p2p' : isVesToUsdBankExchange ? 'cat-cambio-divisas' : 'cat-general'
    );
    const finalCategoryName = isAssigningDebt
      ? (type === 'expense' ? `Préstamo a ${debtPersonName.trim()}` : `Préstamo de ${debtPersonName.trim()}`)
      : isBinanceToBankP2P 
      ? 'Cambio P2P (Binance)' 
      : isVesToUsdBankExchange
      ? 'Compra de Divisas (BCV)'
      : (selectedCategory?.name || (type === 'transfer' ? 'Transferencia / Cambio' : 'General'));
    const finalCategoryIcon = selectedCategory?.icon || (isAssigningDebt ? 'HandCoins' : isBinanceToBankP2P || isVesToUsdBankExchange ? 'ArrowLeftRight' : undefined);
    const finalCategoryColor = selectedCategory?.color || (isAssigningDebt ? '#6366F1' : isBinanceToBankP2P ? '#F59E0B' : isVesToUsdBankExchange ? '#3B82F6' : undefined);
    const finalNote = note.trim() || (
      isAssigningDebt
        ? `Préstamo: ${debtConcept.trim()}`
        : isBinanceToBankP2P 
        ? `Venta P2P Binance: $${currentAmount} USD @ ${effectiveRate} Bs/$ hacia ${destAccount?.name}` 
        : isVesToUsdBankExchange
        ? `Compra de divisas BCV: $${fxBaseUsdAmount.toFixed(2)} USD @ ${effectiveRate} Bs/$ hacia ${destAccount?.name}${toSubFund === 'digital_usd' ? ' ($ Digitales)' : toSubFund === 'physical_usd' ? ' ($ Físicos)' : ''}`
        : undefined
    );

    if (editingTransaction) {
      const updatedTx: Transaction = {
        ...editingTransaction,
        type,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        subFund: (sourceAccount?.type === 'bank_ves') ? subFund : undefined,
        toSubFund: (destAccount?.type === 'bank_ves' && type === 'transfer') ? toSubFund : undefined,
        amount: finalTxAmount,
        currency: finalTxCurrency,
        appliedRate: type === 'transfer' ? effectiveRate : undefined,
        destinationAmount: type === 'transfer' ? finalDestAmount : undefined,
        categoryId: finalCategoryId,
        categoryName: finalCategoryName,
        categoryIcon: finalCategoryIcon,
        categoryColor: finalCategoryColor,
        date: safeToISO(date),
        note: finalNote,
        updatedAt: new Date().toISOString()
      };
      updateTransaction(updatedTx);
    } else {
      const newTx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        subFund: (sourceAccount?.type === 'bank_ves') ? subFund : undefined,
        toSubFund: (destAccount?.type === 'bank_ves' && type === 'transfer') ? toSubFund : undefined,
        amount: finalTxAmount,
        currency: finalTxCurrency,
        appliedRate: type === 'transfer' ? effectiveRate : undefined,
        destinationAmount: type === 'transfer' ? finalDestAmount : undefined,
        categoryId: finalCategoryId,
        categoryName: finalCategoryName,
        categoryIcon: finalCategoryIcon,
        categoryColor: finalCategoryColor,
        date: safeToISO(date),
        note: finalNote,
        createdAt: new Date().toISOString()
      };
      addTransaction(newTx);

      // Si es una compra de divisas bancaria (Bs -> USD) y está activa la comisión del 0,5%
      if (type === 'transfer' && applyFxCommission && isVesToUsdBankExchange && !editingTransaction) {
        if (fxCommissionBs > 0) {
          const commissionCat = categories.find(c => 
            c.id === 'cat-comisiones' || 
            c.name.toLowerCase().includes('comision') ||
            c.name.toLowerCase().includes('comisión')
          );

          const fxCommissionTx: Transaction = {
            id: `tx-${Date.now() + 12}-${Math.random().toString(36).substring(2, 7)}`,
            type: 'expense',
            accountId,
            subFund: (sourceAccount?.type === 'bank_ves') ? 'ves' : undefined,
            amount: fxCommissionBs,
            currency: 'VES',
            categoryId: commissionCat?.id || 'cat-comisiones',
            categoryName: commissionCat?.name || 'Comisiones Bancarias',
            categoryIcon: commissionCat?.icon || 'Receipt',
            categoryColor: commissionCat?.color || '#F59E0B',
            date: safeToISO(date),
            note: `Comisión bancaria (${fxCommissionPercentStr}%) por compra de divisas BCV (${destAccount?.name || 'Dólares'})${note.trim() ? ` - ${note.trim()}` : ''}`,
            createdAt: new Date(Date.now() + 12).toISOString()
          };
          addTransaction(fxCommissionTx);
        }
      }

      // Si es una transferencia en Bs y está activa la comisión bancaria / pago móvil
      if (type === 'transfer' && applyCommission && isVesTransfer) {
        const commissionVal = parseFloat(commissionAmountStr) || 0;
        if (commissionVal > 0) {
          const commissionCat = categories.find(c => 
            c.id === 'cat-comisiones' || 
            c.name.toLowerCase().includes('comision') ||
            c.name.toLowerCase().includes('comisión')
          );

          const commissionTx: Transaction = {
            id: `tx-${Date.now() + 10}-${Math.random().toString(36).substring(2, 7)}`,
            type: 'expense',
            accountId,
            subFund: (sourceAccount?.type === 'bank_ves') ? 'ves' : undefined,
            amount: commissionVal,
            currency: 'VES',
            categoryId: commissionCat?.id || 'cat-comisiones',
            categoryName: commissionCat?.name || 'Comisiones Bancarias',
            categoryIcon: commissionCat?.icon || 'Receipt',
            categoryColor: commissionCat?.color || '#F59E0B',
            date: safeToISO(date),
            note: `Comisión transferencia / Pago móvil (0,30% • Mín. Bs. 14,00)${note.trim() ? ` - ${note.trim()}` : ` - Transferencia a ${destAccount?.name || 'terceros'}`}`,
            createdAt: new Date(Date.now() + 10).toISOString()
          };
          addTransaction(commissionTx);
        }
      }

      // Si es una transferencia de dólares electrónicos a Binance y están activas las comisiones
      if (type === 'transfer' && applyBinanceTransferCommissions && isBankToBinanceTransfer && !editingTransaction) {
        if (bankCommissionUsd > 0) {
          const commissionCat = categories.find(c => 
            c.id === 'cat-custom-1793806188173' ||
            c.id === 'cat-comisiones' || 
            c.name.toLowerCase().includes('comision') ||
            c.name.toLowerCase().includes('comisión')
          );

          const bankCommissionTx: Transaction = {
            id: `tx-${Date.now() + 15}-${Math.random().toString(36).substring(2, 7)}`,
            type: 'expense',
            accountId,
            subFund: 'digital_usd',
            amount: bankCommissionUsd,
            currency: 'USD',
            categoryId: commissionCat?.id || 'cat-custom-1793806188173',
            categoryName: commissionCat?.name || 'Comision Banco',
            categoryIcon: commissionCat?.icon || 'Receipt',
            categoryColor: commissionCat?.color || '#ffffff',
            date: safeToISO(date),
            note: `Comisión bancaria (${bankCommissionPercentStr}%) por transferencia a Binance (${destAccount?.name || 'Binance'})${note.trim() ? ` - ${note.trim()}` : ''}`,
            createdAt: new Date(Date.now() + 15).toISOString()
          };
          addTransaction(bankCommissionTx);
        }
      }

      // Si es un egreso por Pago Móvil en Bolívares y genera comisión del 0,30%
      if (type === 'expense' && expensePaymentMethod === 'pago_movil' && pmCommissionBs > 0 && !editingTransaction) {
        const commissionCat = categories.find(c => 
          c.id === 'cat-comisiones' || 
          c.name.toLowerCase().includes('comision') ||
          c.name.toLowerCase().includes('comisión')
        );

        const pmCommissionTx: Transaction = {
          id: `tx-${Date.now() + 18}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'expense',
          accountId,
          subFund: (sourceAccount?.type === 'bank_ves') ? 'ves' : undefined,
          amount: pmCommissionBs,
          currency: 'VES',
          categoryId: commissionCat?.id || 'cat-comisiones',
          categoryName: commissionCat?.name || 'Comisiones Bancarias',
          categoryIcon: commissionCat?.icon || 'Percent',
          categoryColor: commissionCat?.color || '#F59E0B',
          date: safeToISO(date),
          note: `Comisión bancaria Pago Móvil (${pmPercent}%) - ${finalCategoryName}${note.trim() ? ` (${note.trim()})` : ''}`,
          createdAt: new Date(Date.now() + 18).toISOString()
        };
        addTransaction(pmCommissionTx);
      }
    }

    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      setAmountStr('');
      setNote('');
      setIsManualCommission(false);
      setIsManualBankPercent(false);
      setIsManualFxRate(false);
      setIsManualFxPercent(false);
      setIsManualFxBs(false);
      setFxCommissionPercentStr('0.5');
      setFxCommissionCustomBs('');
      setEditingTransaction(null);
      setIsTxModalOpen(false);
    }, 500);
  };

  if (!isTxModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingTransaction ? 'Editar Movimiento' : 'Nuevo Movimiento'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {editingTransaction ? 'Modifica los datos del movimiento seleccionado' : 'Registra ingresos, gastos o cambios de divisas'}
            </p>
          </div>
          <button 
            onClick={() => {
              setEditingTransaction(null);
              setIsTxModalOpen(false);
            }}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Movement Type Toggle */}
        <div className="grid grid-cols-3 gap-1.5 p-1 mt-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Egreso</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Ingreso</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('transfer')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              type === 'transfer'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Cambio / Transf.</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Amount & Currency input with Dual Previews */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Monto
              </label>
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    currency === 'USD' 
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('VES')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    currency === 'VES' 
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Bs VES
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full text-2xl font-black px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                required
                autoFocus
              />
              <span className="absolute right-4 top-3 text-sm font-black text-slate-600 dark:text-slate-400">
                {currency === 'USD' ? '$' : 'Bs'}
              </span>
            </div>

            {/* Instant Dual Preview */}
            {currentAmount > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 block">Tasa BCV ({rates.bcv} Bs):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {currency === 'USD' ? `${previewVesBcv} Bs` : `$${previewUsdBcv} USD`}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 block">Tasa USDT ({rates.usdt} Bs):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    {currency === 'USD' ? `${previewVesUsdt} Bs` : `$${previewUsdUsdt} USD`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Accounts Selection */}
          {type !== 'transfer' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Cuenta
              </label>
              <div className="flex items-center gap-2">
                {sourceAccount && <BankLogo name={sourceAccount.name} size="md" />}
                <select
                  value={accountId}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency} • Saldo: {RatesService.formatMoney(acc.currentBalance, acc.currency)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-fondo selector if bank */}
              {sourceAccount?.type === 'bank_ves' && (
                <div className="mt-2 p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Fondo a debitar/acreditar:
                  </label>
                  <select
                    value={subFund}
                    onChange={(e) => handleSubFundChange(e.target.value as SubFundType)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700"
                  >
                    <option value="ves">🏦 Cuenta Bolívares (VES)</option>
                    <option value="digital_usd">💻 Cuenta $ Digitales (${sourceAccount.digitalUsdBalance || 0} USD)</option>
                    <option value="physical_usd">💵 $ Físicos (${sourceAccount.physicalUsdBalance || 0} USD)</option>
                  </select>
                </div>
              )}

              {/* Opción Pago Móvil vs Consumo Normal para Egresos en Bs */}
              {isVesExpense && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      Modalidad del Egreso
                    </label>
                    <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                      Pago Móvil añade el 0,30% bancario
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-500/20">
                    <button
                      type="button"
                      onClick={() => setExpensePaymentMethod('normal')}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        expensePaymentMethod === 'normal'
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Consumo Normal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpensePaymentMethod('pago_movil')}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        expensePaymentMethod === 'pago_movil'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Pago Móvil (0,30%)</span>
                    </button>
                  </div>

                  {expensePaymentMethod === 'pago_movil' && (
                    <div className="pt-2 border-t border-amber-500/20 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300">Comisión bancaria:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={pagoMovilCommissionPercentStr}
                            onChange={(e) => setPagoMovilCommissionPercentStr(e.target.value)}
                            className="w-14 px-1.5 py-0.5 text-center text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-amber-500/30 text-amber-900 dark:text-amber-200"
                          />
                          <span className="font-bold text-amber-700 dark:text-amber-400">%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                        <span>Monto comisión ({pmPercent}%):</span>
                        <span className="font-bold">+{RatesService.formatMoney(pmCommissionBs, 'VES')}</span>
                      </div>

                      <div className="flex items-center justify-between font-black text-xs pt-1 border-t border-amber-500/20 text-slate-900 dark:text-white">
                        <span>Total debitado de {sourceAccount?.name}:</span>
                        <span className="text-rose-600 dark:text-rose-400">
                          {RatesService.formatMoney(totalExpenseWithPm, 'VES')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card: Asignar a Deudas / Préstamos */}
              <div className="mt-3 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HandCoins className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        ¿Asignar a Deudas & Cobros?
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {type === 'expense' 
                          ? 'Préstamo otorgado a otra persona (deuda a cobrar)' 
                          : 'Dinero prestado recibido (deuda por pagar)'}
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isAssigningDebt}
                      onChange={(e) => setIsAssigningDebt(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {isAssigningDebt && (
                  <div className="space-y-2.5 pt-2 border-t border-indigo-200 dark:border-indigo-800/60 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                          {type === 'expense' ? 'Persona que te debe (Deudor) *' : 'Persona a quien le debes (Acreedor) *'}
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Carlos Mendoza, Hermana..."
                          value={debtPersonName}
                          onChange={(e) => setDebtPersonName(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required={isAssigningDebt}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                          Concepto del Préstamo *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Para repuesto de moto, Emergencia médica..."
                          value={debtConcept}
                          onChange={(e) => setDebtConcept(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required={isAssigningDebt}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                          Modalidad de la Deuda
                        </label>
                        <select
                          value={debtCurrencyType}
                          onChange={(e) => setDebtCurrencyType(e.target.value as DebtCurrencyType)}
                          className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="VES_BCV">Bs fijados a Tasa BCV (Anti-devaluación)</option>
                          <option value="USD_USDT">Dólares Fijos ($ USD / USDT)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-3 sm:pt-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={debtDeductFromAccount}
                            onChange={(e) => setDebtDeductFromAccount(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span>
                            {type === 'expense' 
                              ? `Descontar saldo de ${sourceAccount?.name || 'la cuenta'}`
                              : `Acreditar saldo a ${sourceAccount?.name || 'la cuenta'}`}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* CUENTA ORIGEN (Arriba) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Cuenta Origen (Debitar)</span>
                  </label>
                  {sourceAccount && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Saldo: {RatesService.formatMoney(sourceAccount.currentBalance, sourceAccount.currency)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {sourceAccount && <BankLogo name={sourceAccount.name} size="md" />}
                  <select
                    value={accountId}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency} • Saldo: {RatesService.formatMoney(acc.currentBalance, acc.currency)})
                      </option>
                    ))}
                  </select>
                </div>

                {sourceAccount?.type === 'bank_ves' && (
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/60">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Fondo a debitar en origen:
                    </label>
                    <select
                      value={subFund}
                      onChange={(e) => handleSubFundChange(e.target.value as SubFundType)}
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700"
                    >
                      <option value="ves">🏦 Cuenta Bolívares (VES)</option>
                      <option value="digital_usd">💻 Cuenta $ Digitales (${sourceAccount.digitalUsdBalance || 0} USD)</option>
                      <option value="physical_usd">💵 $ Físicos (${sourceAccount.physicalUsdBalance || 0} USD)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Flecha visual indicando flujo hacia abajo */}
              <div className="flex items-center justify-center -my-1 relative z-10">
                <div className="p-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 dark:text-blue-400 shadow-sm">
                  <ArrowDown className="w-4 h-4" />
                </div>
              </div>

              {/* CUENTA DESTINO (Abajo) */}
              <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Cuenta Destino (Acreditar)</span>
                  </label>
                  {destAccount && (
                    <span className="text-[11px] font-semibold text-blue-600/80 dark:text-blue-400/80">
                      Saldo: {RatesService.formatMoney(destAccount.currentBalance, destAccount.currency)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {destAccount && <BankLogo name={destAccount.name} size="md" />}
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs border border-blue-200 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar cuenta destino...</option>
                    {accounts.filter(a => a.id !== accountId || a.type === 'bank_ves').map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.id === accountId ? '(Mismo Banco • Cambio entre fondos)' : `(${acc.currency} • Saldo: ${RatesService.formatMoney(acc.currentBalance, acc.currency)})`}
                      </option>
                    ))}
                  </select>
                </div>

                {destAccount?.type === 'bank_ves' && (
                  <div className="mt-2.5 p-2 rounded-xl bg-blue-100/60 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/60">
                    <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-1">
                      Fondo de acreditación en destino:
                    </label>
                    <select
                      value={toSubFund}
                      onChange={(e) => setToSubFund(e.target.value as SubFundType)}
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold border border-blue-200 dark:border-blue-700"
                    >
                      {toAccountId !== accountId || subFund !== 'ves' ? (
                        <option value="ves">🏦 Cuenta Bolívares (VES)</option>
                      ) : null}
                      {toAccountId !== accountId || subFund !== 'digital_usd' ? (
                        <option value="digital_usd">💻 Cuenta $ Digitales (${destAccount.digitalUsdBalance || 0} USD)</option>
                      ) : null}
                      {toAccountId !== accountId || subFund !== 'physical_usd' ? (
                        <option value="physical_usd">💵 $ Físicos (${destAccount.physicalUsdBalance || 0} USD)</option>
                      ) : null}
                    </select>
                  </div>
                )}
              </div>

              {/* Comisión de Transferencia Bancaria o Pago Móvil (0,30% • Mín. Bs. 14,00) */}
              {isVesTransfer && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                          Comisión Transferencia / Pago Móvil
                        </span>
                        <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                          0,30% • Mínimo Bs. 14,00 (se creará como un egreso bancario)
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={applyCommission}
                        onChange={(e) => setApplyCommission(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {applyCommission && (
                    <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-xs">
                      <div>
                        <span className="text-slate-700 dark:text-slate-300 font-medium block">
                          Monto comisión a debitar:
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {effectiveVesAmount <= 4667 
                            ? 'Mínimo fijo de Bs. 14,00 para montos ≤ Bs. 4.667' 
                            : '0,30% calculado sobre el monto de la operación'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={commissionAmountStr}
                          onChange={(e) => {
                            setCommissionAmountStr(e.target.value);
                            setIsManualCommission(true);
                          }}
                          className="w-24 px-2.5 py-1 text-right font-black text-xs rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="font-bold text-xs text-amber-600 dark:text-amber-400">Bs</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Card Especial de Transferencia Dólares Digitales -> Binance */}
          {isBankToBinanceTransfer && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 space-y-3.5 shadow-sm animate-in fade-in">
              
              {/* Header con switch */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Comisiones Dólares Banco &rarr; Binance
                    </h4>
                    <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 block">
                      {isProvincial 
                        ? 'Provincial (1,50% editable) • Binance (4,10% fijo depósito)' 
                        : `${sourceAccount?.name || 'Banco'} (2,45% editable) • Binance (4,10% fijo depósito)`}
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={applyBinanceTransferCommissions}
                    onChange={(e) => setApplyBinanceTransferCommissions(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {applyBinanceTransferCommissions && (
                <div className="space-y-3 pt-2 border-t border-amber-500/20 text-xs">
                  
                  {/* Comisión 1: Banco (2.45% o 1.5% editable) */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Comisión {sourceAccount?.name || 'Banco'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Debitado del banco en $ Digitales
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="100"
                          value={bankCommissionPercentStr}
                          onChange={(e) => {
                            setBankCommissionPercentStr(e.target.value);
                            setIsManualBankPercent(true);
                          }}
                          className="w-12 text-right font-black text-xs bg-transparent text-amber-700 dark:text-amber-300 focus:outline-none"
                        />
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">%</span>
                      </div>
                      <span className="font-black text-xs text-rose-600 dark:text-rose-400 min-w-[65px] text-right">
                        -${bankCommissionUsd.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* Comisión 2: Binance (4.1% fijo por depósito) */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Comisión Depósito Binance
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Descontado por Binance al acreditar
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-extrabold text-[11px] border border-amber-500/20">
                        4,10% fijo
                      </span>
                      <span className="font-black text-xs text-rose-600 dark:text-rose-400 min-w-[65px] text-right">
                        -${binanceCommissionUsd.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* Resumen de Montos Finales */}
                  <div className="p-2.5 rounded-xl bg-amber-500/10 space-y-1.5 text-xs font-semibold">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>Monto enviado desde {sourceAccount?.name}:</span>
                      <span className="font-bold">${currentAmount.toFixed(2)} USD</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-[11px]">
                      <span>Total comisiones ({((parseFloat(bankCommissionPercentStr) || 0) + 4.1).toFixed(2)}%):</span>
                      <span className="font-bold">-${totalCommissionsUsd.toFixed(2)} USD</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 font-black text-xs">
                      <span className="text-emerald-700 dark:text-emerald-300">Neto a recibir en Binance:</span>
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-black">
                        +${netDestAmountToBinance.toFixed(2)} USD
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Total debitado de {sourceAccount?.name}:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        ${(currentAmount + bankCommissionUsd).toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Card Especial de Cambio P2P Binance ($ USD) -> Banco en Bs */}
          {isBinanceToBankP2P && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-emerald-500/30 space-y-3.5 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Cambio P2P: Binance &rarr; {destAccount?.name || 'Banco'}</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black border border-amber-500/30">
                        P2P
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Venta de USDT en Binance P2P con depósito en Bolívares
                    </span>
                  </div>
                </div>
              </div>

              {/* Tasa P2P Input */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Tasa de cambio P2P acordada:
                    </label>
                    <span className="text-[10px] text-slate-500 block">
                      Precio en Bs por cada dólar / USDT vendido
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="0.00"
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                      className="w-32 px-3 py-1.5 text-right rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <span className="text-xs font-bold text-slate-500">Bs/$</span>
                  </div>
                </div>

                {/* Botones de tasas rápidas */}
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                  <span className="text-slate-400 font-medium">Tasas del día:</span>
                  <button
                    type="button"
                    onClick={() => setCustomRate(rates.usdt ? rates.usdt.toString() : '0')}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold transition-colors border border-emerald-500/20"
                  >
                    USDT: {rates.usdt} Bs
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomRate(rates.bcv ? rates.bcv.toString() : '0')}
                    className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-bold transition-colors border border-blue-500/20"
                  >
                    BCV: {rates.bcv} Bs
                  </button>
                </div>
              </div>

              {/* Resumen de Montos P2P */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5 text-xs font-semibold">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Dólares debitados de Binance:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    -${currentAmount.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Tasa P2P aplicada:</span>
                  <span className="font-bold">{effectiveRate.toFixed(2)} Bs / USD</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black">
                  <span>Bolívares a recibir en {destAccount?.name}:</span>
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-black">
                    +Bs. {calculatedDestAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card Especial de Compra de Divisas / Intervención Bancaria (Bs -> USD o Dólares Electrónicos) */}
          {isVesToUsdBankExchange && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-emerald-500/10 border-2 border-blue-500/30 space-y-3.5 shadow-sm animate-in fade-in">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
                    <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Compra de Divisas (Bs &rarr; Dólares)</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-black border border-blue-500/30">
                        BCV
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Intervención cambiaria / Mesa de cambio bancaria
                    </span>
                  </div>
                </div>
              </div>

              {/* Tasa BCV Input */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-500/30 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Tasa de cambio aplicada:
                    </label>
                    <span className="text-[10px] text-slate-500 block">
                      Basada en la tasa oficial BCV del día (editable si difiere)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="0.00"
                      value={customRate}
                      onChange={(e) => {
                        setCustomRate(e.target.value);
                        setIsManualFxRate(true);
                      }}
                      className="w-32 px-3 py-1.5 text-right rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <span className="text-xs font-bold text-slate-500">Bs/$</span>
                  </div>
                </div>

                {/* Botones de tasas rápidas */}
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                  <span className="text-slate-400 font-medium">Tasas del día:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomRate(rates.bcv ? rates.bcv.toString() : '0');
                      setIsManualFxRate(false);
                    }}
                    className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-bold transition-colors border border-blue-500/20 flex items-center gap-1"
                  >
                    <span>BCV: {rates.bcv} Bs</span>
                    <span className="text-[9px] bg-blue-500 text-white px-1 rounded">Oficial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomRate(rates.usdt ? rates.usdt.toString() : '0');
                      setIsManualFxRate(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold transition-colors border border-emerald-500/20"
                  >
                    USDT: {rates.usdt} Bs
                  </button>
                </div>
              </div>

              {/* Comisión Bancaria (0,5%) */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="applyFxComm"
                      checked={applyFxCommission}
                      onChange={(e) => setApplyFxCommission(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                    />
                    <label htmlFor="applyFxComm" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      Cobrar comisión bancaria de operación
                    </label>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Sudeban 0,5%
                  </span>
                </div>

                {applyFxCommission && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          Porcentaje (%):
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={fxCommissionPercentStr}
                            onChange={(e) => {
                              setFxCommissionPercentStr(e.target.value);
                              setIsManualFxPercent(true);
                              setIsManualFxBs(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-white"
                          />
                          <span className="text-xs font-bold text-slate-500">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          Monto en Bolívares:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={isManualFxBs ? fxCommissionCustomBs : autoFxCommissionBs.toFixed(2)}
                            onChange={(e) => {
                              setFxCommissionCustomBs(e.target.value);
                              setIsManualFxBs(true);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-white"
                          />
                          <span className="text-xs font-bold text-slate-500">Bs</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Base imponible: {fxBaseVesAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</span>
                      {(isManualFxPercent || isManualFxBs) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFxCommissionPercentStr('0.5');
                            setIsManualFxPercent(false);
                            setIsManualFxBs(false);
                            setFxCommissionCustomBs('');
                          }}
                          className="text-blue-500 hover:underline font-bold"
                        >
                          Restablecer a 0,5%
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Desglose de Operación */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1.5 text-xs font-semibold">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Monto base en Bolívares:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Bs. {fxBaseVesAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {applyFxCommission && (
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                    <span>Comisión bancaria ({fxCommissionPercentStr}%):</span>
                    <span className="font-bold">
                      +Bs. {fxCommissionBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-blue-500/20 text-rose-700 dark:text-rose-400 font-bold">
                  <span>Total debitado en {sourceAccount?.name}:</span>
                  <span className="text-sm font-black">
                    -Bs. {totalVesDebited.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-blue-500/20 text-emerald-700 dark:text-emerald-300 font-black">
                  <span>Dólares acreditados en {destAccount?.name}{toSubFund === 'digital_usd' ? ' ($ Digitales)' : toSubFund === 'physical_usd' ? ' ($ Físicos)' : ''}:</span>
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-black">
                    +${fxBaseUsdAmount.toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Exchange Rate & Converted Destination Preview para otras transferencias entre monedas distintas */}
          {type === 'transfer' && sourceAccount && destAccount && sourceEffectiveCurrency !== destEffectiveCurrency && !isBankToBinanceTransfer && !isBinanceToBankP2P && !isVesToUsdBankExchange && (
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  Tasa de cambio aplicada:
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-28 px-2 py-1 text-right rounded-lg bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 font-bold text-xs"
                />
              </div>
              <div className="text-xs flex items-center justify-between pt-1 border-t border-blue-200 dark:border-blue-800">
                <span className="text-slate-600 dark:text-slate-400">Monto final a recibir en destino:</span>
                <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                  {RatesService.formatMoney(calculatedDestAmount, destAccount.currency)}
                </span>
              </div>
            </div>
          )}

          {/* Category Selection (Income / Expense) */}
          {type !== 'transfer' && !isAssigningDebt && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Categoría *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Nueva Categoría
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setCategoryError(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl font-medium text-xs border focus:outline-none focus:ring-2 ${
                  categoryError && !categoryId
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-emerald-500'
                }`}
              >
                <option value="" disabled>-- Selecciona una categoría (Obligatorio) --</option>
                {filteredCategories.length === 0 && (
                  <option value="" disabled>Sin categorías disponibles</option>
                )}
                {/* Fallback si la categoría actual no está en la lista filtrada */}
                {categoryId && !filteredCategories.some(c => c.id === categoryId) && (
                  <option value={categoryId}>
                    {categories.find(c => c.id === categoryId)?.name || 'Categoría actual'}
                  </option>
                )}
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.type === 'both' ? (type === 'expense' ? 'Gasto' : 'Ingreso') : cat.type === 'income' ? 'Ingreso' : 'Gasto'})
                  </option>
                ))}
              </select>
              {categoryError && !categoryId && (
                <p className="text-[11px] text-rose-500 font-bold mt-1">
                  ⚠️ Por favor selecciona una categoría para este movimiento.
                </p>
              )}
            </div>
          )}

          {/* Date & Time Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Fecha y Hora
              </label>
              {dateRates.isHistorical && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  Tasa Histórica del {dateRates.rateDate}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Referencia de tasas oficiales tomadas para esa fecha */}
            {dateRates.isHistorical && (
              <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px]">
                <span className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tasas del día ({dateRates.rateDate}):</span>
                </span>
                <span className="font-black text-amber-900 dark:text-amber-200">
                  BCV: {dateRates.bcv} | USDT: {dateRates.usdt} Bs/$
                </span>
              </div>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Nota / Concepto (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Mercado semanal, Pago móvil cliente, Compra USDT..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 ${
              type === 'expense'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : type === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
            }`}
          >
            {isSuccess ? (
              <>
                <Check className="w-5 h-5 animate-bounce" />
                <span>¡Guardado Exitosamente!</span>
              </>
            ) : (
              <span>
                {editingTransaction 
                  ? 'Guardar Modificación' 
                  : (type === 'expense' ? 'Registrar Egreso' : type === 'income' ? 'Registrar Ingreso' : 'Procesar Transferencia / Cambio')
                }
              </span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
