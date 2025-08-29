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

// --- Configuration initiale ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// --- CONFIGURATION DE SOCKET.IO ---

const server = http.createServer(app); // un serveur http à partir de l'app Express
const io = new Server(server, { 
  cors: {
    origin: "*", // Autoriser les connexions de toutes origines (à ajuster en production)
    methods: ["GET", "POST"]
  }
});

// --- GESTION DE L'ÉTAT GLOBAL DE L'ANALYSE ---
export let analysisStatus = 'idle'; // 'idle' ou 'running'

io.on('connection', (socket) => {
  console.log('✅ Un utilisateur est connecté via WebSocket');
  
  // Envoyer le statut actuel dès qu'un nouvel utilisateur se connecte
  socket.emit('analysis-status-update', analysisStatus);

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
app.use('/api/cleaning', cleaningRoutes); 
app.use('/api/pipeline', pipelineRoutes);
app.get('/', (req, res) => {
  res.send('API du serveur de traitement de données est en cours d\'exécution.');
});


// --- Démarrage du serveur ---
const startServer = async () => {
  try {
    await connectDB();
    console.log("Connecté avec succès à MongoDB.");

    // Démarrer le serveur http (qui contient Express et Socket.IO)
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Échec du démarrage", error);
    process.exit(1);
  }
};

startServer();


export const getIo = () => io;
export const setAnalysisStatus = (newStatus) => {
  analysisStatus = newStatus;
};