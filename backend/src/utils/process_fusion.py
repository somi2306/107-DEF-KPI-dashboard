import pandas as pd
import os
import sys
import json
import logging


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename=os.path.join(os.path.dirname(__file__), 'process_fusion.log'),
    filemode='a'
)

def log_message(message):
    """Log messages to file instead of stdout"""
    logging.info(message)


def traiter_ligne(ligne, fichier_df_path, fichier_df1_path, output_dir):
    """
    Fonction pour charger, fusionner et exporter les fichiers pour une ligne donnée.
    """
    log_message(f"\n{'='*20} Début du traitement pour la Ligne {ligne} {'='*20}")

    # --- A. Définir le nom du fichier de sortie ---
    fichier_output_name = f"Fusion_107{ligne}_KPIs.xlsx"
    fichier_output_path = os.path.join(output_dir, fichier_output_name)

    # --- B. Vérifier si les fichiers d'entrée existent ---
    if not os.path.exists(fichier_df_path) or not os.path.exists(fichier_df1_path):
        log_message(f"ATTENTION : Fichiers manquants pour la ligne {ligne}. Traitement annulé.")
        return None

    # --- C. Modèle de base pour le mappage des en-têtes ---
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

    # --- D. Créer le dictionnaire de mappage dynamique ---
    header_mapping_dynamique = {key: value.replace("107D", f"107{ligne}") for key, value in header_mapping_template.items()}

    # --- E. Chargement et préparation des données ---
    log_message(f"Chargement des fichiers pour la ligne {ligne}...")
    df = pd.read_excel(fichier_df_path, header=[0, 1, 2])
    df1 = pd.read_excel(fichier_df1_path, header=[0, 1])
    df = df.iloc[:, 1:]
    df1 = df1.iloc[:, 1:]

    # --- F. Logique de fusion (simplifiée pour la clarté) ---
    colonnes_identiques_df1 = [
        (('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Unnamed: 0_level_2'), ('Unnamed: 0_level_0', 'Unnamed: 0_level_1')),
        (('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Date c'), ('Unnamed: 1_level_0', 'Date c')),
        (('107 D', 'Unnamed: 1_level_1', 'Mois'), ('J_107DEF_107DHIC221_B', 'MOIS')),
        (('107 E', 'Unnamed: 1_level_1', 'Mois'), ('J_107DEF_107EHIC221_B', 'MOIS')),
        (('107 F', 'Unnamed: 1_level_1', 'Mois'), ('J_107DEF_107FHIC221_B', 'MOIS')),
        (('107 D', 'Unnamed: 2_level_1', 'Date '), (pd.Timestamp('2025-08-01 00:00:00'), 'Date ')),
        (('107 D', 'Unnamed: 2_level_1', 'Date c '), (pd.Timestamp('2025-08-01 00:00:00'), 'Date pi')),
        (('107 E', 'Unnamed: 2_level_1', 'Date '), (pd.Timestamp('2025-08-01 00:00:00'), 'Date ')),
        (('107 E', 'Unnamed: 2_level_1', 'Date c '), (pd.Timestamp('2025-08-01 00:00:00'), 'Date pi')),
        (('107 F', 'Unnamed: 2_level_1', 'Date '), (pd.Timestamp('2025-08-01 00:00:00'), 'Date ')),
        (('107 F', 'Unnamed: 2_level_1', 'Date c '), (pd.Timestamp('2025-08-01 00:00:00'), 'Date pi')),
        (('107 D', 'Unnamed: 3_level_1', 'Semaine'), ('J_107DEF_107DHIC221_B', 'Semaine')),
        (('107 E', 'Unnamed: 3_level_1', 'Semaine'), ('J_107DEF_107EHIC221_B', 'Semaine')),
        (('107 F', 'Unnamed: 3_level_1', 'Semaine'), ('J_107DEF_107FHIC221_B', 'Semaine')),
        (('107 D', 'Unnamed: 4_level_1', 'Poste'), ('Unnamed: 2_level_0', 'Poste')),
        (('107 D', 'Unnamed: 4_level_1', 'Poste'), ('Valeurs', 'Poste')),
        (('107 E', 'Unnamed: 4_level_1', 'Poste'), ('Unnamed: 2_level_0', 'Poste')),
        (('107 E', 'Unnamed: 4_level_1', 'Poste'), ('Valeurs', 'Poste')),
        (('107 F', 'Unnamed: 4_level_1', 'Poste'), ('Unnamed: 2_level_0', 'Poste')),
        (('107 F', 'Unnamed: 4_level_1', 'Poste'), ('Valeurs', 'Poste')),
        (('107 D', 'Unnamed: 5_level_1', 'Heure'), ('Unnamed: 3_level_0', 'Heure')),
        (('107 D', 'Unnamed: 5_level_1', 'Heure'), ('Valeurs', 'Heure')),
        (('107 E', 'Unnamed: 5_level_1', 'Heure'), ('Unnamed: 3_level_0', 'Heure')),
        (('107 E', 'Unnamed: 5_level_1', 'Heure'), ('Valeurs', 'Heure')),
        (('107 F', 'Unnamed: 5_level_1', 'Heure'), ('Unnamed: 3_level_0', 'Heure')),
        (('107 F', 'Unnamed: 5_level_1', 'Heure'), ('Valeurs', 'Heure')),
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

    # --- G. Exportation du fichier final ---
    df_fusion.to_excel(fichier_output_path)
    log_message(f"SUCCES ! Fichier '{fichier_output_name}' créé.")
    return fichier_output_name


if __name__ == "__main__":
    result = {"status": "error", "message": "Unknown error", "created_files": []}
    
    try:
        output_dir = sys.argv[1]
        file_paths = sys.argv[2:]
        
        log_message(f"Arguments reçus: {sys.argv}")
        log_message(f"Output directory: {output_dir}")
        log_message(f"File paths: {file_paths}")
        
        # Vérifiez que le répertoire de sortie existe
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            log_message(f"Creation du repertoire de sortie: {output_dir}")
        
        created_files = []
        
        # Traiter les fichiers par paires
        for i in range(0, len(file_paths), 3):
            if i + 2 >= len(file_paths):
                break
                
            ligne = file_paths[i]
            path1 = file_paths[i+1]
            path2 = file_paths[i+2]
            
            log_message(f"Traitement ligne {ligne} avec fichiers: {path1}, {path2}")
            
            # Vérifiez l'existence des fichiers
            if not os.path.exists(path1):
                log_message(f"ERREUR: Fichier introuvable: {path1}")
                continue
            if not os.path.exists(path2):
                log_message(f"ERREUR: Fichier introuvable: {path2}")
                continue
                
            if path1 and path2:
                result_file = traiter_ligne(ligne, path1, path2, output_dir)
                if result_file:
                    created_files.append(result_file)

        # Préparer le résultat JSON
        result = {"status": "success", "created_files": created_files}

    except Exception as e:
        error_msg = f"Erreur: {str(e)}"
        log_message(error_msg)
        result = {"status": "error", "message": str(e)}
    
    # Envoyer uniquement le JSON sur stdout
    print(json.dumps(result))
    
    # Exit avec le code approprié
    sys.exit(0 if result["status"] == "success" else 1)