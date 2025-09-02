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
        print(f"Erreur de connexion MongoDB: {e}")
        return None

def load_data_from_mongodb_for_features(line, imputation_methods=['mean', 'median', 'mode', 'ffill']):
    """Charge les données depuis MongoDB pour extraire les features"""
    client = get_mongodb_connection()
    if not client:
        return None
    
    try:
        db_name = '107_DEF_KPI_dashboard'
        db = client[db_name]
        collection = db['kpidatas']
        
        line_letter = line.replace('107', '')
        documents = list(collection.find({'source_line': line_letter}))
        
        if not documents:
            print(f"Aucune donnée trouvée pour la ligne {line_letter}")
            return None
        
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
        print(f"Erreur lors du chargement depuis MongoDB: {e}")
        traceback.print_exc()
        return None
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

def predict(model_name, all_input_data):
    """Effectue une prédiction en chargeant le modèle depuis MongoDB."""
    client = get_mongodb_connection()
    if not client:
        return {"error": "Connexion à MongoDB échouée"}
    
    try:
        model, training_data, _ = get_model_from_db(client, model_name)
        
        if model is None:
            return {"error": f"Modèle '{model_name}' non trouvé dans la base de données."}

        features_needed = training_data.get('features', [])
        
        # Filtrer et ordonner les données d'entrée selon les besoins du modèle
        filtered_input_data = {feat: all_input_data.get(feat, 0) for feat in features_needed}
        input_df = pd.DataFrame([filtered_input_data], columns=features_needed) # Assure le bon ordre

        scalers = training_data.get('scalers')
        
        if scalers and 'X' in scalers and 'y' in scalers:
            scaler_X = scalers['X']
            scaler_y = scalers['y']
            
            input_scaled = scaler_X.transform(input_df)
            prediction_scaled = model.predict(input_scaled)
            
            # La sortie de predict() est (n_samples,), inverse_transform attend (n_samples, n_features)
            prediction_real = scaler_y.inverse_transform(prediction_scaled.reshape(-1, 1))
            
            return {"prediction": float(prediction_real[0][0])}
        else:
            prediction = model.predict(input_df)
            return {"prediction": float(prediction[0])}

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
