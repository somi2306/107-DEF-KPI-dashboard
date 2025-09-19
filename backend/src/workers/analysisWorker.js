import { parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runAnalysis = () => {
    const { line } = workerData;
    const lineLetter = line.replace('107', '').toUpperCase();

    const path1 = path.resolve(__dirname, '../utils/statistics_analyzer.py');
    const path2 = path.resolve(__dirname, 'utils/statistics_analyzer.py');
    let scriptPath;

    if (fs.existsSync(path1)) {
        scriptPath = path1;
    } else if (fs.existsSync(path2)) {
        scriptPath = path2;
    } else {
        const errorMessage = `Le script d'analyse est introuvable.`;
        console.error(`WORKER: ${errorMessage}`);
        parentPort.postMessage({ status: 'failed', error: errorMessage });
        return;
    }

    console.log(`WORKER: Lancement du script d'analyse pour la ligne ${lineLetter} via : ${scriptPath}`);
    const pythonProcess = spawn('python', [scriptPath, lineLetter]);

    let stderrOutput = '';
    pythonProcess.stderr.on('data', (data) => {
        console.error(`WORKER stderr: ${data}`);
        stderrOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            console.log(`WORKER: Analyse pour la ligne ${lineLetter} terminée avec succès.`);
            parentPort.postMessage({ status: 'completed', message: `L'analyse pour la ligne ${lineLetter} est terminée.` });
        } else {
            console.error(`WORKER: Script d'analyse terminé avec le code ${code}.`);
            parentPort.postMessage({ status: 'failed', error: `L'analyse a échoué (code: ${code})`, details: stderrOutput });
        }
    });

    pythonProcess.on('error', (err) => {
        console.error('WORKER: Failed to start subprocess.', err);
        parentPort.postMessage({ status: 'failed', error: 'Failed to start Python subprocess.', details: err.message });
    });
};

runAnalysis();