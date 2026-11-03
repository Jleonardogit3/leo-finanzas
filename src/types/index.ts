export type Currency = 'USD' | 'VES';

export type ExchangeRateSource = 'BCV' | 'USDT';

export interface ExchangeRates {
  bcv: number;
  usdt: number;
  lastUpdated: string;
  isManualOverride: boolean;
  spreadPercent: number; // ((usdt - bcv) / bcv) * 100
}

export type AccountType = 
  | 'bank_ves'
  | 'cash_usd'
  | 'wallet_crypto'
  | 'cash_ves'
  | 'custom';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: number;
  currentBalance: number;
  // Campos para cuentas bancarias (menos Binance): $ Digitales y $ Físicos
  digitalUsdBalance?: number;
  initialDigitalUsdBalance?: number;
  physicalUsdBalance?: number;
  initialPhysicalUsdBalance?: number;
  color: string;
  icon: string;
  bankCode?: string;
  createdAt: string;
  updatedAt: string;
}

export type SubFundType = 'ves' | 'digital_usd' | 'physical_usd';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  accountId: string;
  toAccountId?: string; // used for transfer/exchange
  subFund?: SubFundType; // fondo afectado en la cuenta origen
  toSubFund?: SubFundType; // fondo afectado en la cuenta destino
  amount: number;
  currency: Currency;
  appliedRate?: number; // Rate used when transferring between currencies
  destinationAmount?: number; // Destination amount if cross-currency transfer
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  date: string; // ISO date string
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export type DebtStatus = 'pending' | 'partially_paid' | 'paid' | 'uncollectible';
export type DebtCurrencyType = 'VES_BCV' | 'USD_USDT';
export type DebtType = 'receivable' | 'payable'; // 'receivable' = Me deben a mí (Por cobrar) | 'payable' = Yo debo a otros (Por pagar)

export interface DebtPayment {
  id: string;
  amount: number;
  currency: 'VES' | 'USD';
  date: string; // ISO date string
  note?: string;
  appliedRate?: number;
  receivedInAccountId?: string;
  receivedInSubFund?: SubFundType;
}

export interface Debt {
  id: string;
  debtType?: DebtType; // 'receivable' (por cobrar, default) | 'payable' (lo que yo debo)
  debtorName: string; // Nombre de la persona o entidad (deudor o acreedor)
  phone?: string;
  concept: string; // Motivo o concepto de la deuda
  originalAmount: number; // Monto principal original
  currencyType: DebtCurrencyType; // 'VES_BCV' (Bs a tasa BCV) o 'USD_USDT' ($ / USDT)
  appliedRateAtCreation: number; // Tasa de cambio (BCV o USDT) en la fecha de registro
  remainingAmount: number; // Monto que aún queda pendiente por pagar (en la moneda original)
  status: DebtStatus; // 'pending' | 'partially_paid' | 'paid' | 'uncollectible'
  dueDate?: string; // Fecha acordada de pago o vencimiento
  createdAt: string; // Fecha de creación ISO
  updatedAt: string;
  notes?: string;
  payments: DebtPayment[];
}

export type LossCategory = 
  | 'uncollectible_debt'   // Deuda declarada incobrable
  | 'theft_scam'           // Robo, estafa o fraude
  | 'crypto_trading'       // Pérdida en trading o criptoactivos
  | 'damage_merchandise'   // Daño, merma o pérdida de inventario/mercancía
  | 'devaluation'          // Pérdida por devaluación / diferencial cambiario
  | 'operational'          // Multa, avería o gasto imprevisto
  | 'other';               // Otro motivo

export type LossStatus = 'total_loss' | 'partially_recovered' | 'recovered';

export interface LossRecovery {
  id: string;
  amount: number;
  currency: Currency;
  date: string;
  note?: string;
  receivedInAccountId?: string;
  receivedInSubFund?: SubFundType;
}

export interface Loss {
  id: string;
  concept: string; // Motivo o concepto de la pérdida
  category: LossCategory;
  amount: number; // Monto principal perdido
  currency: Currency; // 'USD' | 'VES'
  appliedRate: number; // Tasa aplicada al momento de registrar (BCV o USDT)
  date: string; // Fecha en la que ocurrió
  status: LossStatus; // 'total_loss' | 'partially_recovered' | 'recovered'
  recoveredAmount: number; // Monto recuperado si aplica
  recoveries?: LossRecovery[];
  affectedAccountId?: string; // Cuenta afectada (si dedujo de un saldo real)
  subFund?: SubFundType;
  linkedDebtId?: string; // ID de deuda vinculada si provino de una cuenta por cobrar incobrable
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  isPredefined?: boolean;
  updatedAt?: string;
}

export type AssetType = 
  | 'crypto' 
  | 'stock' 
  | 'real_estate' 
  | 'business' 
  | 'vehicle' 
  | 'other';

export interface PortfolioAsset {
  id: string;
  name: string;
  type: AssetType;
  currency: Currency;
  quantity: number;
  costBasisUsd: number;
  currentValuationUsd: number;
  notes?: string;
  institution?: string;
  updatedAt: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmountUsd: number;
  currentSavedUsd: number;
  deadline: string; // ISO date
  category: string;
  color: string;
  createdAt: string;
  updatedAt?: string;
}

export type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface AIAdvisorReport {
  timestamp: string;
  devaluationRiskLevel: 'BAJO' | 'MODERADO' | 'ALTO' | 'CRÍTICO';
  vesLiquidityRatio: number;
  usdLiquidityRatio: number;
  savingsRatePercent: number;
  executiveSummary: string;
  cashflowDiagnosis: string[];
  overbudgetAlerts: string[];
  devaluationHedgeStrategies: string[];
  goalsActionPlan: string[];
}

export interface DeletedItem {
  id: string;
  type: 'account' | 'transaction' | 'category' | 'asset' | 'goal' | 'debt' | 'loss' | 'audit_log';
  deletedAt: string;
}

export interface SyncStats {
  uploaded: number;
  downloaded: number;
  resolved: number;
}

export interface SyncResult {
  success: boolean;
  isOffline?: boolean;
  message: string;
  serverTimestamp?: string;
  stats?: SyncStats;
  mergedData?: any;
}

export type ActivityEntityType = 
  | 'transaction' 
  | 'debt' 
  | 'debt_payment' 
  | 'loss' 
  | 'loss_recovery' 
  | 'account_adjustment' 
  | 'portfolio' 
  | 'goal';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO
  entityType: ActivityEntityType;
  action: 'create' | 'update' | 'delete' | 'payment' | 'recovery' | 'transfer' | 'adjustment';
  title: string;
  details: string;
  entityId: string;
  parentEntityId?: string;
  amount?: number;
  currency?: Currency;
  snapshotBefore?: any;
  snapshotAfter?: any;
  reverted?: boolean;
  revertedAt?: string;
}

export interface UnifiedActivityItem {
  id: string; // ID único para el timeline
  entityId: string; // ID del registro subyacente
  parentEntityId?: string; // ID de deuda o pérdida padre (si aplica)
  entityType: ActivityEntityType;
  title: string;
  description: string;
  amount?: number;
  currency?: Currency;
  date: string;
  createdAt: string;
  accountName?: string;
  subFund?: SubFundType;
  toAccountName?: string;
  toSubFund?: SubFundType;
  categoryName?: string;
  statusBadge?: string;
  badgeVariant?: 'income' | 'expense' | 'transfer' | 'debt' | 'loss' | 'account' | 'portfolio' | 'goal';
  impactExplanation: string;
  revertType: 'transaction' | 'debt' | 'debt_payment' | 'loss' | 'loss_recovery' | 'account_adjustment' | 'portfolio' | 'goal';
  snapshotData?: any;
  isReverted?: boolean;
}

export interface AppUser {
  uid: string;
  username: string;
  displayName: string;
  email?: string;
  loginAt: string;
}


