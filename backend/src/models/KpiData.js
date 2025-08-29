// backend/models/KpiData.js
import mongoose from 'mongoose';

// On définit un sous-schéma pour les valeurs, ce qui permet de garder une structure propre.
const ValueSchema = new mongoose.Schema({
  original_value: { type: mongoose.Schema.Types.Mixed, default: null },
  imputed_values: {
    mean: { type: mongoose.Schema.Types.Mixed, default: null },
    median: { type: mongoose.Schema.Types.Mixed, default: null },
    mode: { type: mongoose.Schema.Types.Mixed, default: null },
    ffill: { type: mongoose.Schema.Types.Mixed, default: null },
    '4fill': { type: mongoose.Schema.Types.Mixed, default: null } // On met '4fill' entre guillemets car il commence par un chiffre
  }
}, { _id: false }); // _id: false pour ne pas créer d'ID pour chaque valeur

const KpiDataSchema = new mongoose.Schema({
  // --- Métadonnées ---
  source_line: { type: String, required: true, enum: ['D', 'E', 'F'] },
  import_date: { type: Date, default: Date.now },
  original_filenames: {
    file1: String,
    file2: String
  },
  
  // Champs pour l'identification unique
  date_c: { type: Date, required: true },
  mois: { type: Number, required: true },
  date_num: { type: Number, required: true },
  semaine: { type: Number, required: true },
  poste: { type: String, required: true },
  heure: { type: String, required: true },
  
  // Chaque ligne du fichier Excel sera un document.
  // On ne définit pas toutes les colonnes ici, on laisse le schéma flexible.
}, {
  strict: false, // TRÈS IMPORTANT: permet de stocker toutes les colonnes de vos données sans les déclarer une par une.
  timestamps: true // Ajoute createdAt et updatedAt
});

// Ajouter un index composé pour garantir l'unicité
// Dans KpiData.js
KpiDataSchema.index(
  { 
    source_line: 1, 
    date_c: 1, 
    mois: 1, 
    date_num: 1, 
    semaine: 1, 
    poste: 1, 
    heure: 1,
    imputation_method: 1 
  }, 
  { 
    unique: true,
    background: true // Création en arrière-plan pour ne pas bloquer
  }
);

const KpiData = mongoose.model('KpiData', KpiDataSchema);

export default KpiData;