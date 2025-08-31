import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api, runFullPipelineInMemory } from '../services/api'; 

interface AnalysisContextType {
  isAnalysisRunning: boolean;
  isPipelineRunning: boolean;
  pipelineResults: any[];
  pipelineError: string | null;
  startPipeline: (files: { [key: string]: File | null }) => Promise<void>;
  stopPipeline: () => void;
  startStatisticsGeneration: (line: string) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};

interface AnalysisProviderProps {
  children: ReactNode;
}

export const AnalysisProvider: React.FC<AnalysisProviderProps> = ({ children }) => {
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineResults, setPipelineResults] = useState<any[]>([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const checkPipelineStatus = useCallback(async () => {
    try {
      const status = await api.getPipelineStatus();
      setIsPipelineRunning(status.status === 'running');
      
      if (status.status === 'finished' && status.results.length > 0) {
        setPipelineResults(status.results);
      } else if (status.status === 'error') {
        setPipelineError(status.error);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut du pipeline:', error);
      setIsPipelineRunning(false); 
    }
  }, []);

  const checkAnalysisStatus = useCallback(async () => {
    try {
      const { status } = await api.getAnalysisStatus();
      setIsAnalysisRunning(status === 'running');
    } catch (error) {
      console.error("Erreur lors de la vérification du statut de l'analyse:", error);
      setIsAnalysisRunning(false);
    }
  }, []);

  useEffect(() => {
    checkPipelineStatus();
    checkAnalysisStatus();
    const interval = setInterval(() => {
      checkPipelineStatus();
      checkAnalysisStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [checkPipelineStatus, checkAnalysisStatus]);

  const startStatisticsGeneration = async (line: string) => {
    setIsAnalysisRunning(true);
    try {
      await api.generateStatisticsFromMongoDB(line);
      // Le statut sera mis à jour via le polling de checkAnalysisStatus
    } catch (error) {
      console.error("Erreur lors du lancement de l'analyse:", error);
      setIsAnalysisRunning(false); // Remettre à false uniquement en cas d'erreur immédiate
    }
  };

  const startPipeline = async (files: { [key: string]: File | null }) => {
    setIsPipelineRunning(true);
    setPipelineResults([]);
    setPipelineError(null);

    try {
      await runFullPipelineInMemory(files);

    } catch (err) {

      if (err instanceof Error) {
        setPipelineError(err.message);
      } else {
        setPipelineError('Erreur de communication avec le serveur.');
      }

      setIsPipelineRunning(false);
    }

  };


  const stopPipeline = () => {
    console.log("Annulation du pipeline demandée.");
    setIsPipelineRunning(false);
  };

  const value: AnalysisContextType = {
    isAnalysisRunning,
    isPipelineRunning,
    pipelineResults,
    pipelineError,
    startStatisticsGeneration,
    startPipeline,
    stopPipeline,
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};