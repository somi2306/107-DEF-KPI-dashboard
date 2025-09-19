import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAnalysis } from '@/providers/AnalysisProvider';
import { toast } from 'react-hot-toast';

type ProcessProtectionRouteProps = {
  blockWhen: 'analysisRunning' | 'trainingRunning';
};

const ProcessProtectionRoute: React.FC<ProcessProtectionRouteProps> = ({ blockWhen }) => {
  const { isAnalysisRunning, isTrainingRunning } = useAnalysis();

  const isBlocked = 
    (blockWhen === 'analysisRunning' && isAnalysisRunning) || 
    (blockWhen === 'trainingRunning' && isTrainingRunning);

  if (isBlocked) {
    toast.error("Cette page est inaccessible pendant qu'un processus est en cours", {
      duration: 4000,
    });
    
    // Rediriger l'utilisateur vers la page 
    return <Navigate to="/hierarchical-data" replace />;
  }
  // Si la route n'est pas bloquée, afficher le contenu
  return <Outlet />;
};

export default ProcessProtectionRoute;