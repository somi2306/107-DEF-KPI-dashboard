import sys
import os
import joblib
import json

def main(model_path, model_type):
    try:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Fichier modèle introuvable: {model_path}")

        model = joblib.load(model_path)
        
        tree_to_inspect = None
        if model_type == 'random_forest':
            tree_to_inspect = model.estimators_[0].tree_
        elif model_type == 'gradient_boosting':
            tree_to_inspect = model.estimators_[0][0].tree_
        
        if tree_to_inspect is None:
            raise TypeError(f"Modèle '{model_type}' non supporté.")
        
        shape_data = {
            "max_depth": int(tree_to_inspect.max_depth),
            "n_leaves": int(tree_to_inspect.n_leaves)
        }
        
        # Imprimer le résultat en JSON
        print(json.dumps(shape_data))

    except Exception as e:
        print(f"ERREUR dans get_tree_shape.py: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python get_tree_shape.py <model_path> <model_type>", file=sys.stderr)
        sys.exit(1)
        
    main(sys.argv[1], sys.argv[2])