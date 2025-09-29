import { createContext, useState, useContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';

interface Notification {
  _id: string;
  message: string;
  status: 'in-progress' | 'completed' | 'failed';
  isRead: boolean;
  timestamp: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: () => void;
  playNotificationSound: () => void;
  isSoundEnabled: boolean;
  toggleSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || '').replace('/api', '');

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialiser l'audio
  useEffect(() => {
    audioRef.current = new Audio('/notification.mpeg');
    audioRef.current.volume = 1; // Volume à 100%
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fonction pour jouer le son de notification
  const playNotificationSound = () => {
    if (!isSoundEnabled || !audioRef.current) return;
    
    try {
      // Réinitialiser l'audio pour pouvoir le rejouer
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.warn("Erreur lors de la lecture du son:", error);
      });
    } catch (error) {
      console.warn("Erreur avec l'audio:", error);
    }
  };

  // Toggle pour activer/désactiver le son
  const toggleSound = () => {
    setIsSoundEnabled(prev => !prev);
  };

  // Charger les notifications initiales
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await api.getNotifications();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      } catch (error) {
        console.error("Erreur chargement notifications:", error);
      }
    };
    fetchNotifications();
  }, []);

  // Écouter les nouvelles notifications en temps réel
  useEffect(() => {
    const socket: Socket = io(SOCKET_URL);
    
    socket.on('new-notification', (newNotification: Notification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Jouer le son uniquement pour les nouvelles notifications (pas au chargement initial)
      playNotificationSound();
    });

    return () => { 
      socket.disconnect(); 
    };
  }, [isSoundEnabled]); // Dépendance à isSoundEnabled

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api.markNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erreur maj notifications:", error);
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    playNotificationSound,
    isSoundEnabled,
    toggleSound,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};