import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Book } from "lucide-react";

// Structure de données contenant toutes les définitions des KPIs
const kpiDictionary = [
  {
    title: "Informations Générales",
    items: [
      { name: "source_line", description: "Indique la ligne de production concernée (D, E ou F)." },
      { name: "date_c, mois, semaine, poste, heure", description: "Champs temporels qui situent l'enregistrement des données (date, mois, semaine, poste de travail et heure)." }
    ]
  },
  {
    title: "ACIDE PHOSPHORIQUE",
    //description: "Ce bloc concerne les paramètres de qualité de l'acide phosphorique.",
    subSections: [
      {
        title: "Picage AR29",
        description: "Mesures liées à la qualité de l'acide phosphorique au point de prélèvement 'AR29'.",
        items: [
          { name: "%P2O5 AR29", description: "Pourcentage de P₂O₅, indiquant la concentration de l'acide." },
          { name: "TS AR29", description: "Teneur en solides totaux." },
          { name: "%SO4 AR29", description: "Pourcentage de sulfate." },
          { name: "Densité AR29", description: "Densité de l'acide phosphorique." }
        ]
      },
      {
        title: "Acide 54% Transfert",
        description: "Mesures liées à l'acide phosphorique qui est transféré.",
        items: [
          { name: "%P2O5 ACP Tra", description: "Pourcentage de P₂O₅ dans l'acide de transfert." },
          { name: "%TS ACP Tra", description: "Teneur en solides totaux dans l'acide de transfert." },
          { name: "SO4(g/l) ACP Tra", description: "Teneur en sulfate en grammes par litre." },
          { name: "Densité ACP Tra", description: "Densité de l'acide de transfert." }
        ]
      }
    ]
  },
  {
    title: "PHOSPHATE BROYE",
    //description: "Ce bloc décrit les caractéristiques du phosphate après avoir été broyé.",
    subSections: [
        {
            title: "Phosphate brute broyé",
            description: "Caractéristiques de la matière première.",
            items: [
              { name: "% H2O Télquel pp broyé", description: "Pourcentage d'humidité." },
              { name: "%CaO broyé", description: "Pourcentage d'oxyde de calcium (CaO)." },
              { name: "%P2O5 TOT broyé", description: "Pourcentage total de P₂O₅." },
              { name: "%Cao/%P2O5 broyé", description: "Ratio CaO/P₂O₅, un indicateur de pureté." },
              { name: "% CO2 broyé", description: "Pourcentage de CO₂." }
            ]
        },
        {
            title: "Tranche granulométrique phosphate broyé en µm",
            description: "Mesure de la taille des particules du phosphate.",
            items: [
              { name: "> 500 à > 40", description: "Pourcentage de particules dont la taille est supérieure aux valeurs spécifiées en micromètres (µm)." }
            ]
        }
    ]
  },
  {
    title: "TSP (Triple Super Phosphate)",
    //description: "Ce bloc contient les paramètres de la bouillie et du produit à la sortie du granulateur.",
    subSections: [
      {
        title: "Cuve D'attaque (bouillie)",
        description: "Paramètres de la bouillie dans la cuve où la réaction principale a lieu.",
        items: [
          { name: "Densité bouillie", description: "Densité du mélange." },
          { name: "%P2O5 TOT bouillie", description: "Pourcentage total de P₂O₅." },
          { name: "%P2O5 SE bouillie", description: "Pourcentage de P₂O₅ soluble dans l'eau." },
          { name: "%Acide libre bouillie", description: "Pourcentage d'acide libre." },
          { name: "%H2O bouillie", description: "Pourcentage d'humidité." }
        ]
      },
      {
        title: "Sortie granulateur",
        description: "Paramètres du produit après l'étape de granulation.",
        items: [
          { name: "%P2O5 SE+SC gran", description: "Pourcentage de P₂O₅ soluble dans l'eau et le citrate." },
          { name: "%P2O5 SE granu", description: "Pourcentage de P₂O₅ soluble dans l'eau." },
          { name: "%Acide libre granul", description: "Pourcentage d'acide libre." },
          { name: "%P2O5 total granu", description: "Pourcentage total de P₂O₅." },
          { name: "%H2O tq granu", description: "Pourcentage d'humidité 'tel quel'." }
        ]
      }
    ]
  },
  {
    title: "PRODUIT FINI TSP",
    //description: "Ce bloc détaille les mesures de qualité du produit final.",
    subSections: [
        {
            title: "Détermination",
            description: "Analyses chimiques du produit fini.",
            items: [
              { name: "%P2O5 TOT PF", description: "Pourcentage total de P₂O₅." },
              { name: "%P2O5 SE+SC PF", description: "Pourcentage de P₂O₅ soluble (eau + citrate)." },
              { name: "%H2O Tq PF", description: "Pourcentage d'humidité 'tel quel'." },
              { name: "% AL à l'eau PF", description: "Pourcentage d'aluminium soluble dans l'eau." },
              { name: "% AL à l'acetone PF", description: "Pourcentage d'aluminium soluble à l'acétone." },
              { name: "%P2O5 SE PF", description: "Pourcentage de P₂O₅ soluble dans l'eau." }
            ]
        },
        {
            title: "Granulométrie",
            description: "Mesures de la taille des granulés du produit.",
            items: [
              { name: "˃6,3mm à ˃1mm", description: "Pourcentage de granulés ayant une taille supérieure à la valeur spécifiée." },
              { name: "˃2,5-˃4mm, ˃2-˃4mm", description: "Pourcentage de granulés dans une plage de taille spécifique." }
            ]
        }
    ]
  },
  {
    title: "Valeurs",
    //description: "Ce bloc contient les indicateurs de performance clés (KPIs) horaires liés à la production et aux équipements.",
    items: [
        { name: "Production TSP balance T/H", description: "J_107DEF_WI407_B : Production de TSP mesurée par une balance, en tonnes par heure." },
        { name: "Débit ACP 1 M3/H", description: "J_107DEF_FIC905_B : Débits de source d'Acide Phosphorique (ACP) en mètres cubes par heure." },
        { name: "Débit ACP 2 M3/H", description: "J_107DEF_FIC912_B : Débits de source d'Acide Phosphorique (ACP) en mètres cubes par heure." },
        { name: "DébIT PP Kg/H", description: "J_107DEF_WIC860_B : Débit du Phosphate Pulvérisé en kilogrammes par heure." },
        
        { name: "Débit bouillie T/H 1", description: "J_107DEF_FIC878_B : Débits de la bouillie, mesurés en tonnes par heure." },
        { name: "Débit bouillie T/H 2", description: "J_107DEF_FIC879_B : Débits de la bouillie, mesurés en tonnes par heure." },
        { name: "Débit bouillie M3/H 1", description: "J_107DEF_FI878_B : Débits de la bouillie, mesurés en mètres cubes par heure." },
        { name: "Débit bouillie M3/H 2", description: "J_107DEF_FI879_B : Débits de la bouillie, mesurés en mètres cubes par heure." },

        { name: "Recyclage T/H", description: "J_107DEF_WIC434_B : Taux de produit recyclé dans le processus en tonnes par heure." },
        { name: "Pression vapeur Barg", description: "J_107DEF_PI911_B : Pression de la vapeur." },
        { name: "Température vapeur °C", description: "J_107DEF_TI751_B : Température de la vapeur." },
        { name: "Température cuve d'attaque °C", description: "J_107DEF_TIC863_B : Température dans la cuve de réaction principale." },
        { name: "Température cuve de passage °C", description: "J_107DEF_TIC876_B : Température dans la seconde cuve de réaction." },
        { name: "Température bouillie pulvérisateur °C", description: "J_107DEF_TI059_B : Température de la bouillie au niveau du pulvérisateur." },
        { name: "Depression sécheur mmH2O", description: "J_107DEF_PI159_B : Pression négative dans le sécheur." },
        { name: "Niveau cuve passage %", description: "J_107DEF_LI865_B : Niveau de remplissage de la cuve de passage." },
        { name: "Température GAZ sortie sécheur °C", description: "J_107DEF_TI138_B : Température des gaz à la sortie du sécheur." },
        
        { name: "Débit fioul Kg/H", description: "J_107DEF_FI176B_B : Débit du fioul utilisé pour le chauffage." },
        { name: "Température air chaud °C", description: "J_107DEF_TIC740_B : Température du sécheur." },
        { name: "Température brique °C", description: "J_107DEF_TI155B_B : Température du brique." },
        { name: "Débit Liquide lavage M3/H", description: "J_107DEF_FIC002_B : Débit du liquide de lavage." },
        { name: "Débit vapeur T/H", description: "J_107DEF_FI751_B : Débit de la vapeur utilisée dans le processus." },
        { name: "Ouverture AH08 %", description: "J_107DEF_HIC275_B : Pourcentage d'ouverture de vanne." },
        { name: "Ouverture AH01 %", description: "J_107DEF_HIC221_B : Pourcentage d'ouverture de vanne." },
        { name: "Ratio Solide/Liquide, Ratio recyclage /TSP, Rapport acidulation", description: "Ratios calculés pour le suivi et l'efficacité du processus." },
        { name: "CSP PP Kg/T, CSP ACP Kg/T, CSP Fioul Kg/T", description: "Consommations spécifiques de matière première (Phosphate Pulvérisé, Acide Phosphorique) et d'énergie (Fioul) par tonne de produit." },
        { name: "Qualité", description: "Indicateur de la qualité du produit (par exemple 'CIV' ou 'SP')." }
    ]
  }
];

// Un composant réutilisable pour afficher une seule définition
const DefinitionItem: React.FC<{ name: string; description: string }> = ({ name, description }) => (
  <div className="mb-4 p-3 rounded-lg bg-emerald-50 border-l-4 border-emerald-500 transition-all hover:bg-emerald-100 hover:shadow-sm">
    <p className="font-semibold text-emerald-800 text-base">{name}</p>
    <p className="text-sm text-emerald-600 mt-1">{description}</p>
  </div>
);

const HierarchicalDataPage: React.FC = () => {
  return (
    <div className="space-y-8 p-6 bg-gradient-to-b from-emerald-50 to-white min-h-screen">
      <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border border-emerald-100">
        <div className="p-2 bg-emerald-100 rounded-full">
          <Book className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-emerald-800">Dictionnaire des Données KPI</h1>
          <p className="text-emerald-600 mt-1">Documentation complète des indicateurs de performance d'unité 107 DEF</p>
        </div>
      </div>
      
      {kpiDictionary.map((section, index) => (
        <Card key={index} className="border-emerald-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <span className="bg-white/20 p-1 rounded-md">{index + 1}</span>
              {section.title}
            </CardTitle>
            
          </CardHeader>
          <CardContent className="p-5 bg-white">
            {section.items && section.items.map((item, itemIndex) => (
              <DefinitionItem key={itemIndex} name={item.name} description={item.description} />
            ))}

            {section.subSections && section.subSections.map((sub, subIndex) => (
              <div key={subIndex} className="mt-6 rounded-lg bg-emerald-50 p-5 border border-emerald-200">
                 <h3 className="text-lg font-bold mb-3 text-emerald-800 flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                   {sub.title}
                 </h3>
                 {sub.description && <p className="text-sm text-emerald-600 mb-4 pl-4 border-l-2 border-emerald-300">{sub.description}</p>}
                 {sub.items && sub.items.map((item, itemIndex) => (
                    <DefinitionItem key={itemIndex} name={item.name} description={item.description} />
                 ))}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {/*<div className="text-center text-sm text-emerald-600 py-4 border-t border-emerald-200 mt-6">
        © {new Date().getFullYear()} OCP Group - Tous droits réservés
      </div>
     */}

    </div>
  );
};

export default HierarchicalDataPage;