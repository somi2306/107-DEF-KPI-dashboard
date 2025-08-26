import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Helper pour obtenir le chemin du dossier courant (__dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPythonScriptPath = (scriptName) => {
    return path.join(__dirname, '..', 'utils', scriptName);
};

// Helper pour nettoyer le nom de la cible pour le nom de fichier
function cleanTargetName(targetName) {
    // Conserve les accents pour correspondre aux noms de fichiers réels
    return targetName
        .replace(/\s+/g, '_')  // Remplace un ou plusieurs espaces par un seul underscore
        .replace(/%/g, 'pct')   // Remplace '%' par 'pct'
        .replace(/-/g, '_'); 
}


export const getPrediction = (req, res) => {
    const { model_name, features } = req.body;

    if (!model_name || !features) {
        return res.status(400).json({ error: "Les paramètres 'model_name' et 'features' sont requis." });
    }

    const featuresJsonString = JSON.stringify(features);
    const pythonScriptPath = getPythonScriptPath('predict.py');
    const pythonProcess = spawn('python', [pythonScriptPath, 'predict', model_name, featuresJsonString]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => dataString += data.toString());
    pythonProcess.stderr.on('data', (data) => errorString += data.toString());

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Erreur du script Python (predict): ${errorString}`);
            return res.status(500).json({ error: "Erreur script prédiction.", details: errorString });
        }
        try {
            res.status(200).json(JSON.parse(dataString));
        } catch (e) {
            res.status(500).json({ error: "Erreur parsing réponse (prédiction)." });
        }
    });
};

export const getModelFeatures = (req, res) => {
    const { line } = req.body;
    if (!line) return res.status(400).json({ error: "Le paramètre 'line' est requis." });
    
    const pythonScriptPath = getPythonScriptPath('predict.py');
    const pythonProcess = spawn('python', [pythonScriptPath, 'get_features', line]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => dataString += data.toString());
    pythonProcess.stderr.on('data', (data) => errorString += data.toString());

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Erreur du script Python (get_features): ${errorString}`);
            return res.status(500).json({ error: "Erreur récupération features.", details: errorString });
        }
        try {
            res.status(200).json(JSON.parse(dataString));
        } catch (e) {
            res.status(500).json({ error: "Erreur parsing réponse (features)." });
        }
    });
};

export const getModelMetrics = (req, res) => {
    const { model_name } = req.body;
    if (!model_name) return res.status(400).json({ error: "Le paramètre 'model_name' est requis." });
    
    const pythonScriptPath = getPythonScriptPath('predict.py');
    const pythonProcess = spawn('python', [pythonScriptPath, 'get_metrics', model_name]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => dataString += data.toString());
    pythonProcess.stderr.on('data', (data) => errorString += data.toString());

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Erreur du script Python (metrics): ${errorString}`);
            return res.status(500).json({ error: "Erreur récupération métriques.", details: errorString });
        }
        try {
            res.status(200).json(JSON.parse(dataString));
        } catch (e) {
            res.status(500).json({ error: "Erreur parsing réponse (métriques)." });
        }
    });
};


export const getModelEquation = (req, res) => {
    const { model_name } = req.body;
    if (!model_name) return res.status(400).json({ error: "Le paramètre 'model_name' est requis." });

    const pythonScriptPath = getPythonScriptPath('predict.py');
    const pythonProcess = spawn('python', [pythonScriptPath, 'get_equation', model_name]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
        console.log('[PYTHON STDOUT][equation]', data.toString());
    });
    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
        console.error('[PYTHON STDERR][equation]', data.toString());
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Erreur du script Python (equation): ${errorString}`);
            return res.status(500).json({ error: "Erreur récupération équation.", details: errorString });
        }
        try {
            // Extract last valid JSON object from stdout
            const lines = dataString.trim().split(/\r?\n/);
            let lastJson = null;
            for (let i = lines.length - 1; i >= 0; i--) {
                try {
                    lastJson = JSON.parse(lines[i]);
                    break;
                } catch {}
            }
            if (lastJson) {
                res.status(200).json(lastJson);
            } else {
                res.status(500).json({ error: "Erreur parsing réponse (équation).", details: dataString });
            }
        } catch (e) {
            res.status(500).json({ error: "Erreur parsing réponse (équation).", details: dataString });
        }
    });
};


export const getVisualization = (req, res) => {
  const { model, ligne, imputation: targetName } = req.query;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  let modelFileNamePart;
  let modelForPython;

  const modelLower = model.toLowerCase();
  if (modelLower.includes('randomforest')) {
    modelFileNamePart = 'randomforestregressor';
    modelForPython = 'random_forest';
  } else if (modelLower.includes('gradientboosting')) {
    modelFileNamePart = 'gradientboostingregressor';
    modelForPython = 'gradient_boosting';
  } else {
    return res.status(400).json({ error: "Type de modèle non supporté." });
  }

  // Nettoyage du nom de la cible pour le nom de fichier
  const targetForFilename = cleanTargetName(targetName);
  const modelFileName = `${modelFileNamePart}_${ligne}_${targetForFilename}.joblib`;
  const modelPath = path.join(__dirname, '..', 'utils', 'models', modelFileName);
  
  const dataImputationMethod = 'ffill'; // On utilise un fichier de données connu
  const dataFileName = `Fusion_107${ligne}_KPIs_${dataImputationMethod}.xlsx`;
  const dataPath = path.join(__dirname, '..', 'data', `ligne ${ligne}`, dataFileName);

  if (!fs.existsSync(modelPath)) {
    return res.status(404).json({
        error: "Fichier du MODÈLE (.joblib) introuvable.",
        details: `Le serveur a cherché ce fichier : ${modelPath}`
    });
  }
  if (!fs.existsSync(dataPath)) {
    return res.status(404).json({
        error: "Fichier de DONNÉES (.xlsx) introuvable.",
        details: `Le serveur a cherché ce fichier : ${dataPath}`
    });
  }

  const pythonScriptPath = path.join(__dirname, '..', 'utils', 'visualize_tree.py');
  

  // On passe le nom de la cible ('targetName') comme 4ème argument au script Python
  const pythonProcess = spawn('python', [pythonScriptPath, modelPath, dataPath, modelForPython, targetName]);

  let imagePath = '';
  pythonProcess.stdout.on('data', (data) => imagePath += data.toString());
  pythonProcess.stderr.on('data', (data) => console.error(`Erreur stderr (visualisation): ${data}`));
  
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
        return res.status(500).json({ error: "Le script Python a échoué. Vérifiez la console du backend." });
    }
    const finalImagePath = imagePath.trim();
    if (fs.existsSync(finalImagePath)) {
        res.sendFile(path.resolve(finalImagePath));
    } else {
        res.status(404).json({ error: "Image générée mais introuvable." });
    }
  });
};

export const getTreeData = (req, res) => {
  const { model, ligne, imputation: targetName } = req.query;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  let modelFileNamePart;
  let modelForPython;

  const modelLower = model.toLowerCase();
  if (modelLower.includes('randomforest')) {
    modelFileNamePart = 'randomforestregressor';
    modelForPython = 'random_forest';
  } else if (modelLower.includes('gradientboosting')) {
    modelFileNamePart = 'gradientboostingregressor';
    modelForPython = 'gradient_boosting';
  } else {
    return res.status(400).json({ error: "Ce type de modèle ne peut pas être visualisé comme un arbre." });
  }

  // Nettoyage du nom de la cible pour le nom de fichier
  const targetForFilename = cleanTargetName(targetName);
  const modelFileName = `${modelFileNamePart}_${ligne}_${targetForFilename}.joblib`;
  const modelPath = path.join(__dirname, '..', 'utils', 'models', modelFileName);
  
  const dataImputationMethod = 'ffill';
  const dataFileName = `Fusion_107${ligne}_KPIs_${dataImputationMethod}.xlsx`;
  const dataPath = path.join(__dirname, '..', 'data', `ligne ${ligne}`, dataFileName);

  if (!fs.existsSync(modelPath) || !fs.existsSync(dataPath)) {
    return res.status(404).json({ error: "Le fichier modèle ou de données est introuvable pour cette sélection." });
  }

  const pythonScriptPath = path.join(__dirname, '..', 'utils', 'tree_to_json.py');
  const pythonProcess = spawn('python', [pythonScriptPath, modelPath, dataPath, modelForPython]);

  let jsonData = '';
  let errorData = '';
  pythonProcess.stdout.on('data', (data) => jsonData += data.toString());
  pythonProcess.stderr.on('data', (data) => errorData += data.toString());
  
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
        console.error(`Erreur du script Python (tree_to_json): ${errorData}`);
        return res.status(500).json({ error: "Le script Python a échoué lors de l'extraction de l'arbre." });
    }
    try {
        res.json(JSON.parse(jsonData));
    } catch(e) {
        res.status(500).json({ error: "Impossible de parser la structure JSON de l'arbre." });
    }
  });
};



// --- LA FORME DE L'ARBRE ---
export const getTreeShape = (req, res) => {
  const { model, ligne, imputation: targetName } = req.query;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  let modelFileNamePart;
  let modelForPython;

  const modelLower = model.toLowerCase();
  if (modelLower.includes('randomforest')) {
    modelFileNamePart = 'randomforestregressor';
    modelForPython = 'random_forest';
  } else if (modelLower.includes('gradientboosting')) {
    modelFileNamePart = 'gradientboostingregressor';
    modelForPython = 'gradient_boosting';
  } else {
    return res.status(400).json({ error: "Ce type de modèle n'a pas de forme d'arbre." });
  }

  // Nettoyage du nom de la cible pour le nom de fichier
  const targetForFilename = cleanTargetName(targetName);
  const modelFileName = `${modelFileNamePart}_${ligne}_${targetForFilename}.joblib`;
  const modelPath = path.join(__dirname, '..', 'utils', 'models', modelFileName);

  if (!fs.existsSync(modelPath)) {
    return res.status(404).json({ error: "Fichier modèle introuvable." });
  }

  const pythonScriptPath = path.join(__dirname, '..', 'utils', 'get_tree_shape.py');
  const pythonProcess = spawn('python', [pythonScriptPath, modelPath, modelForPython]);

  let jsonData = '';
  let errorData = '';
  pythonProcess.stdout.on('data', (data) => jsonData += data.toString());
  pythonProcess.stderr.on('data', (data) => errorData += data.toString());
  
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Erreur du script Python (get_tree_shape): ${errorData}`);
      return res.status(500).json({ error: "Le script Python a échoué." });
    }
    try {
      res.json(JSON.parse(jsonData));
    } catch(e) {
      res.status(500).json({ error: "Impossible de parser la réponse JSON." });
    }
  });
};


export const getAllTreeData = (req, res) => {
  const { modelName, ligne, targetName } = req.query;

  if (!modelName || !ligne || !targetName) {
    return res.status(400).json({ error: 'Les paramètres modelName, ligne et targetName sont requis.' });
  }
  
  // Construit le nom du fichier de la même manière que le hook frontend
  const modelFileNameBase = `${modelName.toLowerCase()}_${ligne}_${cleanTargetName(targetName)}`;
  
  // Chemin vers le fichier JSON qui contient les données de tous les arbres
  const treesDataPath = path.join(
    __dirname, 
    '..', 
    'utils', 
    'models', 
    `${modelFileNameBase}_trees_visualizations`, // Le dossier créé par le script python
    'all_trees_data.json' // Le fichier JSON généré
  );

  if (fs.existsSync(treesDataPath)) {
    try {
      const treesData = JSON.parse(fs.readFileSync(treesDataPath, 'utf-8'));
      res.json(treesData);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la lecture du fichier des données des arbres.' });
    }
  } else {
    // Si le fichier n'existe pas, renvoyer une erreur 404 claire
    res.status(404).json({ error: `Fichier de visualisation introuvable pour ce modèle: ${treesDataPath}` });
  }
};

export const getLearningCurveData = (req, res) => {
    const { modelName, ligne, targetName } = req.query;
    if (!modelName || !ligne || !targetName) return res.status(400).json({ error: 'Paramètres manquants.' });

    // Le nom est maintenant construit correctement
    const modelFileNameBase = `${modelName.toLowerCase()}_${ligne}_${cleanTargetName(targetName)}`;
    const lcDataPath = path.join(__dirname, '..', 'utils', 'models', `${modelFileNameBase}_learning_curve.json`);

    if (fs.existsSync(lcDataPath)) {
        res.sendFile(lcDataPath);
    } else {
        res.status(404).json({ error: `Fichier de la courbe d'apprentissage introuvable : ${lcDataPath}` });
    }
};

export const getPredictionPlotData = (req, res) => {
  const { modelName } = req.query;

  if (!modelName) {
    return res.status(400).json({ error: 'Le paramètre modelName est requis.' });
  }
  
  // Le frontend envoie déjà le nom de fichier complet et correct
  const plotDataPath = path.join(
    __dirname, 
    '..', 
    'utils', 
    'models', 
    `${modelName}_predictions.json` // Le fichier généré par le script d'entraînement
  );

  if (fs.existsSync(plotDataPath)) {
    try {
      const plotData = JSON.parse(fs.readFileSync(plotDataPath, 'utf-8'));
      res.json(plotData);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la lecture du fichier des prédictions.' });
    }
  } else {
    res.status(404).json({ error: `Fichier des prédictions introuvable : ${plotDataPath}` });
  }
};