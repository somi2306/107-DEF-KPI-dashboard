import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { PredictionPlotData } from '../../types';

interface PredictionScatterChartProps {
  data: PredictionPlotData;
}

export const PredictionScatterChart: React.FC<PredictionScatterChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || !data.real_values || !data.predicted_values) return [];
    return data.real_values.map((real, index) => ({
      x: real,
      y: data.predicted_values[index],
    }));
  }, [data]);

  // Calcul min/max avec une marge de 10% pour une meilleure visualisation
  const allValues = [...(data?.real_values || []), ...(data?.predicted_values || [])];
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 100;
  const range = maxVal - minVal;
  const domain: [number, number] = [
    minVal - 0.1 * range,
    maxVal + 0.1 * range
  ];

  // Formatage des ticks comme dans matplotlib
  const formatTick = (tickValue: number) => {
    // Pour les très grandes ou petites valeurs, utiliser la notation scientifique
    if (Math.abs(tickValue) >= 1e4 || (Math.abs(tickValue) < 1e-2 && tickValue !== 0)) {
      return tickValue.toExponential(2);
    }
    
    // Pour les valeurs "normales", afficher avec 2 décimales max
    const formatted = Number(tickValue.toFixed(2));
    return formatted.toString();
  };

  // Formatage du tooltip
  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    if (!active || !payload || !payload.length) return null;

    const dataPoint = payload[0].payload;
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: '#fff',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px'
      }}>
        <p><strong>Réel:</strong> {formatTick(dataPoint.x)}</p>
        <p><strong>Prédit:</strong> {formatTick(dataPoint.y)}</p>
        <p><strong>Différence:</strong> {formatTick(dataPoint.y - dataPoint.x)}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
        <CartesianGrid strokeDasharray="3 3" />
        
        <XAxis 
          type="number" 
          dataKey="x" 
          name="Valeurs Réelles" 
          domain={domain}
          tickFormatter={formatTick}
          label={{ 
            value: "Valeurs Réelles", 
            position: 'insideBottomRight', 
            offset: -10,
            style: { fontSize: '14px', fontWeight: 'bold' }
          }}
        />

        <YAxis 
          type="number" 
          dataKey="y" 
          name="Valeurs Prédites" 
          domain={domain}
          tickFormatter={formatTick}
          label={{ 
            value: 'Valeurs Prédites', 
            angle: -90, 
            position: 'insideLeft',
            style: { fontSize: '14px', fontWeight: 'bold' }
          }}
        />

        <Tooltip content={renderTooltip} cursor={{ strokeDasharray: '3 3' }} />

        <ReferenceLine 
          segment={[{ x: domain[0], y: domain[0] }, { x: domain[1], y: domain[1] }]} 
          stroke="red" 
          strokeWidth={1.5}
        />

        <Scatter 
          name="Prédictions" 
          data={chartData} 
          fill="#1f77b4" // Couleur bleue similaire à matplotlib
          opacity={0.6}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};