

import express from 'express';
import cors from 'cors';


const app = express();
const PORT = process.env.PORT || 5000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Routes ---

app.listen(PORT, () => {
    console.log(`Serveur Node.js (ESM) démarré sur http://localhost:5000`);
});