

import React, { useState } from 'react';
import { runFullPipelineInMemory } from '../services/api';
import { useAnalysis } from '../providers/AnalysisProvider'; 
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

// --- Import des icônes ---
import { UploadCloud, CheckCircle, XCircle, Loader, AlertTriangle,FileText,BarChart2} from 'lucide-react';

// --- Définition des types ---

// Pour gérer l'état des fichiers sélectionnés
type FileState = {
  [key: string]: File | null;
};

type PipelineResult = {
  line: string;
  status: 'success' | 'error' | 'skipped';
  inserted?: number;       // ← CHANGÉ: count → inserted
  duplicates?: number;     // ← NOUVEAU: nombre de doublons
  message?: string;
  details?: string;
};

// --- Composant réutilisable pour un groupe d'inputs ---
const LigneInputGroup: React.FC<{
  ligne: 'D' | 'E' | 'F';
  onFileChange: (id: string, file: File | null) => void;
}> = ({ ligne, onFileChange }) => (
  <div className="p-4 border rounded-lg bg-gray-50">
    <h3 className="font-semibold mb-2 text-gray-800">Ligne {ligne}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-gray-600">Fichier 1 (ex: 107 {ligne}.xlsx)</label>
        <Input
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => onFileChange(`file_${ligne}_1`, e.target.files?.[0] ?? null)}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-600">Fichier 2 (ex: KPIs-{ligne} H nettoyé.xlsx)</label>
        <Input
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => onFileChange(`file_${ligne}_2`, e.target.files?.[0] ?? null)}
          className="mt-1"
        />
      </div>
    </div>
  </div>
);


// --- Composant Principal de la Page ---
const FusionPage: React.FC = () => {
  const [files, setFiles] = useState<FileState>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [pipelineResults, setPipelineResults] = useState<PipelineResult[]>([]);
  const [linesWithNewData, setLinesWithNewData] = useState<string[]>([]);
  const { startStatisticsGeneration, isAnalysisRunning } = useAnalysis();
  const handleFileChange = (id: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [id]: file }));
    setPipelineResults([]);
    setError('');
    setLinesWithNewData([]);
  };


    const handleProcess = async () => {
    setIsLoading(true);
    setError('');
    setPipelineResults([]);
    setLinesWithNewData([]); 

    try {
      const result = await runFullPipelineInMemory(files);
      if (result.status === 'Pipeline terminé') {
        setPipelineResults(result.results);
        const successfulLines = result.results
          .filter((res: PipelineResult) => res.status === 'success' && res.inserted && res.inserted > 0)
          .map((res: PipelineResult) => res.line);
        
        setLinesWithNewData(successfulLines);

      } else {
        setError(result.message || 'Une erreur inattendue est survenue lors du traitement.');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur de communication avec le serveur.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour lancer l'analyse pour une ligne spécifique
  const handleLaunchAnalysis = (line: string) => {
    if (!line) return;
    startStatisticsGeneration(line);
  };

  // Vérifie si au moins une paire de fichiers est complète pour activer le bouton
  const isAnyPairComplete = ['D', 'E', 'F'].some(l => files[`file_${l}_1`] && files[`file_${l}_2`]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl text-gray-800">
            <UploadCloud size={28} className="text-emerald-600" />
            Importer et Traiter les Données
          </CardTitle>
          <CardDescription className="mt-2 text-gray-600">
            Téléversez les paires de fichiers pour lancer le traitement complet (Fusion, Nettoyage, Remplissage) et sauvegarder les résultats directement dans la base de données.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section de sélection des fichiers */}
          <div className="space-y-4">
            <LigneInputGroup ligne="D" onFileChange={handleFileChange} />
            <LigneInputGroup ligne="E" onFileChange={handleFileChange} />
            <LigneInputGroup ligne="F" onFileChange={handleFileChange} />
          </div>

          {/* Bouton de lancement */}
          <div className="pt-4">
            <Button
              onClick={handleProcess}
              disabled={!isAnyPairComplete || isLoading}
              className="w-full flex items-center justify-center gap-2 text-lg py-6 bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-300 disabled:bg-gray-400"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" size={24} />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                'Lancer le Traitement'
              )}
            </Button>
          </div>

          {/* Affichage des erreurs globales */}
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-1" />
              <div>
                <h4 className="font-bold mb-1">Une erreur est survenue :</h4>
                <pre className="whitespace-pre-wrap break-words text-sm font-mono">{error}</pre>
              </div>
            </div>
          )}

          {/* Affichage des résultats du pipeline */}

{pipelineResults.length > 0 && (
  <div className="bg-gray-50 p-4 rounded-lg border">
    <h3 className="font-semibold text-lg mb-4 text-gray-800">Résultats du Traitement</h3>
    <div className="space-y-3">
      {pipelineResults.map((result, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 bg-white rounded-md border shadow-sm"
        >
          <div className="flex items-center gap-3">
            {result.status === "success" && <CheckCircle className="text-emerald-500" />}
            {result.status === "error" && <XCircle className="text-red-500" />}
            {result.status === "skipped" && <AlertTriangle className="text-yellow-500" />}
            <span className="font-medium text-gray-700">Ligne {result.line}</span>
          </div>
          <div className="text-sm text-right">
            {result.status === "success" && (
              <div>
                <p className="text-green-700 font-semibold">
                  {result.inserted} nouveau(x) document(s) inséré(s)
                </p>
                {result.duplicates && result.duplicates > 0 && (
                  <p className="text-gray-500 text-xs">
                    {result.duplicates} doublon(s) ignoré(s)
                  </p>
                )}
              </div>
            )}
            {result.status === "error" && (
              <p className="text-red-600 font-semibold">Échec: {result.message}</p>
            )}
            {result.status === "skipped" && (
              <p className="text-gray-500 italic">Ignorée: {result.message}</p>
            )}
          </div>
        </div>
      ))}

      {/* Résumé global */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
        <h4 className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
  <FileText className="h-5 w-5 text-emerald-500" />
  Résumé global
</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total inséré: </span>
            <span className="font-semibold text-green-600">
              {pipelineResults.reduce((sum, r) => sum + (r.inserted || 0), 0)} documents
            </span>
          </div>
          <div>
            <span className="text-gray-600">Total doublons: </span>
            <span className="font-semibold text-gray-600">
              {pipelineResults.reduce((sum, r) => sum + (r.duplicates || 0), 0)} documents
            </span>
          </div>
        </div>
      </div>

      {/* Message si tous les documents étaient des doublons */}
      {pipelineResults.every(
        (result) => result.status === "success" && result.inserted === 0
      ) && (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-1" />
          <div>
            <h4 className="font-bold mb-1">Information</h4>
            <p>
              Tous les documents existaient déjà dans la base de données. Aucune
              nouvelle donnée n'a été ajoutée.
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
)}
{linesWithNewData.length > 0 && (
          <div className="mt-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg">
              <h4 className="font-bold text-gray-800 mb-2">De nouvelles données ont été ajoutées !</h4>
              <p className="text-sm text-gray-700 mb-4">
                  Vous pouvez maintenant mettre à jour les analyses statistiques pour les lignes concernées.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                  {linesWithNewData.map(line => (
                  <Button
                      key={line}
                      onClick={() => handleLaunchAnalysis(line)}
                      disabled={isAnalysisRunning}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                  >
                      {isAnalysisRunning ? (
                          <>
                              <Loader className="animate-spin" size={18} />
                              <span>Analyse en cours...</span>
                          </>
                      ) : (
                          <>
                              <BarChart2 size={18} />
                              Lancer l'analyse pour la Ligne {line}
                          </>
                      )}
                  </Button>
                  ))}
              </div>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FusionPage;