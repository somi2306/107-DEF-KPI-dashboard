import express from 'express';

import { getPrediction, getModelFeatures, getModelMetrics, getModelEquation,getLearningCurveData,getPredictionPlotData } from '../controllers/predictionController.js';
const router = express.Router();

router.post('/predict', getPrediction);
router.post('/features', getModelFeatures);
router.post('/metrics', getModelMetrics);
router.post('/equation', getModelEquation);
router.get('/learning-curve', getLearningCurveData); 
router.get('/prediction-plot', getPredictionPlotData);

export default router;