import { createContext, useState, useContext, useEffect } from 'react';
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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || '').replace('/api', '');

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
    });
    return () => { socket.disconnect(); };
  }, []);

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

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};