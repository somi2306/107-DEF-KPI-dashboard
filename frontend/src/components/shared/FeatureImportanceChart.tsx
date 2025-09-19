import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { EquationData } from '../../types';

interface FeatureImportanceChartProps {
  data: EquationData;
}

export const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({ data }) => {
  const formatImportanceTooltip = (value: number, name: string) => {
    return [`${value.toFixed(4)}`, name];
  };

  const chartData = useMemo(() => {
    let weights = data.coefficients || data.importances;
    if (!weights || !data.features) {
      return [];
    }
    if (Array.isArray(weights) && Array.isArray(weights[0])) {
      weights = weights[0];
    }
    return data.features
      .map((feature, index) => {
        const weightValue = Number(weights[index]);
        if (isNaN(weightValue)) {
            return null;
        }
        return {
          name: feature.split('.').pop() || feature,
          poids: Math.abs(weightValue)
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => b.poids - a.poids)
      .reverse();
  }, [data]);

  const chartHeight = Math.max(400, chartData.length * 35);

  if (chartData.length === 0) {
    return <p className="text-center text-muted-foreground">Données d'importance non disponibles.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={200}
          tick={{ fontSize: 12 }}
        />
        <Tooltip formatter={formatImportanceTooltip} />
        <Legend />
        <Bar dataKey="poids" fill="#50C878" name="Poids (Importance ou Coeff. Absolu)" />
      </BarChart>
    </ResponsiveContainer>
  );
};