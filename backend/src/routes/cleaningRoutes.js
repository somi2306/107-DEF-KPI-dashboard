

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadAndGetDataInfo, processAndFuseFiles,cleanFiles,fillMissingValues} from '../controllers/cleaningController.js';
import fs from 'fs';

const router = express.Router();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const upload = multer({ dest: path.join(__dirname, '..', 'uploads/') });


router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', filename);
  

  if (fs.existsSync(filePath)) {
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Erreur lors du téléchargement:', err);
        res.status(500).send({ message: 'Erreur lors du téléchargement' });
      }
    });
  } else {
    res.status(404).send({ message: 'Fichier non trouvé' });
  }
});

router.post('/upload-info', upload.single('file'), uploadAndGetDataInfo);

const fusionUpload = upload.fields([
  { name: 'file_D_1', maxCount: 1 }, { name: 'file_D_2', maxCount: 1 },
  { name: 'file_E_1', maxCount: 1 }, { name: 'file_E_2', maxCount: 1 },
  { name: 'file_F_1', maxCount: 1 }, { name: 'file_F_2', maxCount: 1 },
]);

router.post('/process-fusion', fusionUpload, processAndFuseFiles);
router.post('/clean-files', cleanFiles);


router.post('/fill-values', fillMissingValues);

export default router;