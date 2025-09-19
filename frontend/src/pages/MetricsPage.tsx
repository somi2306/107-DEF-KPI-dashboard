import React, { useState, useMemo } from 'react';
import { useModelSelector } from '../hooks/useModelSelector';
import { api } from '../services/api';
import { PRODUCTION_LINES, MODELS, TARGET_VARIABLES } from '../lib/constants';
import type { ModelType } from '../lib/constants';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { EquationDisplay } from '../components/shared/EquationDisplay';
import { MetricCard } from '../components/shared/MetricCard';
import type { ModelMetrics, EquationData,LearningCurveData, PredictionPlotData } from '../types';
import { FeatureImportanceChart } from '../components/shared/FeatureImportanceChart';
import { LearningCurveChart } from '../components/shared/LearningCurveChart';
import { PredictionScatterChart } from '../components/shared/PredictionScatterChart';
import { Loader} from 'lucide-react';
import {Sliders} from 'lucide-react';

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

export const MetricsPage: React.FC = () => {
    const { line, setLine, modelType, setModelType, target, setTarget, modelName, modelDisplayName } = useModelSelector();
    const [metrics, setMetrics] = useState<ModelMetrics | null>(null);

    const [selectedTargetName, setSelectedTargetName] = useState<string | null>(null);
    const [searchTermTarget, setSearchTermTarget] = useState('');
    const [isTargetFocused, setIsTargetFocused] = useState(false);

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

        // Filter by search
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
    const [equation, setEquation] = useState<EquationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [showImportanceChart, setShowImportanceChart] = useState(false);
    const [isLoadingImportance, setIsLoadingImportance] = useState(false);
    const [errorImportance, setErrorImportance] = useState<string | null>(null);
    const [learningCurve, setLearningCurve] = useState<LearningCurveData | null>(null);
    const [isLoadingLC, setIsLoadingLC] = useState(false);
    const [errorLC, setErrorLC] = useState<string | null>(null);
    const [predictionPlot, setPredictionPlot] = useState<PredictionPlotData | null>(null);
    const [isLoadingPlot, setIsLoadingPlot] = useState(false);
    const [errorPlot, setErrorPlot] = useState<string | null>(null);

    React.useEffect(() => {
        setMetrics(null);
        setEquation(null);
        setError(null);
        setShowImportanceChart(false);
        setLearningCurve(null);
        setPredictionPlot(null);
    }, [line, modelType, target]);



const handleFetchMetrics = async () => {
    if (!target) return;
    setLoading(true);
    setError(null);
    setMetrics(null);
    setEquation(null); 

    try {
        
        const metricsData = await api.getModelMetrics(modelName);
        setMetrics(metricsData);
        const equationData = await api.getModelEquation(modelName);
        setEquation(equationData);

    } catch (err: any) {
        setError(err.response?.data?.error || err.message);
    } finally {
        setLoading(false);
    }
};


    const handleToggleImportanceChart = async () => {

        if (showImportanceChart) {
            setShowImportanceChart(false);
            return;
        }

        if (equation) {
            setShowImportanceChart(true);
            return;
        }

        setIsLoadingImportance(true);
        setErrorImportance(null);
        try {
            const equationData = await api.getModelEquation(modelName);
            setEquation(equationData);
            setShowImportanceChart(true);
        } catch (err: any) {
            setErrorImportance(err.response?.data?.error || err.message);
        } finally {
            setIsLoadingImportance(false);
        }
    };
    const handleShowLearningCurve = async () => {
        if (!target) return;
        setIsLoadingLC(true);
        setErrorLC(null);
        setLearningCurve(null);
        try {

            const lcData = await api.getLearningCurveData(modelType, line, target.name); 
            setLearningCurve(lcData);
        } catch (err: any) {
            setErrorLC(err.response?.data?.error || err.message || "Données de la courbe non trouvées.");
        } finally {
            setIsLoadingLC(false);
        }
    };

    const handleShowPredictionPlot = async () => {
        if (!target) return;
        setIsLoadingPlot(true);
        setErrorPlot(null);
        setPredictionPlot(null);
        try {

            const plotData = await api.getPredictionPlotData(modelName); 
            setPredictionPlot(plotData);
        } catch (err: any) {
            setErrorPlot(err.response?.data?.error || err.message || "Données du graphique non trouvées.");
        } finally {
            setIsLoadingPlot(false);
        }
    };
    
    return (
       <div className="container mx-auto p-4 space-y-6">
             <Card className="shadow-lg">
               <CardHeader>
                 <CardTitle className="flex items-center gap-3 text-2xl text-gray-800">
                   <Sliders size={28} className="text-emerald-600" />Performance des Modèles</CardTitle>
                <CardDescription>Visualisez les métriques de performance et la structure interactive du modèle.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg">
                    <div>
                        <label className="block font-semibold mb-2">Ligne de Production</label>
                        <Select value={line} onValueChange={setLine}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>{PRODUCTION_LINES.map(l => <SelectItem key={l} value={l}>Ligne {l}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-2">Modèle</label>
                        <Select value={modelType} onValueChange={(value) => setModelType(value as ModelType)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
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
                                                    {/* Affichage de la variable sélectionnée */}
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


                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
                    <div className="w-full mb-4">
                        <Button className="w-full  bg-emerald-500 hover:bg-emerald-600" onClick={handleFetchMetrics} disabled={loading || !target}>
                            {loading ? 'Chargement...' : 'Afficher la Performance'}
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <Button className="w-full" onClick={handleToggleImportanceChart} disabled={isLoadingImportance} variant="outline">
                            {isLoadingImportance ? 'Chargement...' : (showImportanceChart ? 'Cacher' : 'Afficher') + ' Poids des Variables'}
                        </Button>
                        <Select onValueChange={(value) => {
                            if (value === 'learningCurve') handleShowLearningCurve();
                            else if (value === 'predictionPlot') handleShowPredictionPlot();
                        }}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Afficher Courbe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="learningCurve">Afficher Courbe d'Apprentissage</SelectItem>
                                <SelectItem value="predictionPlot">Réel vs. Prédit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <hr className="divider" />
                

                                {loading && (
                                    <div className="flex flex-col items-center justify-center mt-6 mb-6">
                                        <Loader className="animate-spin text-emerald-500 mb-2" size={32} />
                                        <span className="text-lg font-medium text-gray-700">Chargement des données du modèle...</span>
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

                {!loading && !error && metrics && (
    <div className="mt-6">
       <h3 className="text-lg font-medium">
  Résultats pour : <strong className="text-emerald-500">{modelDisplayName} - Ligne {line} - {target?.name}</strong>
</h3>

        <br/>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard 
                title="Score R²"
                value={typeof metrics.r2_score === 'number' ? metrics.r2_score.toFixed(4) : 'N/A'}
                description="Plus proche de 1, meilleur est le modèle." 
            />
            <MetricCard 
                title="MSE" 
                value={typeof metrics.mse === 'number' ? metrics.mse.toFixed(4) : 'N/A'}
                description="Erreur quadratique moyenne." 
            />
            <MetricCard 
                title="RMSE" 
                value={typeof metrics.rmse === 'number' ? metrics.rmse.toFixed(4) : 'N/A'}
                description="Racine de l'erreur." 
            />
        </div>
        {/* Afficher l'équation ici plutôt que séparément */}
        {equation && (
            <div className="mt-6"><EquationDisplay data={equation} /></div>
        )}
    </div>
)}
                                

                
                <div className="mt-4">
                                        {isLoadingImportance && (
                                            <div className="flex flex-col items-center justify-center mt-2 mb-2">
                                                <Loader className="animate-spin text-emerald-500 mb-2" size={24} />
                                                <span className="text-base font-medium text-gray-700">Chargement des poids des variables...</span>
                                            </div>
                                        )}
                    {errorImportance && <div className="warning-box">{errorImportance}</div>}
                    {showImportanceChart && equation && (
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Poids des Variables</CardTitle>
                                <CardDescription>Influence de chaque variable sur la prédiction.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FeatureImportanceChart data={equation} />
                            </CardContent>
                        </Card>
                    )}
                </div>

                
                
                <div className="mt-8">
                                        {isLoadingLC && (
                                            <div className="flex flex-col items-center justify-center mt-2 mb-2">
                                                <Loader className="animate-spin text-emerald-500 mb-2" size={24} />
                                                <span className="text-base font-medium text-gray-700">Chargement de la courbe d'apprentissage...</span>
                                            </div>
                                        )}
                    {errorLC && <div className="warning-box">{errorLC}</div>}
                    {learningCurve && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Courbe d'Apprentissage</CardTitle>
                                <CardDescription>
                                    Cette courbe montre l'évolution de l'erreur du modèle en fonction du nombre de données d'entraînement.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <LearningCurveChart data={learningCurve} />
                            </CardContent>
                        </Card>
                    )}
                </div>
                <div className="mt-8">
                                        {isLoadingPlot && (
                                            <div className="flex flex-col items-center justify-center mt-2 mb-2">
                                                <Loader className="animate-spin text-emerald-500 mb-2" size={24} />
                                                <span className="text-base font-medium text-gray-700">Chargement du graphique Réel vs. Prédit...</span>
                                            </div>
                                        )}
                    {errorPlot && <div className="warning-box">{errorPlot}</div>}
                    {predictionPlot && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Valeurs Réelles vs. Valeurs Prédites</CardTitle>
                                <CardDescription>
                                    Ce graphique compare les prédictions du modèle aux valeurs réelles. Plus les points sont proches de la ligne rouge, meilleur est le modèle.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PredictionScatterChart data={predictionPlot} />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </CardContent>
        </Card>
        </div>
    );
};