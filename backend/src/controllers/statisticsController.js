import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Modifiez l'import en haut du fichier
import { 
  StatisticsResult, 
  StatisticsVariable, 
  StatisticsRelation 
} from '../models/StatisticsResult.js';
import { createNotification } from './notificationController.js';
import { getIo, setAnalysisStatus, analysisStatus } from '../index.js';
// Pour __dirname en ES module


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Récupère le document complet des statistiques pour une ligne donnée.
 */
export const getStatistics = async (req, res) => {
  const { line } = req.params;
  const fullLine = `107${line.toUpperCase()}`;

  try {
    // 1. Récupérer les métadonnées (ce qui fonctionnait déjà)
    const mainStats = await StatisticsResult.findOne({ Ligne: fullLine });
    
    if (!mainStats) {
      const message = `Les données statistiques pour la ligne ${fullLine} n'ont pas encore été générées.`;
      return res.status(404).json({ error: message });
    }

    // 2. Récupérer toutes les variables pour cette ligne
    const variables = await StatisticsVariable.find({ line: fullLine }).lean();
    const variablesObj = {};
    variables.forEach(v => {
      // Nettoyage pour ne garder que les données pertinentes
      const { _id, line, variable_name, __v, ...variableData } = v;
      variablesObj[variable_name] = variableData;
    });

    // 3. CORRECTION : Récupérer toutes les relations pour cette ligne
    const relations = await StatisticsRelation.find({ line: fullLine }).lean();
    const relationsObj = {};
    relations.forEach(r => {
      relationsObj[r.relation_key] = {
        variables: r.variables,
        type: r.type,
        ...r.data,
        chart_data: r.chart_data
      };
    });

    // 4. Assembler la réponse finale complète
    const completeStats = {
      Ligne: fullLine,
      Variables: variablesObj,
      Relations: relationsObj,
      metadata: mainStats.metadata
    };

    res.status(200).json(completeStats);

  } catch (error) {
    console.error(`Erreur lors de la récupération des statistiques pour la ligne ${fullLine}:`, error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques.' });
  }
};

/**
 * Lance le script Python pour générer les statistiques.
 * Le script se charge lui-même de sauvegarder les résultats dans la base de données.
 */
// Modifiez la fonction generateStatistics
export const generateStatisticsFromMongoDB = async (req, res) => {
  const { line } = req.params;
  const io = getIo();
  
  // Vérifier si une analyse est déjà en cours
  if (analysisStatus === 'running') {
    return res.status(409).json({ 
      error: "Une analyse est déjà en cours.",
      details: "Veuillez attendre la fin de l'analyse actuelle avant d'en lancer une nouvelle."
    });
  }

  // Mettre à jour le statut global ET émettre l'événement
  setAnalysisStatus('running');
  io.emit('analysis-status-update', 'running');
  
  const lineLetter = line.replace('107', '').toUpperCase();
  
  // Répondre immédiatement pour ne pas bloquer le client
  res.status(202).json({ 
    message: `L'analyse pour la ligne ${lineLetter} a été acceptée et démarrée.`,
    status: 'running'
  });

  // Créer la notification de début
  createNotification({
    message: `L'analyse statistique pour la ligne ${lineLetter} a commencé.`,
    status: 'in-progress'
  });

  try {
    // --- DÉBUT DE LA LOGIQUE DE VÉRIFICATION DU CHEMIN ---
    const path1 = 'src/utils/statistics_analyzer.py';
    const path2 = 'utils/statistics_analyzer.py';
    let scriptPath;

    if (fs.existsSync(path1)) {
        scriptPath = path1;
    } else if (fs.existsSync(path2)) {
        scriptPath = path2;
    } else {
        // Si le script est introuvable, on gère l'erreur proprement
        const errorMessage = `Le script d'analyse (${path1} ou ${path2}) est introuvable sur le serveur.`;
        console.error(`💥 ERREUR CRITIQUE: ${errorMessage}`);
        
        setAnalysisStatus('idle');
        io.emit('analysis-status-update', 'idle');
        
        createNotification({
            message: `Échec du lancement de l'analyse pour la ligne ${lineLetter}.`,
            status: 'failed',
            details: errorMessage
        });
        
        // Arrête l'exécution de la fonction ici
        return; 
    }
    
    console.log(`Lancement du script d'analyse pour la ligne ${lineLetter} via : ${scriptPath}`);
    const pythonProcess = spawn('python', [scriptPath, lineLetter]);
    // --- FIN DE LA LOGIQUE DE VÉRIFICATION DU CHEMIN ---


    let scriptOutput = '';
    let scriptError = '';

    pythonProcess.stdout.on('data', (data) => {
      scriptOutput += data.toString();
      console.log(`[Python stdout - Ligne ${lineLetter}]: ${data.toString()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      scriptError += data.toString();
      console.error(`[Python stderr - Ligne ${lineLetter}]: ${data.toString()}`);
    });

    pythonProcess.on('close', async (code) => {
      console.log(`📝 Script Python terminé avec code: ${code}`);
      
      // Mettre à jour le statut global ET émettre l'événement
      setAnalysisStatus('idle');
      io.emit('analysis-status-update', 'idle');
      
      if (code === 0) {
        console.log(`✅ Analyse statistique pour la ligne ${lineLetter} terminée avec succès.`);
        
        // Vérifier que les données ont bien été sauvegardées dans MongoDB
        try {
          const fullLine = `107${lineLetter}`;
          const statsExist = await StatisticsResult.findOne({ Ligne: fullLine });
          
          if (statsExist) {
            createNotification({
              message: `L'analyse statistique pour la ligne ${lineLetter} est terminée avec succès.`,
              status: 'completed'
            });
          } else {
            throw new Error('Aucune donnée trouvée dans MongoDB après exécution du script');
          }
        } catch (dbError) {
          console.error('❌ Erreur de vérification MongoDB:', dbError);
          createNotification({
            message: `L'analyse pour la ligne ${lineLetter} a terminé mais les données n'ont pas été sauvegardées correctement.`,
            status: 'failed'
          });
        }
      } else {
        console.error(`❌ Script d'analyse pour la ligne ${lineLetter} terminé avec le code ${code}.`);
        createNotification({
          message: `L'analyse statistique pour la ligne ${lineLetter} a échoué (code: ${code}).`,
          status: 'failed',
          details: scriptError || scriptOutput
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('💥 Erreur lors de l\'exécution du script Python:', error);
      
      // Mettre à jour le statut en cas d'erreur
      setAnalysisStatus('idle');
      io.emit('analysis-status-update', 'idle');
      
      createNotification({
        message: `Erreur lors de l'exécution de l'analyse pour la ligne ${lineLetter}.`,
        status: 'failed',
        details: error.message
      });
    });

  } catch (error) {
    console.error('💥 Erreur lors du lancement du script Python:', error);
    
    // Mettre à jour le statut en cas d'erreur
    setAnalysisStatus('idle');
    io.emit('analysis-status-update', 'idle');
    
    createNotification({
      message: `Erreur lors du lancement de l'analyse pour la ligne ${lineLetter}.`,
      status: 'failed',
      details: error.message
    });
  }
};


/**
 * Récupère les noms des variables quantitatives et qualitatives depuis la base de données.
 */
export const getVariableNames = async (req, res) => {
  const { line } = req.params;
  // Ajout : Convertir 'D' en '107D'
  const fullLine = `107${line.toUpperCase()}`; 

  try {
    const variables = await StatisticsVariable.find({ line: fullLine }).lean();

    if (!variables || variables.length === 0) {
      return res.status(404).json({ error: `Variables non trouvées pour la ligne ${fullLine}.` });
    }
    // ... suite du code
    const quantitative = [];
    const qualitative = [];

    variables.forEach(v => {
      if (v.type === 'quantitative') {
        quantitative.push(v.variable_name);
      } else if (v.type === 'qualitative') {
        qualitative.push(v.variable_name);
      }
    });

    res.status(200).json({ quantitative, qualitative });

  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/**
 * Récupère les données de relation entre deux variables spécifiques depuis la base de données.
 */
export const getRelationData = async (req, res) => {
  const { line, var1, var2 } = req.params;
  
  // Utiliser directement la ligne reçue (déjà "107D")
  const fullLine = line; // Pas besoin de conversion

  try {
    const relations = await StatisticsRelation.find({ 
      line: fullLine, // Utiliser "107D" directement
      variables: { $all: [var1, var2] } 
    }).lean();

    if (!relations || relations.length === 0) {
      return res.status(404).json({ 
        error: `Aucune relation trouvée entre ${var1} et ${var2} pour la ligne ${fullLine}.`
      });
    }

    const response = {
      Ligne: fullLine,
      Variables: {},
      Relations: relations.reduce((acc, r) => {
        acc[r.relation_key] = {
          variables: r.variables,
          ...r.data,
          chart_data: r.chart_data
        };
        return acc;
      }, {})
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Erreur dans getRelationData:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la recherche de la relation.' });
  }
};