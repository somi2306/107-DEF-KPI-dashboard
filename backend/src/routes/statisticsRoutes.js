

import express from 'express';
import { getDescriptiveStatistics, getVariableNames, getRelationStatistics, generateStatisticsFromMongoDB } from '../controllers/statisticsController.js';

const router = express.Router();

router.get('/analyze/:line', getDescriptiveStatistics);
router.get('/variable-names/:line', getVariableNames);
router.get('/relations/:line/:var1/:var2', getRelationStatistics);
router.post('/generate/:line', generateStatisticsFromMongoDB);

export default router;