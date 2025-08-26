import React from 'react';
import { cn } from '../../lib/utils';

type HeaderProps = {
  activePage: string;
  setActivePage: (page: string) => void;
};

export const Header: React.FC<HeaderProps> = ({ activePage, setActivePage }) => {
  const NavLink = ({ pageName, children }: { pageName: string; children: React.ReactNode }) => (
    <button
      onClick={() => setActivePage(pageName)}
      className={cn(
        "px-3 py-2 rounded-md text-sm font-medium transition-colors",
        activePage === pageName
          ? "bg-slate-900 text-white"
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
          <div className="flex items-center space-x-4">
            <NavLink pageName="prediction">Prédiction</NavLink>
            <NavLink pageName="metrics">Métrique de Performance</NavLink>
            <NavLink pageName="statistics">Statistiques</NavLink>
            <NavLink pageName="nettoyage">Fusion</NavLink> 
          </div>
        </div>
      </nav>
    </header>
  );
};
