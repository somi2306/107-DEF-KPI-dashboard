

import express from 'express';
import multer from 'multer';
import { runPipelineInMemory,getPipelineStatus,cancelPipeline} from '../controllers/pipelineController.js';

const router = express.Router();

// Configuration de Multer pour garder les fichiers en mémoire (RAM)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/run-in-memory', upload.any(), runPipelineInMemory);
router.get('/status', getPipelineStatus); 
router.post('/cancel', cancelPipeline);
export default router;