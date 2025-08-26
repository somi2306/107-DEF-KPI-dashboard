
import React from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout, Shape } from 'plotly.js';

interface ScatterDataPoint {
  x: number;
  y: number;
  name?: string;
}

interface InteractiveScatterPlotPlotlyProps {
  data: ScatterDataPoint[];
  xLabel: string;
  yLabel: string;
  title: string;
  height?: number;
}

export const InteractiveScatterPlotPlotly: React.FC<InteractiveScatterPlotPlotlyProps> = ({
  data,
  xLabel,
  yLabel,
  title,
  height = 400,
}) => {
  const xData = data.map(d => d.x);
  const yData = data.map(d => d.y);

  // Calculer les valeurs min et max pour chaque axe pour définir la bonne échelle
  const minX = Math.min(0, ...xData);
  const maxX = Math.max(...xData);
  const minY = Math.min(0, ...yData);
  const maxY = Math.max(...yData);
  
  // La ligne x=y doit s'étendre sur la plus grande des deux portées pour être visible
  const equalityLineMax = Math.max(0, maxX, maxY);

  const plotData: Partial<Data>[] = [
    {
      x: xData,
      y: yData,
      mode: 'markers',
      type: 'scatter',
      name: 'Points de données',
      marker: { color: '#50C878' },
    },
  ];

  const plotLayout: Partial<Layout> = {
    title: { text: title },
    height,
    autosize: true,
    xaxis: {
      title: { text: xLabel },
      range: [minX, maxX]
    },
    yaxis: {
      title: { text: yLabel },
      range: [minY, maxY]
    },
    // Ajout du tableau des formes pour tracer la ligne x=y
    shapes: [
      {
        type: 'line',
        x0: 0,
        y0: 0,
        x1: equalityLineMax,
        y1: equalityLineMax,
        line: {
          color: 'red',
          width: 2,
          dash: 'dash',
        },
      } as Partial<Shape>,
    ],
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <Plot
        data={plotData as Data[]}
        layout={plotLayout as Layout}
        config={{ responsive: true }}
        style={{ width: '100%' }}
      />
    </div>
  );
};