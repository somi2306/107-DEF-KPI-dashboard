import { parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import fs from 'fs';

const { line, file1_b64, file2_b64, originalname1, originalname2 } = workerData;

const runPythonScript = () => {
    const path1 = 'src/utils/full_pipeline_memory.py';
    const path2 = 'utils/full_pipeline_memory.py';
    let scriptPath;

    if (fs.existsSync(path1)) {
        scriptPath = path1;
    } else if (fs.existsSync(path2)) {
        scriptPath = path2;
    } else {
        parentPort.postMessage({
            status: 'error',
            message: 'Fichier de script Python introuvable sur le serveur.'
        });
        return;
    }

    console.log(`[Worker Ligne ${line}] Lancement du pipeline avec le script : ${scriptPath}`);

    const pythonProcess = spawn('python', ['-X', 'utf8', scriptPath]);

    pythonProcess.stdin.on('error', (err) => {
        console.error(`[Worker Ligne ${line}] Erreur d'écriture stdin:`, err.message);
    });
    pythonProcess.on('error', (err) => {
        console.error(`[Worker Ligne ${line}] Impossible de lancer le processus Python:`, err.message);
        parentPort.postMessage({
            status: 'error',
            message: 'Impossible de lancer le script Python.'
        });
    });

    const inputPayload = {
        line: line,
        file1_b64: file1_b64,
        file2_b64: file2_b64,
        originalname1: originalname1,
        originalname2: originalname2
    };

    pythonProcess.stdin.write(JSON.stringify(inputPayload));
    pythonProcess.stdin.end();

    let scriptOutput = '';
    let scriptError = '';

    pythonProcess.stdout.on('data', (data) => { scriptOutput += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { scriptError += data.toString(); });

    pythonProcess.on('close', (code) => {
        const hasRealError = scriptError && !scriptError.includes('RuntimeWarning') && !scriptError.includes('Mean of empty slice') && !scriptError.includes('FutureWarning');

        if (code === 0 && !hasRealError) {
            try {
                const lines = scriptOutput.trim().split('\n');
                const documents = [];

                for (const docLine of lines) {
                    if (docLine.trim()) {
                        try {
                            const doc = JSON.parse(docLine);
                            documents.push(doc);
                        } catch (parseError) {
                            console.error(`[Worker Ligne ${line}] Erreur de parsing sur une ligne JSON: ${parseError.message}`);
                        }
                    }
                }
                
                parentPort.postMessage({ status: 'success', documents });

            } catch (e) {
                parentPort.postMessage({ status: 'error', message: 'Erreur de traitement de la sortie Python.', details: e.message });
            }
        } else {
            parentPort.postMessage({ status: 'error', message: 'Le script Python a échoué.', details: scriptError || scriptOutput });
        }
    });
};

runPythonScript();