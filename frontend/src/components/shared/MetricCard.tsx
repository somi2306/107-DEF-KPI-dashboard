import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';

interface MetricCardProps {
  title: string;
  // La valeur peut être un nombre ou du texte (ex: 'N/A')
  value: number | string;
  description?: string; // La description est optionnelle
}



export const MetricCard: React.FC<MetricCardProps> = ({ title, value, description }) => {
  
  return (
    <Card className="text-center">
      <CardHeader >
        <CardDescription>{title}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
      {description && (
        <CardContent>
            <p className="text-xs text-slate-500">{description}</p>
        </CardContent>
      )}
    </Card>
  );
};


