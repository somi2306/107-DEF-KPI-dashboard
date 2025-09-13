
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface NormalDistributionPoint {
  x: number;
  y: number;
}

interface InteractiveNormalDistributionProps {
  data: NormalDistributionPoint[]; 
  title: string;
  height?: number;
}

export const InteractiveNormalDistribution: React.FC<InteractiveNormalDistributionProps> = ({ 
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
          <Tooltip formatter={(value) => [`${value}`, 'Densité']} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="y" 
            stroke="#50C878" 
            name="Loi normale" 
            dot={false}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};