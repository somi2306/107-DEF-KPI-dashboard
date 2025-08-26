

import express from 'express';
import cors from 'cors';
import predictionRoutes from './routes/predictionRoutes.js';
import statisticsRoutes from './routes/statisticsRoutes.js';
import cleaningRoutes from './routes/cleaningRoutes.js';


const app = express();
const PORT = process.env.PORT || 5000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use('/api', predictionRoutes);
app.use('/api/stats', statisticsRoutes);
app.use('/api/cleaning', cleaningRoutes); 



app.listen(PORT, () => {
    console.log(`Serveur Node.js (ESM) démarré sur http://localhost:5000`);
});