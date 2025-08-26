
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ScatterDataPoint {
  x: number;
  y: number;
  name?: string;
}

interface InteractiveScatterPlotProps {
  data: ScatterDataPoint[];
  xLabel: string;
  yLabel: string;
  title: string;
  height?: number;
}

export const InteractiveScatterPlot: React.FC<InteractiveScatterPlotProps> = ({ 
  data, 
  xLabel, 
  yLabel, 
  title, 
  height = 400 
}) => {

  const formatScatterTooltip = (value: number, name: string) => {
    return [`${value.toFixed(2)}`, name];
  };

  const maxVal = Math.max(...data.flatMap(d => [d.x, d.y]));

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid />
          <XAxis type="number" dataKey="x" name={xLabel} />
          <YAxis type="number" dataKey="y" name={yLabel} />
          <Tooltip formatter={formatScatterTooltip} cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          <Scatter name="Points" data={data} fill="#50C878" />
          <ReferenceLine 
            segment={[{ x: 0, y: 0 }, { x: maxVal, y: maxVal }]} 
            stroke="black"
            strokeDasharray="5 5"
            label={{ position: 'top', value: 'Ligne x=y', fill: 'black', fontSize: 12 }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};