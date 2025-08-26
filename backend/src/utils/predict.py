import sys
import joblib
import json
import pandas as pd
import os
import traceback
import io

# On importe les fonctions et listes nécessaires depuis le script d'entraînement
from pretrain_models import load_and_process_data, target_variables_to_pretrain, normalize_name

def get_all_features_for_line(line):
    """
    Charge les données pour une ligne et renvoie toutes les colonnes
    qui peuvent servir de feature, en excluant les cibles et les colonnes non pertinentes.
    """
    try:
        df = load_and_process_data(line)
        if df is None:
            return {"error": f"Impossible de charger les données pour la ligne {line}"}



        # 1. Créer la liste des colonnes cibles à exclure (blacklist)
        target_blacklist = {normalize_name(col) for col in target_variables_to_pretrain}
        
        # 2. Filtrer les colonnes du dataframe en gardant l'ordre original
        all_features = []
        for col in df.columns:
            # La colonne ne doit pas être une cible
            is_not_target = col not in target_blacklist
            
            #  Le nom de la colonne ne doit pas contenir de mots-clés non pertinents
            is_not_irrelevant = not any(keyword.lower() in col.lower() for keyword in [
                "unnamed", "date", "mois", "semaine", "poste", "heure", "qualité", "nbr hm"
            ])

            if is_not_target and is_not_irrelevant:
                all_features.append(col)
        

        
        return {"features": all_features}

    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


def predict(model_path, data_path, all_input_data):
    try:
        if not os.path.exists(model_path):
            return {"error": f"Modèle non trouvé : {model_path}"}
        
        model = joblib.load(model_path)
        training_data = joblib.load(data_path)
        
        features_needed_by_model = training_data['features']
        
        filtered_input_data = {feat: all_input_data.get(feat, 0) for feat in features_needed_by_model}
        
        input_df = pd.DataFrame([filtered_input_data])
        
        scalers = training_data.get('scalers')
        
        if scalers:
            scaler_X = scalers['X']
            scaler_y = scalers['y']
            input_scaled = scaler_X.transform(input_df)
            prediction_scaled = model.predict(input_scaled)
            prediction_real = scaler_y.inverse_transform(prediction_scaled)
            return {"prediction": prediction_real[0][0]}
        else:
            prediction = model.predict(input_df)
            return {"prediction": prediction[0]}

    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


def get_metrics(metrics_path):
    try:
        if not os.path.exists(metrics_path): return {"error": f"Fichier de métriques non trouvé : {metrics_path}"}
        with open(metrics_path, 'r') as f: metrics = json.load(f)
        return metrics
    except Exception as e: return {"error": str(e)}



def get_equation(model_path, data_path=None):
    try:
        if not os.path.exists(model_path):
            return {"error": f"Modèle non trouvé : {model_path}"}
        
        print(f"DEBUG get_equation: model_path={model_path}")
        model = joblib.load(model_path)
        print(f"DEBUG get_equation: model type: {type(model)}")
        
        features = []
        if data_path and os.path.exists(data_path):
            training_data = joblib.load(data_path)
            features = training_data.get('features', [])


        # On vérifie si le modèle a l'attribut 'feature_importances_'
        if hasattr(model, 'feature_importances_'):
            print("DEBUG get_equation: Detected Tree model (RandomForest/GradientBoosting).")
            return {
                "type": "tree",
                "features": features,
                # On renvoie les importances au lieu des coefficients
                "importances": model.feature_importances_.tolist()
            }

        # Pour les modèles linéaires (votre code existant)
        if hasattr(model, 'coef_') and hasattr(model, 'intercept_'):
            print("DEBUG get_equation: Detected sklearn linear model.")
            coefs = model.coef_.tolist()
            intercept = model.intercept_.tolist() if hasattr(model.intercept_, 'tolist') else model.intercept_
            return {
                "type": "linear",
                "features": features,
                "coefficients": coefs,
                "intercept": intercept
            }
            
        # Pour le modèle ManualLinearGradientModel (votre code existant)
        elif hasattr(model, 'theta') and hasattr(model, 'b'):
            print("DEBUG get_equation: Detected ManualLinearGradientModel.")
            coefs = model.theta.flatten().tolist() if hasattr(model.theta, 'flatten') else model.theta.tolist()
            intercept = model.b.tolist() if hasattr(model.b, 'tolist') else model.b
            return {
                "type": "linear",
                "features": features,
                "coefficients": coefs,
                "intercept": intercept
            }
            
        else:
            print("DEBUG get_equation: Model does not match known types.")
            return {"error": "Ce modèle n'est pas supporté pour l'affichage des poids."}

    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}

if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    command = sys.argv[1]
    
    if command == "get_features":
        line = sys.argv[2]
        result = get_all_features_for_line(line)
        print(json.dumps(result))

    elif command == "predict":
        model_name = sys.argv[2]
        input_data_json = sys.argv[3]
        input_data = json.loads(input_data_json)
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'models', f"{model_name}.joblib")
        data_path = os.path.join(script_dir, 'models', f"{model_name}_data.joblib")
        
        result = predict(model_path, data_path, input_data)
        print(json.dumps(result))

    elif command == "get_metrics":
        model_name = sys.argv[2]
        script_dir = os.path.dirname(os.path.abspath(__file__))
        metrics_path = os.path.join(script_dir, 'models', f"{model_name}_metrics.json")
        result = get_metrics(metrics_path)
        print(json.dumps(result))

    elif command == "get_equation":
        model_name = sys.argv[2]
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'models', f"{model_name}.joblib")
        data_path = os.path.join(script_dir, 'models', f"{model_name}_data.joblib")
        result = get_equation(model_path, data_path)
        print(json.dumps(result))