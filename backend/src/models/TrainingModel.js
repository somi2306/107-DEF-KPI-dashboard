import mongoose from 'mongoose';

const modelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  line: { type: String, required: true },
  target_variable: { type: String, required: true },
  model_type: { type: String, required: true },
  model_file: { type: Buffer, required: true },
  data_file: { type: Buffer, required: true },
  metrics: { type: Object, required: true },
  learning_curve: { type: Object },
  predictions: { type: Object },
}, {
  timestamps: true,
});

const Model = mongoose.model('Model', modelSchema);

export default Model;