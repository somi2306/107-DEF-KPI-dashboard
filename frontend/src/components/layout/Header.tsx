import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAnalysis } from '../../providers/AnalysisProvider';
import { NotificationBell } from '../notifications/NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useAuthStore } from "@/stores/useAuthStore";
import { BarChart2, Cpu, UploadCloud, Layers, Sliders, PlayCircle, Menu, X } from 'lucide-react';

type HeaderProps = {
  activePage: string;
  setActivePage: (page: string) => void;
};

export const Header: React.FC<HeaderProps> = ({ activePage, setActivePage }) => {
  const { isAnalysisRunning, isTrainingRunning } = useAnalysis();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isAdmin } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fonction pour générer les classes CSS des boutons
  const getButtonClass = (pageName: string, disabled = false, isMobile = false) => {
    const isActive = location.pathname === `/${pageName}` || activePage === pageName;

    if (disabled) {
      return `flex items-center px-4 py-2 rounded-md text-gray-400 bg-emerald-700 opacity-50 cursor-not-allowed ${isMobile ? 'w-full justify-start' : ''}`;
    }

    return `flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
      isActive
        ? 'bg-emerald-600 text-white'
        : 'text-gray-200 hover:bg-emerald-800'
    } ${isMobile ? 'w-full justify-start' : ''}`;
  };

  // Fonction pour naviguer vers une page
  const navigateToPage = (pageName:string) => {
    setActivePage(pageName);
    navigate(`/${pageName}`);
    setIsMobileMenuOpen(false); // Fermer le menu mobile après la navigation
  };

  const handleSignOut = () => {
    signOut(() => navigate("/"));
  };

  const navLinks = (isMobile = false) => (
    <>
      <li>
        <button
          onClick={() => navigateToPage('hierarchical-data')}
          className={getButtonClass('hierarchical-data', false, isMobile)}
        >
          <Layers className="mr-2 h-5 w-5" />
          Données Hiérarchiques
        </button>
      </li>
      <li>
        <button
          onClick={() => navigateToPage('prediction')}
          className={getButtonClass('prediction', isTrainingRunning, isMobile)}
          disabled={isTrainingRunning}
        >
          <Cpu className="mr-2 h-5 w-5" />
          Prédiction
        </button>
      </li>
      <li>
        <button
          onClick={() => navigateToPage('metrics')}
          className={getButtonClass('metrics', isTrainingRunning, isMobile)}
          disabled={isTrainingRunning}
        >
          <Sliders className="mr-2 h-5 w-5" />
          Métrique de Performance
        </button>
      </li>
      <li>
        <button
          onClick={() => navigateToPage('statistics')}
          className={getButtonClass('statistics', isAnalysisRunning, isMobile)}
          disabled={isAnalysisRunning}
        >
          <BarChart2 className="mr-2 h-5 w-5" />
          Statistiques
        </button>
      </li>
      {isAdmin && (
        <>
          <li>
            <button
              onClick={() => navigateToPage('nettoyage')}
              className={getButtonClass('nettoyage', false, isMobile)}
            >
              <UploadCloud className="mr-2 h-5 w-5" />
              Fusion
            </button>
          </li>
          <li>
            <button
              onClick={() => navigateToPage('entrainement')}
              className={getButtonClass('entrainement', false, isMobile)}
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Entraînement
            </button>
          </li>
        </>
      )}
    </>
  );

  return (
    <header className="bg-emerald-700 text-white shadow-md w-full">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <h1 className="text-2xl font-bold">107 DEF dashboard</h1>
          {/* Menu pour les grands écrans */}
          <ul className="hidden md:flex items-center space-x-4">
            {navLinks()}
          </ul>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-black">
            <NotificationBell />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full bg-emerald-600 hover:bg-emerald-800">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                  <AvatarFallback className="bg-emerald-500 text-white">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link to="/profile">
                <DropdownMenuItem className="cursor-pointer">
                  Profil
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer" disabled>
                Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={handleSignOut}
              >
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bouton du menu Hamburger pour mobile */}
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Menu déroulant pour mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-emerald-700">
          <ul className="flex flex-col items-start space-y-2 px-4 pb-4">
            {navLinks(true)}
          </ul>
        </div>
      )}
    </header>
  );
};