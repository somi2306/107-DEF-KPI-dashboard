import React from 'react';
import Tree from 'react-d3-tree';

// Définir un type simple pour les données, la bibliothèque s'occupe du reste
interface TreeNode {
  name: string;
  children?: TreeNode[];
}

// Styles pour les nœuds pour un look plus propre
const nodeSize = { x: 200, y: 80 };
const foreignObjectProps = { width: nodeSize.x, height: nodeSize.y, x: -100 };

// Composant personnalisé pour afficher chaque nœud
const renderNode = ({ nodeDatum, toggleNode }: { nodeDatum: TreeNode; toggleNode: () => void }) => (
  <g>
    <rect 
      width="180" 
      height="50" 
      x="-90" 
      y="-25" 
      onClick={toggleNode}
      fill={nodeDatum.children ? "#e0f2fe" : "#dcfce7"} // Bleu pour décision, Vert pour prédiction
      stroke={nodeDatum.children ? "#7dd3fc" : "#4ade80"}
      strokeWidth="1"
      rx="5" // Bords arrondis
    />
    <text 
      fill="black" 
      strokeWidth="0" 
      x="0" 
      y="0" 
      textAnchor="middle" 
      dominantBaseline="middle"
      style={{ fontFamily: 'Arial', fontSize: '12px' }}
      onClick={toggleNode}
    >
      {nodeDatum.name}
    </text>
  </g>
);

export const TreeVisualization: React.FC<{ data: TreeNode }> = ({ data }) => {
  if (!data) return null;

  return (
    // Ce conteneur est essentiel pour que le zoom et le déplacement fonctionnent
    <div style={{ width: '100%', height: '500px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <Tree
        data={data}
        orientation="vertical"
        pathFunc="step"
        collapsible={true} // Permet de déplier/replier les nœuds
        translate={{ x: 300, y: 50 }} // Position de départ de l'arbre
        nodeSize={nodeSize}
        renderCustomNodeElement={renderNode}
        separation={{ siblings: 1.2, nonSiblings: 1.2 }}
      />
    </div>
  );
};