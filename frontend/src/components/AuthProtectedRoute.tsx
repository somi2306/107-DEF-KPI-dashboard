import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Loader } from 'lucide-react';

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

  // Si l'utilisateur n'est pas connecté, le rediriger vers la page d'accueil
  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  // Si l'utilisateur est bien connecté, afficher la page demandée
  return <Outlet />;
};

export default AuthProtectedRoute;