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
from pymongo import MongoClient
from dotenv import load_dotenv
import warnings
import io
from bson.binary import Binary

warnings.filterwarnings("ignore")

# Configuration de l'encodage pour Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

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

# --- Gestion des arguments CLI ---
import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--lines', type=str, help='JSON array of lines to pretrain')
parser.add_argument('--models', type=str, help='JSON array of models to pretrain')
args, _ = parser.parse_known_args()

if args.lines:
    try:
        # Nettoyer la chaîne d'entrée
        lines_str = args.lines.strip().replace("'", '"')
        print(f"Argument lines reçu (nettoyé): {lines_str}")
        lines_to_pretrain = json.loads(lines_str)
        print(f"Lines interprétées: {lines_to_pretrain}")
    except Exception as e:
        print(f"Erreur parsing JSON '{args.lines}': {e}")
        print("Utilisation des lignes par défaut: ['F', 'E', 'D']")
        lines_to_pretrain = ['F', 'E', 'D']
else:
    lines_to_pretrain = ['F', 'E', 'D']

if args.models:
    try:
        # Nettoyer la chaîne d'entrée
        models_str = args.models.strip().replace("'", '"')
        print(f"Argument models reçu (nettoyé): {models_str}")
        models_to_pretrain = json.loads(models_str)
        print(f"Models interprétées: {models_to_pretrain}")
    except Exception as e:
        print(f"Erreur parsing JSON '{args.models}': {e}")
        print("Utilisation des modèles par défaut: tous les modèles disponibles")
        models_to_pretrain = list(MODEL_TRAINERS.keys())
else:
    models_to_pretrain = list(MODEL_TRAINERS.keys())

target_variables_to_pretrain = [
    ('TSP', "Cuve D'attaque (bouillie)", 'Densité bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%P2O5 TOT bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%P2O5  SE bouillie'),  # 2 espaces
    ('TSP', "Cuve D'attaque (bouillie)", '%Acide libre bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%H2O bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%CaO bouillie'),
    ('TSP', 'Sortie granulateur', '%P2O5  SE+SC gran'),  # 2 espaces
    ('TSP', 'Sortie granulateur', '%P2O5 SE granu'),
    ('TSP', 'Sortie granulateur', '%Acide libre granul'),
    ('TSP', 'Sortie granulateur', '%P2O5 total granu'),
    ('TSP', 'Sortie granulateur', '%H2O tq granu'),
    ('PRODUIT FINI TSP', 'Détermination', '%P2O5  TOT PF'),  # 2 espaces
    ('PRODUIT FINI TSP', 'Détermination', '%P2O5  SE+SC PF'),  # 2 espaces
    ('PRODUIT FINI TSP', 'Détermination', '%H2O Tq PF'),
    ('PRODUIT FINI TSP', 'Détermination', '% AL  à l\'eau PF'),  # 2 espaces
    ('PRODUIT FINI TSP', 'Détermination', '% AL à l\'acetone PF'),
    ('PRODUIT FINI TSP', 'Détermination', '%P2O5 SE PF'),
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

# Liste des colonnes à exclure (adaptée à la structure MongoDB)
exclude_cols = [
    'source_line', 'heure', 'semaine', 'date_c', 'mois', 'date_num',
    'imputation_method', 'poste', '107 D.Mois', '107 D.Date', 
    '107 D.Semaine', '107 D.Poste', '107 D.Heure', '__v', 'createdAt',
    'import_date', 'original_filenames.file1', 'original_filenames.file2',
    'original_row_index', 'updatedAt',
    '107 E.Mois', '107 E.Date', '107 E.Semaine', '107 E.Poste', '107 E.Heure',
    '107 F.Mois', '107 F.Date', '107 F.semaine','107 F.Semaine', '107 F.Poste', '107 F.Heure',
    'Valeurs.Nbr HM',
    'Valeurs.Unnamed: 91_level_2',
    'Valeurs.Unnamed: 92_level_2',
    'Valeurs.J_107DEF_107DWI407_B.Production TSP balance T/H',
    'Valeurs.J_107DEF_107EWI407_B.Production TSP balance T/H',
    'Valeurs.J_107DEF_107FWI407_B.Production TSP balance T/H',
    'Valeurs.Densité bouillie*(Débit bouillie M3/H 1+Débit bouillie M3/H 2)/1000.Débit bouillie T/H',
    'Valeurs.(Recyclage T/H )/(Production TSP balance).Ratio recyclage /TSP',
    'Valeurs.vide si (Débit PP)/(Production TSP balance) >10 et (Débit PP)/(Production TSP balance) sinon.CSP PP Kg/T',
    'Valeurs.((Débit ACP 1+Débit ACP 2)*Densité AR29*%P₂O₅ AR29)/(Production TSP balance*100000).CSP ACP Kg/T',
    'Valeurs.vide si  Débit fioul/Production TSP balance>100 et Débit fioul/Production TSP balance sinon.CSP Fioul Kg/T',
    'Valeurs.%P2O5 SE PF si on a une valeur et la valeur précédant si %P2O5 SE PF =0.SE suivi CIV %',
    'Valeurs."CIV" si SE suivi CIV> =41,5 et "SP" sinon.Qualité',

]

# Configuration MongoDB
def get_mongodb_connection():
    """Établit une connexion à MongoDB Atlas"""
    load_dotenv()
    try:
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            raise ValueError("MONGODB_URI non trouvée dans les variables d'environnement")
        
        client = MongoClient(mongodb_uri)
        client.admin.command('ping')
        print("Connecté à MongoDB Atlas avec succès")
        return client
    except Exception as e:
        print(f"Erreur de connexion MongoDB: {e}")
        return None

def load_data_from_mongodb(line, imputation_methods=['mean', 'median', 'mode', 'ffill']):
    """Charge les données depuis MongoDB pour une ligne spécifique et toutes les méthodes d'imputation"""
    client = get_mongodb_connection()
    if not client:
        return None
    
    try:
        db_name = '107_DEF_KPI_dashboard'
        db = client[db_name]
        collection = db['kpidatas']
        
        line_letter = line.replace('107', '')  # Transforme "107D" en "D"
        dfs = []
        
        for method in imputation_methods:
            query = {
                'source_line': line_letter,
                'imputation_method': method
            }
            documents = list(collection.find(query))
            
            if not documents:
                print(f"Aucune donnée trouvée pour la ligne {line_letter} avec la méthode '{method}'")
                continue
            
            print(f"{len(documents)} documents récupérés pour la ligne {line_letter} (méthode: {method})")
            
            # Convertir en DataFrame
            df_method = pd.DataFrame(documents)
            
            # Supprimer les colonnes de métadonnées
            metadata_cols = ['_id', 'source_line', 'import_date', 'original_filenames', 
                           'imputation_method', 'original_row_index', 'date_c', 'mois', 
                           'date_num', 'semaine', 'poste', 'heure', 'createdAt', 'updatedAt', '__v']
            
            df_method = df_method.drop(columns=[col for col in metadata_cols if col in df_method.columns], errors='ignore')
            
            # Développer les colonnes imbriquées
            df_expanded = expand_nested_columns(df_method)
            
            # Exclure les colonnes spécifiées
            columns_to_drop = [col for col in exclude_cols if col in df_expanded.columns]
            if columns_to_drop:
                df_expanded = df_expanded.drop(columns=columns_to_drop, errors='ignore')
                print(f"Colonnes exclues: {len(columns_to_drop)}")
            
            dfs.append(df_expanded)
        
        client.close()
        
        if not dfs:
            print(f"Aucune donnée valide trouvée pour la ligne {line}")
            return None
        
        # Combiner toutes les données
        combined_df = pd.concat(dfs, ignore_index=True)
        if combined_df is not None:
            print("Colonnes disponibles dans le DataFrame:")
            for col in sorted(combined_df.columns):
                print(f"  - {col}")
        print(f"DataFrame combiné: {combined_df.shape}")
        
        # Nettoyer les données
        combined_df = clean_dataframe(combined_df)
        
        return combined_df
        
    except Exception as e:
        print(f"Erreur lors du chargement depuis MongoDB: {e}")
        traceback.print_exc()
        return None

def expand_nested_columns(df):
    """Développe les colonnes contenant des dictionnaires"""
    expanded_dfs = []
    for col in df.columns:
        if df[col].apply(lambda x: isinstance(x, dict)).any():
            try:
                expanded = pd.json_normalize(df[col])
                expanded.columns = [f"{col}.{subcol}" for subcol in expanded.columns]
                expanded_dfs.append(expanded)
            except:
                # Si la normalisation échoue, garder la colonne originale
                expanded_dfs.append(df[[col]])
        else:
            expanded_dfs.append(df[[col]])
    
    if expanded_dfs:
        return pd.concat(expanded_dfs, axis=1)
    else:
        return df

def clean_dataframe(df):
    """Nettoie le DataFrame en convertissant les colonnes numériques"""
    print("Nettoyage des données...")
    
    # Identifier les colonnes qualitatives (à ne pas convertir)
    qualitative_cols = [
        'Valeurs."CIV" si SE suivi CIV> =41,5 et "SP" sinon.Qualité',
        'Valeurs.Qualité'
    ]
    
    # Convertir les colonnes numériques
    numeric_cols = [col for col in df.columns if col not in qualitative_cols]
    
    for col in numeric_cols:
        if col in df.columns:
            # Remplacer les valeurs problématiques
            df[col] = df[col].replace(['**', '--', '', 'NaN', 'nan', 'NULL', 'null'], np.nan)
            
            # Convertir en numérique
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Supprimer les colonnes avec trop de valeurs manquantes
    threshold = 0.8  # Supprimer les colonnes avec plus de 80% de valeurs manquantes
    cols_to_drop = df.columns[df.isnull().mean() > threshold]
    if len(cols_to_drop) > 0:
        print(f"Colonnes avec trop de NaN supprimées: {len(cols_to_drop)}")
        df = df.drop(columns=cols_to_drop)
    
    # Remplir les valeurs manquantes restantes
    df = df.fillna(df.mean(numeric_only=True))
    df = df.fillna(0)  # Pour les colonnes non numériques
    
    print(f"Données nettoyées: {df.shape}")
    return df

def normalize_name(name_parts):
    if isinstance(name_parts, str):
        return re.sub(r'\s+', ' ', name_parts).strip()
    
    # Garder les espaces exacts tels qu'ils sont dans la base de données
    cleaned_parts = [str(part).strip() for part in name_parts]
    return '.'.join(cleaned_parts)

def save_model_to_db(client, model_data):
    """Sauvegarde ou met à jour un modèle dans MongoDB."""
    try:
        db = client['107_DEF_KPI_dashboard']
        collection = db['models']
        
        # Utiliser 'name' comme clé unique pour la mise à jour
        query = {'name': model_data['name']}
        
        # Utiliser $set pour mettre à jour les champs et upsert=True pour insérer si non existant
        update = {'$set': model_data}
        
        result = collection.update_one(query, update, upsert=True)
        
        if result.upserted_id is not None:
            print(f"Modèle '{model_data['name']}' inséré avec succès.")
        else:
            print(f"Modèle '{model_data['name']}' mis à jour avec succès.")
            
    except Exception as e:
        print(f"Erreur lors de la sauvegarde du modèle '{model_data['name']}' dans MongoDB: {e}")
        traceback.print_exc()

def train_model_from_df(df, line, model_type, target_col, mongo_client):
    try:
        target_col_name = normalize_name(target_col)
        if target_col_name not in df.columns:
            return {"error": f"Colonne cible '{target_col_name}' non trouvée"}

        print(f"Entraînement sur la cible: {target_col_name}")

        blacklist_features = {normalize_name(col) for col in target_variables_to_pretrain}

        correlation_matrix = df.corr(numeric_only=True)
        correlations = correlation_matrix[target_col_name]

        features = [feat for feat, corr in correlations.items()
                   if abs(corr) > 0 and feat != target_col_name and feat not in blacklist_features]

        if not features:
            return {"error": "Aucune feature valide trouvée après filtrage."}

        print(f"{len(features)} features sélectionnées")

        X = df[features]
        y = df[target_col_name]

        X = X.replace([np.inf, -np.inf], np.nan).fillna(X.mean())
        y = y.replace([np.inf, -np.inf], np.nan).fillna(y.mean())

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        trainer = MODEL_TRAINERS.get(model_type)
        if not trainer:
            return {"error": "Type de modèle invalide"}

        model, metrics, scalers = trainer(X_train, y_train, X_test, y_test)
        

        # --- NOUVEAU: Sauvegarde dans MongoDB ---
        clean_target_name = re.sub(r'\s+', '_', target_col[-1])
        model_name = f"{model_type.lower()}_{line}_{clean_target_name.replace('%', 'pct').replace('-', '_')}"

        # Sérialiser le modèle et les données en mémoire
        model_buffer = io.BytesIO()
        joblib.dump(model, model_buffer)
        model_buffer.seek(0)

        data_to_save = {'features': features}
        if scalers:
            data_to_save['scalers'] = scalers
        data_buffer = io.BytesIO()
        joblib.dump(data_to_save, data_buffer)
        data_buffer.seek(0)

        serializable_metrics = {k: float(v) for k, v in metrics.items()}

        learning_curve_data = None
        try:
            train_sizes, train_scores, test_scores = learning_curve(
                model, X, y, cv=5, n_jobs=-1,
                train_sizes=np.linspace(0.1, 1.0, 5),
                scoring='neg_mean_squared_error'
            )
            learning_curve_data = {
                'train_sizes_abs': train_sizes.tolist(),
                'train_scores_mean': (-np.mean(train_scores, axis=1)).tolist(),
                'validation_scores_mean': (-np.mean(test_scores, axis=1)).tolist(),
            }
        except Exception as lc_error:
            print(f"Impossible de générer la courbe d'apprentissage: {lc_error}")

        prediction_data = None
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
        except Exception as pred_error:
            print(f"Impossible de sauvegarder les prédictions: {pred_error}")

        # Préparer le document pour MongoDB
# Dans pretrain_models.py, vérifiez que cette partie existe dans train_model_from_df()
        model_document = {
    'name': model_name,
    'line': line,
    'target_variable': target_col[-1],
    'model_type': model_type,
    'model_file': Binary(model_buffer.read()),
    'data_file': Binary(data_buffer.read()),
    'metrics': serializable_metrics,
    'learning_curve': learning_curve_data,
    'predictions': prediction_data,
    # IMPORTANT: Toujours sauvegarder X_train et y_train pour tous les modèles
    'X_train': X_train.values.tolist(),
    'y_train': y_train.values.tolist(),
    }
                # ==================================================================
        # AJOUTEZ CE BLOC DE VÉRIFICATION
        # ==================================================================
        print("\n--- VÉRIFICATION AVANT SAUVEGARDE ---")
        print(f"Modèle: {model_name}")
        if 'X_train' in model_document and model_document['X_train']:
            # Utiliser numpy pour obtenir la forme (dimensions) de la liste de listes
            shape = np.array(model_document['X_train']).shape
            print(f"Vérification de X_train: OK. Forme: {shape}")
        else:
            print("ERREUR: La clé 'X_train' est MANQUANTE ou VIDE dans le document !")
            
        if 'y_train' in model_document and model_document['y_train']:
            shape = np.array(model_document['y_train']).shape
            print(f"Vérification de y_train: OK. Forme: {shape}")
        else:
            print("ERREUR: La clé 'y_train' est MANQUANTE ou VIDE dans le document !")
        print("-------------------------------------\n")
        # ==================================================================
        # FIN DU BLOC DE VÉRIFICATION
        # ==================================================================

        # Sauvegarder dans la base de données
        save_model_to_db(mongo_client, model_document)
        # Visualisation des arbres (pour les modèles d'arbres)

        # on commente cette partie car elle n'est plus nécessaire
        # if model_type in ['GradientBoostingRegressor', 'RandomForestRegressor']:
        #     try:
        #         viz_output_dir = os.path.join(model_dir, f"{model_name}_trees_visualizations")
        #         visualize_script_path = os.path.join(os.path.dirname(__file__), 'visualize_all_trees.py')
        #         subprocess.run([
        #             sys.executable,
        #             visualize_script_path,
        #             os.path.join(model_dir, f"{model_name}.joblib"),
        #             ",".join(features),
        #             viz_output_dir
        #         ], check=True, capture_output=True, text=True)
        #         print("Visualisations des arbres sauvegardées")
        #     except subprocess.CalledProcessError as e:
        #         print(f"Erreur lors de la visualisation des arbres: {e.stderr}")

        return metrics
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}
        return {"error": str(e)}

def format_metric_value(value, default="N/A"):
    """Formate une valeur métrique en toute sécurité"""
    if isinstance(value, (int, float, np.number)):
        return f"{value:.4f}"
    else:
        return default

if __name__ == '__main__':
    mongo_client = get_mongodb_connection()
    if not mongo_client:
        sys.exit("Impossible de se connecter à MongoDB. Arrêt du script.")

    for line in lines_to_pretrain:
        print(f"\n{'='*60}")
        print(f"PRÉ-ENTRAÎNEMENT POUR LA LIGNE {line}")
        print(f"{'='*60}")
        
        combined_df = load_data_from_mongodb(f"107{line}")
        
        if combined_df is None:
            print(f"Impossible de charger les données pour la ligne {line}")
            continue
        
        print(f"Données chargées: {combined_df.shape}")
        
        for model_type in models_to_pretrain:
            for target_col in target_variables_to_pretrain:
                print(f"\nMODÈLE: {model_type}, CIBLE: {target_col[-1]}")
                
                result = train_model_from_df(combined_df.copy(), line, model_type, target_col, mongo_client)
                
                if "error" in result:
                    print(f"Erreur: {result['error']}")
                else:
                    r2_score = format_metric_value(result.get('r2_score'))
                    mse = format_metric_value(result.get('mse'))
                    mae = format_metric_value(result.get('mae'))
                    
                    print(f"Succès! R²: {r2_score}, MSE: {mse}, MAE: {mae}")
    
    mongo_client.close()
    print(f"\nPRÉ-ENTRAÎNEMENT TERMINÉ!")