import React from 'react';
import { cn } from '../../lib/utils';
import { useAnalysis } from '../../providers/AnalysisProvider';
import { NotificationBell } from '../notifications/NotificationBell';

type HeaderProps = {
  activePage: string;
  setActivePage: (page: string) => void;
};

export const Header: React.FC<HeaderProps> = ({ activePage, setActivePage }) => {
  const { isAnalysisRunning } = useAnalysis();

  const NavLink = ({ pageName, children, disabled = false }: { pageName: string; children: React.ReactNode; disabled?: boolean }) => (
    <button
      onClick={() => setActivePage(pageName)}
      disabled={disabled}
      className={cn(
        "px-3 py-2 rounded-md text-sm font-medium transition-colors",
        activePage === pageName
          ? "bg-slate-900 text-white"
          : disabled
            ? "text-slate-400 cursor-not-allowed"
            : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {children}
    </button>
  );

  return (
    <header className="w-full bg-white border-b border-slate-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="font-bold text-xl text-slate-800">KPI Dashboard</span>
          </div>
          

          <div className="flex items-center">
            <div className="flex items-center space-x-4">
              <NavLink pageName="prediction">Prédiction</NavLink>
              <NavLink pageName="metrics">Métrique de Performance</NavLink>
              <NavLink pageName="statistics" disabled={isAnalysisRunning}>
                Statistiques
              </NavLink>
              <NavLink pageName="nettoyage">Fusion</NavLink> 
            </div>


            <div className="ml-4">
              <NotificationBell />
            </div>

          </div>

        </div>
      </nav>
    </header>
  );
};