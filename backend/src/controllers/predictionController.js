import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Fonction de connexion MongoDB
const get_mongodb_connection = () => {
  try {
    const mongodb_uri = process.env.MONGODB_URI;
    if (!mongodb_uri) {
      throw new Error("MONGODB_URI non trouvée dans les variables d'environnement");
    }
    
    const client = new MongoClient(mongodb_uri);
    return client;
  } catch (error) {
    console.error("Erreur de connexion MongoDB:", error);
    return null;
  }
};

// Helper pour obtenir le chemin du script et du répertoire de travail
const getScriptPaths = (scriptName) => {
    const utilsDir = path.join(__dirname, '..', 'utils');
    return {
        scriptPath: path.join(utilsDir, scriptName),
        // Le répertoire de travail est le dossier 'backend', où se trouve le .env
        cwd: path.join(__dirname, '..') 
    };
};

// Fonction générique pour appeler un script Python et gérer la réponse
const callPythonScript = (res, command, ...args) => {
    const { scriptPath, cwd } = getScriptPaths('predict.py');
    const pythonProcess = spawn('python', [scriptPath, command, ...args], { cwd });

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });
    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`--- ERREUR SCRIPT PYTHON [${command}] ---`);
            console.error(`Code de sortie: ${code}`);
            console.error(`Message d'erreur:\n${errorString}`);
            console.error(`--- FIN ERREUR ---`);
            return res.status(500).json({
                error: `Le script Python a échoué pour la commande '${command}'.`,
                details: errorString
            });
        }
        try {
            res.status(200).json(JSON.parse(dataString));
        } catch (e) {
            console.error(`Erreur de parsing JSON pour la commande '${command}':`, e);
            res.status(500).json({
                error: "Réponse invalide du script Python (pas un JSON valide).",
                rawOutput: dataString
            });
        }
    });
};


export const getPrediction = (req, res) => {
    const { model_name, features } = req.body;
    if (!model_name || !features) {
        return res.status(400).json({ error: "Les paramètres 'model_name' et 'features' sont requis." });
    }
    const featuresJsonString = JSON.stringify(features);
    callPythonScript(res, 'predict', model_name, featuresJsonString);
};

export const getModelFeatures = (req, res) => {
    const { line } = req.body;
    if (!line) {
        return res.status(400).json({ error: "Le paramètre 'line' est requis." });
    }
    callPythonScript(res, 'get_features', line);
};

export const getModelMetrics = (req, res) => {
    const { model_name } = req.body;
    if (!model_name) {
        return res.status(400).json({ error: "Le paramètre 'model_name' est requis." });
    }
    callPythonScript(res, 'get_metrics', model_name);
};

export const getModelEquation = (req, res) => {
    const { model_name } = req.body;
    if (!model_name) {
        return res.status(400).json({ error: "Le paramètre 'model_name' est requis." });
    }
    callPythonScript(res, 'get_equation', model_name);
};

// --- Fonctions pour les courbes et graphiques (utilisent fs, pas de script Python) ---

const cleanTargetName = (targetName) => {
    return targetName
        .replace(/\s+/g, '_')
        .replace(/%/g, 'pct')
        .replace(/-/g, '_');
};

const getModelFilePath = (modelName, fileSuffix) => {
    const modelsDir = path.join(__dirname, '..', 'utils', 'models');
    return path.join(modelsDir, `${modelName}${fileSuffix}`);
};




export const getLearningCurveData = async (req, res) => {
  const { modelName, ligne, targetName } = req.query;
  
  try {
    // Récupérer depuis MongoDB au lieu du système de fichiers
    const client = get_mongodb_connection();
    if (!client) {
      return res.status(500).json({ error: "Connexion MongoDB échouée" });
    }
    
    const db = client.db('107_DEF_KPI_dashboard');
    const collection = db.collection('models');
    
    const cleanTargetName = targetName
      .replace(/\s+/g, '_')
      .replace(/%/g, 'pct')
      .replace(/-/g, '_');
    
    const modelDocName = `${modelName.toLowerCase()}_${ligne}_${cleanTargetName}`;
    const modelDoc = await collection.findOne({ name: modelDocName });
    
    if (!modelDoc || !modelDoc.learning_curve) {
      return res.status(404).json({ error: "Courbe d'apprentissage non trouvée" });
    }
    
    res.json(modelDoc.learning_curve);
    
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getPredictionPlotData = async (req, res) => {
  const { modelName } = req.query;
  
  try {
    // Récupérer depuis MongoDB
    const client = get_mongodb_connection();
    if (!client) {
      return res.status(500).json({ error: "Connexion MongoDB échouée" });
    }
    
    const db = client.db('107_DEF_KPI_dashboard');
    const collection = db.collection('models');
    
    const modelDoc = await collection.findOne({ name: modelName });
    
    if (!modelDoc || !modelDoc.predictions) {
      return res.status(404).json({ error: "Données de prédiction non trouvées" });
    }
    
    res.json(modelDoc.predictions);
    
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: error.message });
  }
};