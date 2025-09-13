
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FrequencyPolygonPoint {
  x: number;
  y: number;
}

interface InteractiveFrequencyPolygonProps {
  data: FrequencyPolygonPoint[];
  title: string;
  height?: number;
}

export const InteractiveFrequencyPolygon: React.FC<InteractiveFrequencyPolygonProps> = ({ 
  data, 
  title, 
  height = 400 
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value}`, 'Fréquence']} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="y" 
            stroke="#50C878" 
            name="Polygone de fréquences" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};