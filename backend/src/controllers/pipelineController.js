// backend/controllers/pipelineController.js
import { spawn } from 'child_process';
import KpiData from '../models/KpiData.js';

// Fonction pour vérifier si un document existe déjà
async function checkDocumentExists(doc) {
  try {
    const existingDoc = await KpiData.findOne({
      source_line: doc.source_line,
      date_c: doc.date_c,
      mois: doc.mois,
      date_num: doc.date_num,
      semaine: doc.semaine,
      poste: doc.poste,
      heure: doc.heure,
      imputation_method: doc.imputation_method
    });
    
    return existingDoc !== null;
  } catch (error) {
    console.error('Erreur lors de la vérification des doublons:', error);
    return false;
  }
}

// Fonction pour insérer seulement les nouveaux documents
async function insertUniqueDocuments(documents) {
  const newDocuments = [];
  let duplicates = 0;
  
  for (const doc of documents) {
    const exists = await checkDocumentExists(doc);
    if (!exists) {
      newDocuments.push(doc);
    } else {
      duplicates++;
    }
  }
  
  if (newDocuments.length > 0) {
    const result = await KpiData.insertMany(newDocuments, { ordered: false });
    return { inserted: result.length, duplicates };
  }
  
  return { inserted: 0, duplicates };
}

async function insertUniqueDocumentsEfficient(documents) {
  if (documents.length === 0) return { inserted: 0, duplicates: 0 };

  const bulkOps = [];
  const seenKeys = new Set();

  for (const doc of documents) {
    const uniqueKey = `${doc.source_line}-${doc.date_c}-${doc.mois}-${doc.date_num}-${doc.semaine}-${doc.poste}-${doc.heure}-${doc.imputation_method}`;
    
    if (!seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
      bulkOps.push({
        updateOne: {
          filter: {
            source_line: doc.source_line,
            date_c: doc.date_c,
            mois: doc.mois,
            date_num: doc.date_num,
            semaine: doc.semaine,
            poste: doc.poste,
            heure: doc.heure,
            imputation_method: doc.imputation_method
          },
          update: { $setOnInsert: doc },
          upsert: true
        }
      });
    }
  }

  try {
    const result = await KpiData.bulkWrite(bulkOps, { ordered: false });
    return {
      inserted: result.upsertedCount,
      duplicates: documents.length - result.upsertedCount
    };
  } catch (error) {
    console.error('Bulk write error:', error);
    throw error;
  }
}

// 2. Fonction pour diviser en batches - C'EST ICI QUE VOUS COLLEZ
async function processInBatches(documents, batchSize = 1000) {
  const results = { inserted: 0, duplicates: 0 };
  
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchResult = await insertUniqueDocumentsEfficient(batch);
    results.inserted += batchResult.inserted;
    results.duplicates += batchResult.duplicates;
    
    console.log(`Batch ${i/batchSize + 1} traité: ${batchResult.inserted} inserts, ${batchResult.duplicates} doublons`);
  }
  
  return results;
}

export const runPipelineInMemory = (req, res) => {
  console.log('Fichiers reçus en mémoire (contrôleur).');

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier reçu.' });
  }

  // Organisation des fichiers par ligne (D, E, F)
  const filesByLine = {};
  req.files.forEach(file => {
    const key = file.fieldname.split('_')[1]; // ex: file_D_1 -> D
    if (!filesByLine[key]) {
      filesByLine[key] = {};
    }
    const fileIndex = file.fieldname.split('_')[2]; // ex: file_D_1 -> 1
    filesByLine[key][`file${fileIndex}`] = {
      buffer: file.buffer.toString('base64'),
      originalname: file.originalname
    };
  });

  const promises = Object.keys(filesByLine).map(line => {
    return new Promise((resolve, reject) => {
      const lineFiles = filesByLine[line];
      if (!lineFiles.file1 || !lineFiles.file2) {
        return resolve({ line, status: 'skipped', message: 'Paire de fichiers incomplète.' });
      }

      console.log(`Lancement du pipeline en mémoire pour la ligne ${line}...`);
      
      const pythonProcess = spawn('python', ['-X', 'utf8', 'src/utils/full_pipeline_memory.py']);

      pythonProcess.stdin.on('error', (err) => {
        console.error(`Erreur d'écriture stdin pour la ligne ${line}:`, err.message);
      });

      pythonProcess.on('error', (err) => {
        console.error(`Impossible de lancer le processus Python pour la ligne ${line}:`, err.message);
        reject({ line, status: 'error', message: 'Impossible de lancer le script Python.' });
      });

      const inputPayload = {
        line: line,
        file1_b64: lineFiles.file1.buffer,
        file2_b64: lineFiles.file2.buffer,
        originalname1: lineFiles.file1.originalname,
        originalname2: lineFiles.file2.originalname
      };

      pythonProcess.stdin.write(JSON.stringify(inputPayload));
      pythonProcess.stdin.end();

      let scriptOutput = '';
      let scriptError = '';

      pythonProcess.stdout.on('data', (data) => { scriptOutput += data.toString(); });
      pythonProcess.stderr.on('data', (data) => { scriptError += data.toString(); });

      pythonProcess.on('close', (code) => {
        const hasRealError = scriptError && !scriptError.includes('RuntimeWarning') && 
                            !scriptError.includes('Mean of empty slice') &&
                            !scriptError.includes('FutureWarning');
        
        if (code === 0 && !hasRealError) {
          try {
            const lines = scriptOutput.trim().split('\n');
            const documents = [];
            
            for (const line of lines) {
              if (line.trim()) {
                try {
                  const doc = JSON.parse(line);
                  documents.push(doc);
                } catch (parseError) {
                  console.error(`Erreur de parsing sur une ligne: ${parseError.message}`);
                }
              }
            }
            
            if (documents.length > 0) {
      // UTILISATION DE processInBatches AU LIEU DE insertUniqueDocuments
      processInBatches(documents, 1000)
        .then(result => {
          console.log(`SUCCÈS Ligne ${line}: ${result.inserted} documents insérés, ${result.duplicates} doublons ignorés.`);
          resolve({ 
            line, 
            status: 'success', 
            inserted: result.inserted, 
            duplicates: result.duplicates 
          });
        })
        .catch(dbError => reject({ 
          line, 
          status: 'error', 
          message: 'Erreur lors de l\'insertion en base de données.', 
          details: dbError.message 
        }));
    } else {
              reject({ 
                line, 
                status: 'error', 
                message: 'Aucun document valide produit par le script Python.', 
                details: scriptOutput 
              });
            }
            
          } catch (e) {
            reject({ 
              line, 
              status: 'error', 
              message: 'Erreur de traitement de la sortie Python.', 
              details: e.message 
            });
          }
        } else {
          reject({ 
            line, 
            status: 'error', 
            message: 'Le script Python a échoué.', 
            details: scriptError || scriptOutput 
          });
        }
      });
    });
  });

  Promise.all(promises)
    .then(results => res.status(200).json({ status: 'Pipeline terminé', results }))
    .catch(error => {
      console.error("Erreur globale du pipeline:", error);
      res.status(500).json({ status: 'Erreur du pipeline', error });
    });
};

