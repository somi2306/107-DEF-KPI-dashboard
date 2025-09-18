// src/App.tsx
import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { PredictionPage } from "./pages/PredictionPage";
import { MetricsPage } from "./pages/MetricsPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import FusionPage from "./pages/FusionPage";
import TrainingPage from "./pages/TrainingPage";
import HierarchicalDataPage from "./pages/HierarchicalDataPage";
import ProfilePage from "./pages/profile/ProfilePage";
import { AnalysisProvider } from "./providers/AnalysisProvider";
import { NotificationProvider } from "./providers/NotificationProvider";
import AdminPage from "./pages/admin/AdminPage";
import { AuthenticateWithRedirectCallback, useUser } from "@clerk/clerk-react";
import AuthCallbackPage from "./pages/auth-callback/AuthCallbackPage";
import AuthPage from "./pages/auth/AuthPage";
import SignUpWithEmail from "./components/SignUpWithEmail";
import FloatingShape from "./components/FloatingShape";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import ProcessProtectionRoute from "./components/ProcessProtectionRoute"; // Importez le nouveau composant
import AuthProtectedRoute from "./components/AuthProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as UIToaster } from "./components/ui/toaster";
import { Toaster as UISonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import NotFoundPage from "./pages/NotFoundPage";
const queryClient = new QueryClient();

const App: React.FC = () => {
  const { isSignedIn } = useUser();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UIToaster />
        <UISonner />
        <Toaster />

        <AnalysisProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/" element={isSignedIn ? <Navigate to="/hierarchical-data" /> : <LandingPage />} />
              <Route element={<PublicOnlyRoute />}>
              <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback signUpForceRedirectUrl={"/auth-callback"} />} />
              <Route path="/auth-callback" element={<AuthCallbackPage />} />
              <Route path="/auth" element={
                <div className='min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center relative overflow-hidden'>
                  <FloatingShape color='bg-green-500' size='w-64 h-64' top='-5%' left='10%' delay={0} />
                  <FloatingShape color='bg-emerald-500' size='w-48 h-48' top='70%' left='80%' delay={5} />
                  <FloatingShape color='bg-lime-500' size='w-32 h-32' top='40%' left='-10%' delay={2} />
                  <AuthPage />
                </div>
              } />
              <Route path='/admin' element={<AdminPage />} />
              <Route path="/sign-up-email" element={<div className="h-screen bg-black flex items-center justify-center"><SignUpWithEmail /></div>} />
              </Route>
              <Route element={<AuthProtectedRoute />}>
              <Route element={<MainLayout activePage="/hierarchical-data" setActivePage={() => {}} />}> 
                {/* Routes non protégées par les processus */}
                <Route path="hierarchical-data" element={<HierarchicalDataPage />} />
                <Route path="profile" element={<ProfilePage />} />
              
                {/* Route protégée pendant l'analyse */}
                <Route element={<ProcessProtectionRoute blockWhen="analysisRunning" />}>
                  <Route path="statistics" element={<StatisticsPage />} />
                </Route>

                {/* Routes protégées pendant l'entraînement */}
                <Route element={<ProcessProtectionRoute blockWhen="trainingRunning" />}>
                  <Route path="prediction" element={<PredictionPage />} />
                  <Route path="metrics" element={<MetricsPage />} />
                </Route>

                {/* Routes Admin Protégées */}
                <Route element={<AdminProtectedRoute />}>
                  <Route path="nettoyage" element={<FusionPage />} />
                  <Route path="entrainement" element={<TrainingPage />} />
                </Route>
              </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </NotificationProvider>
        </AnalysisProvider>
      </TooltipProvider>          
    </QueryClientProvider>
  );
};

export default App;