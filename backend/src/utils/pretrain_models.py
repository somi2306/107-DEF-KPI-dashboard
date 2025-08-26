import sys
import os
import json
import pandas as pd
from sklearn.model_selection import train_test_split
import joblib
import numpy as np
import traceback
import re
import subprocess
from sklearn.model_selection import learning_curve
# Import de TOUTES vos fonctions d'entraînement
from regression_models.pretrain_linear import train_linear_regression
from regression_models.pretrain_random_forest import train_random_forest
from regression_models.pretrain_gradient_boosting import train_gradient_boosting
from regression_models.pretrain_lasso_ridge import train_lasso, train_ridge
from regression_models.pretrain_linear_gradient import train_linear_gradient

# Mapping de TOUS les modèles
MODEL_TRAINERS = {
    'LinearRegression': train_linear_regression,
    'RandomForestRegressor': train_random_forest,
    'GradientBoostingRegressor': train_gradient_boosting,
    'Lasso': train_lasso,
    'Ridge': train_ridge,
    'LinearGradient': train_linear_gradient,
}

# --- CONFIGURATION ---
lines_to_pretrain = ['F', 'E', 'D']
models_to_pretrain = list(MODEL_TRAINERS.keys())

target_variables_to_pretrain = [
    ('TSP', "Cuve D'attaque (bouillie)", 'Densité bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%P2O5 TOT bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%P2O5  SE bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%Acide libre bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%H2O bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%CaO bouillie'),
    ('TSP', 'Sortie granulateur', '%P2O5  SE+SC gran'),
    ('TSP', 'Sortie granulateur', '%P2O5 SE granu'),
    ('TSP', 'Sortie granulateur', '%Acide libre granul'),
    ('TSP', 'Sortie granulateur', '%P2O5 total granu'),
    ('TSP', 'Sortie granulateur', '%H2O tq granu'),
    ('PRODUIT FINI TSP', 'Détermination ', '%P2O5  TOT PF'),
    ('PRODUIT FINI TSP', 'Détermination ', '%P2O5  SE+SC PF'),
    ('PRODUIT FINI TSP', 'Détermination ', '%H2O Tq PF'),
    ('PRODUIT FINI TSP', 'Détermination ', '% AL  à l\'eau PF'),
    ('PRODUIT FINI TSP', 'Détermination ', '% AL à l\'acetone PF'),
    ('PRODUIT FINI TSP', 'Détermination ', '%P2O5 SE PF '),
    ('PRODUIT FINI TSP', 'Granulométrie', '˃6,3mm'),
    ('PRODUIT FINI TSP', 'Granulométrie', '˃4,75mm'),
    ('PRODUIT FINI TSP', 'Granulométrie', '˃4mm'),
    ('PRODUIT FINI TSP', 'Granulométrie', '˃3,15mm'),
    ('PRODUIT FINI TSP', 'Granulométrie', '˃2,5mm'),
    ('PRODUIT FINI TSP', 'Granulométrie', '˃2mm'),
    ('PRODUIT FINI TSP', 'Granulométrie', '˃1mm'),
    ('PRODUIT FINI TSP', 'Granulométrie', '˃2,5-˃4mm'),
    ('PRODUIT FINI TSP', 'Granulométrie', '˃2-˃4mm')
]



exclude_cols = [
    ('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Unnamed: 0_level_2'),
    ('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Date c'),
    ('107 F', 'Unnamed: 1_level_1', 'Mois'), 
    ('107 F', 'Unnamed: 2_level_1', 'Date '),
    ('107 F', 'Unnamed: 3_level_1', 'semaine'),
    ('107 F', 'Unnamed: 3_level_1', 'Semaine'),
    ('107 F', 'Unnamed: 4_level_1', 'Poste'),
    ('107 F', 'Unnamed: 5_level_1', 'Heure'),
#107E
    ('107 E', 'Unnamed: 1_level_1', 'Mois'), 
    ('107 E', 'Unnamed: 2_level_1', 'Date '),
    ('107 E', 'Unnamed: 3_level_1', 'semaine'),
    ('107 E', 'Unnamed: 3_level_1', 'Semaine'),
    ('107 E', 'Unnamed: 4_level_1', 'Poste'),
    ('107 E', 'Unnamed: 5_level_1', 'Heure'),
#107D
    ('107 D', 'Unnamed: 1_level_1', 'Mois'), 
    ('107 D', 'Unnamed: 2_level_1', 'Date '),
    ('107 D', 'Unnamed: 3_level_1', 'semaine'),
    ('107 D', 'Unnamed: 3_level_1', 'Semaine'),
    ('107 D', 'Unnamed: 4_level_1', 'Poste'),
    ('107 D', 'Unnamed: 5_level_1', 'Heure'),

    ('Valeurs', ' "CIV" si SE suivi CIV> =41,5 et "SP" sinon ', 'Qualité'),
    ('Valeurs', 'J_107DEF_107FWI407_B', 'Production TSP balance T/H'),
    ('Valeurs', 'J_107DEF_107EWI407_B', 'Production TSP balance T/H'),
    ('Valeurs', 'J_107DEF_107DWI407_B', 'Production TSP balance T/H'),
    ('Valeurs', 'Densité bouillie*(Débit bouillie M3/H 1+Débit bouillie M3/H 2)/1000', 'Débit bouillie T/H'),
    ('Valeurs', '(Recyclage T/H )/(Production TSP balance)', 'Ratio recyclage /TSP'),
    ('Valeurs', 'vide si (Débit PP)/(Production TSP balance) >10 et (Débit PP)/(Production TSP balance) sinon', 'CSP PP Kg/T'),
    ('Valeurs', '((Débit ACP 1+Débit ACP 2)*Densité AR29*%P₂O₅ AR29)/(Production TSP balance*100000)', 'CSP ACP Kg/T'),
    ('Valeurs', 'vide si  Débit fioul/Production TSP balance>100 et Débit fioul/Production TSP balance sinon', 'CSP Fioul Kg/T'),
    ('Valeurs', ' %P2O5 SE PF si on a une valeur et la valeur précédant si %P2O5 SE PF =0', 'SE suivi CIV %'),
    ('Valeurs', ' ', 'Nbr HM'),
    ('Valeurs', ' ', 'Unnamed: 91_level_2'),
    ('Valeurs', ' ', 'Unnamed: 92_level_2'),
]



def normalize_name(name_parts):
    if isinstance(name_parts, str):
        return re.sub(r'\s+', ' ', name_parts).strip()
    cleaned_parts = [re.sub(r'\s+', ' ', str(part).strip()) for part in name_parts]
    return '.'.join(cleaned_parts)

def load_and_process_data(line):
    sys.stderr.write(f"Début du chargement et traitement des données pour la ligne {line}\n")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_base_dir = os.path.join(script_dir, '..', 'data', f"ligne {line}")
    if not os.path.isdir(data_base_dir): return None
    imputation_methods = ['mean', 'median', 'mode', 'ffill']
    dfs = []
    
    try:
        # Rendre la liste d'exclusion dynamique pour la ligne
        dynamic_exclude_cols = []
        for col_tuple in exclude_cols:
            new_tuple = list(col_tuple)
            if '107 F' in new_tuple[0]:
                new_tuple[0] = f'107 {line}'
            dynamic_exclude_cols.append(tuple(new_tuple))

        for method in imputation_methods:
            file_path = os.path.join(data_base_dir, f"Fusion_107{line}_KPIs_{method}.xlsx")
            if not os.path.exists(file_path): continue
            df_temp = pd.read_excel(file_path, header=[0, 1, 2])
            df_temp = df_temp.drop(columns=dynamic_exclude_cols, errors='ignore').drop(df_temp.columns[0], axis=1, errors='ignore').iloc[1:].reset_index(drop=True)
            df_temp = df_temp.apply(pd.to_numeric, errors='coerce')
            if method == "mean": df_temp = df_temp.fillna(df_temp.mean(numeric_only=True))
            elif method == "median": df_temp = df_temp.fillna(df_temp.median(numeric_only=True))
            elif method == "mode": df_temp = df_temp.fillna(df_temp.mode(numeric_only=True).iloc[0])
            elif method == "ffill": df_temp = df_temp.ffill().bfill()
            df_temp = df_temp.fillna(0)
            dfs.append(df_temp)
        if not dfs: return None
        combined_df = pd.concat(dfs, ignore_index=True)
        combined_df.columns = [normalize_name(col) for col in combined_df.columns]
        return combined_df
    except Exception as e:
        traceback.print_exc()
        return None

def train_model_from_df(df, line, model_type, target_col):
    try:
        target_col_name = normalize_name(target_col)
        if target_col_name not in df.columns: 
            return {"error": f"Colonne cible '{target_col_name}' non trouvée"}

        blacklist_features = {normalize_name(col) for col in target_variables_to_pretrain}
        correlation_matrix = df.corr(numeric_only=True)
        correlations = correlation_matrix[target_col_name]
        features = [feat for feat, corr in correlations.items() if corr > 0 and feat != target_col_name and feat not in blacklist_features]
        if not features: return {"error": "Aucune feature valide trouvée après filtrage."}

        X = df[features]
        y = df[target_col_name]
        X = X.replace([np.inf, -np.inf], np.nan).fillna(X.mean())
        y = y.replace([np.inf, -np.inf], np.nan).fillna(y.mean())
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        trainer = MODEL_TRAINERS.get(model_type)
        if not trainer: return {"error": "Type de modèle invalide"}
        
        model, metrics, scalers = trainer(X_train, y_train, X_test, y_test)
        
        model_dir = os.path.join(os.path.dirname(__file__), 'models')
        os.makedirs(model_dir, exist_ok=True)
        clean_target_name = re.sub(r'\s+', '_', target_col[-1])
        model_name = f"{model_type.lower()}_{line}_{clean_target_name.replace('%', 'pct').replace('-', '_')}"
        
        joblib.dump(model, os.path.join(model_dir, f"{model_name}.joblib"))
        
        data_to_save = {'features': features}
        if scalers: data_to_save['scalers'] = scalers
        joblib.dump(data_to_save, os.path.join(model_dir, f"{model_name}_data.joblib"))
        
        metrics_path = os.path.join(model_dir, f"{model_name}_metrics.json")
        with open(metrics_path, 'w') as f:
            serializable_metrics = {k: float(v) for k, v in metrics.items()}
            json.dump(serializable_metrics, f, indent=4)
        

        try:
            train_sizes, train_scores, test_scores = learning_curve(
                model, X, y, cv=5, n_jobs=-1,
                train_sizes=np.linspace(0.1, 1.0, 5),
                scoring='neg_mean_squared_error'
            )

            train_scores_mean = -np.mean(train_scores, axis=1)
            test_scores_mean = -np.mean(test_scores, axis=1)

            learning_curve_data = {
                'train_sizes_abs': train_sizes.tolist(),
                'train_scores_mean': train_scores_mean.tolist(),
                'validation_scores_mean': test_scores_mean.tolist(),
            }

            lc_path = os.path.join(model_dir, f"{model_name}_learning_curve.json")
            with open(lc_path, 'w') as f:
                json.dump(learning_curve_data, f, indent=4)
            sys.stderr.write(f"Données de la courbe d'apprentissage sauvegardées pour {model_name}\n")

        except Exception as lc_error:
            sys.stderr.write(f"AVERTISSEMENT: Impossible de générer la courbe d'apprentissage pour {model_name}: {lc_error}\n")

        try:
            y_pred = model.predict(X_test)
            
            y_real_final = y_test.values
            y_pred_final = y_pred

            if scalers and 'y' in scalers:
                scaler_y = scalers['y']
                y_real_final = scaler_y.inverse_transform(y_test.values.reshape(-1, 1)).flatten()
                y_pred_final = scaler_y.inverse_transform(y_pred.reshape(-1, 1)).flatten()
            
            prediction_data = {
                'real_values': y_real_final.tolist(),
                'predicted_values': y_pred_final.tolist(),
            }

            pred_path = os.path.join(model_dir, f"{model_name}_predictions.json")
            with open(pred_path, 'w') as f:
                json.dump(prediction_data, f, indent=4)
            sys.stderr.write(f"Données de prédiction sauvegardées pour {model_name}\n")
            sys.stderr.write(
    f"Target: {target_col[-1]} | "
    f"Real values range: [{min(y_real_final):.2f}, {max(y_real_final):.2f}] | "
    f"Predicted range: [{min(y_pred_final):.2f}, {max(y_pred_final):.2f}]\n"
)
        except Exception as pred_error:
            sys.stderr.write(f"AVERTISSEMENT: Impossible de sauvegarder les données de prédiction pour {model_name}: {pred_error}\n")


        if model_type in ['GradientBoostingRegressor', 'RandomForestRegressor']:
            try:
                viz_output_dir = os.path.join(model_dir, f"{model_name}_trees_visualizations")
                visualize_script_path = os.path.join(os.path.dirname(__file__), 'visualize_all_trees.py')
                subprocess.run([
                    sys.executable,
                    visualize_script_path,
                    os.path.join(model_dir, f"{model_name}.joblib"),
                    ",".join(features),
                    viz_output_dir
                ], check=True, capture_output=True, text=True)
                sys.stderr.write(f"Visualisations des arbres sauvegardées dans {viz_output_dir}\n")
            except subprocess.CalledProcessError as e:
                sys.stderr.write(f"Erreur lors de la visualisation des arbres pour {model_name}:\n")
                sys.stderr.write(e.stderr + "\n")

        return metrics
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

if __name__ == '__main__':
    for line in lines_to_pretrain:
        sys.stderr.write(f"\n--- Pré-entraînement pour la Ligne {line} ---\n")
        combined_df = load_and_process_data(line)
        if combined_df is None: continue
        for model_type in models_to_pretrain:
            for target_col in target_variables_to_pretrain:
                sys.stderr.write(f"\nPré-entraînement Modèle {model_type}, Cible: {target_col[-1]}\n")
                result = train_model_from_df(combined_df.copy(), line, model_type, target_col)
                if "error" in result:
                    sys.stderr.write(f"Erreur lors de l'entraînement: {result['error']}\n")
                else:
                    sys.stderr.write(f"Entraînement réussi. R² Score: {result['r2_score']:.4f}\n")