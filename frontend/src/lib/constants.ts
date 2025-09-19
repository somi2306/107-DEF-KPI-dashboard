import type { Model, TargetVariable } from '../types';

export const MODELS: Model[] = [
  { name: 'Régression Linéaire', value: 'LinearRegression' },
  { name: 'Gradient Linéaire', value: 'LinearGradient'},
  { name: 'Régression Lasso', value: 'Lasso' },
  { name: 'Régression Ridge', value: 'Ridge' },
  { name: 'Random Forest', value: 'RandomForestRegressor' },
  { name: 'Gradient Boosting', value: 'GradientBoostingRegressor' },
];

export type ModelType = typeof MODELS[number]['value'];
export const PRODUCTION_LINES = ['D', 'E', 'F'];



export const TARGET_VARIABLES: TargetVariable[] = [
    { group: "TSP", name: 'Densité bouillie' },
    { group: "TSP", name: '%P2O5 TOT bouillie' },
    { group: "TSP", name: '%P2O5  SE bouillie' },
    { group: "TSP", name: '%Acide libre bouillie' },
    { group: "TSP", name: '%H2O bouillie' },
    { group: "TSP", name: '%CaO bouillie' },
    { group: "TSP", name: '%P2O5  SE+SC gran' },
    { group: "TSP", name: '%P2O5 SE granu' },
    { group: "TSP", name: '%Acide libre granul' },
    { group: "TSP", name: '%P2O5 total granu' },
    { group: "TSP", name: '%H2O tq granu' },

    { group: 'PRODUIT FINI TSP', name: '%P2O5  TOT PF' },
    { group: 'PRODUIT FINI TSP', name: '%P2O5  SE+SC PF' },
    { group: 'PRODUIT FINI TSP', name: '%H2O Tq PF' },
    { group: 'PRODUIT FINI TSP', name: '% AL  à l\'eau PF' },
    { group: 'PRODUIT FINI TSP', name: '% AL à l\'acetone PF' },
    { group: 'PRODUIT FINI TSP', name: '%P2O5 SE PF ' },
    { group: 'PRODUIT FINI TSP', name: '˃6,3mm' },
    { group: 'PRODUIT FINI TSP', name: '˃4,75mm' },
    { group: 'PRODUIT FINI TSP', name: '˃4mm' },
    { group: 'PRODUIT FINI TSP', name: '˃3,15mm' },
    { group: 'PRODUIT FINI TSP', name: '˃2,5mm' },
    { group: 'PRODUIT FINI TSP', name: '˃2mm' },
    { group: 'PRODUIT FINI TSP', name: '˃1mm' },
    { group: 'PRODUIT FINI TSP', name: '˃2,5-˃4mm' },
    { group: 'PRODUIT FINI TSP', name: '˃2-˃4mm' }
];