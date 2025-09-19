import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { StatisticsResult, StatisticsVariable, StatisticsRelation } from '../models/StatisticsResult.js';
import { createNotification } from './notificationController.js';
import { getIo, setAnalysisStatus, analysisStatus } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const getStatistics = async (req, res) => {
  const { line } = req.params;
  const fullLine = `107${line.toUpperCase()}`;

  try {
    const mainStats = await StatisticsResult.findOne({ Ligne: fullLine });
    
    if (!mainStats) {
      const message = `Les données statistiques pour la ligne ${fullLine} n'ont pas encore été générées.`;
      return res.status(404).json({ error: message });
    }

    const variables = await StatisticsVariable.find({ line: fullLine }).lean();
    const variablesObj = {};
    variables.forEach(v => {
      const { _id, line, variable_name, __v, ...variableData } = v;
      variablesObj[variable_name] = variableData;
    });

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

export const generateStatisticsFromMongoDB = async (req, res) => {
    const { line } = req.params;
    const io = getIo();

    if (analysisStatus === 'running') {
        return res.status(409).json({ error: "Une analyse est déjà en cours." });
    }

    setAnalysisStatus('running');
    const lineLetter = line.replace('107', '').toUpperCase();

    res.status(202).json({ message: `L'analyse pour la ligne ${lineLetter} a été lancée.` });

    createNotification({
        message: `L'analyse statistique pour la ligne ${lineLetter} a commencé.`,
        status: 'in-progress',
    });

    const worker = new Worker(path.resolve(__dirname, '../workers/analysisWorker.js'), {
        workerData: { line }
    });

    worker.on('message', (result) => {
        setAnalysisStatus('idle');
        if (result.status === 'completed') {
            createNotification({ message: result.message, status: 'completed' });
        } else {
            createNotification({
                message: `L'analyse pour la ligne ${lineLetter} a échoué.`,
                details: result.details || result.error,
                status: 'failed',
            });
        }
    });

    worker.on('error', (error) => {
        console.error("Erreur inattendue du worker d'analyse:", error);
        setAnalysisStatus('idle');
        createNotification({
            message: "Une erreur critique est survenue dans le worker d'analyse.",
            details: error.message,
            status: 'failed',
        });
    });

     worker.on('exit', (code) => {
        if (code !== 0) {
            console.error(`Le worker d'analyse s'est arrêté avec le code ${code}`);
             setAnalysisStatus('idle');
        }
    });
};

export const getVariableNames = async (req, res) => {
  const { line } = req.params;
  const fullLine = `107${line.toUpperCase()}`; 

  try {
    const variables = await StatisticsVariable.find({ line: fullLine }).lean();

    if (!variables || variables.length === 0) {
      return res.status(404).json({ error: `Variables non trouvées pour la ligne ${fullLine}.` });
    }
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


export const getRelationData = async (req, res) => {
  const { line, var1, var2 } = req.params;
  
  const fullLine = line; 

  try {
    const relations = await StatisticsRelation.find({ 
      line: fullLine, 
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