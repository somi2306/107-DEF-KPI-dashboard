import os
import sys
import json
import joblib


def tree_to_dict(tree, feature_names):
    """
    Votre fonction pour convertir un arbre en structure JSON.
    """
    n_nodes = tree.node_count
    children_left = tree.children_left
    children_right = tree.children_right
    feature = tree.feature
    threshold = tree.threshold
    value = tree.value

    def recurse(node_id):
        if children_left[node_id] == children_right[node_id]:
            return {"name": f"Prédiction: {round(value[node_id][0][0], 2)}"}
        
        feature_name = feature_names[feature[node_id]]
        threshold_val = round(threshold[node_id], 2)
        
        left_child = recurse(children_left[node_id])
        right_child = recurse(children_right[node_id])

        return {
            "name": f"{feature_name} <= {threshold_val}",
            "children": [left_child, right_child]
        }
    
    return recurse(0)

def save_all_trees_as_json(model_path, feature_names, output_dir):
    try:
        model = joblib.load(model_path)
        os.makedirs(output_dir, exist_ok=True)
        
        trees_data = []
        
        for i, estimator in enumerate(model.estimators_):
            tree_instance = estimator[0] if hasattr(estimator, '__len__') else estimator
            
            # ON NE FAIT QUE LA CONVERSION EN JSON
            tree_json_structure = tree_to_dict(tree_instance.tree_, feature_names)
            
            # On ne sauvegarde plus le chemin PNG
            trees_data.append({
                'json_structure': tree_json_structure
            })

        # Sauvegarder le fichier JSON final
        output_json_path = os.path.join(output_dir, 'all_trees_data.json')
        with open(output_json_path, 'w') as f:
            json.dump(trees_data, f, indent=4)
            
        print(f"Fichier JSON des arbres sauvegardé dans {output_json_path}")

    except Exception as e:
        print(f"ERREUR dans visualize_all_trees.py: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    model_path_arg = sys.argv[1]
    features_arg = sys.argv[2].split(',')
    output_dir_arg = sys.argv[3]
    
    save_all_trees_as_json(model_path_arg, features_arg, output_dir_arg)