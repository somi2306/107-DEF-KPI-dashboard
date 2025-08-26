
import pandas as pd
import numpy as np
import os
import sys
import json
from pathlib import Path
import warnings

warnings.filterwarnings("ignore", category=FutureWarning, message="Downcasting object dtype arrays")

# Liste des colonnes à exclure de la conversion numérique
exclude_cols = [
    ('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Unnamed: 0_level_2'),
    ('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Date c'),
    #107F
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
]

def debug_print(message):
    """Print debug messages to stderr instead of stdout"""
    print(message, file=sys.stderr)

def apply_formulas(df, ligne):
    """
    Applique les formules mathématiques pour calculer les nouvelles colonnes.
    Cette fonction est cruciale et doit être exécutée APRES l'imputation.
    """
    debug_print("Calcul des colonnes dérivées sur les données remplies...")

    # Créer un mappage simple pour trouver les colonnes par leur nom de niveau 2
    col_map = {c[2].strip(): c for c in df.columns}

    # Fonction sécurisée pour récupérer une colonne
    def get_col(name):
        # Remplace le placeholder 'D' par la ligne actuelle pour les names dynamiques
        name_dyn = name.replace('107D', f'107{ligne}')
        for key, col_tuple in col_map.items():
            if key == name_dyn:
                return df[col_tuple]
        # If the base column is not found, check for a calculated column (by level 2 name)
        if name in col_map:
             return df[col_map[name]]
        debug_print(f"AVERTISSEMENT: Colonne '{name}' introuvable.")
        return pd.Series(np.nan, index=df.index) # Return a Series of NaN if the column does not exist

    # --- Application des formules ---
    # Chaque formule crée une colonne avec la même structure de header que les autres
    try:
        df[('Valeurs', 'somme Débit1+Débit2', 'Débit ACP M3/H')] = get_col('Débit ACP 1 M3/H') + get_col('Débit ACP 2 M3/H')
        debug_print("Formula 'Débit ACP M3/H' applied.")
    except Exception as e: debug_print(f"Erreur formule 'Débit ACP M3/H': {e}")
    
    try:
        df[('Valeurs', 'Densité bouillie*(Débit bouillie M3/H 1+Débit bouillie M3/H 2)/1000', 'Débit bouillie T/H')] = get_col('Densité bouillie')*(get_col('Débit bouillie M3/H 1')+get_col('Débit bouillie M3/H 2'))/1000
        debug_print("Formula 'Débit bouillie T/H' applied.")
    except Exception as e: debug_print(f"Erreur formule 'Débit bouillie T/H': {e}")

    try:
        df[('Valeurs', 'Débit bouillie T/H 1 +Débit bouillie T/H 2', 'debit bouillie T/H')] = get_col('Débit bouillie T/H 1') + get_col('Débit bouillie T/H 2')
        debug_print("Formula 'debit bouillie T/H' applied.")
    except Exception as e: debug_print(f"Erreur formule 'debit bouillie T/H': {e}")

    try:
        df[('Valeurs', '(Recyclage T/H)/(debit bouillie T/H)', 'Ratio Solide/Liquide')] = get_col('Recyclage T/H') / get_col('debit bouillie T/H')
        debug_print("Formula 'Ratio Solide/Liquide' applied.")
    except Exception as e: debug_print(f"Erreur formule 'Ratio Solide/Liquide': {e}")

    try:
        df[('Valeurs', '(Recyclage T/H )/(Production TSP balance)', 'Ratio recyclage /TSP')] = get_col('Recyclage T/H') / get_col('Production TSP balance T/H')
        debug_print("Formula 'Ratio recyclage /TSP' applied.")
    except Exception as e: debug_print(f"Erreur formule 'Ratio recyclage /TSP': {e}")

    try:
        condition = (get_col("Débit ACP 1 M3/H") + get_col("Débit ACP 2 M3/H")) * get_col("%P2O5 AR29") * get_col("Densité AR29") / (get_col("DébIT PP Kg/H") * 30 * 1000) < 0.5
        valeur = (get_col("Débit ACP 1 M3/H") + get_col("Débit ACP 2 M3/H")) * get_col("%P2O5 AR29") * get_col("Densité AR29") / (get_col("DébIT PP Kg/H") * 30 * 1000)
        df[('Valeurs', '0 si ((Débit ACP 1+Débit ACP 2)*(%P2O5 AR29)*(Densité AR29))/(Débit PP*30*1000) <0,5 et ((Débit ACP 1+Débit ACP 2)*(%P2O5 AR29)*(Densité AR29))/(Débit PP*30*1000) sinon', 'Rapport acidulation Kg/M3')] = np.where(condition, 0, valeur)
        debug_print("Formula 'Rapport acidulation Kg/M3' applied.")
    except Exception as e: debug_print(f"Erreur formule 'Rapport acidulation Kg/M3': {e}")

    try:
        condition = get_col('DébIT PP Kg/H') / get_col('Production TSP balance T/H') > 10
        valeur = get_col('DébIT PP Kg/H') / get_col('Production TSP balance T/H')
        df[('Valeurs', 'vide si (Débit PP)/(Production TSP balance) >10 et (Débit PP)/(Production TSP balance) sinon', 'CSP PP Kg/T')] = np.where(condition, np.nan, valeur)
        debug_print("Formula 'CSP PP Kg/T' applied.")
    except Exception as e: debug_print(f"Erreur formule 'CSP PP Kg/T': {e}")

    try:
        df[('Valeurs', '((Débit ACP 1+Débit ACP 2)*Densité AR29*%P₂O₅ AR29)/(Production TSP balance*100000)', 'CSP ACP Kg/T')] = ((get_col('Débit ACP 1 M3/H') + get_col('Débit ACP 2 M3/H')) * get_col('Densité AR29') * get_col('%P2O5 AR29')) / (get_col('Production TSP balance T/H') * 100000)
        debug_print("Formula 'CSP ACP Kg/T' applied.")
    except Exception as e: debug_print(f"Erreur formule 'CSP ACP Kg/T': {e}")

    try:
        debit_acp_total = get_col('Débit ACP 1 M3/H') + get_col('Débit ACP 2 M3/H')
        valeur = (debit_acp_total * get_col('%P2O5 AR29') * get_col('Densité AR29')) / 38500
        condition = valeur == 0
        df[('Valeurs', 'vide si (Débit ACP*%P2O5*Densité AR29)/(38500)=0 et (Débit ACP*%P2O5*Densité AR29)/(38500) sinon', 'Prod TSP/ACP M3/H')] = np.where(condition, np.nan, valeur)
        debug_print("Formula 'Prod TSP/ACP M3/H' applied.")
    except Exception as e: debug_print(f"Erreur formule 'Prod TSP/ACP M3/H': {e}")

    try:
        condition = get_col('Débit fioul Kg/H') / get_col('Production TSP balance T/H') > 100
        valeur = get_col('Débit fioul Kg/H') / get_col('Production TSP balance T/H')
        df[('Valeurs', 'vide si  Débit fioul/Production TSP balance>100 et Débit fioul/Production TSP balance sinon', 'CSP Fioul Kg/T')] = np.where(condition, np.nan, valeur)
        debug_print("Formula 'CSP Fioul Kg/T' applied.")
    except Exception as e: debug_print(f"Erreur formule 'CSP Fioul Kg/T': {e}")

    try:
        # Replace 0 with NaN then forward fill
        se_pf_col = get_col('%P2O5 SE PF').replace(0, np.nan).ffill()
        df[('Valeurs', '%P2O5 SE PF si on a une valeur et la valeur précédant si %P2O5 SE PF =0', 'SE suivi CIV %')] = se_pf_col
        debug_print("Formula 'SE suivi CIV %' applied.")
    except Exception as e: debug_print(f"Erreur formule 'SE suivi CIV %': {e}")

    try:
        condition = get_col('SE suivi CIV %') >= 41.5
        df[('Valeurs', '"CIV" si SE suivi CIV> =41,5 et "SP" sinon', 'Qualité')] = np.where(condition, "CIV", "SP")
        debug_print("Formula 'Qualité' applied.")
    except Exception as e: debug_print(f"Erreur formule 'Qualité': {e}")

    debug_print(f"Shape after applying formulas: {df.shape}")
    return df

def process_file(input_path, output_dir):
    """
    Fonction principale pour nettoyer et imputer les données d'un fichier.
    """
    try:
        debug_print(f"Début du traitement pour {os.path.basename(input_path)}")

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        debug_print(f"Output directory '{output_dir}' ensured.")

        # Extract 'D', 'E' or 'F' from the file name, assuming a format like 'Fusion_107D_KPIs nettoyé.xlsx'
        file_name = os.path.basename(input_path)
        ligne = file_name.split('_')[1][:4][-1] # More robust way to get D, E, or F

        # --- 1. Chargement et nettoyage initial ---
        df = pd.read_excel(input_path, header=[0, 1, 2])
        debug_print(f"Shape after initial load: {df.shape}")
        df = df.iloc[1:, 1:].reset_index(drop=True)
        debug_print(f"Shape after initial cleaning (iloc and reset_index): {df.shape}")

        for col in df.columns:
            if col not in exclude_cols:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            # Les colonnes dans exclude_cols restent inchangées (type objet)
        debug_print(f"Shape after converting to numeric: {df.shape}")

        # --- 2. Définition des colonnes à imputer ---
        cols_to_impute = [c for c in df.columns if c[0] in ['ACIDE PHOSPHORIQUE', 'PHOSPHATE BROYE', 'TSP', 'PRODUIT FINI TSP'] or (c[0] == 'Valeurs' and 'J_107DEF' in c[1])]

        # --- 3. Nettoyage des valeurs négatives ---
        for col in cols_to_impute:
            if col in df.columns:
                df[col] = df[col].apply(lambda x: x if pd.notna(x) and x >= 0 else pd.NA)
        debug_print(f"Shape after cleaning negative values: {df.shape}")

        # --- 4. Création des copies pour chaque méthode d'imputation ---
        df_mean = df.copy()
        df_mode = df.copy()
        df_median = df.copy()
        df_ffill = df.copy()
        df_4fill = df.copy()

        # --- 5. Application des méthodes d'imputation ---
        debug_print("Application des méthodes d'imputation...")
        for col in cols_to_impute:
            if col in df.columns:
                # Moyenne
                df_mean[col] = df_mean[col].fillna(df_mean[col].mean())
                # Médiane
                df_median[col] = df_median[col].fillna(df_median[col].median())
                # Mode
                mode_val = df_mode[col].mode()
                if not mode_val.empty:
                    df_mode[col] = df_mode[col].fillna(mode_val[0])

        # Ffill/Bfill sans exclusion
        cols_for_ffill = [c for c in cols_to_impute if c in df_ffill.columns]
        df_ffill[cols_for_ffill] = df_ffill[cols_for_ffill].ffill().bfill()
        debug_print(f"Shape after imputation (mean, mode, median, ffill): mean={df_mean.shape}, mode={df_mode.shape}, median={df_median.shape}, ffill={df_ffill.shape}")

        # Méthode 4fill - seulement 4 colonnes spécifiques avec ffill
        specific_cols_4fill = [
            ('PRODUIT FINI TSP', 'Détermination', '%P2O5  TOT PF'),
            ('ACIDE PHOSPHORIQUE', 'Picage AR29', '%P2O5 AR29'),
            ('ACIDE PHOSPHORIQUE', 'Picage AR29', 'Densité AR29'),
            ('PHOSPHATE BROYE', 'Phosphate brute broyé', '%P2O5 TOT broyé')
        ]
        
        debug_print("Application de la méthode 4fill sur les colonnes spécifiques...")
        for col in specific_cols_4fill:
            if col in df_4fill.columns:
                df_4fill[col] = df_4fill[col].ffill().bfill()
        
        debug_print(f"Shape after 4fill method: {df_4fill.shape}")

        # --- 6. Sauvegarde des fichiers APRES avoir appliqué les formules ---
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_files = []

        # Liste des dataframes et leurs suffixes
        df_methods = [
            (df_mean, 'mean'),
            (df_mode, 'mode'), 
            (df_median, 'median'),
            (df_ffill, 'ffill'),
            (df_4fill, '4fill')  
        ]

        for df_original, suffix in df_methods:
            # Apply formulas to the filled copy
            df_calculated = apply_formulas(df_original, ligne)

            # Reset index before saving to Excel to handle MultiIndex columns issue
            df_calculated = df_calculated.reset_index(drop=True)
            debug_print(f"Shape after resetting index ({suffix}: {df_calculated.shape}")

            output_name = f"{base_name}_{suffix}.xlsx"
            output_path = os.path.join(output_dir, output_name)
            try:
                df_calculated.to_excel(output_path, index=True)
                output_files.append(output_name)
                debug_print(f"Fichier '{output_name}' créé.")
            except Exception as e:
                debug_print(f"Erreur lors de la sauvegarde du fichier '{output_name}': {e}")

        return {"status": "success", "created_files": output_files}

    except Exception as e:
        return {"status": "error", "message": f"Erreur dans process_file: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        result = {"status": "error", "message": "Chemin du dossier requis"}
        print(json.dumps(result))
        sys.exit(1)
    
    uploads_dir = sys.argv[1]
    results = []
    processed_files = []
    
    # Traiter tous les fichiers nettoyés
    cleaned_files = list(Path(uploads_dir).glob('* nettoyé.xlsx'))
    
    if not cleaned_files:
        result = {"status": "error", "message": "Aucun fichier nettoyé trouvé"}
        print(json.dumps(result))
        sys.exit(1)
    
    for file_path in cleaned_files:
        result = process_file(str(file_path), uploads_dir)
        results.append(result)
        if result["status"] == "success":
            processed_files.extend(result["created_files"])
    
    final_result = {
        "status": "success",
        "processed_files": processed_files,
        "details": results
    }
    

    print(json.dumps(final_result))

if __name__ == "__main__":
    main()