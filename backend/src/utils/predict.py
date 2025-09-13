import numpy as np
import sys
import joblib
import json
import pandas as pd
import os
import traceback
import io
import numpy as np
from pymongo import MongoClient
from dotenv import load_dotenv
from sklearn.linear_model import LinearRegression, Lasso, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
            

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
        
        return client
    except Exception as e:
        print(f"Erreur de connexion MongoDB: {e}", file=sys.stderr)
        return None

def load_data_from_mongodb_for_features(line, imputation_methods=['mean', 'median', 'mode', 'ffill']):
    """Charge les données depuis MongoDB pour extraire les features"""
    client = get_mongodb_connection()
    if not client:
        return {"error": "Erreur de connexion à MongoDB"}
    
    try:
        db_name = '107_DEF_KPI_dashboard'
        db = client[db_name]
        collection = db['kpidatas']
        
        line_letter = line.replace('107', '')
        documents = list(collection.find({'source_line': line_letter}))
        
        if not documents:
            print(f"Aucune donnée trouvée pour la ligne {line_letter}", file=sys.stderr)
            return {"error": f"Aucune donnée trouvée pour la ligne {line_letter}"}
        
        # Convertir en DataFrame
        df = pd.DataFrame(documents)
        
        # Supprimer les colonnes de métadonnées
        metadata_cols = ['_id', 'source_line', 'import_date', 'original_filenames', 
                       'imputation_method', 'original_row_index', 'date_c', 'mois', 
                       'date_num', 'semaine', 'poste', 'heure', 'createdAt', 'updatedAt', '__v']
        
        df = df.drop(columns=[col for col in metadata_cols if col in df.columns], errors='ignore')
        
        # Développer les colonnes imbriquées
        expanded_dfs = []
        for col in df.columns:
            if df[col].apply(lambda x: isinstance(x, dict)).any():
                try:
                    expanded = pd.json_normalize(df[col])
                    expanded.columns = [f"{col}.{subcol}" for subcol in expanded.columns]
                    expanded_dfs.append(expanded)
                except:
                    expanded_dfs.append(df[[col]])
            else:
                expanded_dfs.append(df[[col]])
        
        if expanded_dfs:
            df = pd.concat(expanded_dfs, axis=1)
        
        return df
        
    except Exception as e:
        print(f"Erreur lors du chargement depuis MongoDB: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return {"error": str(e), "traceback": traceback.format_exc()}
    finally:
        if client:
            client.close()

def get_all_features_for_line(line):
    """
    Charge les données pour une ligne depuis MongoDB et renvoie toutes les colonnes
    qui peuvent servir de feature, en excluant les cibles et les colonnes non pertinentes.
    """
    try:
        # Utiliser la nouvelle fonction pour charger depuis MongoDB
        df = load_data_from_mongodb_for_features(line)
        if df is None:
            return {"error": f"Impossible de charger les données pour la ligne {line}"}

        # Liste des colonnes cibles à exclure (adaptée à votre structure MongoDB)
        target_blacklist = [
    # TSP - Cuve D'attaque (bouillie)
    'TSP.Cuve D\'attaque (bouillie).Densité bouillie',
    'TSP.Cuve D\'attaque (bouillie).%P2O5 TOT bouillie',
    'TSP.Cuve D\'attaque (bouillie).%P2O5  SE bouillie',
    'TSP.Cuve D\'attaque (bouillie).%Acide libre bouillie',
    'TSP.Cuve D\'attaque (bouillie).%H2O bouillie',
    'TSP.Cuve D\'attaque (bouillie).%CaO bouillie',
    
    # TSP - Sortie granulateur
    'TSP.Sortie granulateur.%P2O5  SE+SC gran',
    'TSP.Sortie granulateur.%P2O5 SE granu',
    'TSP.Sortie granulateur.%Acide libre granul',
    'TSP.Sortie granulateur.%P2O5 total granu',
    'TSP.Sortie granulateur.%H2O tq granu',
    
    # PRODUIT FINI TSP - Détermination
    'PRODUIT FINI TSP.Détermination.%P2O5  TOT PF',
    'PRODUIT FINI TSP.Détermination.%P2O5  SE+SC PF',
    'PRODUIT FINI TSP.Détermination.%H2O Tq PF',
    'PRODUIT FINI TSP.Détermination.% AL  à l\'eau PF',
    'PRODUIT FINI TSP.Détermination.% AL à l\'acetone PF',
    'PRODUIT FINI TSP.Détermination.%P2O5 SE PF',
    
    # PRODUIT FINI TSP - Granulométrie
    'PRODUIT FINI TSP.Granulométrie.˃6,3mm',
    'PRODUIT FINI TSP.Granulométrie.˃4,75mm',
    'PRODUIT FINI TSP.Granulométrie.˃4mm',
    'PRODUIT FINI TSP.Granulométrie.˃3,15mm',
    'PRODUIT FINI TSP.Granulométrie.˃2,5mm',
    'PRODUIT FINI TSP.Granulométrie.˃2mm',
    'PRODUIT FINI TSP.Granulométrie.˃1mm',
    'PRODUIT FINI TSP.Granulométrie.˃2,5-˃4mm',
    'PRODUIT FINI TSP.Granulométrie.˃2-˃4mm',
    #extra
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

        # Colonnes non pertinentes à exclure
        irrelevant_keywords = [
            'unnamed', 'date', 'mois', 'semaine', 'poste', 'heure', 
            'qualité', 'nbr hm', 'source_line', 'import_date', 'createdAt', 'updatedAt'
        ]
        
        # Filtrer les colonnes
        all_features = []
        for col in df.columns:
            # Exclure les colonnes cibles
            is_not_target = col not in target_blacklist
            
            # Exclure les colonnes non pertinentes
            is_not_irrelevant = not any(keyword.lower() in col.lower() for keyword in irrelevant_keywords)
            
            # Exclure les colonnes avec trop de valeurs manquantes
            if is_not_target and is_not_irrelevant:
                # Vérifier si la colonne est numérique
                try:
                    pd.to_numeric(df[col], errors='raise')
                    all_features.append(col)
                except:
                    # Colonne non numérique, on l'exclut
                    continue
        
        return {"features": all_features}

    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}

def get_model_from_db(client, model_name):
    """
    Récupère un modèle, ses données associées (features, scalers) et le document complet depuis MongoDB.
    """
    try:
        db = client['107_DEF_KPI_dashboard']
        collection = db['models']
        model_doc = collection.find_one({'name': model_name})
        
        if not model_doc:
            return None, None, None

        # Désérialiser le modèle et les données depuis les champs binaires
        model = joblib.load(io.BytesIO(model_doc['model_file']))
        model_data = joblib.load(io.BytesIO(model_doc['data_file']))
        
        return model, model_data, model_doc
    except Exception as e:
        print(f"Erreur lors du chargement du modèle '{model_name}' depuis MongoDB: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return None, None, None

# --- Fonctions principales (adaptées pour MongoDB) ---

# Dans predict.py, ajoutez cette fonction avant la fonction predict()
def bootstrap_confidence_interval(model, X_train, n_bootstrap=100, alpha=0.05):
    """
    Calcule l'intervalle de confiance par bootstrap pour les modèles d'arbres.
    X_train doit être les données d'entraînement non-normalisées.
    """
    try:
        bootstrap_predictions = []
        
        if isinstance(X_train, pd.DataFrame):
            X_train_np = X_train.values
        else:
            X_train_np = np.array(X_train)
            
        n_samples = X_train_np.shape[0]

        for _ in range(n_bootstrap):
            indices = np.random.choice(n_samples, size=n_samples, replace=True)
            X_bootstrap = X_train_np[indices]
            
            # Pour une seule prédiction, on s'attend à une valeur moyenne du bootstrap
            pred = model.predict(X_bootstrap)
            bootstrap_predictions.append(np.mean(pred))
        
        lower_bound = np.percentile(bootstrap_predictions, (alpha/2) * 100)
        upper_bound = np.percentile(bootstrap_predictions, (1 - alpha/2) * 100)
        
        return lower_bound, upper_bound
        
    except Exception as e:
        print(f"Erreur dans bootstrap_confidence_interval: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return None, None

def predict(model_name, all_input_data):
    """
    Effectue une prédiction et tente de calculer un intervalle de confiance 
    adapté au type de modèle.
    """
    client = get_mongodb_connection()
    if not client:
        return {"error": "Connexion à MongoDB échouée"}
    
    try:
        model, training_data, model_doc = get_model_from_db(client, model_name)
        if model is None:
            return {"error": f"Modèle '{model_name}' non trouvé."}

        features_needed = training_data.get('features', [])
        # Assurer que l'ordre des colonnes est le même que pendant l'entraînement
        input_df = pd.DataFrame([all_input_data], columns=features_needed)
        
        # --- Étape 1: Obtenir la prédiction ponctuelle ---
        prediction_val = None
        scalers = training_data.get('scalers')
        if scalers and 'X' in scalers and 'y' in scalers:
            # Cas pour modèles avec normalisation (ex: régression linéaire)
            input_scaled = scalers['X'].transform(input_df)
            prediction_scaled = model.predict(input_scaled)
            prediction_val = scalers['y'].inverse_transform(prediction_scaled.reshape(-1, 1))[0][0]
        else:
            # Cas pour modèles sans normalisation (ex: arbres de décision)
            prediction_val = model.predict(input_df)[0]

        # --- Étape 2: Calculer l'intervalle de confiance basé sur le type de modèle ---
        is_linear_model = isinstance(model, (LinearRegression, Lasso, Ridge))
        is_tree_model = isinstance(model, (GradientBoostingRegressor, RandomForestRegressor))
        
        if is_linear_model and scalers:
            X_train = model_doc.get('X_train')
            y_train = model_doc.get('y_train')
            if X_train is not None and y_train is not None:
                try:
                    scaler_X = scalers['X']
                    scaler_y = scalers['y']
                    
                    X_train_scaled = scaler_X.transform(pd.DataFrame(X_train, columns=features_needed))
                    y_train_scaled = scaler_y.transform(np.array(y_train).reshape(-1, 1))
                    
                    n, p = X_train_scaled.shape
                    y_pred_scaled = scaler_y.transform(np.array([[prediction_val]]))[0][0]
                    
                    y_hat_train = model.predict(X_train_scaled)
                    residuals = y_train_scaled.flatten() - y_hat_train.flatten()
                    mse = np.mean(residuals ** 2)
                    
                    input_scaled = scaler_X.transform(input_df)
                    X0 = input_scaled[0]
                    X_design = np.hstack([np.ones((n, 1)), X_train_scaled])
                    X0_design = np.hstack([1, X0])
                    
                    cov_beta = mse * np.linalg.inv(np.dot(X_design.T, X_design))
                    se_pred = np.sqrt(mse + np.dot(np.dot(X0_design.T, cov_beta), X0_design))
                    
                    low_bound_scaled = y_pred_scaled - 1.96 * se_pred
                    ci_low = scaler_y.inverse_transform(np.array([low_bound_scaled]).reshape(1, 1))[0][0]
                    
                    high_bound_scaled = y_pred_scaled + 1.96 * se_pred
                    ci_high = scaler_y.inverse_transform(np.array([high_bound_scaled]).reshape(1, 1))[0][0]

                    # Vérification NaN ou infini
                    if not (np.isnan(ci_low) or np.isnan(ci_high) or np.isinf(ci_low) or np.isinf(ci_high)):
                        return {
                            "prediction": float(prediction_val),
                            "confidence_interval": [float(ci_low), float(ci_high)],
                            "method": "analytical"
                        }
                    else:
                        return {
                            "prediction": float(prediction_val),
                            "warning": "Intervalle de confiance non calculable (NaN ou infini)",
                            "confidence_interval": None
                        }
                except Exception as e:
                    return {"prediction": float(prediction_val), "warning": f"Impossible de calculer l'intervalle de confiance: {str(e)}"}
        
        elif is_tree_model:
            X_train = model_doc.get('X_train')
            if X_train is not None:
                # Les modèles d'arbres sont entraînés sur des données brutes, pas besoin de scaler X_train
                X_train_df = pd.DataFrame(X_train, columns=features_needed)
                ci_low, ci_high = bootstrap_confidence_interval(model, X_train_df)
                
                if ci_low is not None and ci_high is not None and not (np.isnan(ci_low) or np.isnan(ci_high) or np.isinf(ci_low) or np.isinf(ci_high)):
                    return {
                        "prediction": float(prediction_val),
                        "confidence_interval": [float(ci_low), float(ci_high)],
                        "method": "bootstrap"
                    }
                else:
                    return {
                        "prediction": float(prediction_val),
                        "warning": "Intervalle de confiance non calculable (NaN ou infini)",
                        "confidence_interval": None
                    }
        
        # Si aucun intervalle n'a pu être calculé, renvoyer la prédiction simple
        return {"prediction": float(prediction_val)}

    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}
    finally:
        if client:
            client.close()

def get_metrics(model_name):
    """Récupère les métriques d'un modèle depuis MongoDB."""
    client = get_mongodb_connection()
    if not client:
        return {"error": "Connexion à MongoDB échouée"}
        
    try:
        _, _, model_doc = get_model_from_db(client, model_name)
        
        if model_doc is None:
            return {"error": f"Modèle '{model_name}' non trouvé pour récupérer les métriques."}
            
        return model_doc.get('metrics', {"error": "Aucune métrique trouvée pour ce modèle."})
        
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}
    finally:
        if client:
            client.close()

def get_equation(model_name):
    """Récupère l'équation ou l'importance des features d'un modèle depuis MongoDB."""
    client = get_mongodb_connection()
    if not client:
        return {"error": "Connexion à MongoDB échouée"}

    try:
        model, training_data, _ = get_model_from_db(client, model_name)
        
        if model is None:
            return {"error": f"Modèle '{model_name}' non trouvé pour récupérer l'équation."}
            
        features = training_data.get('features', [])

        if hasattr(model, 'feature_importances_'):
            return {
                "type": "tree",
                "features": features,
                "importances": model.feature_importances_.tolist()
            }
        elif hasattr(model, 'coef_') and hasattr(model, 'intercept_'):
            return {
                "type": "linear",
                "features": features,
                "coefficients": model.coef_.tolist(),
                "intercept": model.intercept_.tolist() if hasattr(model.intercept_, 'tolist') else model.intercept_
            }
        elif hasattr(model, 'theta') and hasattr(model, 'b'): # Pour votre modèle custom
            return {
                "type": "linear",
                "features": features,
                "coefficients": model.theta.flatten().tolist(),
                "intercept": model.b
            }
        else:
            return {"error": "Ce type de modèle n'est pas supporté pour l'affichage de l'équation."}
            
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}
    finally:
        if client:
            client.close()

if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Commande manquante."}))
        sys.exit(1)
        
    command = sys.argv[1]
    
    try:
        if command == "get_features":
            line = sys.argv[2]
            result = get_all_features_for_line(line)
            print(json.dumps(result, ensure_ascii=False))

        elif command == "predict":
            model_name = sys.argv[2]
            input_data = json.loads(sys.argv[3])
            result = predict(model_name, input_data)
            print(json.dumps(result, ensure_ascii=False))

        elif command == "get_metrics":
            model_name = sys.argv[2]
            result = get_metrics(model_name)
            print(json.dumps(result, ensure_ascii=False))

        elif command == "get_equation":
            model_name = sys.argv[2]
            result = get_equation(model_name)
            print(json.dumps(result, ensure_ascii=False))
        else:
            print(json.dumps({"error": f"Commande '{command}' non reconnue."}))

    except Exception as e:
        print(json.dumps({"error": "Erreur majeure dans le script.", "details": str(e), "traceback": traceback.format_exc()}))
