// src/components/ProcessProtectionRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAnalysis } from '@/providers/AnalysisProvider';
import { toast } from 'react-hot-toast';

type ProcessProtectionRouteProps = {
  /** Spécifie le type de processus qui bloque l'accès à la route */
  blockWhen: 'analysisRunning' | 'trainingRunning';
};

const ProcessProtectionRoute: React.FC<ProcessProtectionRouteProps> = ({ blockWhen }) => {
  const { isAnalysisRunning, isTrainingRunning } = useAnalysis();

  const isBlocked = 
    (blockWhen === 'analysisRunning' && isAnalysisRunning) || 
    (blockWhen === 'trainingRunning' && isTrainingRunning);

  if (isBlocked) {
    // Optionnel : Avertir l'utilisateur pourquoi il est redirigé
    toast.error("Cette page est inaccessible pendant qu'un processus est en cours", {
      duration: 4000,
    });
    
    // Rediriger l'utilisateur vers la page d'accueil
    return <Navigate to="/hierarchical-data" replace />;
  }

  // Si la route n'est pas bloquée, afficher le contenu
  return <Outlet />;
};

export default ProcessProtectionRoute;