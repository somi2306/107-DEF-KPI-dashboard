import React, { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { PredictionPage } from './pages/PredictionPage';
import { MetricsPage } from './pages/MetricsPage';
import 'katex/dist/katex.min.css';
import './App.css';
import { StatisticsPage } from './pages/StatisticsPage';
import FusionPage from './pages/FusionPage';

// fournisseur 
import { AnalysisProvider } from './providers/AnalysisProvider';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('prediction');

  return (
    <AnalysisProvider>
      <MainLayout activePage={activePage} setActivePage={setActivePage}>
        {activePage === 'prediction' && <PredictionPage />}
        {activePage === 'metrics' && <MetricsPage />}
        {activePage === 'statistics' && <StatisticsPage />}
        {activePage === 'nettoyage' && <FusionPage />}
      </MainLayout>
    </AnalysisProvider>
  );
};

export default App;