import React, { useState, useEffect, useMemo } from 'react';
import { useModelSelector } from '../hooks/useModelSelector';
import { api } from '../services/api';
import { PRODUCTION_LINES, MODELS, TARGET_VARIABLES } from '../lib/constants';
import { getCalculatedFieldsConfig, getCalculatedFieldNames } from '../lib/calculations';
import type { FeatureValues } from '../types';

// Ajout du type pour la réponse de prédiction//
//import type { PredictionResponse } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Loader, Cpu} from 'lucide-react';

// Composant pour afficher les noms de variables hiérarchiques
const HierarchicalVariableName: React.FC<{ parts: string[] }> = ({ parts }) => {
  return (
    <div className="flex flex-col">
      {parts.map((part, index) => (
        <div
          key={index}
          className={`text-xs ${index === 0
            ? 'text-gray-500 font-medium'
            : index === 1
              ? 'text-gray-700 font-semibold'
              : 'text-black font-bold'
            }`}
        >
          {part}
        </div>
      ))}
    </div>
  );
};

export const PredictionPage: React.FC = () => {
  const { line, setLine, modelType, setModelType, target, setTarget, modelName } = useModelSelector();
  const [selectedTargetName, setSelectedTargetName] = useState<string | null>(null);
    
    const [allPossibleFeatures, setAllPossibleFeatures] = useState<string[]>([]);
    const [featureValues, setFeatureValues] = useState<FeatureValues>({});
  const [prediction, setPrediction] = useState<number | null>(null);
  const [predictionError, setPredictionError] = useState<number | null>(null);
  const [confidenceInterval, setConfidenceInterval] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // États pour le menu hiérarchique
    const [searchTermTarget, setSearchTermTarget] = useState('');
    const [isTargetFocused, setIsTargetFocused] = useState(false);
    
// Dans PredictionPage.tsx, modifiez simplement :
const isValidLine = (line: string | null): line is 'D' | 'E' | 'F' => {
  return line === 'D' || line === 'E' || line === 'F';
};


const calculatedFieldsConfig = useMemo(() => 
  isValidLine(line) ? getCalculatedFieldsConfig(line) : {}, 
  [line]
);

const calculatedFieldNamesArray = useMemo(() => 
  isValidLine(line) ? getCalculatedFieldNames(line) : [], 
  [line]
);

const baseInputFields = useMemo(() => 
  allPossibleFeatures.filter(f => !calculatedFieldNamesArray.includes(f)), 
  [allPossibleFeatures, calculatedFieldNamesArray]
);

const calculatedFields = useMemo(() =>
  allPossibleFeatures.filter(f => calculatedFieldNamesArray.includes(f)),
  [allPossibleFeatures, calculatedFieldNamesArray]
);

    // Liste des variables cibles avec hiérarchie
    const targetVarsList = [
      ['TSP', "Cuve D'attaque (bouillie)", 'Densité bouillie'],
      ['TSP', "Cuve D'attaque (bouillie)", '%P2O5 TOT bouillie'],
      ['TSP', "Cuve D'attaque (bouillie)", '%P2O5  SE bouillie'],
      ['TSP', "Cuve D'attaque (bouillie)", '%Acide libre bouillie'],
      ['TSP', "Cuve D'attaque (bouillie)", '%H2O bouillie'],
      ['TSP', "Cuve D'attaque (bouillie)", '%CaO bouillie'],
      ['TSP', 'Sortie granulateur', '%P2O5  SE+SC gran'],
      ['TSP', 'Sortie granulateur', '%P2O5 SE granu'],
      ['TSP', 'Sortie granulateur', '%Acide libre granul'],
      ['TSP', 'Sortie granulateur', '%P2O5 total granu'],
      ['TSP', 'Sortie granulateur', '%H2O tq granu'],
      ['PRODUIT FINI TSP', 'Détermination ', '%P2O5  TOT PF'],
      ['PRODUIT FINI TSP', 'Détermination ', '%P2O5  SE+SC PF'],
      ['PRODUIT FINI TSP', 'Détermination ', '%H2O Tq PF'],
      ['PRODUIT FINI TSP', 'Détermination ', '% AL  à l\'eau PF'],
      ['PRODUIT FINI TSP', 'Détermination ', '% AL à l\'acetone PF'],
      ['PRODUIT FINI TSP', 'Détermination ', '%P2O5 SE PF '],
      ['PRODUIT FINI TSP', 'Granulométrie', '˃6,3mm'],
      ['PRODUIT FINI TSP', 'Granulométrie', '˃4,75mm'],
      ['PRODUIT FINI TSP', 'Granulométrie', '˃4mm'],
      ['PRODUIT FINI TSP', 'Granulométrie', '˃3,15mm'],
      ['PRODUIT FINI TSP', 'Granulométrie', '˃2,5mm'],
      ['PRODUIT FINI TSP', 'Granulométrie', '˃2mm'],
      ['PRODUIT FINI TSP', 'Granulométrie', '˃1mm'],
      ['PRODUIT FINI TSP', 'Granulométrie', '˃2,5-˃4mm'],
      ['PRODUIT FINI TSP', 'Granulométrie', '˃2-˃4mm']
    ];

    // Grouper les variables cibles par premier niveau
    const groupByFirstLevel = (variables: { fullName: string, parts: string[] }[]) => {
      const grouped: { [key: string]: { fullName: string, parts: string[] }[] } = {};
      variables.forEach(variable => {
        const firstLevel = variable.parts[0] || 'Autres';
        if (!grouped[firstLevel]) {
          grouped[firstLevel] = [];
        }
        grouped[firstLevel].push(variable);
      });
      return grouped;
    };

    const groupedTargetVars = useMemo(() => {
      const transformAndGroup = (vars: string[][]) => {
        const transformed = vars.map(parts => ({
          fullName: parts.join('.'),
          parts: parts
        }));
        return groupByFirstLevel(transformed);
      };
      return transformAndGroup(targetVarsList);
    }, [targetVarsList]);

    // Filtrer les variables cibles par recherche
    const filterTargetVariablesBySearch = (variables: { [key: string]: { fullName: string, parts: string[] }[] }) => {
      if (!searchTermTarget) return variables;
      const filtered: { [key: string]: { fullName: string, parts: string[] }[] } = {};
      Object.entries(variables).forEach(([groupName, groupVariables]) => {
        const filteredGroup = groupVariables.filter(variable =>
          variable.fullName.toLowerCase().includes(searchTermTarget.toLowerCase()) ||
          variable.parts.some(part => part.toLowerCase().includes(searchTermTarget.toLowerCase()))
        );
        if (filteredGroup.length > 0) {
          filtered[groupName] = filteredGroup;
        }
      });
      return filtered;
    };

    const handleTargetInputFocus = () => {
      setIsTargetFocused(true);
    };

    const handleTargetInputBlur = (e: React.FocusEvent) => {
      setTimeout(() => {
        if (e.currentTarget && !e.currentTarget.contains(document.activeElement)) {
          setIsTargetFocused(false);
        }
      }, 100);
    };

    const handleSelectTargetVariable = (variableFullName: string) => {
      const lastPart = variableFullName.split('.').pop();
      const foundTarget = TARGET_VARIABLES.find(t => t.name === lastPart);
      if (foundTarget) {
        setTarget(foundTarget);
        setSelectedTargetName(null);
      } else {
        setTarget(null);
        setSelectedTargetName(variableFullName);
      }
      setSearchTermTarget('');
      setIsTargetFocused(false);
    };

    useEffect(() => {
    const loadAllFeatures = async () => {
      if (!line) return; 
      setLoading(true);
      setError(null);
      setAllPossibleFeatures([]);
      setPrediction(null);
      try {
        const features = await api.getModelFeatures(line);
        //console.log('Features récupérés du backend:', features);
        setAllPossibleFeatures(features);
        const initialValues = features.reduce((acc: FeatureValues, f) => ({ ...acc, [f]: '' }), {});
        setFeatureValues(initialValues);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || "Une erreur est survenue.");
      } finally {
        setLoading(false);
      }
    };
    loadAllFeatures();
  }, [line]);
    
useEffect(() => {
  setFeatureValues(currentValues => {
    const newValues = { ...currentValues };
    let hasChanged = false;
    
    calculatedFieldNamesArray.forEach(fieldName => {
      const config = calculatedFieldsConfig[fieldName];
      if (config) {
        const calculatedValue = config.calculate(currentValues);
        const formattedValue = calculatedValue !== null ? String(calculatedValue) : '';
        if (newValues[fieldName] !== formattedValue) {
          newValues[fieldName] = formattedValue;
          hasChanged = true;
        }
      }
    });
    
    return hasChanged ? newValues : currentValues;
  });
}, [featureValues, calculatedFieldsConfig, calculatedFieldNamesArray]);

    const handleFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFeatureValues(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      setPrediction(null);
      setPredictionError(null);
      setConfidenceInterval(null); // Réinitialiser aussi l'intervalle

      const featuresAsNumbers = Object.entries(featureValues).reduce((acc, [key, value]) => {
        const num = parseFloat(value);
        if (!isNaN(num)) acc[key] = num;
        return acc;
      }, {} as { [key: string]: number });

      if (!modelName || Object.keys(featuresAsNumbers).length === 0) {
        setError("Le nom du modèle et les features sont requis.");
        setLoading(false);
        return;
      }

      try {
        // Lancer les deux appels API en parallèle
        const [predictionResult, metricsResult] = await Promise.all([
          api.getPrediction(modelName, featuresAsNumbers),
          api.getModelMetrics(modelName)
        ]);

        // Maintenant que nous avons TOUTES les données, nous mettons à jour l'état en une seule fois.

        // 1. Traiter le résultat de la prédiction
        if (typeof predictionResult === 'object' && predictionResult !== null && 'prediction' in predictionResult) {
          setPrediction(predictionResult.prediction);
          if ('confidence_interval' in predictionResult && Array.isArray(predictionResult.confidence_interval)) {
            setConfidenceInterval(predictionResult.confidence_interval);
          }
        }

        // 2. Traiter le résultat des métriques
        if (typeof metricsResult.rmse === 'number') {
          setPredictionError(metricsResult.rmse);
        } else if (typeof metricsResult.mse === 'number') {
          setPredictionError(Math.sqrt(metricsResult.mse));
        }

      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
        <div className="container mx-auto p-4 space-y-6">
                     <Card className="shadow-lg">
                       <CardHeader>
                         <CardTitle className="flex items-center gap-3 text-2xl text-gray-800">
                           <Cpu size={28} className="text-emerald-600" />Prédiction & Visualisation de KPI</CardTitle>
                <CardDescription>Sélectionnez les paramètres, entrez les valeurs pour obtenir une prédiction ou visualisez la structure du modèle.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg">
                    <div>
                        <label className="block font-semibold mb-2">Ligne de Production</label>
                        <Select value={line} onValueChange={setLine}>
                            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                            <SelectContent>{PRODUCTION_LINES.map(l => <SelectItem key={l} value={l}>Ligne {l}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-2">Modèle</label>
                        <Select value={modelType} onValueChange={(value) => setModelType(value)}>
                            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                            <SelectContent>{MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-2">Variable Cible</label>
                        <div className="relative">
                          {/* Champ d'affichage et de recherche */}
                          <Input
                            placeholder="Rechercher une variable cible..."
                            value={searchTermTarget}
                            onChange={(e) => setSearchTermTarget(e.target.value)}
                            onFocus={handleTargetInputFocus}
                            onBlur={handleTargetInputBlur}
                            className="w-full"
                          />
                          {/* Le menu déroulant personnalisé */}
                          {isTargetFocused && (
                            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                              {Object.entries(filterTargetVariablesBySearch(groupedTargetVars)).map(([groupName, variables]) => (
                                <div key={groupName}>
                                  <div className="p-2 text-emerald-700 bg-emerald-100 font-semibold sticky top-0">
                                    {groupName} ({variables.length})
                                  </div>
                                  {variables.map((variable) => (
                                    <div
                                      key={variable.fullName}
                                      className="p-2 cursor-pointer hover:bg-gray-100"
                                      onClick={() => handleSelectTargetVariable(variable.fullName)}
                                    >
                                      <HierarchicalVariableName parts={variable.parts.slice(1)} />
                                    </div>
                                  ))}
                                </div>
                              ))}
                              {Object.keys(filterTargetVariablesBySearch(groupedTargetVars)).length === 0 && (
                                <div className="p-2 text-center text-gray-500 text-sm">
                                  Aucune variable cible trouvée pour "{searchTermTarget}"
                                </div>
                              )}
                            </div>
                          )}
                          {/* Affichage de la variable sélectionnée, harmonisé avec MetricsPage */}
                          {!isTargetFocused && (target || selectedTargetName) && (
                            <div className="mt-2 p-2 border border-gray-300 rounded-md bg-gray-50">
                              {selectedTargetName ? (
                                <HierarchicalVariableName parts={selectedTargetName.split('.').slice(1)} />
                              ) : target ? (
                                <HierarchicalVariableName parts={[target.group, target.name]} />
                              ) : null}
                            </div>
                          )}
                        </div>
                    </div>
                </div>
                
                {loading && (
                  <div className="flex flex-col items-center justify-center py-6">
                    <Loader className="animate-spin text-emerald-500 mb-2" size={32} />
                    <span className="text-gray-700 font-semibold">Chargement des paramètres...</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center justify-center bg-yellow-100 border border-yellow-400 text-yellow-900 rounded-md p-4 my-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-2.82l-7.07-12.26a2 2 0 00-3.48 0L3.19 16.18A2 2 0 004.93 19z" />
                    </svg>
                    <span className="font-semibold mr-2">Attention :</span>
                    <span>{error}</span>
                  </div>
                )}
                
                {allPossibleFeatures.length > 0 && !error && (
                    <form onSubmit={handleSubmit}>
                        <h2 className="text-xl font-semibold mb-4 text-emerald-500">Paramètres à saisir</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {baseInputFields.map(feature => (
                                <div key={feature}>
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" title={feature}>{feature.split('.').pop()}</label>
                                    <Input type="number" step="any" name={feature} value={featureValues[feature] || ''} onChange={handleFeatureChange} required />
                                </div>
                            ))}
                        </div>

                        {calculatedFields.length > 0 && (
                            <>
                                <h2 className="text-xl font-semibold my-4 text-emerald-500">Paramètres calculés</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {calculatedFields.map(feature => (
                                        <div key={feature}>
                                            <label className="text-sm font-medium" title={feature}>{feature.split('.').pop()}</label>
                                            <Input type="text" value={parseFloat(featureValues[feature] || '0').toFixed(4)} readOnly disabled />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        
                        <div className="flex gap-4 mt-6">
                            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" type="submit" disabled={loading}>{loading ? 'Calcul en cours...' : 'Obtenir la Prédiction'}</Button>
                        </div>
                    </form>
                )}
                
                {prediction !== null && (
                  <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                    <h3 className="text-lg font-semibold text-emerald-800">
                      Résultat de la Prédiction
                    </h3>

                    {/* Ligne pour la prédiction et l'erreur du modèle (RMSE) */}
                    <p className="text-2xl font-bold text-emerald-900 mt-2">
                      {prediction.toFixed(4)}
                      {predictionError !== null && (
                        <span className="text-2xl font-bold text-emerald-900 mt-2" title="Erreur moyenne du modèle (RMSE)">
                          &nbsp;&plusmn;&nbsp;{predictionError.toFixed(4)}
                        </span>
                      )}
                    </p>

                    {/* Bloc séparé pour l'intervalle de confiance */}
                    {confidenceInterval && (
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <h4 className="text-lg font-semibold text-emerald-800">
                          Intervalle de Confiance (95%)
                        </h4>
                        <p className="text-2xl font-bold text-emerald-900 mt-2">
                          [{confidenceInterval[0].toFixed(4)}, {confidenceInterval[1].toFixed(4)}]
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-8">
                    {/* {isLoadingVis && <p>Chargement de la visualisation...</p>}
                    {errorVis && <div className="p-4 bg-red-100 text-red-700 rounded-md">{errorVis}</div>}
                    {visualization && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Visualisation d'un Arbre de Décision</CardTitle>
                                <CardDescription>
                                    Ceci est un seul arbre du modèle {modelDisplayName}. Sa profondeur est limitée pour la lisibilité.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <img src={visualization} alt="Visualisation de l'arbre de décision" className="w-full border rounded-md" />
                            </CardContent>
                        </Card>
                    )} */}
                </div>
            </CardContent>
        </Card>
        </div>
    );
};