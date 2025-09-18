
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4">
      <div className="bg-white p-10 rounded-lg shadow-lg max-w-md w-full">
        <AlertTriangle className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-5xl font-bold text-gray-800">404</h1>
        <h2 className="text-xl font-semibold text-gray-600 mt-4 mb-2">Page Non Trouvée</h2>
        <p className="text-gray-500 mb-8">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded">
          <Link to="/hierarchical-data">Retourner à l'accueil</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;