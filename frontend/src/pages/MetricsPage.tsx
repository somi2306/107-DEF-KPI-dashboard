import React, { useState } from 'react';
import { useModelSelector } from '../hooks/useModelSelector';
import { api } from '../services/api';
import { PRODUCTION_LINES, MODELS, TARGET_VARIABLES } from '../lib/constants';
import type { ModelType } from '../lib/constants';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { EquationDisplay } from '../components/shared/EquationDisplay';
import { MetricCard } from '../components/shared/MetricCard';
import { TreeVisualization } from '../components/shared/TreeVisualization';
import type { ModelMetrics, EquationData, TreeShape, AllTreesData, TargetVariable,LearningCurveData, PredictionPlotData } from '../types';
import { FeatureImportanceChart } from '../components/shared/FeatureImportanceChart';
import { LearningCurveChart } from '../components/shared/LearningCurveChart';
import { PredictionScatterChart } from '../components/shared/PredictionScatterChart';
export const MetricsPage: React.FC = () => {
    const { line, setLine, modelType, setModelType, target, setTarget, modelName, modelDisplayName } = useModelSelector();
    const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
    const [equation, setEquation] = useState<EquationData | null>(null);
    const [treeData, setTreeData] = useState<any | null>(null);
    const [treeShape, setTreeShape] = useState<TreeShape | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorTree, setErrorTree] = useState<string | null>(null);
    const [errorShape, setErrorShape] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isLoadingTree, setIsLoadingTree] = useState(false);
    const [isLoadingShape, setIsLoadingShape] = useState(false);
    const [allTrees, setAllTrees] = useState<AllTreesData | null>(null);
    const [isLoadingAllTrees, setIsLoadingAllTrees] = useState(false);
    const [errorAllTrees, setErrorAllTrees] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const TREES_PER_PAGE = 2; // On affiche 2 arbres par page
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
        setTreeData(null);
        setTreeShape(null);
        setAllTrees(null); 
        setError(null);
        setErrorTree(null);
        setErrorShape(null);
        setErrorAllTrees(null);
        setCurrentPage(0);
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
/*    
    const handleShowTree = async () => {
        if (!target) return;
        setIsLoadingTree(true);
        setErrorTree(null);
        setTreeData(null);
        try {
            const data = await api.getTreeData(modelType, line, target.name);
            setTreeData(data);
        } catch (err: any) {
            setErrorTree(err.response?.data?.error || err.message);
        } finally {
            setIsLoadingTree(false);
        }
    };

    const handleShowShape = async () => {
        if (!target) return;
        setIsLoadingShape(true);
        setErrorShape(null);
        setTreeShape(null);
        try {
            const shape = await api.getTreeShape(modelType, line, target.name);
            setTreeShape(shape);
        } catch (err: any) {
            setErrorShape(err.response?.data?.error || err.message);
        } finally {
            setIsLoadingShape(false);
        }
    };

    const handleShowAllTrees = async () => {
        if (!target) return;
        setIsLoadingAllTrees(true);
        setErrorAllTrees(null);
        setAllTrees(null);
        try {
            const allTreesData = await api.getAllTreeData(modelType, line, target.name);
            setAllTrees(allTreesData);
        } catch (err: any) {
            setErrorAllTrees(err.response?.data?.error || err.message || "Erreur lors du chargement de la liste des arbres.");
        } finally {
            setIsLoadingAllTrees(false);
        }
    };
*/
    const handleTargetChange = (targetName: string) => {
        const foundTarget = TARGET_VARIABLES.find(t => t.name === targetName);
        if (foundTarget) setTarget(foundTarget);
    };

        const handleNextPage = () => {
        if (allTrees && (currentPage + 1) * TREES_PER_PAGE < allTrees.length) {
            setCurrentPage(prevPage => prevPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(prevPage => prevPage - 1);
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
        <Card>
            <CardHeader>
                <CardTitle>Performance des Modèles</CardTitle>
                <CardDescription>Visualisez les métriques de performance et la structure interactive du modèle.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="selection-grid">
                    <div>
                        <label className="form-label">Ligne</label>
                        <Select value={line} onValueChange={setLine}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{PRODUCTION_LINES.map(l => <SelectItem key={l} value={l}>Ligne {l}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <label className="form-label">Modèle</label>
                        <Select value={modelType} onValueChange={(value) => setModelType(value as ModelType)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <label className="form-label">Cible</label>
                        <Select value={target?.name || ''} onValueChange={handleTargetChange}><SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger><SelectContent><SelectGroup><SelectLabel>TSP</SelectLabel>{TARGET_VARIABLES.filter(t => t.group.startsWith("TSP")).map(t => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}</SelectGroup><SelectGroup><SelectLabel>Produit Fini TSP</SelectLabel>{TARGET_VARIABLES.filter(t => t.group.startsWith("PRODUIT FINI TSP")).map(t => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}</SelectGroup></SelectContent></Select>
                    </div>
                </div>


                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
                    <Button onClick={handleFetchMetrics} disabled={loading}>
                        {loading ? 'Chargement...' : 'Afficher la Performance'}
                    </Button>

                    <Button onClick={handleToggleImportanceChart} disabled={isLoadingImportance} variant="outline">
                        {isLoadingImportance ? 'Chargement...' : (showImportanceChart ? 'Cacher' : 'Afficher') + ' Poids des Variables'}
                    </Button>
                    
                    {/*{(modelType === 'RandomForestRegressor' || modelType === 'GradientBoostingRegressor') && (
                        <>
                            {modelType === 'RandomForestRegressor' && (
                        <Button onClick={handleShowTree} disabled={isLoadingTree} variant="outline">
                            {isLoadingTree ? 'Chargement...' : 'Visualiser Arbre'}
                        </Button>
                    )}
                            <Button onClick={handleShowShape} disabled={isLoadingShape} variant="outline">
                                {isLoadingShape ? 'Chargement...' : 'Afficher Forme'}
                            </Button>

                            {modelType === 'GradientBoostingRegressor' && (
                <Button onClick={handleShowAllTrees} disabled={isLoadingAllTrees} variant="outline">
                    {isLoadingAllTrees ? 'Chargement...' : 'Visualiser Tous les Arbres'}
                </Button>
            )}
                        </>
                    )} */}

                    <Button onClick={handleShowLearningCurve} disabled={isLoadingLC} variant="outline">
                        {isLoadingLC ? 'Chargement...' : "Afficher Courbe d'Apprentissage"}
                    </Button>
                    <Button onClick={handleShowPredictionPlot} disabled={isLoadingPlot} variant="outline">
                        {isLoadingPlot ? 'Chargement...' : "Réel vs. Prédit"}
                    </Button>
                </div>

                <hr className="divider" />
                

                {loading && <div className="mt-6">Chargement des données du modèle...</div>}
                {error && <div className="warning-box">{error}</div>}

                {!loading && !error && metrics && (
                    <div className="mt-6">
                        <h3 className="text-lg-medium">Résultats pour : <strong>{modelDisplayName} - Ligne {line} - {target?.name}</strong></h3>
                        <div className="metrics-grid">
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
                    </div>
                )}
                {!loading && !error && equation && (
                  <div className="mt-6"><EquationDisplay data={equation} /></div>
                )}

                {errorShape && <div className="warning-box mt-4">{errorShape}</div>}
                {treeShape && (
                    <div className="mt-6">
                        <h3 className="text-lg font-medium">Dimensions de l'Arbre</h3>
                        <div className="metrics-grid">
                            <MetricCard title="Profondeur Maximale" value={treeShape.max_depth} />
                            <MetricCard title="Nombre de Feuilles" value={treeShape.n_leaves} />
                        </div>
                    </div>
                )}

                {isLoadingTree && <p className="mt-4">Chargement de l'arbre interactif...</p>}
                {errorTree && <div className="warning-box mt-4">{errorTree}</div>}
                {treeData && (
                    <div className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Structure Interactive d'un Arbre</CardTitle>
                                <CardDescription>Représentation interactive d'un arbre du modèle {modelDisplayName}.</CardDescription>
                            </CardHeader>
                            <CardContent><TreeVisualization data={treeData} /></CardContent>
                        </Card>
                    </div>
                )}
                <div className="mt-4">
                    {isLoadingImportance && <p>Chargement des poids des variables...</p>}
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
                    {isLoadingAllTrees && <p>Chargement de la visualisation de tous les arbres...</p>}
                    {errorAllTrees && <div className="warning-box">{errorAllTrees}</div>}

                    
                    {allTrees && allTrees.length > 0 && (
                        <div>
                            
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">
                                    Arbres du Modèle "{modelDisplayName}"
                                </h2>
                                <div className="flex items-center gap-2">
                                    <Button onClick={handlePrevPage} disabled={currentPage === 0} variant="outline">
                                        Précédent
                                    </Button>
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Page {currentPage + 1} / {Math.ceil(allTrees.length / TREES_PER_PAGE)}
                                    </span>
                                    <Button 
                                        onClick={handleNextPage} 
                                        disabled={(currentPage + 1) * TREES_PER_PAGE >= allTrees.length}
                                        variant="outline"
                                    >
                                        Suivant
                                    </Button>
                                </div>
                            </div>
                            
                            
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {allTrees
                                    .slice(currentPage * TREES_PER_PAGE, (currentPage + 1) * TREES_PER_PAGE)
                                    .map((tree, index) => {
                                        
                                        const treeNumber = currentPage * TREES_PER_PAGE + index + 1;
                                        return (
                                            <Card key={treeNumber}>
                                                <CardHeader><CardTitle>Arbre {treeNumber}</CardTitle></CardHeader>
                                                <CardContent><TreeVisualization data={tree.json_structure} /></CardContent>
                                            </Card>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-8">
                    {isLoadingLC && <p>Chargement de la courbe d'apprentissage...</p>}
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
                    {isLoadingPlot && <p>Chargement du graphique Réel vs. Prédit...</p>}
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
    );
};