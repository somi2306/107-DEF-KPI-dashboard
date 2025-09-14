import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import http from 'http'; 
import { Server } from 'socket.io'; 
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import predictionRoutes from './routes/predictionRoutes.js';
import statisticsRoutes from './routes/statisticsRoutes.js';
import cleaningRoutes from './routes/cleaningRoutes.js';
import pipelineRoutes from './routes/pipelineRoutes.js'; 
import notificationRoutes from './routes/notificationRoutes.js';
import trainingRoutes from './routes/trainingRoutes.js';
import authRoutes from "./routes/authRoute.js";
import adminRoutes from "./routes/adminRoute.js";
import userRoutes from "./routes/userRoute.js";
import { clerkMiddleware } from '@clerk/express'

// --- Configuration initiale ---
dotenv.config();
const app = express();

const PORT = process.env.PORT || 5000;

// +++ MODIFICATION POUR LE DÉPLOIEMENT +++
// Définir l'URL du frontend autorisée en fonction de l'environnement
const frontendURL = process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:5173';

// --- CONFIGURATION DE SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, { 
  cors: {
    origin: frontendURL, // Utiliser la variable ici aussi
    methods: ["GET", "POST"],
    credentials: true
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  
  socket.emit('analysis-status-update', analysisStatus);
  socket.emit('pipeline-status-update', pipelineStatus);
  socket.emit('training-status-update', trainingStatus);
  
  socket.on('disconnect', () => {
    console.log('❌ Un utilisateur s\'est déconnecté');
  });
});

// --- MIDDLEWARES ---
// +++ MODIFICATION POUR LE DÉPLOIEMENT +++
app.use(cors({
  origin: frontendURL, // Utiliser la variable ici
  credentials: true
}));
app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(clerkMiddleware())
app.use(helmet());

// --- Définition des points d'accès de l'API ---

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
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



// --- Servir les fichiers statiques du frontend en production ---
// NOTE: Cette section est utile pour Render, mais pas nécessaire pour Vercel car le frontend et le backend sont déployés séparément.
// Vous pouvez la laisser, elle ne causera pas de problème.
// --- Servir les fichiers statiques du frontend en production ---
if (process.env.NODE_ENV === "production") {
  // Chemin corrigé pour pointer vers le dossier 'dist' à la racine
  app.use(express.static(path.join(__dirname, "../../dist"))); 

  app.use((req, res) => {
    // Chemin corrigé pour le fichier index.html
    res.sendFile(path.join(__dirname, "../../dist/index.html"));
  });
}

if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

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
};

export const setTrainingStatus = (newStatus) => {
  trainingStatus = newStatus;
  io.emit('training-status-update', trainingStatus);
};

