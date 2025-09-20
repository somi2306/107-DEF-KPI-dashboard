import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import KpiData from '../models/KpiData.js';
import { pipelineStatus, getIo, setPipelineStatus } from '../index.js';
import { createNotification } from './notificationController.js';


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
  if (pipelineStatus.status === 'running') {
    return res.status(409).json({ error: "Un processus de fusion est déjà en cours." });
  }

  const filesByLine = {};
  req.files.forEach(file => {
    const key = file.fieldname.split('_')[1];
    if (!filesByLine[key]) {
      filesByLine[key] = {};
    }
    const fileIndex = file.fieldname.split('_')[2];
    filesByLine[key][`file${fileIndex}`] = {
      buffer: file.buffer.toString('base64'),
      originalname: file.originalname
    };
  });

  const linesProcessed = Object.keys(filesByLine).join(', ');
  const startMessage = `Le processus de fusion des fichiers de la ligne ${linesProcessed} a commencé.`;

  const io = getIo();
  const newStatus = { status: 'running', results: [], error: null };
  setPipelineStatus(newStatus);
  io.emit('pipeline-status-update', newStatus);

  createNotification({
    message: startMessage,
    status: 'in-progress'
  });
  
  res.status(202).json({ message: 'Le processus de fusion a été accepté et démarré.' });

  const promises = Object.keys(filesByLine).map(line => {
    return new Promise((resolve, reject) => {
      const lineFiles = filesByLine[line];
      if (!lineFiles.file1 || !lineFiles.file2) {
        return resolve({ line, status: 'skipped', message: 'Paire de fichiers incomplète.' });
      }

      const worker = new Worker('./src/workers/pipelineWorker.js', {
        workerData: {
          line: line,
          file1_b64: lineFiles.file1.buffer,
          file2_b64: lineFiles.file2.buffer,
          originalname1: lineFiles.file1.originalname,
          originalname2: lineFiles.file2.originalname
        }
      });

      worker.on('message', (message) => {
        if (message.status === 'success') {
          processInBatches(message.documents, 500)
            .then(result => {
              console.log(`SUCCÈS Ligne ${line}: ${result.inserted} documents insérés, ${result.duplicates} doublons ignorés.`);
              resolve({ line, status: 'success', inserted: result.inserted, duplicates: result.duplicates });
            })
            .catch(dbError => reject({ line, status: 'error', message: 'Erreur lors de l\'insertion en base de données.', details: dbError.message }));
        } else if (message.status === 'error') {
            reject({ line, status: 'error', message: message.message, details: message.details });
        }
      });

      worker.on('error', (error) => {
        reject({ line, status: 'error', message: 'Erreur inattendue du worker.', details: error.message });
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject({ line, status: 'error', message: `Le worker s'est arrêté avec le code ${code}` });
        }
      });
    });
  });

  Promise.all(promises)
    .then(results => {
      console.log("Pipeline terminé avec succès sur le serveur.");
      const finalStatus = { status: 'finished', results, error: null };
      
      setPipelineStatus(finalStatus);
      getIo().emit('pipeline-status-update', finalStatus);

      const successMessage = `La fusion des fichiers de la ligne ${linesProcessed} est terminée avec succès.`;
      createNotification({
        message: successMessage,
        status: 'completed'
      });
    })
    .catch(error => {
      console.error("Erreur globale du pipeline:", error);
      const errorStatus = { status: 'error', results: [], error: error.message || 'Erreur inconnue du pipeline' };

      setPipelineStatus(errorStatus);
      getIo().emit('pipeline-status-update', errorStatus);
      
      const errorMessage = `La fusion des fichiers de la ligne ${linesProcessed} a échoué.`;
      createNotification({
        message: errorMessage,
        status: 'failed'
      });
    });
};

export const getPipelineStatus = (req, res) => {
  res.status(200).json(pipelineStatus);
};

export const cancelPipeline = (req, res) => {
  if (pipelineStatus.status === 'running') {
    setPipelineStatus({ status: 'cancelled', results: [], error: 'Processus annulé par l\'utilisateur' });
    
    const io = getIo();
    io.emit('pipeline-status-update', pipelineStatus);
    
    return res.status(200).json({ message: 'Pipeline annulé avec succès' });
  }
  
  return res.status(400).json({ error: 'Aucun pipeline en cours d\'exécution' });
};