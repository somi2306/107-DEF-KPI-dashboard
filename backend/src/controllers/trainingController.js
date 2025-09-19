import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { createNotification } from './notificationController.js';
import { setTrainingStatus, trainingStatus } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const startTraining = async (req, res) => {
    if (trainingStatus.status === 'running') {
        return res.status(400).json({ message: "Un entraînement est déjà en cours." });
    }

    setTrainingStatus({ status: 'running', error: null, message: null });
    const { lines, models } = req.body;

    res.status(202).json({ message: "L'entraînement a été lancé." });

    createNotification({
        message: "L'entraînement des modèles a commencé.",
        status: 'in-progress',
    });

    const worker = new Worker(path.resolve(__dirname, '../workers/trainingWorker.js'), {
        workerData: { lines, models }
    });

    worker.on('message', (result) => {
        if (result.status === 'completed') {
            setTrainingStatus({ status: 'finished', error: null, message: result.message });
            createNotification({ message: result.message, status: 'completed' });
        } else {
            setTrainingStatus({ status: 'error', error: result.error, message: null });
            createNotification({
                message: "Erreur lors de l'entraînement des modèles.",
                details: result.details || result.error,
                status: 'failed',
            });
        }
    });

    worker.on('error', (error) => {
        console.error("Erreur inattendue du worker d'entraînement:", error);
        setTrainingStatus({ status: 'error', error: "Erreur majeure dans le worker.", message: null });
        createNotification({
            message: "Une erreur critique est survenue dans le worker d'entraînement.",
            details: error.message,
            status: 'failed',
        });
    });

    worker.on('exit', (code) => {
        if (code !== 0) {
            console.error(`Le worker d'entraînement s'est arrêté avec le code ${code}`);
        }
    });
};

export const getTrainingStatus = (req, res) => {
    res.json(trainingStatus);
};