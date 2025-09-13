import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import FloatingShape from '@/components/FloatingShape';
import { BarChart2, Combine, Cpu, Lightbulb, Lock, Users } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Composant pour le modèle 3D
function Model3D() {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF('/apatite.glb');
    
    // Animation de rotation
    useFrame(() => {
        if (group.current) {
            group.current.rotation.y += 0.005;
        }
    });

    return <primitive ref={group} object={scene} scale={15} position={[0, -2, 0]} />;
}

const features = [
    {
        icon: <Combine className="h-10 w-10 text-emerald-400" />,
        title: "Fusion des Données",
        description: "Centralisez et fusionnez vos fichiers KPIs provenant de différentes lignes de production."
    },
    {
        icon: <BarChart2 className="h-10 w-10 text-emerald-400" />,
        title: "Analyses Statistiques",
        description: "Explorez vos données avec des visualisations interactives et des analyses approfondies."
    },
    {
        icon: <Cpu className="h-10 w-10 text-emerald-400" />,
        title: "Machine Learning",
        description: "Entraînez des modèles prédictifs avancés pour optimiser vos processus industriels."
    },
    {
        icon: <Lightbulb className="h-10 w-10 text-emerald-400" />,
        title: "Prédictions Intelligentes",
        description: "Anticipez les performances et les pannes grâce à l'intelligence artificielle."
    },
    {
        icon: <Users className="h-10 w-10 text-emerald-400" />,
        title: "Gestion Multi-Utilisateurs",
        description: "Contrôlez les accès avec un système de rôles sécurisé pour toute votre équipe."
    },
    {
        icon: <Lock className="h-10 w-10 text-emerald-400" />,
        title: "Sécurité Avancée",
        description: "Protégez vos données sensibles avec une infrastructure sécurisée."
    }
];

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div
            className='min-h-screen bg-gradient-to-br
    from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center relative overflow-hidden'
        >
            <div className="relative isolate px-6 pt-14 lg:px-8">
                {/* Shapes */}
                <FloatingShape color='bg-green-500' size='w-64 h-64' top='-5%' left='10%' delay={0} />
            <FloatingShape color='bg-emerald-500' size='w-48 h-48' top='70%' left='80%' delay={5} />
            <FloatingShape color='bg-lime-500' size='w-32 h-32' top='40%' left='-10%' delay={2} />
                
                {/* Hero Section avec modèle 3D */}
                <div className="mx-auto max-w-7xl py-32 sm:py-48 lg:py-56 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <motion.div
                        className="z-10 lg:w-1/2"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                            Bienvenue sur 107 DEF KPI Dashboard
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-gray-300">
                            Votre solution complète pour le suivi, l'analyse et la prédiction des indicateurs de performance clés (KPIs) de vos lignes de production. Prenez des décisions éclairées grâce à des visualisations de données intuitives et des modèles de machine learning performants.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
  <Button
    onClick={() => navigate('/auth')}
    className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105"
  >
    Commencer
  </Button>
</div>

                    </motion.div>
                    
                    {/* Modèle 3D */}
                    <motion.div 
                        className="lg:w-1/2 h-96 rounded-2xl overflow-hidden"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <Canvas
                            camera={{ position: [5, 5, 5], fov: 50 }}
                            className="rounded-2xl bg-gradient-to-br from-emerald-800/20 to-green-900/20 backdrop-blur-sm"
                        >
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[10, 10, 5]} intensity={1} />
                            <pointLight position={[-10, -10, -10]} intensity={0.5} />
                            <Model3D />
                            <OrbitControls 
                                enableZoom={true} 
                                enablePan={false}
                                maxDistance={15}
                                minDistance={5}
                            />
                        </Canvas>
                    </motion.div>
                </div>
                
                {/* Features Section */}
                <div className="pb-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl lg:text-center">
                            <h2 className="text-base font-semibold leading-7 text-emerald-400">Fonctionnalités Avancées</h2>
                            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                Une suite complète d'outils pour valoriser vos données industrielles
                            </p>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                                {features.map((feature) => (
                                    <motion.div 
                                        key={feature.title} 
                                        className="flex flex-col p-6 bg-white/5 rounded-2xl backdrop-blur-sm ring-1 ring-white/10"
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                                            {feature.icon}
                                            {feature.title}
                                        </dt>
                                        <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-300">
                                            <p className="flex-auto">{feature.description}</p>
                                        </dd>
                                    </motion.div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;