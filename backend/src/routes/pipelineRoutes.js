// backend/routes/pipelineRoutes.js

import express from 'express';
import multer from 'multer';

// On importe la logique depuis notre nouveau fichier contrôleur
import { runPipelineInMemory } from '../controllers/pipelineController.js';

const router = express.Router();

// Configuration de Multer pour garder les fichiers en mémoire (RAM)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Définition de la route :
// 1. Point d'accès : POST /api/pipeline/run-in-memory
// 2. Middleware : `upload.any()` pour traiter les fichiers uploadés
// 3. Contrôleur : `runPipelineInMemory` pour exécuter la logique
router.post('/run-in-memory', upload.any(), runPipelineInMemory);

export default router;