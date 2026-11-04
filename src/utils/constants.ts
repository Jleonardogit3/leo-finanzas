import { Account, Category } from '../types';

export const PRECONFIGURED_ACCOUNTS: Omit<Account, 'id' | 'currentBalance' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Banco de Venezuela',
    type: 'bank_ves',
    currency: 'VES',
    initialBalance: 5252.87,
    digitalUsdBalance: 0.18,
    initialDigitalUsdBalance: 0.18,
    physicalUsdBalance: 0,
    initialPhysicalUsdBalance: 0,
    color: '#B91C1C', // Red BDV
    icon: 'Building2',
    bankCode: '0102'
  },
  {
    name: 'Banco Provincial (BBVA)',
    type: 'bank_ves',
    currency: 'VES',
    initialBalance: 29489.04,
    digitalUsdBalance: 931.32,
    initialDigitalUsdBalance: 931.32,
    physicalUsdBalance: 0,
    initialPhysicalUsdBalance: 0,
    color: '#1D4ED8', // Blue Provincial
    icon: 'Landmark',
    bankCode: '0108'
  },
  {
    name: 'Banco Mercantil',
    type: 'bank_ves',
    currency: 'VES',
    initialBalance: 7.15,
    digitalUsdBalance: 0,
    initialDigitalUsdBalance: 0,
    physicalUsdBalance: 0,
    initialPhysicalUsdBalance: 0,
    color: '#0284C7', // Sky Blue Mercantil
    icon: 'Building',
    bankCode: '0105'
  },
  {
    name: 'Banco Nacional de Crédito (BNC)',
    type: 'bank_ves',
    currency: 'VES',
    initialBalance: 0,
    digitalUsdBalance: 2.63,
    initialDigitalUsdBalance: 2.63,
    physicalUsdBalance: 0,
    initialPhysicalUsdBalance: 0,
    color: '#047857', // Green BNC
    icon: 'CreditCard',
    bankCode: '0191'
  },
  {
    name: 'Banco del Tesoro',
    type: 'bank_ves',
    currency: 'VES',
    initialBalance: 106.83,
    digitalUsdBalance: 0,
    initialDigitalUsdBalance: 0,
    physicalUsdBalance: 0,
    initialPhysicalUsdBalance: 0,
    color: '#B45309', // Amber Tesoro
    icon: 'ShieldCheck',
    bankCode: '0163'
  },
  {
    name: 'Binance ($)',
    type: 'wallet_crypto',
    currency: 'USD',
    initialBalance: 1493.63,
    color: '#F59E0B', // Binance Yellow
    icon: 'Coins'
  },
  {
    name: 'Efectivo ($)',
    type: 'cash_usd',
    currency: 'USD',
    initialBalance: 1279,
    color: '#10B981', // Emerald Green USD Cash
    icon: 'Banknote'
  }
];

export const PREDEFINED_CATEGORIES: Category[] = [
  {
    id: 'cat-comida',
    name: 'Comida',
    icon: 'Utensils',
    color: '#F97316', // Orange
    type: 'expense',
    isPredefined: true
  },
  {
    id: 'cat-casa',
    name: 'Casa',
    icon: 'Home',
    color: '#3B82F6', // Blue
    type: 'expense',
    isPredefined: true
  },
  {
    id: 'cat-personal',
    name: 'Personal',
    icon: 'User',
    color: '#EC4899', // Pink
    type: 'expense',
    isPredefined: true
  },
  {
    id: 'cat-ropa',
    name: 'Ropa',
    icon: 'Shirt',
    color: '#8B5CF6', // Purple
    type: 'expense',
    isPredefined: true
  },
  {
    id: 'cat-entretenimiento',
    name: 'Entretenimiento',
    icon: 'Gamepad2',
    color: '#06B6D4', // Cyan
    type: 'expense',
    isPredefined: true
  },
  {
    id: 'cat-trabajo',
    name: 'Trabajo',
    icon: 'Briefcase',
    color: '#64748B', // Slate
    type: 'both',
    isPredefined: true
  },
  {
    id: 'cat-sueldo',
    name: 'Sueldo de nómina',
    icon: 'WalletCards',
    color: '#10B981', // Emerald
    type: 'income',
    isPredefined: true
  },
  {
    id: 'cat-local',
    name: 'Local',
    icon: 'Store',
    color: '#EAB308', // Amber
    type: 'expense',
    isPredefined: true
  }
];

export const AVAILABLE_CATEGORY_ICONS = [
  'Utensils', 'Home', 'User', 'Shirt', 'Gamepad2', 'Briefcase',
  'WalletCards', 'Store', 'Car', 'ShoppingCart', 'Coffee', 'Plane',
  'HeartPulse', 'GraduationCap', 'Zap', 'Gift', 'Dumbbell', 'Phone'
];

export const AVAILABLE_CATEGORY_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', 
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B'
];
