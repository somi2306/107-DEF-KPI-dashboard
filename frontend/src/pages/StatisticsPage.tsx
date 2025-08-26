

import React, { useState, useMemo, useEffect } from 'react';
import { useModelSelector } from '../hooks/useModelSelector';
import { api } from '../services/api';
import { PRODUCTION_LINES } from '../lib/constants';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import type { RelationQualitative, RelationQuantitative, RelationQuantQual } from '../types';
import type { StatisticsResponse, QuantitativeStats, QualitativeStats, DescriptiveStats, QualitativeDistribution } from '../types';
import { MetricCard } from '../components/shared/MetricCard';
import { InteractiveHistogram } from '../components/shared/InteractiveHistogram';
import { InteractiveBoxPlot } from '../components/shared/InteractiveBoxPlot';
import { InteractiveScatterPlot } from '../components/shared/InteractiveScatterPlot';
import { FeatureImportanceChart } from '../components/shared/FeatureImportanceChart';
import { InteractiveNormalDistribution } from '../components/shared/InteractiveNormalDistribution';
import { InteractiveFrequencyPolygon } from '../components/shared/InteractiveFrequencyPolygon';
import { InteractiveScatterPlotPlotly } from '../components/shared/InteractiveScatterPlotPlotly';

// Types pour les sélections d'analyse
type AnalysisType = 'descriptive' | 'relations';
type DescriptiveSubType = 'quantitative' | 'qualitative';
type RelationsSubType = 'qualitative_qualitative' | 'quantitative_qualitative' | 'quantitative_quantitative';

export const StatisticsPage: React.FC = () => {
  const { line, setLine } = useModelSelector();
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour les sélections d'analyse
  const [analysisType, setAnalysisType] = useState<AnalysisType>('descriptive');
  const [descriptiveSubType, setDescriptiveSubType] = useState<DescriptiveSubType>('quantitative');
  const [relationsSubType, setRelationsSubType] = useState<RelationsSubType>('qualitative_qualitative');

  // États pour le filtrage des variables
  const [targetVariable, setTargetVariable] = useState<string>('');
  const [variableNames, setVariableNames] = useState<{
    quantitative: { [key: string]: { fullName: string, parts: string[] }[] },
    qualitative: { [key: string]: { fullName: string, parts: string[] }[] }
  }>({
    quantitative: {},
    qualitative: {}
  });

  const [loadingVariables, setLoadingVariables] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetRelationVariable, setTargetRelationVariable] = useState<string>('');
  const [otherRelationVariable, setOtherRelationVariable] = useState<string>('');
  const [searchTermRelations, setSearchTermRelations] = useState('');
  const [searchTermTarget, setSearchTermTarget] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isTargetFocused, setIsTargetFocused] = useState(false);
  const [isOtherFocused, setIsOtherFocused] = useState(false);


  const normalizeName = (nameParts: string | string[]): string => {
    if (typeof nameParts === 'string') {
      return nameParts.replace(/\s+/g, ' ').trim();
    }
    const cleanedParts = nameParts.map(part =>
      typeof part === 'string' ? part.replace(/\s+/g, ' ').trim() : String(part)
    );
    return cleanedParts.join('.');
  };


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

  // Normaliser les noms de variables cibles
  const normalizedTargetVars = targetVarsList.map(v => normalizeName(v));

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
        fullName: normalizeName(parts),
        parts: parts
      }));
      return groupByFirstLevel(transformed);
    };
    return transformAndGroup(targetVarsList);
  }, [targetVarsList]);


  const handleSelectVariable = (variableFullName: string) => {
    setTargetVariable(variableFullName);
    setSearchTerm(''); // Réinitialise le terme de recherche
    setIsFocused(false); // Ferme le menu
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Retarde la fermeture pour permettre le clic sur un élément
    setTimeout(() => {
      if (!e.currentTarget.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 100);
  };

  const handleTargetInputFocus = () => {
    setIsTargetFocused(true);
  };

  const handleTargetInputBlur = (e: React.FocusEvent) => {
    setTimeout(() => {
      if (!e.currentTarget.contains(document.activeElement)) {
        setIsTargetFocused(false);
      }
    }, 100);
  };

  const handleSelectTargetVariable = (variableFullName: string) => {
    setTargetRelationVariable(variableFullName);
    setSearchTermTarget('');
    setIsTargetFocused(false);
    setStats(null);
  };


  const handleOtherInputFocus = () => {
    setIsOtherFocused(true);
  };

  const handleOtherInputBlur = (e: React.FocusEvent) => {
    setTimeout(() => {
      if (!e.currentTarget.contains(document.activeElement)) {
        setIsOtherFocused(false);
      }
    }, 100);
  };

  const handleSelectOtherVariable = (variableFullName: string) => {
    setOtherRelationVariable(variableFullName);
    setSearchTermRelations('');
    setIsOtherFocused(false);
    setStats(null);
  };

  const filterRelationVariablesBySearch = (variables: { [key: string]: { fullName: string, parts: string[] }[] }, searchTerm: string) => {
    if (!searchTerm) return variables;
    const filtered: { [key: string]: { fullName: string, parts: string[] }[] } = {};
    Object.entries(variables).forEach(([groupName, groupVariables]) => {
      const filteredGroup = groupVariables.filter(variable =>
        variable.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        variable.parts.some(part => part.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (filteredGroup.length > 0) {
        filtered[groupName] = filteredGroup;
      }
    });
    return filtered;
  };

  const filterVariablesBySearch = (variables: { [key: string]: { fullName: string, parts: string[] }[] }) => {
    if (!searchTerm) return variables;
    const filtered: { [key: string]: { fullName: string, parts: string[] }[] } = {};
    Object.entries(variables).forEach(([groupName, groupVariables]) => {
      const filteredGroup = groupVariables.filter(variable =>
        variable.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        variable.parts.some(part => part.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (filteredGroup.length > 0) {
        filtered[groupName] = filteredGroup;
      }
    });
    return filtered;
  };

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


  const loadVariableNames = async () => {
    if (!line) return;
    setLoadingVariables(true);
    try {
      const data = await api.getVariableNames(line);
      const transformVariables = (variables: string[]) => {
        return variables.map(fullName => {
          const parts = fullName.split('.');
          return { fullName, parts };
        });
      };
      setVariableNames({
        quantitative: groupByFirstLevel(transformVariables(data.quantitative)),
        qualitative: groupByFirstLevel(transformVariables(data.qualitative))
      });
    } catch (error) {
      console.error('Erreur chargement noms variables:', error);
    } finally {
      setLoadingVariables(false);
    }
  };

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


  useEffect(() => {
    if (line) {
      loadVariableNames();
    } else {
      setVariableNames({ quantitative: {}, qualitative: {} });
      setTargetVariable('');
      setTargetRelationVariable('');
      setOtherRelationVariable('');
      setStats(null); 
    }
  }, [line]);

  const handleFetchStatistics = async () => {
    if (!line) return;
    setLoading(true);
    setError(null);
    setStats(null);
    try {
      let data;
      if (analysisType === 'relations' && relationsSubType === 'quantitative_quantitative' && targetRelationVariable && otherRelationVariable) {
        const relationData = await api.getRelationStatistics(line, targetRelationVariable, otherRelationVariable);
        data = {
          Fichier: `Relation entre ${targetRelationVariable} et ${otherRelationVariable}`,
          Variables: {},
          Relations: relationData.Relations || {}
        };
      } else {
        data = await api.getStatistics(line);
        if (analysisType === 'descriptive' && descriptiveSubType === 'quantitative' && targetVariable) {
          data = {
            ...data,
            Variables: {
              [targetVariable]: data.Variables[targetVariable]
            },
          };
        }
      }
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement des statistiques.");
    } finally {
      setLoading(false);
    }
  };

  const isQuantitative = (data: DescriptiveStats): data is QuantitativeStats => {
    return data?.type === 'quantitative';
  };

  const isQualitative = (data: DescriptiveStats): data is QualitativeStats => {
    return data?.type === 'qualitative';
  };

  const filteredQuantitativeVars = useMemo(() => {
    if (!stats) return [];
    const allVars = Object.entries(stats.Variables).filter(([_, data]) =>
      isQuantitative(data)
    );
    return allVars;
  }, [stats]);

  const filteredQualitativeVars = useMemo(() => {
    if (!stats || !stats.Variables) return [];
    return Object.entries(stats.Variables).filter(([_, data]) =>
      isQualitative(data)
    );
  }, [stats]);

  const renderQuantitativeStats = (col: string, data: QuantitativeStats) => (
    <Card key={col} className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm break-all">{col}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 2.1.1 Distribution Table */}
        {data.distribution_table && data.distribution_table.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-lg"> Distribution</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-emerald-100">
                    <th className="border border-emerald-300 p-2">Classe</th>
                    <th className="border border-emerald-300 p-2">Effectif</th>
                    <th className="border border-emerald-300 p-2">Effectif Cumulatif</th>
                  </tr>
                </thead>
                <tbody>
                  {data.distribution_table.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-emerald-300 p-2">{item.classe}</td>
                      <td className="border border-emerald-300 p-2">{item.effectif}</td>
                      <td className="border border-emerald-300 p-2">{item.cumulatif}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2.1.2 Indicateurs de tendance centrale */}
        {data.tendance_centrale && (
          <div>
            <h3 className="font-semibold mb-2 text-lg"> Indicateurs de Tendance Centrale</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="Mode" value={data.tendance_centrale.mode?.toString() ?? 'N/A'} />
              <MetricCard title="Médiane (Q2)" value={data.tendance_centrale.mediane?? 'N/A'} />
              <MetricCard title="Moyenne" value={data.tendance_centrale.moyenne ?? 'N/A'} />
            </div>
          </div>
        )}

        {/* 2.1.3 Quartiles */}
        {data.quartiles && (
          <div>
            <h3 className="font-semibold mb-2 text-lg"> Quartiles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="1er Quartile (Q1)" value={data.quartiles.Q1 ?? 'N/A'} />
              <MetricCard title="2ème Quartile (Q2)" value={data.quartiles.Q2 ?? 'N/A'} />
              <MetricCard title="3ème Quartile (Q3)" value={data.quartiles.Q3 ?? 'N/A'} />
            </div>
          </div>
        )}

        {/* 2.1.4 Indicateurs de dispersion */}
        {data.dispersion && (
          <div>
            <h3 className="font-semibold mb-2 text-lg"> Indicateurs de Dispersion</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="Écart-type" value={data.dispersion.ecart_type ?? 'N/A'} />
              <MetricCard title="Écart interquartile" value={data.dispersion.ecart_interquartile ?? 'N/A'} />
              <MetricCard title="Étendue" value={data.dispersion.etendue ?? 'N/A'} />
            </div>
          </div>
        )}

        {/* 2.1.5 Indicateurs de forme */}
        {data.forme && (
          <div>
            <h3 className="font-semibold mb-2 text-lg"> Indicateurs de Forme</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Coefficient de Variance"
                value={data.forme.coeff_variance ?? 'N/A'}
              />
              <MetricCard
                title="Coefficient de Pearson"
                value={data.forme.coeff_skewness ?? 'N/A'}
              />
              <MetricCard
                title="Kurtosis"
                value={data.forme.kurtosis ?? 'N/A'}
              />
            </div>
          </div>
        )}

        {/* 2.1.6 Représentations graphiques interactives */}
        {data.chart_data && (
          <div>
            <h3 className="font-semibold mb-2 text-lg"> Représentations Graphiques Interactives</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Colonne de gauche: Histogramme et polygone de fréquences */}
              <div className="space-y-6">
                {data.chart_data.histogram && (
                  <InteractiveHistogram
                    data={data.chart_data.histogram}
                    title={`Histogramme de ${col}`}
                    height={300}
                  />
                )}
                {data.chart_data.frequency_polygon && (
                  <InteractiveFrequencyPolygon
                    data={data.chart_data.frequency_polygon}
                    title={`Polygone de fréquences de ${col}`}
                    height={300}
                  />
                )}
              </div>

              {/* Colonne de droite: Loi normale et boîte à moustaches */}
              <div className="space-y-6">
                {data.chart_data.normal_distribution && (
                  <InteractiveNormalDistribution
                    data={data.chart_data.normal_distribution}
                    title={`Loi normale de ${col}`}
                    height={300}
                  />
                )}
                {data.chart_data.boxplot && (
                  <InteractiveBoxPlot
                    data={[{
                      name: col,
                      values: [
                        data.chart_data.boxplot.min,
                        data.chart_data.boxplot.q1,
                        data.chart_data.boxplot.median,
                        data.chart_data.boxplot.q3,
                        data.chart_data.boxplot.max
                      ]
                    }]}
                    title={`Boîte à moustache de ${col}`}
                    height={300}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderQualitativeStats = (col: string, data: any) => {
    const distributionKey = Object.keys(data).find(key =>
      key.includes('_distribution') && Array.isArray(data[key])
    );

    const modeKey = Object.keys(data).find(key =>
      key.includes('_mode') && data[key] !== undefined
    );

    const distributionData = distributionKey ? data[distributionKey] as QualitativeDistribution[] : [];

    return (
      <Card key={col} className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm break-all">{col}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2.2.1 Distribution */}
          {distributionData.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-lg"> Distribution</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2">Modalité</th>
                      <th className="border border-gray-300 p-2">Effectif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributionData.map((item, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2">{item.modalite}</td>
                        <td className="border border-gray-300 p-2">{item.effectif}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2.2.2 Mode */}
          {modeKey && data[modeKey] && (
            <div>
              <h3 className="font-semibold mb-2 text-lg"> Mode</h3>
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-lg font-semibold text-blue-800">{data[modeKey]}</p>
              </div>
            </div>
          )}

          {/* 2.2.3 Diagramme en barre interactif */}
          {data.chart_data?.bar_chart && (
            <div>
              <h3 className="font-semibold mb-2 text-lg">Diagramme en Barre Interactif</h3>
              <InteractiveHistogram
                data={data.chart_data.bar_chart.map((item: any) => ({
                  bin: item.modalite,
                  count: item.effectif
                }))}
                title={`Distribution de ${col}`}
                height={400}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRelationItem = (relationKey: string, relationData: any, index: number) => {
    const keyLower = relationKey.toLowerCase();

    if (keyLower.includes('qualitative')) {
      const qualData = relationData as RelationQualitative;
      const [var1, var2] = relationData.variables || ['Variable 1', 'Variable 2'];

      return (
        <div key={relationKey} className="mb-8 p-6 border-2 border-emerald-200 rounded-lg bg-emerald-50 relation-card">
          <div className="relation-type-badge bg-emerald-500 text-white">Qualitative/Qualitative</div>
          <h3 className="font-semibold mb-4 text-xl text-emerald-800">Relation {index + 1}: {var1} vs {var2}</h3>

          {qualData.tableau_contingence && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-lg"> Tableau de Contingence</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-emerald-300 text-sm">
                  <thead>
                    <tr className="bg-emerald-100">
                      <th className="border border-emerald-300 p-2">Modalité</th>
                      {Object.keys(qualData.tableau_contingence).map(key => (
                        <th key={key} className="border border-emerald-300 p-2">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(qualData.tableau_contingence).map(([modalite, values]) => (
                      <tr key={modalite}>
                        <td className="border border-emerald-300 p-2 font-medium">{modalite}</td>
                        {Object.values(values as any).map((value: any, idx: number) => (
                          <td key={idx} className="border border-emerald-300 p-2">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {qualData.graphiques && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {qualData.graphiques.barre_groupe && (
                <div>
                  <h4 className="font-semibold mb-3 text-lg"> Diagramme en Barre Groupé</h4>
                  <img
                    src={qualData.graphiques.barre_groupe}
                    alt="Diagramme groupé"
                    className="w-full border-2 border-emerald-300 rounded-lg shadow-md"
                  />
                </div>
              )}
              {qualData.graphiques.barre_empile && (
                <div>
                  <h4 className="font-semibold mb-3 text-lg"> Diagramme en Barre Empilé</h4>
                  <img
                    src={qualData.graphiques.barre_empile}
                    alt="Diagramme empilé"
                    className="w-full border-2 border-emerald-300 rounded-lg shadow-md"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else if (keyLower.includes('quant_qual')) {
      const quantQualData = relationData as RelationQuantQual;
      const [quantVar, qualVar] = relationData.variables || ['Variable Quantitative', 'Variable Qualitative'];

      return (
        <div key={relationKey} className="mb-8 p-6 border-2 border-white-200 rounded-lg bg-white-50 relation-card">
          
          <h3 className="font-semibold mb-4 text-xl text-black-800">Relation : {quantVar} vs {qualVar}</h3>

          {quantQualData.tableau_moy_ecart_type && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-lg"> Tableau de Moyenne et Écart-type</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-white-300 text-sm">
                  <thead>
                    <tr className="bg-emerald-100">
                      {Object.keys(quantQualData.tableau_moy_ecart_type[0] || {}).map(key => (
                        <th key={key} className="border border-emerald-300 p-2">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quantQualData.tableau_moy_ecart_type.map((row: any, rowIndex: number) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((value: any, idx: number) => (
                          <td key={idx} className="border border-emerald-300 p-2">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {quantQualData.tableau_mediane_quartiles && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-lg"> Tableau de Médiane et Quartiles</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-emerald-300 text-sm">
                  <thead>
                    <tr className="bg-emerald-100">
                      {Object.keys(quantQualData.tableau_mediane_quartiles[0] || {}).map(key => (
                        <th key={key} className="border border-emerald-300 p-2">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quantQualData.tableau_mediane_quartiles.map((row: any, rowIndex: number) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((value: any, idx: number) => (
                          <td key={idx} className="border border-emerald-300 p-2">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Box plot interactif par catégorie */}
          {quantQualData.chart_data?.boxplot_data && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-lg"> Boîtes à Moustache par Catégorie</h4>
              <InteractiveBoxPlot
                data={quantQualData.chart_data.boxplot_data.map((item: any) => ({
                  name: item.category,
                  values: [
                    item.min,
                    item.q1,
                    item.median,
                    item.q3,
                    item.max
                  ]
                }))}
                title={`Distribution de ${quantVar} par ${qualVar}`}
                height={400}
              />
            </div>
          )}
        </div>
      );
    } else if (keyLower.includes('quantitative')) {
      const quantData = relationData as RelationQuantitative;
      const [var1, var2] = relationData.variables || ['Variable 1', 'Variable 2'];

      return (
        <div key={relationKey} className="mb-8 p-6 border-2 border-white-200 rounded-lg bg-white-50 relation-card">
          <h3 className="font-semibold mb-4 text-xl text-black-800">Relation : {var1} vs {var2}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <MetricCard title=" Covariance" value={quantData.covariance ?? 'N/A'} />
            <MetricCard title=" Coefficient de Corrélation" value={quantData.correlation ?? 'N/A'} />
          </div>
          {quantData.regression_lineaire && (
            <div>
              <h4 className="font-semibold mb-3 text-lg"> Régression Linéaire</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <MetricCard title="Pente" value={quantData.regression_lineaire.pente ?? 'N/A'} />
                <MetricCard title="Ordonnée à l'origine" value={quantData.regression_lineaire.ordonnee_origine ?? 'N/A'} />
              </div>
              {/* Conteneur pour afficher les deux graphiques côte à côte */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scatter plot interactif (recharts) */}
                {quantData.chart_data?.scatter_data && (
                  <InteractiveScatterPlot
                    data={quantData.chart_data.scatter_data}
                    xLabel={var1}
                    yLabel={var2}
                    title={`Relation entre ${var1} et ${var2}`}
                    height={400}
                  />
                )}
                {/* Scatter plot interactif (plotly) */}
                {quantData.chart_data?.scatter_data && (
                  <InteractiveScatterPlotPlotly
                    data={quantData.chart_data.scatter_data}
                    xLabel={var1}
                    yLabel={var2}
                    title={`Relation entre ${var1} et ${var2}`}
                    height={400}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const filteredRelations = () => {
    if (!stats?.Relations) return null;
    const relations = stats.Relations;
    const filtered: any = {};
    Object.entries(relations).forEach(([key, data]) => {
      const keyLower = key.toLowerCase();
      const shouldInclude =
        (relationsSubType === 'qualitative_qualitative' && keyLower.includes('qualitative')) ||
        (relationsSubType === 'quantitative_qualitative' && keyLower.includes('quant_qual')) ||
        (relationsSubType === 'quantitative_quantitative' && keyLower.includes('quantitative'));
      if (shouldInclude) {
        filtered[key] = data;
      }
    });
    return Object.keys(filtered).length > 0 ? filtered : null;
  };

  const quantitativeVars = stats ? Object.entries(stats.Variables).filter(([_, data]) => isQuantitative(data)) : [];
  const qualitativeVars = stats ? Object.entries(stats.Variables).filter(([_, data]) => isQualitative(data)) : [];
  const relationsData = filteredRelations();
  const hasRelations = relationsData && Object.keys(relationsData).length > 0;
  const availableCorrelationVars = useMemo(() => {
    const targetVarFullNames = new Set(normalizedTargetVars);

    if (!variableNames.quantitative || !targetRelationVariable) return {};
    const filtered: { [key: string]: { fullName: string, parts: string[] }[] } = {};

    Object.entries(variableNames.quantitative).forEach(([groupName, groupVariables]) => {
      const filteredGroup = groupVariables.filter(v => 
        v.fullName !== targetRelationVariable && 
        !targetVarFullNames.has(v.fullName)
      );

      if (filteredGroup.length > 0) {
        filtered[groupName] = filteredGroup;
      }
    });

    return filtered;
  }, [variableNames.quantitative, targetRelationVariable, normalizedTargetVars]);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analyse Statistique Complète</CardTitle>
          <CardDescription>Configurez et lancez votre analyse statistique</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sélection de la ligne et type d'analyse côte à côte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sélection de la ligne */}
            <div>
              <label className="form-label">Ligne de Production</label>
              <Select value={line} onValueChange={(value) => {
                setLine(value);
                setAnalysisType('descriptive');
                setDescriptiveSubType('quantitative');
                setRelationsSubType('qualitative_qualitative');
                setTargetVariable('');
                setTargetRelationVariable('');
                setOtherRelationVariable('');
                setStats(null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une ligne" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_LINES.map(l => (
                    <SelectItem key={l} value={l}>Ligne {l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélection du type d'analyse */}
            <div>
              <label className="form-label">Type d'Analyse</label>
              <Select value={analysisType} onValueChange={(value: AnalysisType) => {
                setAnalysisType(value);
                setDescriptiveSubType('quantitative');
                setRelationsSubType('qualitative_qualitative');
                setTargetVariable('');
                setTargetRelationVariable('');
                setOtherRelationVariable('');
                setStats(null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir le type d'analyse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="descriptive">Analyse Descriptive</SelectItem>
                  <SelectItem value="relations">Étude des Relations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sous-sélection pour l'analyse descriptive */}
          {analysisType === 'descriptive' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Type de Variables</label>
                <Select value={descriptiveSubType} onValueChange={(value: DescriptiveSubType) => {
                  setDescriptiveSubType(value);
                  setTargetVariable('');
                  setStats(null); 
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le type de variables" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quantitative">Variables quantitatives</SelectItem>
                    <SelectItem value="qualitative">Variables qualitatives</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sélecteur de Cible - Uniquement pour les variables quantitatives */}
{descriptiveSubType === 'quantitative' && (
                <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <label className="form-label">Variable Cible</label>
                    {targetVariable && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTargetVariable('')}
                      >
                        Effacer la sélection
                      </Button>
                    )}
                  </div>
                  
                  {/* Champ d'affichage et de recherche */}
                  <Input
                    placeholder="Rechercher une variable..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="w-full"
                  />
                  
                  {/* Le menu déroulant personnalisé */}
                  {isFocused && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                      {Object.entries(filterVariablesBySearch(variableNames.quantitative)).map(([groupName, variables]) => (
                        <div key={groupName}>
                          <div className="p-2 text-emerald-700 bg-emerald-100 font-semibold sticky top-0">
                            {groupName} ({variables.length})
                          </div>
                          {variables.map((variable) => (
                            <div
                              key={variable.fullName}
                              className="p-2 cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSelectVariable(variable.fullName)}
                            >
                              <HierarchicalVariableName parts={variable.parts.slice(1)} />
                            </div>
                          ))}
                        </div>
                      ))}
                      {Object.keys(filterVariablesBySearch(variableNames.quantitative)).length === 0 && (
                        <div className="p-2 text-center text-gray-500 text-sm">
                          Aucune variable trouvée pour "{searchTerm}"
                        </div>
                      )}
                    </div>
                  )}

                  {/* Afficheur de la variable sélectionnée (si le menu est fermé) */}
                  {!isFocused && targetVariable && (
                    <div className="mt-2 p-2 border border-gray-300 rounded-md bg-gray-50">
                      <HierarchicalVariableName parts={targetVariable.split('.').slice(1)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* Sous-sélection pour l'étude des relations */}
          {analysisType === 'relations' && (
            <div className="space-y-4">
              {/* Ligne contenant les 3 sélecteurs alignés */}
              <div className="flex gap-4">

                {/* Type de Relations */}
                <div className="w-1/3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="form-label">Type de Relations</label>
                  </div>
                  <Select
                    value={relationsSubType}
                    onValueChange={(value: RelationsSubType) => {
                      setRelationsSubType(value);
                      setTargetRelationVariable('');
                      setOtherRelationVariable('');
                      setStats(null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir le type de relations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qualitative_qualitative">Deux variables qualitatives</SelectItem>
                      <SelectItem value="quantitative_qualitative">Variable quantitative / Variable qualitative</SelectItem>
                      <SelectItem value="quantitative_quantitative">Deux variables quantitatives</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                {/* Variable Cible */}
                {relationsSubType === 'quantitative_quantitative' && (
                  <div className="w-1/3 relative">
                    <div className="flex justify-between items-center mb-2">
                      <label className="form-label">Variable Cible</label>
                      {targetRelationVariable && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTargetRelationVariable('');
                            setStats(null);
                          }}
                        >
                          Effacer la sélection
                        </Button>
                      )}
                    </div>
                    {/* Champ de recherche et affichage */}
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
                    {/* Afficheur de la variable sélectionnée (si le menu est fermé) */}
                    {!isTargetFocused && targetRelationVariable && (
                      <div className="mt-2 p-2 border border-gray-300 rounded-md bg-gray-50">
                        <HierarchicalVariableName parts={targetRelationVariable.split('.').slice(1)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Variable à Corréler */}
                {relationsSubType === 'quantitative_quantitative' && targetRelationVariable && (
                  <div className="w-1/3 relative">
                    <div className="flex justify-between items-center mb-2">
                      <label className="form-label">Variable à Corréler</label>
                      {otherRelationVariable && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOtherRelationVariable('');
                            setStats(null);
                          }}
                        >
                          Effacer la sélection
                        </Button>
                      )}
                    </div>
                    {/* Champ de recherche et affichage */}
                    <Input
                      placeholder="Rechercher une variable..."
                      value={searchTermRelations}
                      onChange={(e) => setSearchTermRelations(e.target.value)}
                      onFocus={handleOtherInputFocus}
                      onBlur={handleOtherInputBlur}
                      className="w-full"
                    />
                    {/* Le menu déroulant personnalisé */}
                    {isOtherFocused && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                        {Object.entries(filterRelationVariablesBySearch(availableCorrelationVars, searchTermRelations)).map(([groupName, variables]) => (
                          <div key={groupName}>
                            <div className="p-2 text-emerald-700 bg-emerald-100 font-semibold sticky top-0">
                              {groupName} ({variables.length})
                            </div>
                            {variables.map((variable) => (
                              <div
                                key={variable.fullName}
                                className="p-2 cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSelectOtherVariable(variable.fullName)}
                              >
                                <HierarchicalVariableName parts={variable.parts.slice(1)} />
                              </div>
                            ))}
                          </div>
                        ))}
                        {Object.keys(filterRelationVariablesBySearch(availableCorrelationVars, searchTermRelations)).length === 0 && (
                          <div className="p-2 text-center text-gray-500 text-sm">
                            Aucune variable trouvée pour "{searchTermRelations}"
                          </div>
                        )}
                      </div>
                    )}
                    {/* Afficheur de la variable sélectionnée (si le menu est fermé) */}
                    {!isOtherFocused && otherRelationVariable && (
                      <div className="mt-2 p-2 border border-gray-300 rounded-md bg-gray-50">
                        <HierarchicalVariableName parts={otherRelationVariable.split('.').slice(1)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Bouton de lancement - TOUJOURS VISIBLE */}
          <Button
            onClick={handleFetchStatistics}
            disabled={loading || !line ||
              (analysisType === 'relations' &&
                relationsSubType === 'quantitative_quantitative' &&
                (!targetRelationVariable || !otherRelationVariable)) ||
              (analysisType === 'descriptive' &&
                descriptiveSubType === 'quantitative' &&
                !targetVariable) 
            }
            className={`w-full ${
              (analysisType === 'relations' &&
                relationsSubType === 'quantitative_quantitative' &&
                (!targetRelationVariable || !otherRelationVariable)) ||
              (analysisType === 'descriptive' &&
                descriptiveSubType === 'quantitative' &&
                !targetVariable)
                ? 'bg-emerald-300 cursor-not-allowed' 
                : 'bg-emerald-500 hover:bg-emerald-600' 
            } text-white`}
            size="lg"
          >
            {loading ? 'Chargement des Analyses...' : "Lancer l'Analyse"}
          </Button>

        </CardContent>
      </Card>

      {stats && stats.Variables && (
        <>
          {/* 2. Analyse Descriptive */}
          {analysisType === 'descriptive' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Analyse Descriptive - {
                    descriptiveSubType === 'quantitative' ? 'Variables Quantitatives' : 'Variables Qualitatives'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {descriptiveSubType === 'quantitative' && (
                  <div>
                    <div className="space-y-6">
                      {filteredQuantitativeVars.map(([col, data]) =>
                        renderQuantitativeStats(col, data as QuantitativeStats)
                      )}
                    </div>
                  </div>
                )}

                {descriptiveSubType === 'qualitative' && (
                  <div className="space-y-6">
                    {filteredQualitativeVars.map(([col, data]) =>
                      renderQualitativeStats(col, data as any)
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 3. Étude des Relations */}
          {analysisType === 'relations' && hasRelations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Étude des Relations - {
                    relationsSubType === 'qualitative_qualitative' ? 'Variables Qualitatives' :
                      relationsSubType === 'quantitative_qualitative' ? 'Quantitative/Qualitative' :
                        'Variables Quantitatives'
                  } 
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(relationsData!).map(([relationKey, relationData], index) =>
                    renderRelationItem(relationKey, relationData, index)
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages si aucune donnée */}
          {analysisType === 'descriptive' && descriptiveSubType === 'quantitative' && filteredQuantitativeVars.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Aucune donnée quantitative</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">
                  Aucune donnée quantitative disponible pour la sélection actuelle.
                </p>
              </CardContent>
            </Card>
          )}
          {analysisType === 'descriptive' && descriptiveSubType === 'qualitative' && filteredQualitativeVars.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Aucune donnée qualitative</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">
                  Aucune donnée qualitative disponible pour la sélection actuelle.
                </p>
              </CardContent>
            </Card>
          )}
          {analysisType === 'relations' && !hasRelations && (
            <Card>
              <CardHeader>
                <CardTitle>Aucune relation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">
                  Aucune relation disponible pour la sélection "{relationsSubType}" dans l'étude des relations.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};