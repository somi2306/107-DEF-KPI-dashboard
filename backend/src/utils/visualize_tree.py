import sys
import os
import joblib
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
from sklearn.tree import plot_tree
import unicodedata
import re

matplotlib.use('Agg')

def super_normalize(text):
    """
    Nettoyage agressif : retire les accents, met en minuscule,
    et supprime TOUT ce qui n'est pas une lettre ou un chiffre.
    'Densité bouillie' -> 'densitebouillie'
    "TSP_Cuve d'attaque (bouillie)_Densité bouillie" -> 'tspcuvedattaquebouilliedensitebouillie'
    """
    try:
        if isinstance(text, bytes):
            text = text.decode('utf-8', errors='ignore')
    except AttributeError:
        pass
    
    text = str(text).lower()
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^a-z0-9]', '', text)
    return text

def main(model_path, data_path, model_type, target_column_name):
    try:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Fichier modèle introuvable: {model_path}")
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Fichier de données introuvable: {data_path}")

        model = joblib.load(model_path)
        data = pd.read_excel(data_path, engine='openpyxl', header=[0, 1, 2])
        
        data.columns = ['_'.join(map(str, col)).strip() for col in data.columns.values]
        # On nettoie agressivement le nom de la cible reçu
        search_term_clean = super_normalize(target_column_name)
        
        actual_target_col = None
        for col in data.columns:
            # On nettoie agressivement chaque nom de colonne du fichier
            col_clean = super_normalize(col)
            # On cherche si le nom de colonne nettoyé se TERMINE par le nom de la cible nettoyé
            if col_clean.endswith(search_term_clean):
                actual_target_col = col
                break

        if actual_target_col is None:
            cleaned_cols = [super_normalize(c) for c in data.columns]
            raise ValueError(f"La colonne cible '{target_column_name}' (recherchée comme '{search_term_clean}') est introuvable. Colonnes nettoyées disponibles : {cleaned_cols}")
            
        features = [col for col in data.columns if col != actual_target_col]

        tree_to_visualize = None
        if model_type == 'random_forest':
            tree_to_visualize = model.estimators_[0]
        elif model_type == 'gradient_boosting':
            if hasattr(model, 'estimators_') and model.estimators_.ndim == 2:
                 tree_to_visualize = model.estimators_[0][0]
            else:
                 tree_to_visualize = model.estimators_[0]
        
        if tree_to_visualize is None:
            raise TypeError(f"Modèle '{model_type}' non supporté.")

        plt.figure(figsize=(40, 20))
        plot_tree(tree_to_visualize,
                  feature_names=features,
                  filled=True,
                  rounded=True,
                  fontsize=7,
                  max_depth=4)
        
        vis_dir = os.path.join(os.path.dirname(data_path), '..', '..', 'visualizations')
        if not os.path.exists(vis_dir): os.makedirs(vis_dir)

        image_path = os.path.join(vis_dir, f'{model_type}_tree.png')
        plt.savefig(image_path, bbox_inches='tight')
        plt.close()
        
        print(image_path, flush=True)

    except Exception as e:
        print(f"ERREUR dans visualize_tree.py: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 5:
        print("Usage: python ... <target_column_name>", file=sys.stderr)
        sys.exit(1)
        
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])