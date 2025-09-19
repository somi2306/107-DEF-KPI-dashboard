import express from 'express';
import { 
  getStatistics, 
  getVariableNames, 
  getRelationData, 
  generateStatisticsFromMongoDB
} from '../controllers/statisticsController.js';

const router = express.Router();

router.get('/:line', getStatistics);
router.get('/variable-names/:line', getVariableNames);
router.get('/relations/:line/:var1/:var2', getRelationData);
router.post('/generate/:line', generateStatisticsFromMongoDB);

export default router;