import React, { useState } from 'react';
import type { ProcessFusionResponse, CleaningResponse } from '../services/api';
import { processFusionFiles, downloadFile, startCleaningProcess ,startFillingProcess } from '../services/api';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import axios from 'axios';
import { Download, FileDown, Brush, Sparkles,Droplets ,PaintBucket,GitMerge,SquarePlus,ListRestart,Filter} from 'lucide-react';

type FileState = {
  [key: string]: File | null;
};

type CreatedFile = {
  name: string;
  cleanedName?: string;
  filledNames?: string[]; 
};

const LigneInputGroup: React.FC<{ ligne: 'D' | 'E' | 'F'; onFileChange: (id: string, file: File | null) => void }> = ({ ligne, onFileChange }) => (
  <div className="p-4 border rounded-lg">
    <h3 className="font-semibold mb-2">Ligne {ligne}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium">Fichier 1 (ex: 107 {ligne}.xlsx)</label>
        <Input type="file" accept=".xlsx, .xls" onChange={(e) => onFileChange(`file_${ligne}_1`, e.target.files?.[0] ?? null)} />
      </div>
      <div>
        <label className="text-sm font-medium">Fichier 2 (ex: KPIs-{ligne} H nettoyé.xlsx)</label>
        <Input type="file" accept=".xlsx, .xls" onChange={(e) => onFileChange(`file_${ligne}_2`, e.target.files?.[0] ?? null)} />
      </div>
    </div>
  </div>
);

const FusionPage: React.FC = () => {
  const [files, setFiles] = useState<FileState>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [cleaningError, setCleaningError] = useState<string>('');
  const [createdFiles, setCreatedFiles] = useState<CreatedFile[]>([]);
  const [cleaningResults, setCleaningResults] = useState<any>(null);
  const [cleanedFiles, setCleanedFiles] = useState<CreatedFile[]>([]);
const [isFilling, setIsFilling] = useState<boolean>(false);
const [fillingError, setFillingError] = useState<string>('');
const [filledFiles, setFilledFiles] = useState<CreatedFile[]>([]);

const handleFilling = async () => {
  setIsFilling(true);
  setFillingError('');

  try {
    const result = await startFillingProcess();
if (result.status === 'success' && result.processed_files) {
    const filesList: CreatedFile[] = result.processed_files.map((filename: string) => ({
        name: filename
    }));
    setFilledFiles(filesList);

    const updatedOriginalFiles = createdFiles.map(originalFile => {
        if (!originalFile.cleanedName) {
            return originalFile;
        }
        const baseName = originalFile.cleanedName.replace('.xlsx', '');
        const correspondingFilled = result.processed_files.filter((f: string) => f.startsWith(baseName));

        if (correspondingFilled.length > 0) {
            return { ...originalFile, filledNames: correspondingFilled };
        }
        return originalFile;
    });
    setCreatedFiles(updatedOriginalFiles);

} else {
    setFillingError(result.message || 'Erreur lors du remplissage');
}
  } catch (err) {
    setFillingError('Erreur de communication avec le serveur');
  } finally {
    setIsFilling(false);
  }
};

  const handleFileChange = (id: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [id]: file }));
  };

  const handleDownload = async (filename: string) => {
    try {
      const blob = await downloadFile(filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Erreur lors du téléchargement du fichier');
    }
  };

  const handleDownloadAll = async (filesToDownload: CreatedFile[]) => {
    for (const file of filesToDownload) {
      await handleDownload(file.name);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const handleDownloadAllOriginal = () => handleDownloadAll(createdFiles);
  const handleDownloadAllCleaned = () => handleDownloadAll(cleanedFiles);
  const handleDownloadAllFilledForFile = async (filledNames: string[]) => {
    for (const filename of filledNames) {
      await handleDownload(filename);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const handleProcess = async () => {
    setIsLoading(true);
    setError('');
    setCreatedFiles([]);
    setCleaningResults(null);
    setCleaningError('');
    setCleanedFiles([]);
    setFilledFiles([]);
    setFillingError('');

    try {
      const result: ProcessFusionResponse = await processFusionFiles(files);
      if (result.status === 'success' && result.created_files) {
        const filesList: CreatedFile[] = result.created_files.map((filename: string) => ({ 
          name: filename 
        }));
        setCreatedFiles(filesList);
      } else {
        setError(result.message || result.error || 'Une erreur est survenue.');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const serverError = err.response.data.error || err.response.data.message || 'Erreur inconnue du serveur.';
        setError(serverError);
      } else if (err instanceof Error) {
        setError(err.message || 'Erreur de communication avec le serveur.');
      } else {
        setError('Erreur de communication avec le serveur.');
      }
    } finally {
      setIsLoading(false);
    }
  };

const handleCleaning = async () => {
  setIsCleaning(true);
  setCleaningError('');
  setCleaningResults(null);
  setCleanedFiles([]);
  setFilledFiles([]);
  setFillingError('');

  try {
    const result: CleaningResponse = await startCleaningProcess();
    console.log('Résultat du nettoyage:', result); 
    
    if (result.status === 'success' && result.cleaned_files) {
      const cleanedFilesList: CreatedFile[] = result.cleaned_files.map((filename: string) => ({
        name: filename
      }));
      setCleanedFiles(cleanedFilesList);
      console.log('Détails du nettoyage:', result.details); 
      setCleaningResults(result);
        const updatedFiles = createdFiles.map(originalFile => ({
          ...originalFile,
          cleanedName: result.cleaned_files?.find(cleaned => 
            cleaned.includes(originalFile.name.replace('.xlsx', ''))
          )
        }));
        setCreatedFiles(updatedFiles);
      } else {
        setCleaningError(result.message || result.error || 'Erreur lors du nettoyage.');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const serverError = err.response.data.error || err.response.data.message || 'Erreur inconnue du serveur.';
        setCleaningError(serverError);
      } else if (err instanceof Error) {
        setCleaningError(err.message || 'Erreur de communication avec le serveur.');
      } else {
        setCleaningError('Erreur de communication avec le serveur.');
      }
    } finally {
      setIsCleaning(false);
    }
  };

  

  const isAnyPairComplete = ['D', 'E', 'F'].some(l => files[`file_${l}_1`] && files[`file_${l}_2`]);
  const hasCreatedFiles = createdFiles.length > 0;
  const hasCleanedFiles = cleanedFiles.length > 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Section Fusion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge size={24} />
            Fusion des Fichiers par Ligne
          </CardTitle>
          <CardDescription>
            Uploadez les paires de fichiers pour chaque ligne (D, E, F) à traiter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <LigneInputGroup ligne="D" onFileChange={handleFileChange} />
            <LigneInputGroup ligne="E" onFileChange={handleFileChange} />
            <LigneInputGroup ligne="F" onFileChange={handleFileChange} />
          </div>
          
          <div className="flex justify-end">
<Button 
  onClick={handleProcess} 
  disabled={!isAnyPairComplete || isLoading}
  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white w-full"
>
  {isLoading ? 'Traitement en cours...' : 'Lancer la Fusion'}
</Button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              <h4 className="font-bold mb-2">Une erreur est survenue :</h4>
              <pre className="whitespace-pre-wrap break-words text-sm">{error}</pre>
            </div>
          )}

          {hasCreatedFiles && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <p className="text-green-800 font-semibold">Traitement réussi !</p>
                <Button 
                  onClick={handleDownloadAllOriginal} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download size={16} />
                  Télécharger tous les originaux
                </Button>
              </div>
              
              <p className="text-green-700 mb-3">Fichiers créés :</p>
              <div className="space-y-2">
                {createdFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex items-center gap-2">
    <FileDown size={18} className="text-emerald-600" />
    <span className="text-sm">{file.name}</span>
    {file.cleanedName && (
        <span className="text-xs text-blue-600 ml-2">(nettoyé disponible)</span>
    )}

    {file.filledNames && file.filledNames.length > 0 && (
        <span className="text-xs text-purple-600 ml-2">(remplissage disponible)</span>
    )}
</div>
                    <div className="flex gap-2">
                      {file.cleanedName && (
                        <Button 
                          onClick={() => handleDownload(file.cleanedName!)}
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Filter size={14} />
                          Version nettoyée
                        </Button>
                      )}

                      {file.filledNames && file.filledNames.length > 0 && (
                        <Button 
                          onClick={() => handleDownloadAllFilledForFile(file.filledNames!)}
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <ListRestart size={14} />
                          Toutes versions remplies
                        </Button>
                      )}
                      <Button 
                        onClick={() => handleDownload(file.name)} 
                        variant="ghost" 
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Download size={16} />
                        Original
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Nettoyage */}
      {hasCreatedFiles && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter size={24} />
              Nettoyage des Données
            </CardTitle>
            <CardDescription>
              Nettoyez les fichiers fusionnés en corrigeant les valeurs mal formatées.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Fonctionnalités de nettoyage :</h4>
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                <li>Correction des formats erronés (ex: "0./86" → "0.86")</li>
                <li>Conversion des virgules en points</li>
                <li>Suppression des symboles spéciaux</li>
                <li>Élimination des lignes entièrement vides</li>
                <li>Conversion des valeurs en format numérique</li>
              </ul>
            </div>

            <div className="flex justify-end">
<Button 
  onClick={handleCleaning} 
  disabled={isCleaning || hasCleanedFiles}
  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white w-full"
>
  {isCleaning ? 'Nettoyage en cours...' : hasCleanedFiles ? 'Nettoyage déjà effectué' : (
    <>
      <Brush size={16} />
      Lancer le Nettoyage
    </>
  )}
</Button>
            </div>

            {cleaningError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                <h4 className="font-bold mb-2">Erreur lors du nettoyage :</h4>
                <pre className="whitespace-pre-wrap break-words text-sm">{cleaningError}</pre>
              </div>
            )}

            {hasCleanedFiles && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-green-800 font-semibold">Nettoyage réussi !</p>
                  <Button 
                    onClick={handleDownloadAllCleaned} 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download size={16} />
                    Télécharger tous les nettoyés
                  </Button>
                </div>
                
                <p className="text-green-700 mb-3">Fichiers nettoyés créés :</p>
                <div className="space-y-2">
                  {cleanedFiles.map((file) => (
                    <div key={file.name} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <FileDown size={18} className="text-emerald-600" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button 
                        onClick={() => handleDownload(file.name)} 
                        variant="ghost" 
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Download size={16} />
                        Télécharger
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cleaningResults && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">Résultats détaillés du nettoyage :</h4>
                <div className="space-y-3">
                  {cleaningResults.details && cleaningResults.details.map((detail: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <h5 className="font-medium mb-2">{detail.original_file}</h5>
                      <div className="text-sm text-gray-600">
                        <p>Lignes supprimées: {detail.rows_removed}</p>
                        <p>Lignes finales: {detail.final_rows}</p>
                        {detail.changes && Object.keys(detail.changes).length > 0 && (
                          <p>Colonnes modifiées: {Object.keys(detail.changes).length}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </CardContent>
        </Card>
      )}

{hasCleanedFiles && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
            <ListRestart size={24} /> 
            Remplissage des Valeurs Manquantes
          </CardTitle>
      <CardDescription>
        Applique différentes méthodes de remplissage et calcule les colonnes dérivées.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Méthodes de remplissage :</h4>
        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
          <li>Moyenne</li>
          <li>Mode (valeur la plus fréquente)</li>
          <li>Médiane</li>
          <li>Forward Fill + Backward Fill</li>
          <li>4-Fill (méthode spécifique sur 4 colonnes clés)</li>
        </ul>
      </div>

      <div className="flex justify-end">
<Button 
  onClick={handleFilling} 
  disabled={isFilling || filledFiles.length > 0}
  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white w-full"
>
  {isFilling ? 'Remplissage en cours...' : filledFiles.length > 0 ? 'Remplissage déjà effectué' : 'Lancer le Remplissage'}
</Button>
      </div>

      {fillingError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <h4 className="font-bold mb-2">Erreur lors du remplissage :</h4>
          <pre className="whitespace-pre-wrap break-words text-sm">{fillingError}</pre>
        </div>
      )}

      {filledFiles.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-green-800 font-semibold">Remplissage réussi !</p>
            <Button 
              onClick={() => handleDownloadAll(filledFiles)} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Télécharger tous
            </Button>
          </div>
          
          <p className="text-green-700 mb-3">Fichiers créés :</p>
          <div className="space-y-2">
            {filledFiles.map((file) => (
              <div key={file.name} className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <FileDown size={18} className="text-emerald-600" />
                  <span className="text-sm">{file.name}</span>
                </div>
                <Button 
                  onClick={() => handleDownload(file.name)} 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Download size={16} />
                  Télécharger
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
)}
    </div>
  );
};

export default FusionPage;