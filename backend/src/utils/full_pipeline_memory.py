
import pandas as pd
import numpy as np
import sys
import json
import re
import base64
import io
import warnings
from pathlib import Path
import logging

# Configuration des logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Suppression des warnings
warnings.filterwarnings("ignore", category=FutureWarning, message="Downcasting object dtype arrays")

# Liste des colonnes à exclure de la conversion numérique
exclude_cols = [
    ('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Unnamed: 0_level_2'),
    ('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Date c'),
    # 107F
    ('107 F', 'Unnamed: 1_level_1', 'Mois'), 
    ('107 F', 'Unnamed: 2_level_1', 'Date '),
    ('107 F', 'Unnamed: 3_level_1', 'semaine'),
    ('107 F', 'Unnamed: 3_level_1', 'Semaine'),
    ('107 F', 'Unnamed: 4_level_1', 'Poste'),
    ('107 F', 'Unnamed: 5_level_1', 'Heure'),
    # 107E
    ('107 E', 'Unnamed: 1_level_1', 'Mois'), 
    ('107 E', 'Unnamed: 2_level_1', 'Date '),
    ('107 E', 'Unnamed: 3_level_1', 'semaine'),
    ('107 E', 'Unnamed: 3_level_1', 'Semaine'),
    ('107 E', 'Unnamed: 4_level_1', 'Poste'),
    ('107 E', 'Unnamed: 5_level_1', 'Heure'),
    # 107D
    ('107 D', 'Unnamed: 1_level_1', 'Mois'), 
    ('107 D', 'Unnamed: 2_level_1', 'Date '),
    ('107 D', 'Unnamed: 3_level_1', 'semaine'),
    ('107 D', 'Unnamed: 3_level_1', 'Semaine'),
    ('107 D', 'Unnamed: 4_level_1', 'Poste'),
    ('107 D', 'Unnamed: 5_level_1', 'Heure'),
]

# Fonctions utilitaires
def debug_print(message):
    """Print debug messages to stderr instead of stdout"""
    print(message, file=sys.stderr)

def nettoyer_nom_colonne(col):
    if isinstance(col, tuple):
        col = '_'.join(str(c) for c in col if c)
    # Remplace les caractères non alphanumériques par _
    clean_col = re.sub(r'[^0-9a-zA-Z_]', '_', str(col)).lower()
    # Supprime les underscores multiples ou en début/fin de chaîne
    return re.sub(r'_+', '_', clean_col).strip('_')

def convert_to_serializable(obj):
    # Gestion des valeurs pandas NULL en premier
    if pd.isna(obj):
        return None
    
    # Gestion des nombres extrêmement grands ou petits
    if isinstance(obj, (np.integer, np.int64, int)):
        value = int(obj)
        # Vérifier si le nombre est trop grand pour JSON
        if abs(value) > 1e20:
            return 0  # ou une valeur par défaut appropriée
        return value
        
    elif isinstance(obj, (np.floating, np.float64, float)):
        value = float(obj)
        # Vérifier et corriger les nombres extrêmes
        if abs(value) > 1e20 or (abs(value) < 1e-20 and value != 0):
            return 0.0  # ou une valeur par défaut appropriée
        # Éviter les valeurs NaN et inf
        if np.isnan(value) or np.isinf(value):
            return 0.0
        return value
        
    elif isinstance(obj, np.ndarray):
        return [convert_to_serializable(item) for item in obj.tolist()]
        
    elif isinstance(obj, pd.Timestamp):
        return obj.strftime('%Y-%m-%d %H:%M:%S')
        
    elif hasattr(obj, 'dtype'):
        try:
            return obj.item() if hasattr(obj, 'item') else str(obj)
        except:
            return str(obj)
            
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
        
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
        
    else:
        return obj
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

# Fonctions de traitement
def traiter_fusion(ligne, file1_content, file2_content):
    """
    Fonction pour charger, fusionner et exporter les fichiers pour une ligne donnée.
    """
    debug_print(f"\n{'='*20} Début du traitement pour la Ligne {ligne} {'='*20}")

    # --- A. Chargement des fichiers ---
    debug_print(f"Chargement des fichiers pour la ligne {ligne}...")
    df = pd.read_excel(io.BytesIO(file1_content), header=[0, 1, 2])
    df1 = pd.read_excel(io.BytesIO(file2_content), header=[0, 1])
    df = df.iloc[:, 1:]
    df1 = df1.iloc[:, 1:]

    # --- B. Modèle de base pour le mappage des en-têtes ---
    header_mapping_template = {
        'Production TSP balance T/H': 'J_107DEF_107DWI407_B',
        'Débit ACP 1 M3/H': 'J_107DEF_107DFIC905_B',
        'Débit ACP 2 M3/H': 'J_107DEF_107DFIC912_B',
        'DébIT PP Kg/H': 'J_107DEF_107DWIC860_B',
        'Débit bouillie T/H 1': 'J_107DEF_107DFIC878_B',
        'Débit bouillie T/H 2': 'J_107DEF_107DFIC879_B',
        'Débit bouillie M3/H 1': 'J_107DEF_107DFI878_B',
        'Débit bouillie M3/H 2': 'J_107DEF_107DFI879_B',
        'Recyclage T/H': 'J_107DEF_107DWIC434_B',
        'Pression vapeur Barg': 'J_107DEF_107DPI911_B',
        'Température vapeur °C': 'J_107DEF_107DTI751_B',
        "Température cuve d'attaque °C": 'J_107DEF_107DTIC863_B',
        'Température cuve de passage °C': 'J_107DEF_107DTIC876_B',
        'Température bouillie pulvérisateur °C': 'J_107DEF_107DTI059_B',
        'Depression sécheur mmH2O': 'J_107DEF_107DPI159_B',
        'Niveau cuve passage %': 'J_107DEF_107dLI865_B',
        'Température GAZ sortie sécheur °C': 'J_107DEF_107DTI138_B',
        'Débit fioul Kg/H': 'J_107DEF_107DFI176B_B',
        'Température air chaud °C': 'J_107DEF_107DTIC740_B',
        'Température brique °C': 'J_107DEF_107DTI155B_B',
        'Débit Liquide lavage M3/H': 'J_107DEF_107DFIC002_B',
        'Débit vapeur T/H': 'J_107DEF_107DFI751_B',
        'Ouverture AH08 %': 'J_107DEF_107DHIC275_B',
        'Ouverture AH01 %': 'J_107DEF_107DHIC221_B',
        'Débit ACP M3/H': 'somme Débit1+Débit2',
        'Débit bouillie T/H': 'Densité bouillie*(Débit bouillie M3/H 1+Débit bouillie M3/H 2)/1000',
        'debit bouillie T/H': 'Débit bouillie T/H 1 +Débit bouillie T/H 2',
        'Ratio Solide/Liquide': '(Recyclage T/H)/(debit bouillie T/H)',
        'Ratio recyclage /TSP': '(Recyclage T/H )/(Production TSP balance)',
        'Rapport acidulation Kg/M3': '0 si ((Débit ACP 1+Débit ACP 2)*(%P2O5 AR29)*(Densité AR29))/(Débit PP*30*1000) <0,5 et ((Débit ACP 1+Débit ACP 2)*(%P2O5 AR29)*(Densité AR29))/(Débit PP*30*1000) sinon',
        'CSP PP Kg/T': 'vide si (Débit PP)/(Production TSP balance) >10 et (Débit PP)/(Production TSP balance) sinon',
        'CSP ACP Kg/T': '((Débit ACP 1+Débit ACP 2)*Densité AR29*%P₂O₅ AR29)/(Production TSP balance*100000)',
        'Prod TSP/ACP M3/H': 'vide si (Débit ACP*%P2O5*Densité AR29)/(38500)=0 et (Débit ACP*%P2O5*Densité AR29)/(38500) sinon',
        'Nbr HM': ' ',
        'CSP Fioul Kg/T': 'vide si  Débit fioul/Production TSP balance>100 et Débit fioul/Production TSP balance sinon',
        'SE suivi CIV %': '%P2O5 SE PF si on a une valeur et la valeur précédant si %P2O5 SE PF =0',
        'Qualité': '"CIV" si SE suivi CIV> =41,5 et "SP" sinon',
        'Unnamed: 91_level_2': ' '
    }

    # --- C. Créer le dictionnaire de mappage dynamique ---
    header_mapping_dynamique = {key: value.replace("107D", f"107{ligne}") for key, value in header_mapping_template.items()}

    # --- D. Logique de fusion ---
    colonnes_identiques_df1 = [
        (('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Unnamed: 0_level_2'), ('Unnamed: 0_level_0', 'Unnamed: 0_level_1')),
        (('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Date c'), ('Unnamed: 1_level_0', 'Date c')),
        ((f'107 {ligne}', 'Unnamed: 1_level_1', 'Mois'), (f'J_107DEF_107{ligne}HIC221_B', 'MOIS')),
        ((f'107 {ligne}', 'Unnamed: 2_level_1', 'Date '), (pd.Timestamp('2025-08-01 00:00:00'), 'Date ')),
        ((f'107 {ligne}', 'Unnamed: 2_level_1', 'Date c '), (pd.Timestamp('2025-08-01 00:00:00'), 'Date pi')),
        ((f'107 {ligne}', 'Unnamed: 3_level_1', 'Semaine'), (f'J_107DEF_107{ligne}HIC221_B', 'Semaine')),
        ((f'107 {ligne}', 'Unnamed: 4_level_1', 'Poste'), ('Unnamed: 2_level_0', 'Poste')),
        ((f'107 {ligne}', 'Unnamed: 4_level_1', 'Poste'), ('Valeurs', 'Poste')),
        ((f'107 {ligne}', 'Unnamed: 5_level_1', 'Heure'), ('Unnamed: 3_level_0', 'Heure')),
        ((f'107 {ligne}', 'Unnamed: 5_level_1', 'Heure'), ('Valeurs', 'Heure')),
        (('ACIDE PHOSPHORIQUE', 'Picage AR29', '%P2O5 AR29'), ('Valeurs', 'Moyenne de %P2O5 AR29')),
        (('ACIDE PHOSPHORIQUE', 'Picage AR29', '%P2O5 AR29'), ('Valeurs', 'P2O5 AR29')),
        (('ACIDE PHOSPHORIQUE', 'Picage AR29', 'Densité AR29'), ('Valeurs', 'Moyenne de Densité AR29')),
        (('ACIDE PHOSPHORIQUE', 'Picage AR29', 'Densité AR29'), ('Valeurs', 'Densité AR29')),
        (('PHOSPHATE BROYE', 'Phosphate brute broyé', '%P2O5 TOT broyé '), ('Valeurs', 'Moyenne de %P2O5 TOT broyé ')),
        (('PHOSPHATE BROYE', 'Phosphate brute broyé', '%P2O5 TOT broyé '), ('Valeurs', 'P2O5 PP')),
        (('TSP', "Cuve D'attaque (bouillie)", 'Densité bouillie'), ('Valeurs', 'Moyenne de Densité bouillie')),
        (('TSP', "Cuve D'attaque (bouillie)", '%P2O5 SE bouillie'), ('Valeurs', 'Moyenne de %P2O5  SE bouillie')),
        (('TSP', "Cuve D'attaque (bouillie)", '%Acide libre bouillie'), ('Valeurs', 'Moyenne de %Acide libre bouillie')),
        (('TSP', 'Sortie granulateur', '%P2O5 SE+SC gran'), ('Valeurs', 'Moyenne de %P2O5  SE+SC gran')),
        (('TSP', 'Sortie granulateur', '%P2O5 SE granu'), ('Valeurs', 'Moyenne de %P2O5 SE granu')),
        (('TSP', 'Sortie granulateur', '%Acide libre granul'), ('Valeurs', 'Moyenne de %Acide libre granul')),
        (('PRODUIT FINI TSP', 'Détermination ', '%P2O5 TOT PF'), ('Valeurs', 'Moyenne de %P2O5 TOT PF')),
        (('PRODUIT FINI TSP', 'Détermination', '%P2O5  TOT PF'),('Valeurs', 'Moyenne de %P2O5  TOT PF')),
        (('PRODUIT FINI TSP', 'Détermination', '%P2O5  TOT PF'),('Valeurs', 'P2O5 PF T')),
        (('PRODUIT FINI TSP', 'Détermination ', '%P2O5 SE+SC PF'), ('Valeurs', 'Moyenne de %P2O5  SE+SC PF')),
        (('PRODUIT FINI TSP', 'Détermination ', '%H2O Tq PF'), ('Valeurs', 'Moyenne de %H2O Tq PF')),
        (('PRODUIT FINI TSP', 'Détermination ', "% AL à l'acetone PF"), ('Valeurs', "Moyenne de % AL à l'acetone PF")),
        (('PRODUIT FINI TSP', 'Détermination ', '%P2O5 SE PF '), ('Valeurs', 'Moyenne de %P2O5 SE PF ')),
        (('PRODUIT FINI TSP', 'Granulométrie', '˃2,5-˃4mm'), ('Valeurs', 'Moyenne de ˃2,5-˃4mm')),
        (('PRODUIT FINI TSP', 'Granulométrie', '˃2-˃4mm'), ('Valeurs', 'Moyenne de ˃2-˃4mm')),
    ]
    
    colonnes_deja_vues_df1 = [col[1] for col in colonnes_identiques_df1]
    colonnes_a_ajouter = [col for col in df1.columns if col not in colonnes_deja_vues_df1]
    new_cols = []
    
    for col in colonnes_a_ajouter:
        level_2_name = col[1].strip()
        level_1_name = header_mapping_dynamique.get(level_2_name, 'Description Manquante')
        new_cols.append(('Valeurs', level_1_name, level_2_name))
    
    df1_filtered = df1[colonnes_a_ajouter].copy()
    df1_filtered.columns = pd.MultiIndex.from_tuples(new_cols)
    df = df.reset_index(drop=True)
    df1_filtered = df1_filtered.reset_index(drop=True)
    df1_filtered = df1_filtered.iloc[:df.shape[0]]
    df_fusion = pd.concat([df, df1_filtered], axis=1)
    df_fusion = df_fusion.iloc[1:]
    df_fusion.reset_index(drop=True, inplace=True)

    debug_print(f"Fusion terminée pour la ligne {ligne}. Shape: {df_fusion.shape}")
    return df_fusion

def nettoyage_donnees(df_fusion):
    """
    Fonction pour nettoyer les données fusionnées.
    """
    debug_print("Début du nettoyage des données...")
    
    # Trouver la colonne de départ
    start_index = None
    for i in range(len(df_fusion.columns)):
        if df_fusion.columns[i] == ('ACIDE PHOSPHORIQUE', 'Picage AR29', '%P2O5 AR29'):
            start_index = i
            break
    
    if start_index is None:
        raise ValueError("Colonne de départ non trouvée")
    
    colonnes = df_fusion.columns[start_index:-1]
    df_clean = df_fusion.copy()
    
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
                nan_indices = df_clean[col][df_clean[col].isna() & df_fusion[col].notna()].index.tolist()
                changes[str(col)] = {
                    'added_nan': int(new_nan - original_nan),
                    'examples': nan_indices[:5] if nan_indices else []
                }
    
    # Supprimer les lignes vides
    original_rows = len(df_clean)
    df_nettoye = df_clean.dropna(subset=colonnes, how="all")
    df_nettoye = df_nettoye.dropna(how="all")
    removed_rows = original_rows - len(df_nettoye)
    
    debug_print(f"Nettoyage terminé. Lignes supprimées: {removed_rows}")
    return df_nettoye

def apply_formulas(df, ligne):
    """
    Applique les formules mathématiques pour calculer les nouvelles colonnes.
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
    # AJOUTER CETTE LIGNE POUR DEBUG
        col_name = ('Valeurs', '"CIV" si SE suivi CIV>=41,5 et "SP" sinon', 'Qualité')
        values = df[col_name].unique()
        debug_print(f"Qualité values: {values}")


    except Exception as e: 
        debug_print(f"Erreur formule 'Qualité': {e}")

    debug_print(f"Shape after applying formulas: {df.shape}")
    return df

def remplissage_donnees(df_nettoye, ligne):
    """
    Fonction pour appliquer les différentes méthodes de remplissage.
    """
    debug_print("Début du remplissage des données...")
    
    # Forcer le type des colonnes
    for col in df_nettoye.columns:
        if col in exclude_cols:
            df_nettoye[col] = df_nettoye[col].astype('object')
        else:
            try:
                df_nettoye[col] = pd.to_numeric(df_nettoye[col], errors='coerce').astype('float64')
            except:
                pass

    # Définition des colonnes à imputer
    cols_to_impute = [c for c in df_nettoye.columns if c[0] in ['ACIDE PHOSPHORIQUE', 'PHOSPHATE BROYE', 'TSP', 'PRODUIT FINI TSP'] or (c[0] == 'Valeurs' and f'J_107DEF_107{ligne}' in str(c[1]))]

    # Nettoyage des valeurs négatives
    for col in cols_to_impute:
        if col in df_nettoye.columns:
            df_nettoye[col] = df_nettoye[col].apply(lambda x: x if pd.notna(x) and x >= 0 else pd.NA)

    # Création des copies pour chaque méthode d'imputation
    df_mean = df_nettoye.copy()
    df_mode = df_nettoye.copy()
    df_median = df_nettoye.copy()
    df_ffill = df_nettoye.copy()
    df_4fill = df_nettoye.copy()

    # Application des méthodes d'imputation
    debug_print("Application des méthodes d'imputation...")
    for col in cols_to_impute:
        if col in df_nettoye.columns:
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
    

    debug_print("Application des formules après l'imputation...")
    df_mean = apply_formulas(df_mean, ligne)
    df_mode = apply_formulas(df_mode, ligne)
    df_median = apply_formulas(df_median, ligne)
    df_ffill = apply_formulas(df_ffill, ligne)
    df_4fill = apply_formulas(df_4fill, ligne)
    
    debug_print("Remplissage terminé.")
    return {
        'mean': df_mean,
        'mode': df_mode,
        'median': df_median,
        'ffill': df_ffill,
        '4fill': df_4fill
    }

def validate_number(value):
    """
    Valide et corrige les nombres problématiques pour la sérialisation JSON.
    """
    if pd.isna(value):
        return None
        
    try:
        num = float(value)
        # Vérifier les valeurs extrêmes
        if abs(num) > 1e20:
            return 0.0
        if abs(num) < 1e-20 and num != 0:
            return 0.0
        if np.isnan(num) or np.isinf(num):
            return 0.0
        return num
    except (ValueError, TypeError):
        return value
    
def create_nested_document(row, multiindex):
    """
    Crée un document imbriqué pour MongoDB à partir d'une ligne de données.
    """
    nested_doc = {}
    for col, value in zip(multiindex, row):
        # Valider et corriger la valeur avant de l'ajouter
        validated_value = validate_number(value)
        current_dict = nested_doc
        
        for level in col[:-1]:
            if "Unnamed" not in str(level):
                level = str(level).strip()
                if level not in current_dict:
                    current_dict[level] = {}
                current_dict = current_dict[level]
                
        final_key = str(col[-1]).strip()
        if "Unnamed" not in final_key:
            current_dict[final_key] = validated_value
            
    return nested_doc

def convert_numbers(obj):
    """
    Convertit les nombres NumPy en types Python natifs.
    """
    if isinstance(obj, dict):
        return {k: convert_numbers(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numbers(x) for x in obj]
    elif isinstance(obj, (np.integer, int)):
        return float(obj)
    elif isinstance(obj, (np.floating, float)):
        return float(obj)
    else:
        return obj


def main():
    try:
        # Lecture des données d'entrée
        input_data = sys.stdin.read()
        payload = json.loads(input_data)

        ligne = payload['line']
        originalname1 = payload['originalname1']
        originalname2 = payload['originalname2']

        # Décoder les fichiers depuis le format base64
        file1_content = base64.b64decode(payload['file1_b64'])
        file2_content = base64.b64decode(payload['file2_b64'])

        # 1. Fusion des fichiers
        df_fusion = traiter_fusion(ligne, file1_content, file2_content)

        # 2. Nettoyage des données
        df_nettoye = nettoyage_donnees(df_fusion)

        # 3. Remplissage des données avec différentes méthodes
        dict_dfs_remplis = remplissage_donnees(df_nettoye, ligne)
        

        # 4. Préparation et envoi des données pour MongoDB (en streaming)
        for method, df_method in dict_dfs_remplis.items():
            df_method = df_method.drop(df_method.columns[0], axis=1)
            #df_method = df_method.drop(df_method.columns[-1], axis=1)
            df_method = df_method.iloc[1:].reset_index(drop=True)

            for idx, row in df_method.iterrows():
                nested_doc_data = create_nested_document(row, df_method.columns)
                
                # Extraire les champs d'identification unique
                date_c = None
                mois = None
                date_num = None
                semaine = None
                poste = None
                heure = None
                
                # Chercher ces valeurs dans les données
                for col_name, value in zip(df_method.columns, row):
                    if 'Date c' in str(col_name[-1]):
                        date_c = value
                    elif 'Mois' in str(col_name[-1]):
                        mois = value
                    elif 'Date ' in str(col_name[-1]) and 'Date c' not in str(col_name[-1]):
                        date_num = value
                    elif 'Semaine' in str(col_name[-1]):
                        semaine = value
                    elif 'Poste' in str(col_name[-1]):
                        poste = value
                    elif 'Heure' in str(col_name[-1]):
                        heure = value
                
                # Construire le document final
                final_doc = {
                    'source_line': ligne,
                    'original_filenames': {
                        'file1': originalname1,
                        'file2': originalname2
                    },
                    'imputation_method': method,
                    'original_row_index': idx,
                    
                    # Champs d'identification unique
                    'date_c': date_c,
                    'mois': mois if mois is not None else 0,
                    'date_num': date_num if date_num is not None else 0,
                    'semaine': semaine if semaine is not None else 0,
                    'poste': poste if poste is not None else 'Inconnu',
                    'heure': heure if heure is not None else 'Inconnu',
                    
                    **nested_doc_data
                }
                
                final_doc = convert_to_serializable(final_doc)
                print(json.dumps(final_doc, ensure_ascii=False))

    except Exception as e:
        debug_print(f"PYTHON SCRIPT ERROR: {str(e)}")
        import traceback
        debug_print(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main() # Simplification du bloc final