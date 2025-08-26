import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HistogramData {
  bin: string;
  count: number;
}

interface InteractiveHistogramProps {
  data: HistogramData[];
  title: string;
  height?: number;
}

export const InteractiveHistogram: React.FC<InteractiveHistogramProps> = ({ 
  data, 
  title, 
  height = 400 
}) => {
  // Formatter correct pour Tooltip
  const formatTooltip = (value: number, name: string) => {
    return [`${value}`, name];
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bin" />
          <YAxis />
          <Tooltip formatter={formatTooltip} />
          <Legend />
          <Bar dataKey="count" fill="#50C878" name="Effectif" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};