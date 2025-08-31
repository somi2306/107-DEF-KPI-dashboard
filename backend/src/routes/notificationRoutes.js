import express from 'express';
import { getNotifications, markNotificationsAsRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', getNotifications);
router.post('/mark-as-read', markNotificationsAsRead);

export default router;