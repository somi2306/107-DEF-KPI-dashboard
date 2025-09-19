

export interface Model {
  name: string;
  value: string;
}

export interface TargetVariable {
  group: string;
  name: string;
}

export interface TargetVariableGroups {
  [group: string]: TargetVariable[];
}

export interface FeatureValues {
  [key: string]: string;
}

export interface ModelMetrics {
  r2_score: number;
  mse: number;
  rmse: number;
}

export interface EquationData {
    type: 'linear' | 'tree';
    features: string[];
    coefficients?: number[];
    intercept?: number;
    importances?: number[];
}

export interface TreeShape {
  max_depth: number;
  n_leaves: number;
}

export interface TreeDataNode {
    name: string;
    children?: TreeDataNode[];
    attributes?: Record<string, string | number>;
}

export interface SingleTreeData {
    json_structure: TreeDataNode;
    png_path: string;
}

export type AllTreesData = SingleTreeData[];

export interface LearningCurveData {
  train_sizes_abs: number[];
  train_scores_mean: number[];
  validation_scores_mean: number[];
}

export interface PredictionPlotData {
  real_values: number[];
  predicted_values: number[];
}


export interface DistributionTable {
    classe: string;
    effectif: number;
    cumulatif: number;
}

export interface TendanceCentrale {
    mode: number | null;
    moyenne: number;
    mediane: number;
}

export interface Quartiles {
    Q1: number;
    Q2: number;
    Q3: number;
}

export interface Dispersion {
    ecart_type: number;
    ecart_interquartile: number;
    etendue: number;
}

export interface Forme {
    coeff_variance?: number | null;
    coeff_skewness?: number;
    kurtosis?: number;
    coeff_pearson?: number;
}

export interface GraphiquesQuantitatifs {
    histogramme?: string;
    boite_a_moustache?: string;
}

/*hhhhhhh */
export interface QualitativeDistribution {
    modalite: string;
    effectif: number;
}

export interface GraphiquesQualitatifs {
    diagramme_en_barre?: string;
}

export type DescriptiveStats = QuantitativeStats | QualitativeStats;


export interface RelationContingence {
    [key: string]: number;
}

export interface RegressionLineaire {
    pente: number;
    ordonnee_origine: number;
    graphique: string;
}


export interface GraphiquesRelationQualitative {
    barre_groupe?: string;
    barre_empile?: string;
}

export interface RelationQualitative {
    tableau_contingence?: RelationContingence;
    graphiques?: GraphiquesRelationQualitative;
}

export interface TableauStatistique {
    [key: string]: any;
}

export interface GraphiquesRelationQuantQual {
    boite_a_moustache?: string;
}

export interface Relations {
    [key: string]: RelationQualitative | RelationQuantitative | RelationQuantQual;
}



export interface QualitativeData {
    type: 'qualitative';
    distribution?: QualitativeDistribution[];
    distribution_table?: QualitativeDistribution[];
    [key: string]: any;
    mode?: string | null;
    graphiques?: {
        diagramme_en_barre?: string;
        [key: string]: any;
    };
}
export interface QuantitativeData {
    type: 'quantitative';
    distribution_table?: DistributionTable[];
    tendance_centrale?: TendanceCentrale;
    quartiles?: Quartiles;
    dispersion?: Dispersion;
    forme?: Forme;
    graphiques: GraphiquesQuantitatifs;
}



export type AnalysisType = 'descriptive' | 'relations';
export type DescriptiveSubType = 'quantitative' | 'qualitative' | 'all';
export type RelationsSubType = 'qualitative_qualitative' | 'quantitative_qualitative' | 'quantitative_quantitative' | 'all';



export interface HistogramData {
  bin: string;
  count: number;
}

export interface BoxPlotData {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export interface ScatterDataPoint {
  x: number;
  y: number;
}

export interface RegressionLine {
  slope: number;
  intercept: number;
  r_squared: number;
}

export interface CategoryBoxPlot {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export interface CategorySummary {
  mean: number;
  std_dev: number;
}




export interface NormalDistributionPoint {
  x: number;
  y: number;
}


export type NormalDistributionData = NormalDistributionPoint[];



export interface FrequencyPolygonPoint {
  x: number;    // Point médian de la classe
  y: number;    // Fréquence de la classe
}

export type FrequencyPolygonData = FrequencyPolygonPoint[];


export interface QuantitativeStats {
    type: 'quantitative';
    distribution_table?: DistributionTable[];
    tendance_centrale?: TendanceCentrale;
    quartiles?: Quartiles;
    dispersion?: Dispersion;
    forme?: Forme;
    chart_data?: {
        histogram: HistogramData[];
        boxplot: BoxPlotData;
        normal_distribution?: NormalDistributionData;
        frequency_polygon?: FrequencyPolygonData; 
        summary_stats: {
            mean: number;
            std_dev: number;
            sample_size: number;
        };
    };
}


export interface RelationQuantitative {
    covariance?: number;
    correlation?: number;
    regression_lineaire?: RegressionLineaire;
    chart_data?: {
        scatter_data: ScatterDataPoint[];
        regression_line: RegressionLine;
        sample_size: number;
    };
}


export interface RelationQuantQual {
    tableau_moy_ecart_type?: TableauStatistique[];
    tableau_mediane_quartiles?: TableauStatistique[];
    chart_data?: {
        boxplot_data: CategoryBoxPlot[];
        summary_by_category: Record<string, CategorySummary>;
    };
}


export interface QualitativeStats {
    type: 'qualitative';
    distribution: QualitativeDistribution[];
    mode: string | null;
    chart_data?: {
        bar_chart: QualitativeDistribution[];
        categories: string[];
        sample_size: number;
    };
}

// Dans types/index.ts
export interface StatisticsResponse {
  Ligne: string;
  Variables: Record<string, DescriptiveStats>;
  Relations: Record<string, RelationData>;
  metadata?: {
    total_variables: number;
    total_relations: number;
    generated_at: string;
    imputation_method: string;
    analysis_duration?: number;
  };
}

export interface RelationData {
  variables: string[];
  type?: string;
  data: any;
  chart_data?: any;
}

