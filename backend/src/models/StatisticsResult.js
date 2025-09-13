import mongoose from 'mongoose';

// Schéma pour les variables
const variableSchema = new mongoose.Schema({
  line: { type: String, required: true },
  variable_name: { type: String, required: true },
  type: String,
  distribution_table: Array,
  tendance_centrale: Object,
  quartiles: Object,
  dispersion: Object,
  forme: Object,
  chart_data: Object
}, { strict: false });

// Schéma pour les relations
const relationSchema = new mongoose.Schema({
  line: { type: String, required: true },
  relation_key: String,
  type: String,
  variables: [String],
  data: Object,
  chart_data: Object
}, { strict: false });

// Schéma principal pour les métadonnées
const statisticsResultSchema = new mongoose.Schema({
  Ligne: { 
    type: String, 
    required: true,
    enum: ['107D', '107E', '107F']
  },
  metadata: {
    total_variables: Number,
    total_relations: Number,
    generated_at: { type: Date, default: Date.now },
    imputation_method: { type: String, default: '4fill' },
    analysis_duration: Number
  }
}, {
  strict: false,
  timestamps: true
});

// Créer les modèles
const StatisticsResult = mongoose.model('StatisticsResult', statisticsResultSchema, 'statistics_results');
const StatisticsVariable = mongoose.model('StatisticsVariable', variableSchema, 'statistics_variables');
const StatisticsRelation = mongoose.model('StatisticsRelation', relationSchema, 'statistics_relations');

export { StatisticsResult, StatisticsVariable, StatisticsRelation };