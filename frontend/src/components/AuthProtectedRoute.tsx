import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Loader } from 'lucide-react';
import { toast } from 'react-hot-toast'; // 1. Importer le toast

const AuthProtectedRoute: React.FC = () => {
  const { isSignedIn, isLoaded } = useUser();

  // Attendre que Clerk ait fini de vérifier l'état de connexion
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <Loader className="animate-spin h-10 w-10 text-emerald-600" />
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté, le rediriger
  if (!isSignedIn) {
    // 2. Ajouter la notification d'erreur avec un id unique
    toast.error("Veuillez vous connecter pour accéder à cette page.", {
      id: 'auth-required-error',
    });
    return <Navigate to="/" replace />;
  }

  // Si l'utilisateur est bien connecté, afficher la page demandée
  return <Outlet />;
};

export default AuthProtectedRoute;