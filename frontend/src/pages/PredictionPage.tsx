import React, { useState, useEffect, useMemo } from 'react';
import { useModelSelector } from '../hooks/useModelSelector';
import { api } from '../services/api';
import { PRODUCTION_LINES, MODELS, TARGET_VARIABLES } from '../lib/constants';
import { calculatedFieldsConfig, calculatedFieldNames } from '../lib/calculations';
import type { FeatureValues, TargetVariable } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export const PredictionPage: React.FC = () => {
    const { line, setLine, modelType, setModelType, target, setTarget, modelName, modelDisplayName } = useModelSelector();
    
    const [allPossibleFeatures, setAllPossibleFeatures] = useState<string[]>([]);
    const [featureValues, setFeatureValues] = useState<FeatureValues>({});
    const [prediction, setPrediction] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [visualization, setVisualization] = useState<string | null>(null);
    const [isLoadingVis, setIsLoadingVis] = useState(false);
    const [errorVis, setErrorVis] = useState<string | null>(null);
    const baseInputFields = useMemo(() => 
        allPossibleFeatures.filter(f => !calculatedFieldNames.includes(f)),
        [allPossibleFeatures]
    );
    const calculatedFields = useMemo(() =>
        allPossibleFeatures.filter(f => calculatedFieldNames.includes(f)),
        [allPossibleFeatures]
    );
    useEffect(() => {
        const loadAllFeatures = async () => {
            if (!line) return; 
            setLoading(true);
            setError(null);
            setAllPossibleFeatures([]);
            setPrediction(null);
            setVisualization(null);
            try {
                const features = await api.getModelFeatures(line);
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
            calculatedFieldNames.forEach(fieldName => {
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
    }, [featureValues]);

    const handleFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFeatureValues(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setPrediction(null);
        try {
            const featuresAsNumbers = Object.entries(featureValues).reduce((acc, [key, value]) => {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    acc[key] = num;
                }
                return acc;
            }, {} as { [key: string]: number });
            const result = await api.getPrediction(modelName, featuresAsNumbers);
            setPrediction(result);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleVisualization = async () => {
        if (!target) return;
        setIsLoadingVis(true);
        setVisualization(null);
        setErrorVis(null);
        try {
            const imageBlob = await api.getVisualization(modelType, line, target.name);
            const imageUrl = URL.createObjectURL(imageBlob);
            setVisualization(imageUrl);
        } catch (error: any) {
            console.error("Erreur lors de la récupération de la visualisation:", error);
            setErrorVis("Impossible de charger la visualisation.");
        } finally {
            setIsLoadingVis(false);
        }
    };
    const handleTargetChange = (targetName: string) => {
        const foundTarget = TARGET_VARIABLES.find(t => t.name === targetName);
        if (foundTarget) {
            setTarget(foundTarget);
        }
    };
    const groupedTargets = useMemo(() => TARGET_VARIABLES.reduce((acc, currentTarget) => {
        const groupName = currentTarget.group;
        if (!acc[groupName]) {
            acc[groupName] = [];
        }
        acc[groupName].push(currentTarget);
        return acc;
    }, {} as Record<string, TargetVariable[]>), []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Prédiction & Visualisation de KPI</CardTitle>
                <CardDescription>Sélectionnez les paramètres, entrez les valeurs pour obtenir une prédiction ou visualisez la structure du modèle.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg">
                    <div>
                        <label className="form-label">Ligne</label>
                        <Select value={line} onValueChange={setLine}>
                            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                            <SelectContent>{PRODUCTION_LINES.map(l => <SelectItem key={l} value={l}>Ligne {l}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="form-label">Modèle</label>
                        <Select value={modelType} onValueChange={(value) => setModelType(value)}>
                            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                            <SelectContent>{MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="form-label">Cible</label>
                        <Select value={target?.name || ''} onValueChange={handleTargetChange}>
                            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(groupedTargets).map(([group, targets]) => (
                                    <SelectGroup key={group}>
                                        <SelectLabel>{group}</SelectLabel>
                                        {targets.map(t => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                {loading && <p>Chargement des paramètres...</p>}
                {error && <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}
                
                {allPossibleFeatures.length > 0 && !error && (
                    <form onSubmit={handleSubmit}>
                        <h2 className="text-xl font-semibold mb-4">Paramètres à saisir</h2>
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
                                <h2 className="text-xl font-semibold my-4">Paramètres calculés</h2>
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
                            
                            {(modelType === 'RandomForestRegressor' || modelType === 'GradientBoostingRegressor') && (
                                <Button type="button" onClick={handleVisualization} disabled={isLoadingVis} variant="outline">
                                    {isLoadingVis ? 'Génération...' : 'Visualiser un Arbre'}
                                </Button>
                            )}
                        </div>
                    </form>
                )}
                
                {prediction !== null && (
                    <div className="mt-6 p-4 bg-green-100 border border-green-200 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-800">Résultat de la Prédiction</h3>
                        <p className="text-3xl font-bold text-green-900">{prediction.toFixed(4)}</p>
                    </div>
                )}
                
                <div className="mt-8">
                    {isLoadingVis && <p>Chargement de la visualisation...</p>}
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
                    )}
                </div>
            </CardContent>
        </Card>
    );
};