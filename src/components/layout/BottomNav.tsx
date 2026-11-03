import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Wallet, 
  HandCoins, 
  TrendingDown,
  Bot, 
  Plus 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { currentView, setCurrentView, setIsTxModalOpen, activeDebtorsCount, lossesCount } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'transactions', label: 'Movimientos', icon: ArrowLeftRight },
    { id: 'accounts', label: 'Cuentas', icon: Wallet },
    { id: 'debts', label: 'Deudas', icon: HandCoins, badge: activeDebtorsCount > 0 ? activeDebtorsCount.toString() : undefined },
    { id: 'losses', label: 'Pérdidas', icon: TrendingDown, badge: lossesCount > 0 ? lossesCount.toString() : undefined },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none select-none">
      
      {/* Floating Action Button (+) Centered Directly Above the 5 Tabs */}
      <div className="flex justify-center mb-1.5 pointer-events-auto">
        <button
          onClick={() => setIsTxModalOpen(true)}
          aria-label="Registrar nuevo movimiento"
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 hover:from-emerald-500 hover:to-teal-300 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-90 transition-transform border-2 border-white dark:border-slate-900 ring-2 ring-emerald-500/20"
          title="Nuevo Movimiento (+)"
        >
          <Plus className="w-6 h-6 stroke-[2.8]" />
        </button>
      </div>

      {/* 5 Bottom Navigation Buttons Bar: Inicio, Movimientos, Cuentas, Deudas, Pérdidas */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 safe-bottom shadow-2xl pointer-events-auto transition-colors">
        <div className="flex items-center justify-around h-14 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  isActive 
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 mb-0.5" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-gradient-to-r from-purple-500 to-indigo-500 text-[8px] font-black text-white rounded-full leading-tight">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
