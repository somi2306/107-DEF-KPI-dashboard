import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import numpy as np

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    raise ValueError("MONGODB_URI not found in environment variables. Please check your .env file.")

DB_NAME = "stage_pfa"
script_dir = os.path.dirname(os.path.abspath(__file__))
data_base_dir = os.path.join(script_dir, '..', 'data')

lines_to_import = {
    "F": [
        "Fusion_107F_KPIs_mean.xlsx",
        "Fusion_107F_KPIs_median.xlsx",
        "Fusion_107F_KPIs_mode.xlsx",
        "Fusion_107F_KPIs_ffill.xlsx"
    ],
    "E": [
        "Fusion_107E_KPIs_mean.xlsx",
        "Fusion_107E_KPIs_median.xlsx",
        "Fusion_107E_KPIs_mode.xlsx",
        "Fusion_107E_KPIs_ffill.xlsx"
    ],
    "D": [
        "Fusion_107D_KPIs_mean.xlsx",
        "Fusion_107D_KPIs_median.xlsx",
        "Fusion_107D_KPIs_mode.xlsx",
        "Fusion_107D_KPIs_ffill.xlsx"
    ]
}

cols_obj = [
    ('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Unnamed: 0_level_2'),
    ('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Date c'),
    ('107 F', 'Unnamed: 1_level_1', 'Mois'),
    ('107 F', 'Unnamed: 2_level_1', 'Date '),
    ('107 F', 'Unnamed: 3_level_1', 'semaine'),
    ('107 F', 'Unnamed: 4_level_1', 'Poste'),
    ('107 F', 'Unnamed: 5_level_1', 'Heure'),
    ('Valeurs', ' "CIV" si SE suivi CIV> =41,5 et "SP" sinon ', 'Qualité')
]

def convert_numbers(obj):
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

def create_nested_document(row, multiindex):
    nested_doc = {}
    for col, value in zip(multiindex, row):
        current_dict = nested_doc
        for level in col[:-1]:
            if "Unnamed" not in str(level):
                level = str(level).strip()
                if level not in current_dict:
                    current_dict[level] = {}
                current_dict = current_dict[level]
        final_key = str(col[-1]).strip()
        if "Unnamed" not in final_key:
            current_dict[final_key] = value
    return nested_doc

def import_excel_to_mongo():
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        print(f"Connecté à la base de données MongoDB '{DB_NAME}'")

        for line, files in lines_to_import.items():
            line_dir = os.path.join(data_base_dir, f"ligne {line}")

            for file in files:
                try:
                    file_path = os.path.join(line_dir, file)
                    filename_base = os.path.splitext(file)[0].replace('Fusion_107', 'ligne_').replace('_', '_').lower()
                    collection_name = filename_base
                    collection = db[collection_name]

                    df = pd.read_excel(file_path, header=[0,1,2])

                    # Suppression première colonne, dernière colonne, première ligne après header
                    df = df.drop(df.columns[0], axis=1)
                    df = df.drop(df.columns[-1], axis=1)
                    df = df.iloc[1:].reset_index(drop=True)

                    # Forcer le type
                    for col in df.columns:
                        if col in cols_obj:
                            df[col] = df[col].astype('object')
                        else:
                            try:
                                df[col] = pd.to_numeric(df[col], errors='coerce').astype('float64')
                            except:
                                pass

                    records = []
                    for _, row in df.iterrows():
                        nested_doc = create_nested_document(row, df.columns)
                        nested_doc = convert_numbers(nested_doc)
                        records.append(nested_doc)

                    collection.delete_many({})
                    if records:
                        collection.insert_many(records)
                        print(f"Données de '{file}' importées avec succès dans la collection '{collection_name}'")
                        print(f"Nombre de documents insérés dans '{collection_name}': {len(records)}")
                    else:
                        print(f"Aucune donnée à insérer pour '{file}'")

                except FileNotFoundError:
                    print(f"Erreur : Fichier '{file_path}' introuvable.")
                except Exception as e:
                    print(f"Erreur lors du traitement du fichier '{file}': {e}")

    except Exception as e:
        print(f"Erreur de connexion MongoDB: {e}")
    finally:
        if 'client' in locals() and client is not None:
            client.close()
            print("Connexion MongoDB fermée.")

if __name__ == "__main__":
    import_excel_to_mongo()
