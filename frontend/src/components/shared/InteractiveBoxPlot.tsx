import React from 'react';
import Plot from 'react-plotly.js';

interface BoxPlotData {
  name: string;
  values: number[];
}

interface InteractiveBoxPlotProps {
  data: BoxPlotData[];
  title: string;
  height?: number;
}

export const InteractiveBoxPlot: React.FC<InteractiveBoxPlotProps> = ({
  data,
  title,
  height = 400,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <Plot
        data={data.map(item => ({
          y: item.values,
          type: 'box',
          name: item.name,
          boxpoints: 'outliers',
          marker: { color: '#50C878' },
        }))}
        layout={{
          title: { text: title }, 
          height,
          margin: { t: 40, l: 50, r: 30, b: 40 },
        }}
        config={{ responsive: true }}
        style={{ width: '100%' }}
      />
    </div>
  );
};
