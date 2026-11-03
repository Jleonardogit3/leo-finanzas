import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Coins, 
  Banknote, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Landmark, 
  CreditCard, 
  ShieldCheck,
  Building,
  X,
  Sliders
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Account } from '../../types';
import { RatesService } from '../../services/ratesService';
import { StorageService } from '../../services/storageService';
import { BankLogo } from '../common/BankLogo';

export const InitialSetupModal: React.FC = () => {
  const { 
    isInitialSetupModalOpen, 
    setIsInitialSetupModalOpen, 
    accounts, 
    batchSaveAccounts,
    rates 
  } = useApp();

  const isInitialSetupDone = StorageService.isInitialSetupDone();

  const [balances, setBalances] = useState<Record<string, string>>({});
  const [digitalBalances, setDigitalBalances] = useState<Record<string, string>>({});
  const [physicalBalances, setPhysicalBalances] = useState<Record<string, string>>({});

  // Cargar siempre los saldos actuales registrados de las cuentas al abrir el modal
  useEffect(() => {
    if (!isInitialSetupModalOpen) return;

    const initBalances: Record<string, string> = {};
    const initDigital: Record<string, string> = {};
    const initPhysical: Record<string, string> = {};

    accounts.forEach(acc => {
      // Tomar el saldo actual registrado para que el usuario pueda editar a partir de él
      const current = acc.currentBalance !== undefined ? acc.currentBalance : (acc.initialBalance || 0);
      initBalances[acc.id] = current !== 0 ? current.toString() : '';

      const dig = acc.digitalUsdBalance !== undefined ? acc.digitalUsdBalance : (acc.initialDigitalUsdBalance || 0);
      initDigital[acc.id] = dig !== 0 ? dig.toString() : '';

      const phys = acc.physicalUsdBalance !== undefined ? acc.physicalUsdBalance : (acc.initialPhysicalUsdBalance || 0);
      initPhysical[acc.id] = phys !== 0 ? phys.toString() : '';
    });

    setBalances(initBalances);
    setDigitalBalances(initDigital);
    setPhysicalBalances(initPhysical);
  }, [isInitialSetupModalOpen]);

  if (!isInitialSetupModalOpen) return null;

  const handleBalanceChange = (accountId: string, value: string) => {
    setBalances(prev => ({
      ...prev,
      [accountId]: value
    }));
  };

  const handleDigitalChange = (accountId: string, value: string) => {
    setDigitalBalances(prev => ({
      ...prev,
      [accountId]: value
    }));
  };

  const handlePhysicalChange = (accountId: string, value: string) => {
    setPhysicalBalances(prev => ({
      ...prev,
      [accountId]: value
    }));
  };

  const calculateTotalOpeningUsd = () => {
    let totalUsd = 0;
    accounts.forEach(acc => {
      const val = parseFloat(balances[acc.id] || '0') || 0;
      if (acc.currency === 'USD') {
        totalUsd += val;
      } else {
        totalUsd += rates.usdt > 0 ? val / rates.usdt : 0;
        const dig = parseFloat(digitalBalances[acc.id] || '0') || 0;
        const phys = parseFloat(physicalBalances[acc.id] || '0') || 0;
        totalUsd += dig + phys;
      }
    });
    return totalUsd;
  };

  const handleSave = () => {
    let anyChanges = false;

    const updatedAccounts: Account[] = accounts.map(acc => {
      const currentVal = acc.currentBalance ?? 0;
      const currentDig = acc.digitalUsdBalance ?? 0;
      const currentPhys = acc.physicalUsdBalance ?? 0;

      const inputBalStr = balances[acc.id];
      const inputDigStr = digitalBalances[acc.id];
      const inputPhysStr = physicalBalances[acc.id];

      const newAmount = inputBalStr !== undefined && inputBalStr !== '' ? (parseFloat(inputBalStr) || 0) : 0;
      const newDigAmount = inputDigStr !== undefined && inputDigStr !== '' ? (parseFloat(inputDigStr) || 0) : 0;
      const newPhysAmount = inputPhysStr !== undefined && inputPhysStr !== '' ? (parseFloat(inputPhysStr) || 0) : 0;

      const isBalChanged = Math.abs(newAmount - currentVal) > 0.0001;
      const isDigChanged = Math.abs(newDigAmount - currentDig) > 0.0001;
      const isPhysChanged = Math.abs(newPhysAmount - currentPhys) > 0.0001;

      // Si la cuenta NO fue modificada por el usuario, mantenerla exactamente igual con sus montos y movimientos
      if (!isBalChanged && !isDigChanged && !isPhysChanged) {
        return acc;
      }

      // La cuenta sí fue modificada: actualizar únicamente lo editado
      anyChanges = true;
      const isFirstSetup = !StorageService.isInitialSetupDone();
      const precision = acc.currency === 'USD' && acc.type === 'wallet_crypto' ? 4 : 2;
      const cleanAmount = Number(newAmount.toFixed(precision));
      const cleanDig = Number(newDigAmount.toFixed(2));
      const cleanPhys = Number(newPhysAmount.toFixed(2));

      return {
        ...acc,
        currentBalance: cleanAmount,
        // Si ya se había hecho setup inicial, conservar el saldo histórico de apertura intacto
        initialBalance: (isFirstSetup || acc.initialBalance === 0) ? cleanAmount : acc.initialBalance,
        digitalUsdBalance: cleanDig,
        initialDigitalUsdBalance: (isFirstSetup || (acc.initialDigitalUsdBalance || 0) === 0) ? cleanDig : acc.initialDigitalUsdBalance,
        physicalUsdBalance: cleanPhys,
        initialPhysicalUsdBalance: (isFirstSetup || (acc.initialPhysicalUsdBalance || 0) === 0) ? cleanPhys : acc.initialPhysicalUsdBalance,
        updatedAt: new Date().toISOString()
      };
    });

    if (anyChanges || !StorageService.isInitialSetupDone()) {
      batchSaveAccounts(updatedAccounts);
    }
    setIsInitialSetupModalOpen(false);
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right close button */}
        <button
          type="button"
          onClick={() => setIsInitialSetupModalOpen(false)}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6 pr-6 pl-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-3 border border-emerald-500/20">
            {isInitialSetupDone ? <Sliders className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {isInitialSetupDone ? 'Ajuste de Saldos en Cuentas' : 'Asistente de Estado Inicial'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {isInitialSetupDone 
              ? 'Tus saldos actuales se mantienen intactos. Edita únicamente las cuentas que desees actualizar y los cambios se guardarán a partir de allí.'
              : 'Configura el saldo de apertura de tus bancos en Bolívares, $ Digitales y $ Físicos para calibrar tu patrimonio inicial.'}
          </p>
        </div>

        {/* Live Net Worth Preview */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-blue-500/15 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {isInitialSetupDone ? 'Patrimonio Total en Cuentas:' : 'Patrimonio de Apertura Estimado:'}
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ${calculateTotalOpeningUsd().toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600 dark:text-slate-400">
            <span>Tasa USDT ref:</span>
            <span className="font-bold block text-slate-700 dark:text-slate-300">{rates.usdt} Bs/$</span>
          </div>
        </div>

        {/* Accounts Form Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 px-1">
            <span>Cuenta / Banco</span>
            <span>{isInitialSetupDone ? 'Saldo Registrado' : 'Saldos de Apertura'}</span>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {accounts.map(acc => {
              const isBank = acc.type === 'bank_ves' || (!acc.name.includes('Binance') && acc.currency === 'VES');
              const val = parseFloat(balances[acc.id] || '0') || 0;
              const convertedHint = acc.currency === 'VES' 
                ? (rates.usdt > 0 ? `≈ $${(val / rates.usdt).toFixed(2)} USD` : '')
                : (rates.usdt > 0 ? `≈ ${(val * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs` : '');

              return (
                <div 
                  key={acc.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <BankLogo name={acc.name} size="md" />
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {acc.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="px-1.5 py-0.2 rounded font-bold bg-slate-200/80 dark:bg-slate-700/80 text-[10px]">
                            {acc.currency}
                          </span>
                          {convertedHint && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {convertedHint}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Single balance input if NOT a bank with multi-fund */}
                    {!isBank && (
                      <div className="relative w-36 sm:w-44">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={balances[acc.id] || ''}
                          onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                          className="w-full text-right font-bold text-sm px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-600 dark:text-slate-400 pointer-events-none">
                          {acc.currency === 'USD' ? '$' : 'Bs'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Multi-fund rows for Venezuelan banks */}
                  {isBank && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      {/* 1. Bolívares */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          🏦 Saldo en Bs (VES)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={balances[acc.id] || ''}
                            onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                            className="w-full text-right font-bold text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute left-2 top-1.5 text-[10px] font-bold text-blue-500 pointer-events-none">
                            Bs
                          </span>
                        </div>
                      </div>

                      {/* 2. $ Digitales */}
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
                            value={digitalBalances[acc.id] || ''}
                            onChange={(e) => handleDigitalChange(acc.id, e.target.value)}
                            className="w-full text-right font-bold text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="absolute left-2 top-1.5 text-[10px] font-bold text-emerald-500 pointer-events-none">
                            $
                          </span>
                        </div>
                      </div>

                      {/* 3. $ Físicos */}
                      <div>
                        <label className="block text-[10px] font-bold text-teal-600 dark:text-teal-400 mb-1">
                          💵 $ Físicos (Custodia/Taquilla)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={physicalBalances[acc.id] || ''}
                            onChange={(e) => handlePhysicalChange(acc.id, e.target.value)}
                            className="w-full text-right font-bold text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <span className="absolute left-2 top-1.5 text-[10px] font-bold text-teal-500 pointer-events-none">
                            $
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setIsInitialSetupModalOpen(false)}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isInitialSetupDone ? 'Cancelar' : 'Configurar más tarde (Iniciar en 0)'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{isInitialSetupDone ? 'Guardar Modificaciones' : 'Confirmar Saldos de Apertura'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
