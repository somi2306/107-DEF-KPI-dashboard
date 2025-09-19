
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUser } from '@clerk/clerk-react';
import { Loader } from 'lucide-react';
import { toast } from 'react-hot-toast'; 

const AdminProtectedRoute: React.FC = () => {
  const { isAdmin, isLoading: isAdminLoading } = useAuthStore();
  const { isLoaded: isUserLoaded } = useUser();

  // Afficher un indicateur de chargement
  if (isAdminLoading || !isUserLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="animate-spin h-10 w-10 text-emerald-600" />
      </div>
    );
  }

  // Si l'utilisateur n'est pas admin, le rediriger
  if (!isAdmin) {
    toast.error("Accès refusé. Vous devez être administrateur", {
      duration: 4000,
    });
    return <Navigate to="/hierarchical-data" replace />;
  }

  // Si l'utilisateur est admin, afficher le contenu
  return <Outlet />;
};

export default AdminProtectedRoute;