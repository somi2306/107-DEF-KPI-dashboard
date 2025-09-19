
import mongoose from 'mongoose';


const ValueSchema = new mongoose.Schema({
  original_value: { type: mongoose.Schema.Types.Mixed, default: null },
  imputed_values: {
    mean: { type: mongoose.Schema.Types.Mixed, default: null },
    median: { type: mongoose.Schema.Types.Mixed, default: null },
    mode: { type: mongoose.Schema.Types.Mixed, default: null },
    ffill: { type: mongoose.Schema.Types.Mixed, default: null },
    '4fill': { type: mongoose.Schema.Types.Mixed, default: null } 
  }
}, { _id: false }); 

const KpiDataSchema = new mongoose.Schema({

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
  

}, {
  strict: false, // permet de stocker toutes les colonnes de données sans les déclarer une par une.
  timestamps: true 
});


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
    background: true 
  }
);

const KpiData = mongoose.model('KpiData', KpiDataSchema);

export default KpiData;