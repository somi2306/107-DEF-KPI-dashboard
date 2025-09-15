import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createNotification } from './notificationController.js';
// Importer la fonction de mise à jour et l'état depuis index.js
import { setTrainingStatus, trainingStatus } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const startTraining = async (req, res) => {
  // Vérifier l'état centralisé
  if (trainingStatus.status === 'running') {
    return res.status(400).json({ message: "Un entraînement est déjà en cours." });
  }

  // Mettre à jour l'état via la fonction centralisée (ce qui envoie l'événement WebSocket)
  setTrainingStatus({ status: 'running', error: null, message: null });

  // Récupérer les paramètres de ligne et modèle depuis le body
  const { lines, models } = req.body;

  try {
    createNotification({
      message: "L'entraînement des modèles a commencé.",
      status: 'in-progress',
    });

    console.log("Lancement du script d'entraînement...");

    const pythonScriptPath = path.resolve(__dirname, '../utils/pretrain_models.py');
    // Passer les paramètres en JSON via argv
    const args = [pythonScriptPath];
    if (lines) args.push('--lines', JSON.stringify(lines));
    if (models) args.push('--models', JSON.stringify(models));
    const pythonProcess = spawn('python', args);

    let stderrOutput = '';
    pythonProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
      stderrOutput += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        console.log("Script d'entraînement terminé avec succès.");
        const successMessage = "L'entraînement des modèles est terminé avec succès.";
        // Mettre à jour l'état sur succès
        setTrainingStatus({ status: 'finished', error: null, message: successMessage });

        createNotification({
          message: successMessage,
          status: 'completed',
        });

      } else {
        console.error(`Le script d'entraînement s'est terminé avec le code ${code}`);
        const errorMessage = `Le script s'est terminé avec une erreur (code ${code}).`;
        // Mettre à jour l'état sur erreur
        setTrainingStatus({ status: 'error', error: errorMessage, message: null });

        createNotification({
          message: "Erreur lors de l'entraînement des modèles.",
          details: stderrOutput || errorMessage,
          status: 'failed',
        });
      }
    });

    res.status(202).json({ message: "L'entraînement a été lancé." });

  } catch (error) {
    const errorMessage = "Erreur interne du serveur lors du lancement de l'entraînement.";
    // Mettre à jour l'état en cas d'erreur de lancement
    setTrainingStatus({ status: 'error', error: errorMessage, message: null });
    console.error("Erreur lors du lancement de l'entraînement :", error);
    res.status(500).json({ message: errorMessage });
  }
};

// Cette fonction renvoie l'état centralisé actuel
export const getTrainingStatus = (req, res) => {
  res.json(trainingStatus);
};