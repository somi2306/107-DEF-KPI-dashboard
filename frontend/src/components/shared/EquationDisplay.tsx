import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css'; // Importation du CSS de KaTeX
import type { EquationData } from '../../types';

const escapeLatex = (text: string): string => {
  return text.replace(/([&%$#_{}])/g, '\\$1');
};

const formatNumberForLatex = (num: number): string => {
  const numStr = num.toString();
  if (numStr.includes('e')) {
    const [mantissa, exponent] = numStr.split('e');
    const roundedMantissa = parseFloat(mantissa);
    return `${roundedMantissa} \\times 10^{${exponent}}`;
  }
  return numStr;
};

export const EquationDisplay: React.FC<{ data: EquationData }> = ({ data }) => {

  if (data.type === 'linear' && data.coefficients && data.intercept !== undefined) {
    const coefs = Array.isArray(data.coefficients[0]) ? data.coefficients[0] : data.coefficients;
    const intercept = Array.isArray(data.intercept) ? data.intercept[0] : data.intercept;

    const allZero = coefs.every((c) => Math.abs(c) < 1e-8);
    const interceptZero = Math.abs(intercept) < 1e-8;
    if (allZero && interceptZero) return null;

    const interceptValue = typeof intercept === 'number' ? formatNumberForLatex(intercept) : '0';

    const termsString = data.features
      .map((feature, index) => {
        const coef = coefs?.[index] ?? 0;
        if (Math.abs(coef) < 1e-8) return '';
        const sign = coef >= 0 ? '+' : '-';
        const shortName = escapeLatex(feature.split('.').pop() ?? '');
        const coefString = formatNumberForLatex(Math.abs(coef));
        // Ajout de la commande \textcolor{emerald}{...}
        return ` ${sign} ${coefString} \\cdot \\textcolor{green}{\\text{[${shortName}]}}`;
      })
      .join('');

    const fullEquation = `\\text{Cible} \\approx ${interceptValue}${termsString}`;
    
    const createMarkup = () => {
        try {
            // Utilise KaTeX pour convertir la chaîne LaTeX en HTML
            return { __html: katex.renderToString(fullEquation, { throwOnError: false, displayMode: false }) };
        } catch (e) {
            console.error(e);
            return { __html: 'Erreur lors du rendu de l\'équation' };
        }
    };

    return (
      <div className="equation-container">
        <h4 className="text-lg font-medium">
  Équation du Modèle Linéaire : 
</h4>
<br/>

        <div
          className="equation-content text-left p-4 bg-gray-100 rounded-md text-lg"
          dangerouslySetInnerHTML={createMarkup()}
        />
      </div>
    );
  }

  if (data.type === 'tree' && data.importances) {
    const featureImportances = data.features
      .map((feature, index) => ({
        name: feature.split('.').pop() ?? 'Inconnu',
        importance: data.importances?.[index] ?? 0,
      }))
      .sort((a, b) => b.importance - a.importance);

    return (
      <div className="equation-container">
        <h4 className="text-lg font-medium mb-4 text-emerald-700">
          Importance des Variables
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-md shadow border">
            <thead>
              <tr className="bg-emerald-100">
                <th className="py-2 px-4 text-left">Variable</th>
                <th className="py-2 px-4 text-left">Importance (%)</th>
                <th className="py-2 px-4 text-left">Visualisation</th>
              </tr>
            </thead>
            <tbody>
              {featureImportances.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4 font-semibold text-gray-700">{item.name}</td>
                  <td className="py-2 px-4 text-gray-900">{(item.importance * 100).toFixed(2)}%</td>
                  <td className="py-2 px-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-emerald-500 h-3 rounded-full"
                        style={{ width: `${(item.importance * 100).toFixed(2)}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
};