import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Wallet, 
  PieChart, 
  TrendingUp, 
  Bot, 
  PlusCircle,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  HandCoins,
  TrendingDown,
  Download,
  History
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    setIsTxModalOpen, 
    totalNetWorthUsdUsdt,
    totalNetWorthUsdBcv,
    rates,
    activeDebtorsCount,
    lossesCount,
    isInstallable,
    isInstalled,
    setIsPwaModalOpen,
    triggerInstall
  } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Movimientos', icon: ArrowLeftRight },
    { id: 'accounts', label: 'Cuentas & Bancos', icon: Wallet },
    { id: 'debts', label: 'Deudas & Cobros', icon: HandCoins, badge: activeDebtorsCount > 0 ? activeDebtorsCount.toString() : undefined },
    { id: 'losses', label: 'Pérdidas & Mermas', icon: TrendingDown, badge: lossesCount > 0 ? lossesCount.toString() : undefined },
    { id: 'portfolio', label: 'Portafolio & Activos', icon: PieChart },
    { id: 'projections', label: 'Metas & Proyecciones', icon: TrendingUp },
    { id: 'history', label: 'Historial & Cambios', icon: History },
    { id: 'advisor', label: 'Asesor IA Gemini', icon: Bot, highlight: true },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 min-h-[calc(100vh-4rem)] select-none">
      
      {/* Quick Action Button */}
      <button
        onClick={() => setIsTxModalOpen(true)}
        className="w-full mb-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
      >
        <PlusCircle className="w-5 h-5" />
        <span>Nuevo Movimiento</span>
      </button>

      {/* Main Navigation Links */}
      <nav className="space-y-1.5 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as any)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
              {item.highlight && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  IA
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* PWA Install Promotion Card */}
      {!isInstalled && (
        <div className="mb-4 mt-auto p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-100/50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900/40 border border-emerald-500/30">
          <div className="flex items-center gap-2 mb-1">
            <Download className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">Instalar Aplicación</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight mb-2.5">
            Úsala en tu PC o móvil como app nativa, con acceso 100% offline.
          </p>
          <button
            onClick={() => isInstallable ? triggerInstall() : setIsPwaModalOpen(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar en este equipo</span>
          </button>
        </div>
      )}

      {/* Mini Financial Summary Card */}
      <div className={`p-3.5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/50 dark:from-slate-800/80 dark:to-slate-900/90 border border-slate-200 dark:border-slate-800 ${isInstalled ? 'mt-auto' : ''}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Patrimonio Real (USDT)
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <div className="text-xl font-black text-slate-900 dark:text-white">
          ${totalNetWorthUsdUsdt.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex justify-between">
          <span>A tasa BCV:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            ${totalNetWorthUsdBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-750 flex items-center justify-between text-[11px]">
          <span className="text-slate-600 dark:text-slate-400">Brecha Cambiaria:</span>
          <span className="font-bold text-rose-500">+{rates.spreadPercent.toFixed(1)}%</span>
        </div>
      </div>

      {/* Offline First Tip */}
      <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 px-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
        <span>Persistencia offline activa</span>
      </div>

    </aside>
  );
};
