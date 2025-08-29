

import React, { createContext, useState, useContext, useEffect} from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import { io, Socket } from 'socket.io-client'; 
import { API_BASE_URL } from '../lib/constants'; 

interface AnalysisContextType {
  isAnalysisRunning: boolean;
  startStatisticsGeneration: (line: string) => Promise<void>;
  error: string | null;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);


const SOCKET_URL = API_BASE_URL.replace('/api', '');

export const AnalysisProvider = ({ children }: { children: ReactNode }) => {
  const [isAnalysisRunning, setIsAnalysisRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Établir la connexion WebSocket une seule fois
    const socket: Socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Connecté au serveur WebSocket avec ID:', socket.id);
    });

    // Écouter les mises à jour de statut envoyées par le serveur
    socket.on('analysis-status-update', (status: 'idle' | 'running') => {
      console.log('Mise à jour du statut reçue:', status);
      setIsAnalysisRunning(status === 'running');
    });

    socket.on('disconnect', () => {
      console.log('Déconnecté du serveur WebSocket');
    });

    // Nettoyer la connexion quand le composant est démonté
    return () => {
      socket.disconnect();
    };
  }, []); // Le tableau vide assure que l'effet s'exécute une seule fois

  const startStatisticsGeneration = async (line: string) => {
    // Elle se contente de déclencher le processus. Le serveur s'occupera de la diffusion.
    setError(null);
    try {
      await api.generateStatistics(line);
      // L'alerte de succès est optionnelle, le popup disparaîtra automatiquement
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message;
      setError(errorMessage);
      alert(`Erreur lors du lancement de l'analyse : ${errorMessage}`);
      // L'état isAnalysisRunning sera automatiquement remis à 'false' par le serveur
    }
  };

  return (
    <AnalysisContext.Provider value={{ isAnalysisRunning, startStatisticsGeneration, error }}>
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};