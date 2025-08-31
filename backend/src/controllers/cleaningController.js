

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadAndGetDataInfo = (req, res) => {
  if (!req.file) {
    return res.status(400).send('Aucun fichier uploadé.');
  }

  const filePath = req.file.path;
  const pythonScriptPath = path.join(__dirname, '..', 'utils', 'data_info.py');

  const pythonProcess = spawn('python', [pythonScriptPath, filePath]);

  let dataInfo = '';
  pythonProcess.stdout.on('data', (data) => {
    dataInfo += data.toString();
  });

  let errorInfo = '';
  pythonProcess.stderr.on('data', (data) => {
    errorInfo += data.toString();
  });

  pythonProcess.on('close', (code) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Erreur lors de la suppression du fichier temporaire:", err);
      }
    });

    if (code !== 0) {
      console.error(`Python script exited with code ${code}`);
      console.error(errorInfo);
      return res.status(500).send({
        message: "Erreur lors de l'analyse du fichier.",
        error: errorInfo,
      });
    }

    res.status(200).send({
        message: 'Informations du DataFrame récupérées avec succès',
        dataInfo: dataInfo
    });
  });
};


const processAndFuseFiles = (req, res) => {
  console.log('Processing fusion files...');
  console.log('Available files:', Object.keys(req.files || {}));
  const outputDir = path.join(__dirname, '..', 'uploads');
  const pythonScriptPath = path.join(__dirname, '..', 'utils', 'process_fusion.py');
  
  if (!fs.existsSync(pythonScriptPath)) {
    console.error(`Python script not found at: ${pythonScriptPath}`);
    return res.status(500).send({ 
      message: "Python script not found", 
      error: `Script path: ${pythonScriptPath}` 
    });
  }


  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const args = [outputDir];
  const filesToProcess = [];

  ['D', 'E', 'F'].forEach(ligne => {
    const file1 = req.files[`file_${ligne}_1`]?.[0];
    const file2 = req.files[`file_${ligne}_2`]?.[0];
    if (file1 && file2) {
      args.push(ligne, file1.path, file2.path);
      filesToProcess.push(file1, file2);
      console.log(`Added files for line ${ligne}: ${file1.path}, ${file2.path}`);
    }
  });

  if (args.length === 1) {
    return res.status(400).send({ message: "Aucune paire de fichiers complète n'a été fournie." });
  }

  console.log('Python command args:', ['python', pythonScriptPath, ...args]);

  const pythonProcess = spawn('python', [pythonScriptPath, ...args]);

  let scriptOutput = '';
  pythonProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    console.log(`[Python STDOUT]: ${chunk}`);
    scriptOutput += chunk;
  });

  let scriptError = '';
  pythonProcess.stderr.on('data', (data) => {
    const errorChunk = data.toString();
    console.error(`[Python STDERR]: ${errorChunk}`);
    scriptError += errorChunk;
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code: ${code}`);
    console.log(`Script output: ${scriptOutput}`);
    console.log(`Script error: ${scriptError}`);


    filesToProcess.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) console.error(`Erreur de suppression du fichier temporaire ${file.path}:`, err);
      });
    });

    if (code !== 0) {
      return res.status(500).send({ 
        message: "Erreur lors du traitement Python.", 
        error: scriptError || `Process exited with code ${code}` 
      });
    }
    
    try {
      const result = JSON.parse(scriptOutput);
      res.status(200).send(result);
    } catch (e) {
      console.error('JSON parse error:', e);
      res.status(500).send({ 
        message: "Erreur d'analyse de la réponse Python.", 
        error: scriptOutput,
        parseError: e.message 
      });
    }
  });


  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python process:', err);
    res.status(500).send({ 
      message: "Impossible de démarrer le processus Python.", 
      error: err.message 
    });
  });
};


const cleanFiles = (req, res) => {
  const pythonScriptPath = path.join(__dirname, '..', 'utils', 'data_cleaning.py');
  const uploadsDir = path.join(__dirname, '..', 'uploads');

  console.log('Starting cleaning process...');

  const pythonProcess = spawn('python', [pythonScriptPath, uploadsDir]);

  let scriptOutput = '';
  pythonProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    console.log(`[Python STDOUT chunk]: ${chunk.substring(0, 100)}...`); // Log les premiers 100 caractères
    scriptOutput += chunk;
  });

  let scriptError = '';
  pythonProcess.stderr.on('data', (data) => {
    const errorChunk = data.toString();
    console.error(`[Python STDERR]: ${errorChunk}`);
    scriptError += errorChunk;
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python cleaning process exited with code: ${code}`);
    console.log(`Full script output length: ${scriptOutput.length}`);

    
    let jsonResponse;
    
    try {

      jsonResponse = JSON.parse(scriptOutput);
    } catch (firstError) {
      console.log('First parse attempt failed, trying to extract JSON...');
      

      try {

        const firstBrace = scriptOutput.indexOf('{');
        const lastBrace = scriptOutput.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const jsonString = scriptOutput.substring(firstBrace, lastBrace + 1);
          console.log(`Extracted JSON: ${jsonString.substring(0, 200)}...`);
          jsonResponse = JSON.parse(jsonString);
        } else {
          throw new Error('No JSON object found in output');
        }
      } catch (secondError) {
        console.error('JSON extraction failed:', secondError.message);
        console.error('Full output:', scriptOutput);
        
        return res.status(500).send({ 
          status: 'error', 
          message: "Erreur d'analyse de la réponse Python.", 
          error: secondError.message,
          outputPreview: scriptOutput.substring(0, 500) + '...'
        });
      }
    }


    if (code !== 0) {
      return res.status(500).send({ 
        status: 'error', 
        message: "Erreur lors du nettoyage Python.", 
        error: scriptError || `Process exited with code ${code}`,
        pythonOutput: jsonResponse
      });
    }
    
    
    res.status(200).send(jsonResponse);
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python cleaning process:', err);
    res.status(500).send({ 
      status: 'error', 
      message: "Impossible de démarrer le processus Python.", 
      error: err.message 
    });
  });
};



const fillMissingValues = (req, res) => {
  const pythonScriptPath = path.join(__dirname, '..', 'utils', 'data_filling.py');
  const uploadsDir = path.join(__dirname, '..', 'uploads');

  console.log('Starting filling process...');

  const pythonProcess = spawn('python', [pythonScriptPath, uploadsDir]);

  let scriptOutput = '';
  pythonProcess.stdout.on('data', (data) => {
    scriptOutput += data.toString();
  });

  let scriptError = '';
  pythonProcess.stderr.on('data', (data) => {
    scriptError += data.toString();
  });

  pythonProcess.on('close', (code) => {
    try {
      const result = JSON.parse(scriptOutput);
      
      if (code === 0 && result.status === 'success') {
        res.status(200).send(result);
      } else {
        res.status(500).send({
          status: 'error',
          message: 'Erreur lors du remplissage',
          error: result.message || scriptError
        });
      }
    } catch (e) {
      res.status(500).send({
        status: 'error',
        message: 'Erreur de parsing JSON',
        error: e.message
      });
    }
  });
};


export { uploadAndGetDataInfo, processAndFuseFiles, cleanFiles, fillMissingValues };
