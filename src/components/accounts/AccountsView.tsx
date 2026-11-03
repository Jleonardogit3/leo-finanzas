import React, { useState } from 'react';
import { 
  Wallet, 
  PlusCircle, 
  Sliders, 
  Building2, 
  Coins, 
  Banknote, 
  ArrowLeftRight, 
  Landmark, 
  CreditCard, 
  ShieldCheck,
  Building,
  TrendingUp,
  LayoutGrid,
  LayoutList
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RatesService } from '../../services/ratesService';
import { BankLogo } from '../common/BankLogo';

export const AccountsView: React.FC = () => {
  const { 
    accounts, 
    rates, 
    setIsAccountModalOpen, 
    setIsInitialSetupModalOpen, 
    setIsTxModalOpen 
  } = useApp();

  const [isCompactView, setIsCompactView] = useState(false);

  const vesAccounts = accounts.filter(a => a.currency === 'VES');
  const usdAccounts = accounts.filter(a => a.currency === 'USD');

  const totalVes = vesAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalUsd = accounts.reduce((sum, a) => {
    if (a.currency === 'USD') {
      return sum + a.currentBalance;
    }
    return sum + (a.digitalUsdBalance || 0) + (a.physicalUsdBalance || 0);
  }, 0);

  const totalVesInUsd = rates.usdt > 0 ? totalVes / rates.usdt : 0;

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            Cuentas y Billeteras
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Gestión de saldos bancarios (Bs, $ Digitales y $ Físicos) y billeteras cripto
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsInitialSetupModalOpen(true)}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden xs:inline">Ajustar Saldos</span>
            <span className="xs:hidden">Saldos</span>
          </button>

          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Añadir Cuenta</span>
          </button>
        </div>
      </div>

      {/* Summary Cards: 2-column Grid on Mobile for Maximum Vertical Efficiency */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        
        {/* Dólares & USDT Summary */}
        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-900 border border-emerald-500/30 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400 truncate">
                Total en Dólares
              </span>
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
            </div>
            <div className="text-lg sm:text-3xl font-black tracking-tight">
              ${totalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-[10px] sm:text-xs font-semibold ml-1 text-slate-300">USD</span>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate" title={`≈ ${(totalUsd * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs a tasa USDT`}>
            ≈ {(totalUsd * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
          </p>
        </div>

        {/* Bolívares Summary */}
        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-900/40 via-slate-900 to-slate-900 border border-blue-500/30 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-400 truncate">
                Total en Bolívares
              </span>
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" />
            </div>
            <div className="text-lg sm:text-3xl font-black tracking-tight">
              {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-[10px] sm:text-xs font-semibold ml-1 text-slate-300">Bs</span>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate" title={`≈ $${totalVesInUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD a tasa USDT`}>
            ≈ ${totalVesInUsd.toFixed(2)} USD
          </p>
        </div>

      </div>

      {/* Section 1: Cuentas en Bolívares */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-500"></span>
            Bancos Nacionales (Bs, $ y Físico)
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">{vesAccounts.length} Bancos</span>
            
            {/* View Mode Toggle Button */}
            <button
              onClick={() => setIsCompactView(prev => !prev)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all"
              title={isCompactView ? "Ver detalles completos de subfondos" : "Vista compacta para ver todos los bancos sin scroll"}
            >
              {isCompactView ? (
                <>
                  <LayoutGrid className="w-3 h-3 text-emerald-500" />
                  <span>Detallado</span>
                </>
              ) : (
                <>
                  <LayoutList className="w-3 h-3 text-blue-500" />
                  <span>Compacto</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isCompactView ? (
          /* Vista Compacta: Lista condensada de alto impacto visual */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {vesAccounts.map(acc => {
              const valVesInUsd = rates.usdt > 0 ? (acc.currentBalance / rates.usdt) : 0;
              const digitalUsd = acc.digitalUsdBalance || 0;
              const physicalUsd = acc.physicalUsdBalance || 0;
              const totalBankUsd = valVesInUsd + digitalUsd + physicalUsd;

              return (
                <div 
                  key={acc.id}
                  className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BankLogo name={acc.name} size="sm" />
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                        {acc.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Bs: {RatesService.formatMoney(acc.currentBalance, 'VES')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      ${totalBankUsd.toFixed(2)} USD
                    </div>
                    <button
                      onClick={() => setIsTxModalOpen(true)}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      + Movimiento
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista Normal / Detallada Optimizada para Móvil */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {vesAccounts.map(acc => {
              const valVesInUsd = rates.usdt > 0 ? (acc.currentBalance / rates.usdt) : 0;
              const digitalUsd = acc.digitalUsdBalance || 0;
              const physicalUsd = acc.physicalUsdBalance || 0;
              const totalBankUsd = valVesInUsd + digitalUsd + physicalUsd;

              return (
                <div 
                  key={acc.id}
                  className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <BankLogo name={acc.name} size="md" />
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {acc.name}
                          </h4>
                          {acc.bankCode && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              Código: {acc.bankCode}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        MULTIFONDO
                      </span>
                    </div>

                    {/* Multifund breakdown container */}
                    <div className="mt-2 space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                      
                      {/* 1. Bolívares */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Cuenta en Bs:
                        </span>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {RatesService.formatMoney(acc.currentBalance, 'VES')}
                          </span>
                          <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                            ≈ ${valVesInUsd.toFixed(2)} USD
                          </span>
                        </div>
                      </div>

                      {/* 2. $ Digitales */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          $ Digitales:
                        </span>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            ${digitalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                            ≈ {(digitalUsd * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
                          </span>
                        </div>
                      </div>

                      {/* 3. $ Físicos */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[10px] sm:text-[11px] font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                          $ Físicos:
                        </span>
                        <div className="text-right">
                          <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                            ${physicalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                            ≈ {(physicalUsd * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Total Bank Value Consolidado */}
                    <div className="mt-2 flex items-center justify-between px-1 text-xs">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Total banco en USD:
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                        ${totalBankUsd.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => setIsTxModalOpen(true)}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Movimiento / P2P</span>
                    </button>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 hidden xs:inline">
                      Apertura: {RatesService.formatMoney(acc.initialBalance, 'VES')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Cuentas en Dólares & Cripto */}
      <div className="space-y-2.5 sm:space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500"></span>
            Cuentas en Divisas ($ USD & Binance USDT)
          </h3>
          <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">{usdAccounts.length} Cuentas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {usdAccounts.map(acc => {
            const valInVes = (acc.currentBalance * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 });
            return (
              <div 
                key={acc.id}
                className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BankLogo name={acc.name} size="md" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {acc.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {acc.type === 'wallet_crypto' ? 'Cripto / P2P' : 'Efectivo Divisas'}
                        </span>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      USD
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                      {RatesService.formatMoney(acc.currentBalance, 'USD')}
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      ≈ {valInVes} Bs
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setIsTxModalOpen(true)}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Movimiento / P2P</span>
                  </button>
                  <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 hidden xs:inline">
                    Apertura: ${acc.initialBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
