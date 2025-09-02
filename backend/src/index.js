import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import http from 'http'; 
import { Server } from 'socket.io'; 

import predictionRoutes from './routes/predictionRoutes.js';
import statisticsRoutes from './routes/statisticsRoutes.js';
import cleaningRoutes from './routes/cleaningRoutes.js';
import pipelineRoutes from './routes/pipelineRoutes.js'; 
import notificationRoutes from './routes/notificationRoutes.js';
import trainingRoutes from './routes/trainingRoutes.js';

// --- Configuration initiale ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// --- CONFIGURATION DE SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, { 
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// --- GESTION DE L'ÉTAT GLOBAL ---
export let analysisStatus = 'idle';
export let pipelineStatus = {
  status: 'idle',
  results: [],
  error: null,
};
export let trainingStatus = {
  status: 'idle',
  error: null,
  message: null,
};

io.on('connection', (socket) => {
  console.log('✅ Un utilisateur est connecté via WebSocket');
  
  // Envoyer les statuts actuels dès qu'un nouvel utilisateur se connecte
  socket.emit('analysis-status-update', analysisStatus);
  socket.emit('pipeline-status-update', pipelineStatus);
  socket.emit('training-status-update', trainingStatus);
  
  socket.on('disconnect', () => {
    console.log('❌ Un utilisateur s\'est déconnecté');
  });
});

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Définition des points d'accès de l'API ---
app.use('/api/predictions', predictionRoutes);
app.use('/api/stats', statisticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cleaning', cleaningRoutes); 
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/training', trainingRoutes);

// --- ROUTES DE STATUT ---
app.get('/api/analysis/status', (req, res) => {
  res.status(200).json({ status: analysisStatus });
});

app.get('/', (req, res) => {
  res.send('API du serveur de traitement de données est en cours d\'exécution.');
});

// --- Démarrage du serveur ---
const startServer = async () => {
  try {
    await connectDB();
    console.log("Connecté avec succès à Azure MongoDB.");
    server.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Échec du démarrage", error);
    process.exit(1);
  }
};

startServer();

// --- Fonctions de mise à jour de l'état ---
export const getIo = () => io;

export const setAnalysisStatus = (newStatus) => {
  analysisStatus = newStatus;
  io.emit('analysis-status-update', analysisStatus);
};

export const setPipelineStatus = (newStatus) => {
  pipelineStatus = newStatus;
  // Note: l'émission est gérée dans le controller pour plus de flexibilité
};

export const setTrainingStatus = (newStatus) => {
  trainingStatus = newStatus;
  // Émission de l'événement de mise à jour du statut à tous les clients
  io.emit('training-status-update', trainingStatus);
};