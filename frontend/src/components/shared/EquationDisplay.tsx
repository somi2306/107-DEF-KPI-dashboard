

import React from 'react';
import { InlineMath } from 'react-katex';
import type { EquationData } from '../../types';

interface EquationDisplayProps {
  data: EquationData;
}

const escapeLatex = (text: string): string => {
  return text.replace(/([&%$#_{}])/g, '\\$1');
};


const formatNumberForLatex = (num: number): string => {
  const numStr = num.toString();
  if (numStr.includes('e')) {
    const [mantissa, exponent] = numStr.split('e');
    // On peut arrondir la mantisse pour un affichage plus propre
    const roundedMantissa = parseFloat(mantissa); 
    return `${roundedMantissa} \\times 10^{${exponent}}`;
  }
  return numStr;
};

export const EquationDisplay: React.FC<EquationDisplayProps> = ({ data }) => {
  if (data.type === 'linear' && data.coefficients && data.intercept !== undefined) {
    const coefs = Array.isArray(data.coefficients[0]) ? data.coefficients[0] : data.coefficients;
    const intercept = Array.isArray(data.intercept) ? data.intercept[0] : data.intercept;

    const allZero = coefs.every((c) => Math.abs(c) < 1e-8);
    const interceptZero = Math.abs(intercept) < 1e-8;
    if (allZero && interceptZero) return null;

    // Utilisation de la nouvelle fonction pour l'intercept
    const interceptValue = typeof intercept === 'number' ? formatNumberForLatex(intercept) : '0';

    const terms = data.features
      .map((feature, index) => {
        const coef = coefs?.[index] ?? 0;
        if (Math.abs(coef) < 1e-8) return null;

        const sign = coef >= 0 ? '+' : '-';
        const shortName = escapeLatex(feature.split('.').pop() ?? '');
        
        // Utilisation de la nouvelle fonction pour les coefficients
        const coefString = formatNumberForLatex(Math.abs(coef));

        return `${sign} ${coefString} \\cdot \\text{[${shortName}]}`;
      })
      .filter(Boolean) as string[];

    return (
      <div className="equation-container">
        <h4 className="equation-title">Équation du Modèle Linéaire</h4>
        
        <div className="equation-content text-left p-4 bg-gray-100 rounded-md text-lg">
          <InlineMath math={`\\text{Cible} \\approx ${interceptValue}`} />
          
          {terms.map((term, index) => (
            <span key={index} className="inline-block ml-2 whitespace-nowrap">
              <InlineMath math={term} />
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'tree' && data.importances) {
    const featureImportances = data.features
      .map((feature, index) => ({
        name: feature.split('.').pop() ?? 'Inconnu',
        importance: data.importances?.[index] ?? 0,
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);

    return (
      <div className="equation-container">
        <h4 className="equation-title">Importance des Variables (Top 10)</h4>
        <ul className="importance-list">
          {featureImportances.map((item, index) => (
            <li key={index}>
              <strong>{item.name}:</strong>
              <span>{(item.importance * 100).toFixed(2)}%</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
};