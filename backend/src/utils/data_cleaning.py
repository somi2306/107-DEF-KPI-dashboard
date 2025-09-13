
import pandas as pd
import re
import os
import sys
import json
from pathlib import Path
import numpy as np

def nettoyage_personnalise(val):
    if isinstance(val, str):
        val = val.strip()

        if val.endswith('/'):
            val = val.rstrip('/')

        if re.match(r'^\d+\./\d+$', val):
            val = val.replace('./', '.')

        val = re.sub(r'\.\.+', '.', val)
        val = re.sub(r'(?<!^)[\+\-]', '', val)
        val = val.replace(',', '.')

        if val in ['**', '--', '', 'NaN', 'nan', 'NULL', 'null']:
            return None

    return val

# Fonction pour convertir les types NumPy en types Python natifs
def convert_to_serializable(obj):
    if isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Timestamp):
        return obj.strftime('%Y-%m-%d %H:%M:%S')
    elif hasattr(obj, 'dtype'):  # Pour les autres types pandas/NumPy
        return obj.item() if hasattr(obj, 'item') else str(obj)
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    else:
        return obj

def clean_file(file_path):
    try:
        # Lire le fichier
        df = pd.read_excel(file_path, header=[0, 1, 2])
        
        # Trouver la colonne de départ
        start_index = None
        for i in range(len(df.columns)):
            if df.columns[i] == ('ACIDE PHOSPHORIQUE', 'Picage AR29', '%P2O5 AR29'):
                start_index = i
                break
        
        if start_index is None:
            return {"status": "error", "message": f"Colonne de départ non trouvée dans {file_path}"}
        
        colonnes = df.columns[start_index:-1]
        df_clean = df.copy()
        
        # Nettoyage des colonnes
        changes = {}
        for col in colonnes:
            if df_clean[col].dtype == 'object':
                original_nan = df_clean[col].isna().sum()
                df_clean[col] = df_clean[col].apply(nettoyage_personnalise)
                df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
                new_nan = df_clean[col].isna().sum()
                
                if new_nan > original_nan:
                    # Convertir les index en liste Python standard
                    nan_indices = df_clean[col][df_clean[col].isna() & df[col].notna()].index.tolist()
                    changes[str(col)] = {
                        'added_nan': int(new_nan - original_nan),  # Convertir en int
                        'examples': nan_indices[:5] if nan_indices else []
                    }
        
        # Supprimer les lignes vides
        original_rows = len(df_clean)
        df_nettoye = df_clean.dropna(subset=colonnes, how="all")
        df_nettoye = df_nettoye.dropna(how="all")
        removed_rows = original_rows - len(df_nettoye)
        
        # Sauvegarder le fichier nettoyé
        cleaned_filename = file_path.replace('.xlsx', ' nettoyé.xlsx')
        df_nettoye.to_excel(cleaned_filename, index=True)
        
        return {
            "status": "success",
            "original_file": os.path.basename(file_path),
            "cleaned_file": os.path.basename(cleaned_filename),
            "changes": changes,
            "rows_removed": int(removed_rows),  # Convertir en int
            "final_rows": int(len(df_nettoye))   # Convertir en int
        }
        
    except Exception as e:
        return {"status": "error", "message": f"Erreur avec {file_path}: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        result = {"status": "error", "message": "Chemin du dossier requis"}
        print(json.dumps(result))
        sys.exit(1)
    
    uploads_dir = sys.argv[1]
    results = []
    cleaned_files = []
    
    # Nettoyer tous les fichiers fusion_107*_KPIs.xlsx
    fusion_files = list(Path(uploads_dir).glob('fusion_107*_KPIs.xlsx'))
    
    if not fusion_files:
        result = {
            "status": "error",
            "message": "Aucun fichier fusionné trouvé. Veuillez d'abord effectuer la fusion."
        }
        print(json.dumps(result))
        sys.exit(1)
    
    for file_path in fusion_files:
        print(f"Traitement du fichier: {file_path.name}")
        result = clean_file(str(file_path))
        results.append(result)
        if result["status"] == "success":
            cleaned_files.append(result["cleaned_file"])
    
    # Préparer le résultat final avec conversion des types
    final_result = {
        "status": "success",
        "cleaned_files": cleaned_files,
        "details": results
    }
    
    # Convertir tous les types NumPy en types Python natifs
    final_result = convert_to_serializable(final_result)
    
    print(json.dumps(final_result, indent=2))

if __name__ == "__main__":
    main()