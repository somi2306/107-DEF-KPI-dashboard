import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { getIo, setAnalysisStatus, analysisStatus } from '../index.js';
// Pour __dirname en ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers le dossier contenant les stats JSON
const statsPath = path.join(__dirname, '..', 'utils', 'stats');

export const generateStatisticsFromMongoDB = (req, res) => {
    if (analysisStatus === 'running') {
        return res.status(409).json({ 
            error: "Une analyse est déjà en cours.",
            details: "Veuillez attendre la fin de l'analyse actuelle avant d'en lancer une nouvelle."
        });
    }

    const { line } = req.params;
    const io = getIo(); // Récupérer l'instance de socket.io

    // --- MISE À JOUR ET DIFFUSION DU STATUT 'RUNNING' ---
    setAnalysisStatus('running');
    io.emit('analysis-status-update', 'running'); // Diffuse à tous les clients
    
    console.log(`Statut passé à 'running'. Lancement de l'analyse pour la ligne ${line}...`);
    
    const pythonProcess = spawn('python', ['src/utils/statistics_analyzer.py', line]);
    
    let scriptOutput = '';
    let scriptError = '';
    
    pythonProcess.stdout.on('data', (data) => { 
        scriptOutput += data.toString();
        console.log(`Python stdout: ${data.toString()}`);
    });
    
    pythonProcess.stderr.on('data', (data) => { 
        scriptError += data.toString();
        console.error(`Python stderr: ${data.toString()}`);
    });
    
    pythonProcess.on('close', (code) => {
        setAnalysisStatus('idle');
        io.emit('analysis-status-update', 'idle'); // Diffuse la fin à tous les clients
        console.log("Statut repassé à 'idle'.");
        if (code === 0) {
            const fileName = `Fusion_107${line}_KPIs nettoyé_4fill_stats.json`;
            const filePath = path.join(statsPath, fileName);
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    return res.status(500).json({
                        error: `Impossible de lire le fichier de stats pour la ligne ${line}`,
                        details: err.message
                    });
                }
                
                try {
                    const cleanData = data
                        .replace(/\bNaN\b/g, 'null')
                        .replace(/\bInfinity\b/g, 'null')
                        .replace(/\b-Infinity\b/g, 'null');
                    
                    const jsonData = JSON.parse(cleanData);
                    res.json({
                        status: 'success',
                        message: `Statistiques générées pour la ligne ${line}`,
                        data: jsonData
                    });
                } catch (e) {
                    res.status(500).json({
                        error: "Erreur de parsing du fichier JSON.",
                        details: e.message
                    });
                }
            });
        } else {
            res.status(500).json({
                error: "Erreur lors de l'exécution du script Python",
                details: scriptError || scriptOutput,
                code: code
            });
        }
    });
};


export const getDescriptiveStatistics = (req, res) => {
    const { line } = req.params;
    const fileName = `Fusion_107${line}_KPIs nettoyé_4fill_stats.json`;
    const filePath = path.join(statsPath, fileName);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Erreur lecture JSON: ${err}`);
            return res.status(500).json({
                error: `Impossible de lire le fichier pour la ligne ${line}`,
                details: err.message
            });
        }

        try {
            const cleanData = data
                .replace(/\bNaN\b/g, 'null')
                .replace(/\bInfinity\b/g, 'null')
                .replace(/\b-Infinity\b/g, 'null');

            const jsonData = JSON.parse(cleanData);
            
            // Log pour déboguer
            console.log(`Fichier chargé: ${fileName}`);
            console.log(`Nombre de relations: ${jsonData.Relations ? Object.keys(jsonData.Relations).length : 0}`);
            if (jsonData.Relations) {
                console.log('Clés des relations:', Object.keys(jsonData.Relations));
            }
            
            res.json(jsonData);
        } catch (e) {
            console.error(`Erreur parsing JSON: ${e}`);
            res.status(500).json({
                error: "Erreur de parsing du fichier JSON.",
                details: e.message
            });
        }
    });
};


export const getVariableNames = (req, res) => {
    const { line } = req.params;
    const fileName = `Fusion_107${line}_KPIs nettoyé_4fill_stats.json`;
    const filePath = path.join(statsPath, fileName);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            error: `Le fichier de statistiques pour la ligne ${line} n'a pas encore été généré.`,
            details: `Veuillez lancer l'analyse depuis la page de Fusion.`
        });
    }
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Erreur lecture JSON: ${err}`);
            return res.status(500).json({
                error: `Impossible de lire le fichier pour la ligne ${line}`,
                details: err.message
            });
        }
        try {
            const cleanData = data
                .replace(/\bNaN\b/g, 'null')
                .replace(/\bInfinity\b/g, 'null')
                .replace(/\b-Infinity\b/g, 'null');

            const jsonData = JSON.parse(cleanData);
            
            const quantitative = [];
            const qualitative = [];
            
            Object.entries(jsonData.Variables || {}).forEach(([variableName, variableData]) => {
                if (variableData.type === 'quantitative') {
                    quantitative.push(variableName);
                } else if (variableData.type === 'qualitative') {
                    qualitative.push(variableName);
                }
            });
            
            res.json({ quantitative, qualitative });
        } catch (e) {
            console.error(`Erreur parsing JSON: ${e}`);
            res.status(500).json({
                error: "Erreur de parsing du fichier JSON.",
                details: e.message
            });
        }
    });
};

export const getRelationStatistics = (req, res) => {
    const { line, var1, var2 } = req.params;
    const fileName = `Fusion_107${line}_KPIs nettoyé_4fill_stats.json`;
    const filePath = path.join(statsPath, fileName);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Erreur lecture JSON: ${err}`);
            return res.status(500).json({
                error: `Impossible de lire le fichier pour la ligne ${line}`,
                details: err.message
            });
        }

        try {
            const cleanData = data
                .replace(/\bNaN\b/g, 'null')
                .replace(/\bInfinity\b/g, 'null')
                .replace(/\b-Infinity\b/g, 'null');

            const jsonData = JSON.parse(cleanData);
            
            let relations = {};

            if (jsonData.Relations) {
                const relationKey = Object.keys(jsonData.Relations).find(key => {
                    const relation = jsonData.Relations[key];
                    return (relation.variables.includes(var1) && relation.variables.includes(var2));
                });

                if (relationKey) {
                    relations[relationKey] = jsonData.Relations[relationKey];
                }
            }

            res.json({ Relations: relations });
        } catch (e) {
            console.error(`Erreur parsing JSON: ${e}`);
            res.status(500).json({
                error: "Erreur de parsing du fichier JSON.",
                details: e.message
            });
        }
    });
};