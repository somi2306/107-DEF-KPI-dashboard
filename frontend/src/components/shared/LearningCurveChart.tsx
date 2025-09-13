import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LearningCurveData } from '../../types';

interface LearningCurveChartProps {
  data: LearningCurveData;
}

export const LearningCurveChart: React.FC<LearningCurveChartProps> = ({ data }) => {
  // On transforme les données pour qu'elles soient utilisables par Recharts
  const chartData = useMemo(() => {
    return data.train_sizes_abs.map((size, index) => ({
      name: size, // Nom pour l'axe X
      'Erreur (Entraînement)': data.train_scores_mean[index],
      'Erreur (Validation)': data.validation_scores_mean[index],
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" label={{ value: "Nombre d'échantillons d'entraînement", position: 'insideBottom', offset: -15 }} />
        <YAxis label={{ value: 'Erreur Quadratique Moyenne (MSE)', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend verticalAlign="top" />
        <Line type="monotone" dataKey="Erreur (Entraînement)" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="Erreur (Validation)" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
};