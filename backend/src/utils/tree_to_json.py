import sys
import os
import joblib
import json
import numpy as np
import pandas as pd

def tree_to_dict(tree, feature_names):
    n_nodes = tree.node_count
    children_left = tree.children_left
    children_right = tree.children_right
    feature = tree.feature
    threshold = tree.threshold
    value = tree.value

    def recurse(node_id):
        # Si c'est un noeud final (une feuille)
        if children_left[node_id] == children_right[node_id]:
            # On retourne un objet avec une clé "name" pour la prédiction
            return {"name": f"Prédiction: {round(value[node_id][0][0], 2)}"}
        
        # Sinon, c'est un noeud de décision
        feature_name = feature_names[feature[node_id]]
        threshold_val = round(threshold[node_id], 2)
        
        left_child = recurse(children_left[node_id])
        right_child = recurse(children_right[node_id])

        return {
            "name": f"{feature_name} <= {threshold_val}",
            "children": [left_child, right_child]
        }
    
    return recurse(0)

def main(model_path, data_path, model_type):
    try:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Fichier modèle introuvable: {model_path}")

        model = joblib.load(model_path)
        
        # Sélectionner le premier arbre du modèle
        tree_to_process = None
        if model_type == 'random_forest':
            tree_to_process = model.estimators_[0].tree_
        elif model_type == 'gradient_boosting':
            tree_to_process = model.estimators_[0][0].tree_
        
        if tree_to_process is None:
            raise TypeError(f"Modèle '{model_type}' non supporté.")
            
        # Obtenir les noms des features
        import pandas as pd
        data = pd.read_excel(data_path, engine='openpyxl', header=[0, 1, 2])
        data.columns = ['_'.join(map(str, col)).strip() for col in data.columns.values]
        
        # Supposer que la dernière colonne est la cible
        features = list(data.columns[:-1])

        # Convertir l'arbre en JSON et l'imprimer
        tree_json = tree_to_dict(tree_to_process, features)
        print(json.dumps(tree_json, indent=2))

    except Exception as e:
        print(f"ERREUR dans tree_to_json.py: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: python tree_to_json.py <model_path> <data_path> <model_type>", file=sys.stderr)
        sys.exit(1)
        
    main(sys.argv[1], sys.argv[2], sys.argv[3])