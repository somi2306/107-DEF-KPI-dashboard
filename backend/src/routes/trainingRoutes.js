import express from 'express';
import * as trainingController from '../controllers/trainingController.js';

const router = express.Router();

router.post('/start', trainingController.startTraining);
router.get('/status', trainingController.getTrainingStatus);

export default router;