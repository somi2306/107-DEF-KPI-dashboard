import React from 'react';
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
import { BarChart2, Cpu, UploadCloud, Layers, Sliders, PlayCircle} from 'lucide-react';

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

  // Fonction pour générer les classes CSS des boutons
  const getButtonClass = (pageName: string, disabled = false) => {
    const isActive = location.pathname === `/${pageName}` || activePage === pageName;
    
    if (disabled) {
      return "flex items-center px-4 py-2 rounded-md text-gray-400 bg-emerald-700 opacity-50 cursor-not-allowed";
    }
    
    return `flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
      isActive
        ? 'bg-emerald-600 text-white'
        : 'text-gray-200 hover:bg-emerald-800'
    }`;
  };

  // Fonction pour naviguer vers une page
  const navigateToPage = (pageName: string) => {
    setActivePage(pageName);
    navigate(`/${pageName}`);
  };

  const handleSignOut = () => {
    signOut(() => navigate("/"));
  };

  return (
    <header className="bg-emerald-700 text-white shadow-md w-full">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <h1 className="text-2xl font-bold">107 DEF Pred-Analytics</h1>
          <ul className="flex items-center space-x-4">
            <li>
              <button 
                onClick={() => navigateToPage('hierarchical-data')} 
                className={getButtonClass('hierarchical-data')}
              >
                <Layers className="mr-2 h-5 w-5" />
                Données Hiérarchiques
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigateToPage('prediction')} 
                className={getButtonClass('prediction', isTrainingRunning)}
                disabled={isTrainingRunning}
              >
                <Cpu className="mr-2 h-5 w-5" />
                Prédiction
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigateToPage('metrics')} 
                className={getButtonClass('metrics', isTrainingRunning)}
                disabled={isTrainingRunning}
              >
                <Sliders className="mr-2 h-5 w-5" />
                Métrique de Performance
              </button>
            </li>
            <li>
              <button
                onClick={() => navigateToPage('statistics')}
                className={getButtonClass('statistics', isAnalysisRunning)}
                disabled={isAnalysisRunning}
              >
                <BarChart2 className="mr-2 h-5 w-5" />
                Statistiques
              </button>
            </li>
            
            {/* Afficher les onglets Fusion et Entraînement seulement pour les administrateurs */}
            {isAdmin && (
              <>
                <li>
                  <button 
                    onClick={() => navigateToPage('nettoyage')} 
                    className={getButtonClass('nettoyage')}
                  >
                    <UploadCloud className="mr-2 h-5 w-5" />
                    Fusion
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigateToPage('entrainement')} 
                    className={getButtonClass('entrainement')}
                  >
                    <PlayCircle className="mr-2 h-5 w-5" />
                    Entraînement
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Ajout d'une div wrapper avec text-black pour forcer la couleur */}
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
        </div>
      </nav>
    </header>
  );
};