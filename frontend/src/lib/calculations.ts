

import type { FeatureValues } from '../types';
interface CalculatedField {
    dependencies: string[];
    calculate: (values: FeatureValues) => number | null;
}

const getNum = (values: FeatureValues, key: string): number => {
    const val = parseFloat(values[key]);
    return isNaN(val) ? 0 : val;
};

// --- DÉFINITION DES CHAMPS ---
// Champs sources
const DEBIT_ACP_1 = 'Valeurs.J_107DEF_107FFIC905_B.Débit ACP 1 M3/H';
const DEBIT_ACP_2 = 'Valeurs.J_107DEF_107FFIC912_B.Débit ACP 2 M3/H';
const DEBIT_BOUILLIE_T_H_1 = 'Valeurs.J_107DEF_107FFIC878_B.Débit bouillie T/H 1';
const DEBIT_BOUILLIE_T_H_2 = 'Valeurs.J_107DEF_107FFIC879_B.Débit bouillie T/H 2';
const RECYCLAGE_T_H = 'Valeurs.J_107DEF_107FWIC434_B.Recyclage T/H';
const DEBIT_PP_KG_H = 'Valeurs.J_107DEF_107FWI860-R_B.DébIT PP Kg/H';
const P2O5_AR29 = 'ACIDE PHOSPHORIQUE.Picage AR29.%P2O5 AR29';
const DENSITE_AR29 = 'ACIDE PHOSPHORIQUE.Picage AR29.Densité AR29';

// Champs calculés
const DEBIT_ACP_TOTAL = 'Valeurs.somme Débit1+Débit2.Débit ACP M3/H';
const DEBIT_BOUILLIE_TOTAL = 'Valeurs.Débit bouillie T/H 1 +Débit bouillie T/H 2.debit bouillie T/H';
const RATIO_SOLIDE_LIQUIDE = 'Valeurs.(Recyclage T/H)/(debit bouillie T/H).Ratio Solide/Liquide';
const RAPPORT_ACIDULATION = 'Valeurs.0 si ((Débit ACP 1+Débit ACP 2)*(%P2O5 AR29)*(Densité AR29))/(Débit PP*30*1000) <0,5 et ((Débit ACP 1+Débit ACP 2)*(%P2O5 AR29)*(Densité AR29))/(Débit PP*30*1000) sinon.Rapport acidulation Kg/M3';
const PROD_TSP_ACP = 'Valeurs.vide si (Débit ACP*%P2O5*Densité AR29)/(38500)=0 et (Débit ACP*%P2O5*Densité AR29)/(38500) sinon.Prod TSP/ACP M3/H';


// --- CONFIGURATION DES CALCULS ---
export const calculatedFieldsConfig: Record<string, CalculatedField> = {
    [DEBIT_ACP_TOTAL]: {
        dependencies: [DEBIT_ACP_1, DEBIT_ACP_2],
        calculate: (values) => {
            const d1 = getNum(values, DEBIT_ACP_1);
            const d2 = getNum(values, DEBIT_ACP_2);
            return d1 + d2;
        }
    },
    [DEBIT_BOUILLIE_TOTAL]: {
        dependencies: [DEBIT_BOUILLIE_T_H_1, DEBIT_BOUILLIE_T_H_2],
        calculate: (values) => {
            const d1 = getNum(values, DEBIT_BOUILLIE_T_H_1);
            const d2 = getNum(values, DEBIT_BOUILLIE_T_H_2);
            return d1 + d2;
        }
    },
    [RATIO_SOLIDE_LIQUIDE]: {
        dependencies: [RECYCLAGE_T_H, DEBIT_BOUILLIE_TOTAL],
        calculate: (values) => {
            const recyclage = getNum(values, RECYCLAGE_T_H);
            const debitBouillie = getNum(values, DEBIT_BOUILLIE_TOTAL);
            if (debitBouillie === 0) return 0; // Éviter la division par zéro
            return recyclage / debitBouillie;
        }
    },
    [RAPPORT_ACIDULATION]: {
        dependencies: [DEBIT_ACP_1, DEBIT_ACP_2, P2O5_AR29, DENSITE_AR29, DEBIT_PP_KG_H],
        calculate: (values) => {
            const debitAcpTotal = getNum(values, DEBIT_ACP_1) + getNum(values, DEBIT_ACP_2);
            const p2o5 = getNum(values, P2O5_AR29);
            const densite = getNum(values, DENSITE_AR29);
            const debitPp = getNum(values, DEBIT_PP_KG_H);
            
            if (debitPp === 0) return 0;

            const result = (debitAcpTotal * p2o5 * densite) / (debitPp * 30 * 1000);
            return result < 0.5 ? 0 : result;
        }
    },
    [PROD_TSP_ACP]: {
        dependencies: [DEBIT_ACP_TOTAL, P2O5_AR29, DENSITE_AR29],
        calculate: (values) => {
            const debitAcpTotal = getNum(values, DEBIT_ACP_TOTAL);
            const p2o5 = getNum(values, P2O5_AR29);
            const densite = getNum(values, DENSITE_AR29);

            const result = (debitAcpTotal * p2o5 * densite) / 38500;
            return result === 0 ? null : result; // Renvoie null pour simuler "vide"
        }
    }
};


export const calculatedFieldNames = Object.keys(calculatedFieldsConfig);