import React from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { AccountsView } from './components/accounts/AccountsView';
import { DebtsView } from './components/debts/DebtsView';
import { LossesView } from './components/losses/LossesView';
import { PortfolioView } from './components/portfolio/PortfolioView';
import { ProjectionsView } from './components/projections/ProjectionsView';
import { AiAdvisorView } from './components/advisor/AiAdvisorView';
import { HistoryView } from './components/history/HistoryView';
import { LoginView } from './components/auth/LoginView';

// Modals
import { RatesModal } from './components/dashboard/RatesModal';
import { TransactionModal } from './components/transactions/TransactionModal';
import { AccountModal } from './components/accounts/AccountModal';
import { InitialSetupModal } from './components/accounts/InitialSetupModal';
import { CategoryModal } from './components/transactions/CategoryModal';
import { AssetModal } from './components/portfolio/AssetModal';
import { GoalModal } from './components/projections/GoalModal';
import { DebtModal } from './components/debts/DebtModal';
import { DebtPaymentModal } from './components/debts/DebtPaymentModal';
import { LossModal } from './components/losses/LossModal';
import { LossRecoveryModal } from './components/losses/LossRecoveryModal';
import { TodosView } from './components/todos/TodosView';
import { TodoModal } from './components/todos/TodoModal';
import { PwaInstallModal } from './components/layout/PwaInstallModal';
import { SyncModal } from './components/layout/SyncModal';
import { BiometricLockModal } from './components/auth/BiometricLockModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const App: React.FC = () => {
  const { 
    user,
    currentView,
    isWideLayout,
    isPwaModalOpen,
    setIsPwaModalOpen,
    triggerInstall,
    isInstallable,
    isInstalled
  } = useApp();

  if (!user) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'transactions':
        return <TransactionsView />;
      case 'accounts':
        return <AccountsView />;
      case 'debts':
        return <DebtsView />;
      case 'losses':
        return <LossesView />;
      case 'portfolio':
        return <PortfolioView />;
      case 'projections':
        return <ProjectionsView />;
      case 'advisor':
        return <AiAdvisorView />;
      case 'history':
        return <HistoryView />;
      case 'todos':
        return <TodosView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Navbar */}
      <Navbar />

      {/* Main Responsive Body (Ampliada por defecto) */}
      <div className={`flex-1 flex w-full mx-auto transition-all duration-300 ${isWideLayout ? 'max-w-[1920px] px-2 sm:px-4 lg:px-6 2xl:px-8' : 'max-w-7xl'}`}>
        
        {/* Desktop Expanded Sidebar */}
        <Sidebar />

        {/* Dynamic Content View */}
        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-full overflow-x-hidden min-w-0">
          <ErrorBoundary>
            {renderActiveView()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Modals */}
      <RatesModal />
      <TransactionModal />
      <AccountModal />
      <InitialSetupModal />
      <CategoryModal />
      <AssetModal />
      <GoalModal />
      <DebtModal />
      <DebtPaymentModal />
      <LossModal />
      <LossRecoveryModal />
      <TodoModal />
      <PwaInstallModal 
        isOpen={isPwaModalOpen} 
        onClose={() => setIsPwaModalOpen(false)} 
        onInstall={triggerInstall}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />
      <SyncModal />
      <BiometricLockModal />

    </div>
  );
};
