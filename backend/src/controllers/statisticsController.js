import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Pour __dirname en ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers le dossier contenant les stats JSON
const statsPath = path.join(__dirname, '..', 'utils', 'stats');

/**
 * Controller pour récupérer les stats descriptives d'une ligne
 */
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
            
            // Extraire les noms des variables quantitatives et qualitatives
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
                // Chercher la relation spécifique
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