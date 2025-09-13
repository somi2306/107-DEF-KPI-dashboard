import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import sys
import json
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, Lasso, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import numpy as np
import traceback

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = "stage_pfa"

# Dictionary to map model names to scikit-learn classes
models_dict = {
    'LinearRegression': LinearRegression,
    'Lasso': Lasso,
    'Ridge': Ridge,
    'RandomForestRegressor': RandomForestRegressor,
    'GradientBoostingRegressor': GradientBoostingRegressor
}

# Mapping des modèles aux fichiers de sauvegarde
model_file_names = {
    'LinearRegression': 'linear_regression_model_combined',
    'Lasso': 'lasso_model_combined',
    'Ridge': 'ridge_model_combined',
    'RandomForestRegressor': 'rf_regressor_model_combined',
    'GradientBoostingRegressor': 'gb_regressor_model_combined',
}

# Fonction pour charger les données de MongoDB et les normaliser
def load_and_impute_data(line):
    sys.stderr.write(f"Début du chargement des données pour ligne {line}\n")
    imputation_methods = ['mean', 'median', 'mode', 'ffill']
    dfs = []
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        for method in imputation_methods:
            collection_name = f"ligne_{line.lower()}_kpis_{method}"
            sys.stderr.write(f"Chargement collection : {collection_name}\n")
            cursor = db[collection_name].find({})
            raw_data = list(cursor)
            sys.stderr.write(f"Nombre documents récupérés : {len(raw_data)}\n")
            
            if not raw_data:
                sys.stderr.write(f"La collection {collection_name} est vide. Skip.\n")
                continue

            sys.stderr.write("Démarrage de pd.json_normalize...\n")
            df = pd.json_normalize(raw_data)
            sys.stderr.write(f"pd.json_normalize terminé. Shape: {df.shape}\n")

            if '_id' in df.columns:
                df = df.drop(columns=['_id'])

            sys.stderr.write("Conversion des colonnes en numérique...\n")
            for col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

            sys.stderr.write(f"Application de l'imputation '{method}'...\n")
            if method == "mean":
                df = df.fillna(df.mean(numeric_only=True))
            elif method == "median":
                df = df.fillna(df.median(numeric_only=True))
            elif method == "mode":
                mode_vals = df.mode(numeric_only=True).iloc[0]
                df = df.fillna(mode_vals)
            elif method == "ffill":
                df = df.ffill().bfill()
            
            df = df.fillna(0)
            
            sys.stderr.write(f"Shape dataframe après traitement de {method}: {df.shape}\n")
            dfs.append(df)

        if not dfs:
            sys.stderr.write("Aucune donnée à concaténer.\n")
            return None

        sys.stderr.write("Concatenation des dataframes...\n")
        combined_df = pd.concat(dfs, ignore_index=True)
        sys.stderr.write(f"Data loaded and concatenated. Final shape: {combined_df.shape}\n")
        return combined_df
    except Exception as e:
        sys.stderr.write(f"Exception dans load_and_impute_data: {e}\n")
        traceback.print_exc()
        return None
    finally:
        if 'client' in locals() and client is not None:
            client.close()


if __name__ == '__main__':
    try:
        if len(sys.argv) < 5:
            sys.stderr.write("Nombre d'arguments insuffisant.\n")
            print(json.dumps({"error": "Nombre d'arguments insuffisant."}))
            sys.exit(1)
        
        action = sys.argv[1]
        line = sys.argv[2]
        model_type = sys.argv[3]
        target_json_str = sys.argv[4]

        try:
            target_col = tuple(json.loads(target_json_str))
        except json.JSONDecodeError:
            sys.stderr.write("Invalid target variable JSON format.\n")
            sys.exit(1)

        if action == "get_results":
            model_dir = os.path.join(os.path.dirname(__file__), 'models')
            model_name = f"{model_file_names[model_type]}_{line}_{target_col[-1].replace(' ', '_').replace('%', 'pct').replace('-', '_')}"
            model_path = os.path.join(model_dir, f"{model_name}.joblib")
            data_path = os.path.join(model_dir, f"{model_name}_data.joblib")
            
            sys.stderr.write(f"Recherche de modèle et données pour {model_name}...\n")

            if not os.path.exists(model_path) or not os.path.exists(data_path):
                # Cette partie ne devrait plus être exécutée si le script de pré-entraînement a tourné
                sys.stderr.write("Modèle ou données pré-traitées non trouvés, entrainement en cours...\n")
                # Ici, on pourrait lancer un entraînement "just-in-time" si nécessaire
                print(json.dumps({"error": "Model not pre-trained. Please run the pretrain_models.py script first."}))
                sys.exit(1)
            else:
                sys.stderr.write("Modèle et données pré-traitées trouvés, chargement en cours...\n")
                sys.stderr.write("Chargement des données...\n")
                data = joblib.load(data_path)
                X = data['X']
                y = data['y']
                
                sys.stderr.write("Chargement du modèle...\n")
                model = joblib.load(model_path)
                
                _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

                sys.stderr.write("Prédiction en cours...\n")
                y_pred = model.predict(X_test)

                results = {
                    "mse": mean_squared_error(y_test, y_pred),
                    "rmse": np.sqrt(mean_squared_error(y_test, y_pred)),
                    "r2_score": r2_score(y_test, y_pred),
                }
                sys.stderr.write("Résultats prêts.\n")
                print(json.dumps(results))
        else:
            sys.stderr.write("Action inconnue.\n")
            print(json.dumps({"error": "Action inconnue."}))
            sys.exit(1)

    except Exception as e:
        sys.stderr.write("Exception capturée:\n")
        traceback.print_exc()
        sys.exit(1)