import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Loader } from 'lucide-react';

const PublicOnlyRoute: React.FC = () => {
  const { isSignedIn, isLoaded } = useUser();

  // Attendre que Clerk ait fini de vérifier l'état de connexion
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <Loader className="animate-spin h-10 w-10 text-emerald-600" />
      </div>
    );
  }

  // Si l'utilisateur EST connecté, le rediriger vers la page principale
  if (isSignedIn) {
    return <Navigate to="/hierarchical-data" replace />;
  }

  // Si l'utilisateur n'est PAS connecté, afficher la page publique (connexion, etc.)
  return <Outlet />;
};

export default PublicOnlyRoute;