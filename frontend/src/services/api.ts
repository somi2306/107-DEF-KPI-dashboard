import { apiClient } from '../lib/axios';
import type { ModelMetrics, EquationData, LearningCurveData,PredictionPlotData } from '../types';
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

// Add this near the top of api.ts
export type PredictionResponse = {
  prediction: number;
  confidence_interval?: [number, number];
};


export const api = {

  getModelFeatures: async (line: string): Promise<string[]> => {
    const response = await apiClient.post('/predictions/features', { line });
    if (response.data.error) throw new Error(response.data.error);
    return response.data.features;
  },

  getPrediction: async (modelName: string, features: { [key: string]: number }): Promise<PredictionResponse> => {
    const response = await apiClient.post<PredictionResponse>('/predictions/predict', { model_name: modelName, features });
    if ('error' in response.data) throw new Error((response.data as any).error);
    return response.data;
  },
  getModelMetrics: async (modelName: string): Promise<ModelMetrics> => {
    const response = await apiClient.post('/predictions/metrics', { model_name: modelName });
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },
  
  getModelEquation: async (modelName: string): Promise<EquationData> => {
    const response = await apiClient.post('/predictions/equation', { model_name: modelName });
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },
/*
  getVisualization: async (modelType: string, line: string, imputation: string): Promise<Blob> => {
    const response = await apiClient.get('/predictions/visualize', {
      params: { model: modelType, ligne: line, imputation: imputation },
      responseType: 'blob' 
    });
    return response.data;
  },

  getTreeData: async (modelType: string, line: string, targetName: string): Promise<any> => {
  const response = await apiClient.get('/predictions/tree-data', {
    params: { model: modelType, ligne: line, imputation: targetName }
  });
    return response.data;
  },
  
  getTreeShape: async (modelType: string, line: string, targetName: string): Promise<TreeShape> => {
  const response = await apiClient.get('/predictions/tree-shape', {
    params: { model: modelType, ligne: line, imputation: targetName }
  });
    return response.data;
  },

  getAllTreeData: async (modelType: string, line: string, targetName: string): Promise<AllTreesData> => {
  const response = await apiClient.get('/predictions/all-trees-data', {
    params: { modelName: modelType, ligne: line, targetName: targetName }
  });
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },
*/
  getLearningCurveData: async (modelType: string, line: string, targetName: string): Promise<LearningCurveData> => {
  const response = await apiClient.get('/predictions/learning-curve', {
    params: { modelName: modelType, ligne: line, targetName: targetName }
  });
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },

  getPredictionPlotData: async (modelName: string): Promise<PredictionPlotData> => {
  const response = await apiClient.get('/predictions/prediction-plot', {
    params: { modelName: modelName }
  });
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },

  getStatistics: async (line: string): Promise<StatisticsResponse> => {
  const response = await apiClient.get(`/stats/${line}`);
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },
  
  getVariableNames: async (line: string): Promise<{quantitative: string[], qualitative: string[]}> => {
  const response = await apiClient.get(`/stats/variable-names/${line}`);
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },
  
getRelationStatistics: async (line: string, var1: string, var2: string): Promise<StatisticsResponse> => {
  const response = await apiClient.get(`/stats/relations/107${line}/${encodeURIComponent(var1)}/${encodeURIComponent(var2)}`);
  if (response.data.error) throw new Error(response.data.error);
  return response.data;
},
  
  generateStatisticsFromMongoDB: async (line: string): Promise<any> => {
  const response = await apiClient.post(`/stats/generate/107${line}`);
    if (response.data.error) throw new Error(response.data.error);
    return response.data;
  },

  getNotifications: async (): Promise<any[]> => {
  const response = await apiClient.get('/notifications');
    return response.data;
  },

  markNotificationsAsRead: async (): Promise<void> => {
  await apiClient.post('/notifications/mark-as-read');
  },
    getPipelineStatus: async (): Promise<any> => {
  const response = await apiClient.get('/pipeline/status');
    return response.data;
  },
  
  getAnalysisStatus: async (): Promise<{status: string}> => {
  const response = await apiClient.get('/analysis/status');
    return response.data;
  },

    startTraining: async (lines?: string[], models?: string[]): Promise<any> => {
      try {
        const payload: any = {};
        if (lines) payload.lines = lines;
        if (models) payload.models = models;
  const response = await apiClient.post('/training/start', payload);
        return response.data;
      } catch (error) {
        console.error("Erreur lors du démarrage de l'entraînement:", error);
        throw error;
      }
    },

  getTrainingStatus: async (): Promise<{ status: string; message?: string; error?: string }> => {
    try {
  const response = await apiClient.get('/training/status');
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération du statut de l'entraînement:", error);
      throw error;
    }
  },
  /*
  getKpiData: async (): Promise<KpiData[]> => {
    // CORRECTION : Utiliser API_BASE_URL pour pointer vers le bon endpoint de l'API backend
  const response = await apiClient.get('/kpidata');
    return response.data;
  },*/
};

export const getRelations = async (line: string, var1: string, var2: string) => {
  const url = `/relations/${line}/${encodeURIComponent(var1)}/${encodeURIComponent(var2)}`;
  const response = await apiClient.get(url);
  return response.data;
};

export const uploadFileForInfo = async (file: File): Promise<{ dataInfo: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post('/cleaning/upload-info', formData, {
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
    const response = await apiClient.post('/cleaning/process-fusion', formData, {
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
  const response = await apiClient.post('/cleaning/clean-files');
    return response.data as CleaningResponse;
  } catch (error) {
    console.error("Erreur lors du nettoyage:", error);
    throw error;
  }
};


export const downloadFile = async (filename: string): Promise<Blob> => {
  try {
    const response = await apiClient.get(`/cleaning/download/${filename}`, {
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
  const response = await apiClient.post('/cleaning/fill-values');
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
    const response = await apiClient.post('/pipeline/run-in-memory', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) { // Add type annotation here
    if (error && error.response) {
      throw new Error(error.response.data.message || 'Erreur du serveur lors du lancement du pipeline.');
    }
    throw new Error('Erreur de communication avec le serveur.');
  }
};

