import Notification from '../models/Notification.js';
import { getIo } from '../index.js';


export const createNotification = async (data) => {
  try {
    const notification = new Notification(data);
    await notification.save();
  
    getIo().emit('new-notification', notification);
    
    console.log('Nouvelle notification créée et diffusée:', notification.message);
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ timestamp: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications.' });
  }
};


export const markNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ message: 'Notifications marquées comme lues.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des notifications.' });
  }
};