import React, { useState } from 'react';
import { X, Wallet, Check, PlusCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Account, AccountType, Currency } from '../../types';
import { BankLogo } from '../common/BankLogo';

export const AccountModal: React.FC = () => {
  const { isAccountModalOpen, setIsAccountModalOpen, saveAccount } = useApp();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank_ves');
  const [currency, setCurrency] = useState<Currency>('VES');
  const [initialBalance, setInitialBalance] = useState('');
  const [initialDigitalUsd, setInitialDigitalUsd] = useState('');
  const [initialPhysicalUsd, setInitialPhysicalUsd] = useState('');
  const [color, setColor] = useState('#10B981');

  if (!isAccountModalOpen) return null;

  const handleTypeChange = (newType: AccountType) => {
    setType(newType);
    if (newType === 'bank_ves' || newType === 'cash_ves') {
      setCurrency('VES');
    } else if (newType === 'cash_usd' || newType === 'wallet_crypto') {
      setCurrency('USD');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const balanceNum = parseFloat(initialBalance) || 0;
    const digitalNum = parseFloat(initialDigitalUsd) || 0;
    const physicalNum = parseFloat(initialPhysicalUsd) || 0;

    const newAccount: Account = {
      id: `acc-custom-${Date.now()}`,
      name: name.trim(),
      type,
      currency,
      initialBalance: balanceNum,
      currentBalance: balanceNum,
      digitalUsdBalance: digitalNum,
      initialDigitalUsdBalance: digitalNum,
      physicalUsdBalance: physicalNum,
      initialPhysicalUsdBalance: physicalNum,
      color,
      icon: 'Wallet',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveAccount(newAccount);
    setIsAccountModalOpen(false);
    setName('');
    setInitialBalance('');
    setInitialDigitalUsd('');
    setInitialPhysicalUsd('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-500" />
              Añadir Nueva Cuenta
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Registra una billetera, cuenta bancaria o caja
            </p>
          </div>
          <button 
            onClick={() => setIsAccountModalOpen(false)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Nombre de la Cuenta
            </label>
            <div className="flex items-center gap-2">
              <BankLogo name={name} size="md" />
              <input
                type="text"
                placeholder="Ej: Banesco, Zinli, Wally, Efectivo $ Reserva..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                autoFocus
              />
            </div>
            {name.trim() && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
                ✓ Logo bancario detectado y adaptado automáticamente
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Tipo de Cuenta
              </label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as AccountType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="bank_ves">Banco Nacional (VES)</option>
                <option value="wallet_crypto">Billetera Cripto / USDT</option>
                <option value="cash_usd">Efectivo ($ USD)</option>
                <option value="cash_ves">Efectivo (Bs VES)</option>
                <option value="custom">Cuenta Personalizada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="VES">Bolívares (VES)</option>
                <option value="USD">Dólares ($ USD)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Saldo Inicial en Bolívares (VES)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                {currency}
              </span>
            </div>
          </div>

          {/* Sub-fondos en Divisas para bancos nacionales */}
          {type === 'bank_ves' && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                💵 Cuentas en Divisas del Banco (Opcional)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    💻 $ Digitales (Cuenta Divisas)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={initialDigitalUsd}
                      onChange={(e) => setInitialDigitalUsd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] font-bold text-emerald-500">
                      USD
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-teal-600 dark:text-teal-400 mb-1">
                    💵 $ Físicos (Custodia)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={initialPhysicalUsd}
                      onChange={(e) => setInitialPhysicalUsd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] font-bold text-teal-500">
                      USD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Color Distintivo
            </label>
            <div className="flex items-center gap-2">
              {['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4', '#64748B'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-800 dark:ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Crear Cuenta</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
