import { parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runTraining = () => {
    const { lines, models } = workerData;

    console.log("WORKER: Lancement du script d'entraînement...");
    const pythonScriptPath = path.resolve(__dirname, '../utils/pretrain_models.py');

    const args = [pythonScriptPath];
    if (lines) args.push('--lines', JSON.stringify(lines));
    if (models) args.push('--models', JSON.stringify(models));

    const pythonProcess = spawn('python', args);

    let stderrOutput = '';

    pythonProcess.stderr.on('data', (data) => {
        console.error(`WORKER stderr: ${data}`);
        stderrOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            console.log("WORKER: Script d'entraînement terminé avec succès.");
            parentPort.postMessage({ status: 'completed', message: "L'entraînement des modèles est terminé avec succès." });
        } else {
            console.error(`WORKER: Le script d'entraînement s'est terminé avec le code ${code}`);
            const errorMessage = `Le script s'est terminé avec une erreur (code ${code}).`;
            parentPort.postMessage({ status: 'failed', error: errorMessage, details: stderrOutput });
        }
    });

     pythonProcess.on('error', (err) => {
        console.error('WORKER: Failed to start subprocess.', err);
        parentPort.postMessage({ status: 'failed', error: 'Failed to start Python subprocess.', details: err.message });
    });
};

runTraining();