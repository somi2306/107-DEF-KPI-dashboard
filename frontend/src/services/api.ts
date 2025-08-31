import axios from 'axios';
import { API_BASE_URL } from '../lib/constants'; 
import type { ModelMetrics, EquationData, TreeShape, AllTreesData, LearningCurveData,PredictionPlotData, FeatureValues } from '../types';
import type { StatisticsResponse } from '../types';

export type CleaningResponse = {
  status: 'success' | 'error';
  cleaned_files?: string[];
  message?: string;
  error?: string;
  details?: Array<{
    status: 'success' | 'error';
    original_file?: string;
    cleaned_file?: string;
    changes?: Record<string, any>;
    rows_removed?: number;
    final_rows?: number;
    message?: string;
  }>;
};

export type ProcessFusionResponse = {
  status: 'success' | 'error';
  created_files?: string[];
  message?: string;
  error?: string;
};



export const api = {

  getModelFeatures: async (line: string): Promise<string[]> => {
    const response = await axios.post(`${API_BASE_URL}/predictions/features`, { line: line });
    if (response.data.error) throw new Error(response.data.error);
    return response.data.features;
  },

  getPrediction: async (modelName: string, features: { [key: string]: number }): Promise<number> => {
    const response = await axios.post(`${API_BASE_URL}/predictions/predict`, { model_name: modelName, features });
    if (response.data.error) throw new Error(response.data.error);
    return response.data.prediction;
  },

  getModelMetrics: async (modelName: string): Promise<ModelMetrics> => {
    const response = await axios.post(`${API_BASE_URL}/predictions/metrics`, { model_name: modelName });
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },
  
  getModelEquation: async (modelName: string): Promise<EquationData> => {
    const response = await axios.post(`${API_BASE_URL}/predictions/equation`, { model_name: modelName });
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },

  getVisualization: async (modelType: string, line: string, imputation: string): Promise<Blob> => {
    const response = await axios.get(`${API_BASE_URL}/predictions/visualize`, {
      params: { model: modelType, ligne: line, imputation: imputation },
      responseType: 'blob' 
    });
    return response.data;
  },

  getTreeData: async (modelType: string, line: string, targetName: string): Promise<any> => {
    const response = await axios.get(`${API_BASE_URL}/predictions/tree-data`, {
        params: { model: modelType, ligne: line, imputation: targetName }
    });
    return response.data;
  },
  
  getTreeShape: async (modelType: string, line: string, targetName: string): Promise<TreeShape> => {
    const response = await axios.get(`${API_BASE_URL}/predictions/tree-shape`, {
        params: { model: modelType, ligne: line, imputation: targetName }
    });
    return response.data;
  },

  getAllTreeData: async (modelType: string, line: string, targetName: string): Promise<AllTreesData> => {
    const response = await axios.get(`${API_BASE_URL}/predictions/all-trees-data`, {
        params: { modelName: modelType, ligne: line, targetName: targetName }
    });
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },

  getLearningCurveData: async (modelType: string, line: string, targetName: string): Promise<LearningCurveData> => {
    const response = await axios.get(`${API_BASE_URL}/predictions/learning-curve`, {
        params: { modelName: modelType, ligne: line, targetName: targetName }
    });
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },

  getPredictionPlotData: async (modelName: string): Promise<PredictionPlotData> => {
    const response = await axios.get(`${API_BASE_URL}/predictions/prediction-plot`, {
        params: { modelName: modelName }
    });
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },

  getStatistics: async (line: string): Promise<StatisticsResponse> => {
    const response = await axios.get(`${API_BASE_URL}/stats/${line}`);
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },
  
  getVariableNames: async (line: string): Promise<{quantitative: string[], qualitative: string[]}> => {
    const response = await axios.get(`${API_BASE_URL}/stats/variable-names/${line}`);
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },
  
getRelationStatistics: async (line: string, var1: string, var2: string): Promise<StatisticsResponse> => {
  const response = await axios.get(`${API_BASE_URL}/stats/relations/107${line}/${encodeURIComponent(var1)}/${encodeURIComponent(var2)}`);
  if (response.data.error) throw new Error(response.data.error);
  return response.data;
},
  
  generateStatisticsFromMongoDB: async (line: string): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/stats/generate/107${line}`);
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },

  getNotifications: async (): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/notifications`);
    return response.data;
  },

  markNotificationsAsRead: async (): Promise<void> => {
    await axios.post(`${API_BASE_URL}/notifications/mark-as-read`);
  },
    getPipelineStatus: async (): Promise<any> => {
    const response = await axios.get(`${API_BASE_URL}/pipeline/status`);
    return response.data;
  },
  
  getAnalysisStatus: async (): Promise<{status: string}> => {
    const response = await axios.get(`${API_BASE_URL}/analysis/status`);
    return response.data;
  },
};

export const getRelations = async (line: string, var1: string, var2: string) => {
    const url = `${API_BASE_URL}/relations/${line}/${encodeURIComponent(var1)}/${encodeURIComponent(var2)}`;
    const response = await axios.get(url);
    return response.data;
};

export const uploadFileForInfo = async (file: File): Promise<{ dataInfo: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(`${API_BASE_URL}/cleaning/upload-info`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'upload du fichier:", error);
    throw error;
  }
};

export const processFusionFiles = async (files: { [key: string]: File | null }): Promise<ProcessFusionResponse> => {
  const formData = new FormData();
  Object.keys(files).forEach(key => {
    if (files[key]) {
      formData.append(key, files[key] as File);
    }
  });

  try {
    const response = await axios.post(`${API_BASE_URL}/cleaning/process-fusion`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as ProcessFusionResponse;
  } catch (error) {
    console.error("Erreur lors du traitement des fichiers:", error);
    throw error;
  }
};


export const startCleaningProcess = async (): Promise<CleaningResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/cleaning/clean-files`);
    return response.data as CleaningResponse;
  } catch (error) {
    console.error("Erreur lors du nettoyage:", error);
    throw error;
  }
};


export const downloadFile = async (filename: string): Promise<Blob> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/cleaning/download/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors du téléchargement:", error);
    throw error;
  }
};

export const startFillingProcess = async (): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/cleaning/fill-values`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors du remplissage:', error);
    throw error;
  }
};

export const runFullPipelineInMemory = async (files: { [key: string]: File | null }): Promise<any> => {
  const formData = new FormData();

  Object.keys(files).forEach(key => {
    if (files[key]) {
      formData.append(key, files[key] as File);
    }
  });

  try {
    const response = await axios.post(`${API_BASE_URL}/pipeline/run-in-memory`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Erreur du serveur lors du lancement du pipeline.');
    }
    throw new Error('Erreur de communication avec le serveur.');
  }
};