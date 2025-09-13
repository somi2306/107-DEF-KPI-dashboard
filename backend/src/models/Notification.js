import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  status: { type: String, enum: ['in-progress', 'completed', 'failed'], required: true },
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;