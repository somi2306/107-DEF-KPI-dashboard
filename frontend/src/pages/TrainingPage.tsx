import React, { useEffect, useState } from 'react';
import { useAnalysis } from '../providers/AnalysisProvider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PlayCircle, Loader, AlertTriangle, CheckCircle } from 'lucide-react';

const TrainingPage: React.FC = () => {
  const { startTraining, isTrainingRunning, trainingError, trainingStatus } = useAnalysis();
  const [localTrainingStatus, setLocalTrainingStatus] = useState<string | null>(null);
  const [localTrainingError, setLocalTrainingError] = useState<string | null>(null);
  const [localIsTrainingRunning, setLocalIsTrainingRunning] = useState(false);

  // Synchroniser les états locaux avec le contexte
  useEffect(() => {
    setLocalTrainingStatus(trainingStatus);
    setLocalTrainingError(trainingError);
    setLocalIsTrainingRunning(isTrainingRunning);
  }, [trainingStatus, trainingError, isTrainingRunning]);

  const handleStartTraining = () => {
    startTraining();
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl text-gray-800">
            <PlayCircle size={28} className="text-emerald-600" />
            Entraînement des Modèles
          </CardTitle>
          <CardDescription className="mt-2 text-gray-600">
            Lancez le réentraînement complet de tous les modèles de prédiction.
            Cette opération peut prendre du temps. Les pages de prédiction et de métriques seront désactivées jusqu'à la fin de l'opération.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="pt-4">
            <Button
              onClick={handleStartTraining}
              disabled={localIsTrainingRunning}
              className="w-full flex items-center justify-center gap-2 text-lg py-6 bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-300 disabled:bg-gray-400"
            >
              {localIsTrainingRunning ? (
                <>
                  <Loader className="animate-spin" size={24} />
                  <span>Entraînement en cours...</span>
                </>
              ) : (
                'Lancer l\'entraînement'
              )}
            </Button>
          </div>

          {localTrainingError && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-1" />
              <div>
                <h4 className="font-bold mb-1">Une erreur est survenue :</h4>
                <pre className="whitespace-pre-wrap break-words text-sm font-mono">{localTrainingError}</pre>
              </div>
            </div>
          )}

          {localTrainingStatus && !localIsTrainingRunning && (
            <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-start gap-3">
              <CheckCircle className="h-5 w-5 mt-1" />
              <div>
                <h4 className="font-bold mb-1">Succès</h4>
                <p>{localTrainingStatus}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingPage;