import React, { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { PredictionPage } from './pages/PredictionPage';
import { MetricsPage } from './pages/MetricsPage';
import 'katex/dist/katex.min.css';
import './App.css';
import { StatisticsPage } from './pages/StatisticsPage';
import FusionPage from './pages/FusionPage';
import TrainingPage from './pages/TrainingPage';
// 1. Importer la nouvelle page
import HierarchicalDataPage from './pages/HierarchicalDataPage';
import { AnalysisProvider } from './providers/AnalysisProvider';
import { NotificationProvider } from './providers/NotificationProvider';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('hierarchical-data');

  return (
    <AnalysisProvider>
      <NotificationProvider>
        <MainLayout activePage={activePage} setActivePage={setActivePage}>
          {activePage === 'prediction' && <PredictionPage />}
          {activePage === 'metrics' && <MetricsPage />}
          {activePage === 'statistics' && <StatisticsPage />}
          {activePage === 'nettoyage' && <FusionPage />}
          {activePage === 'entrainement' && <TrainingPage />}
          {/* 2. Ajouter la condition pour afficher la nouvelle page */}
          {activePage === 'hierarchical-data' && <HierarchicalDataPage />}
        </MainLayout>
      </NotificationProvider>
    </AnalysisProvider>
  );
};

export default App;