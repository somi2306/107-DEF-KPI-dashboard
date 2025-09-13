import pandas as pd
import numpy as np
import os
import re
import json
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import skew, kurtosis, pearsonr
import io
import base64
from scipy.stats import norm
from pymongo import MongoClient
import warnings
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from urllib.parse import urlparse
warnings.filterwarnings("ignore")

import sys
import io

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(env_path)

# Configuration de la connexion MongoDB
def get_mongodb_connection():
    """Établit une connexion à MongoDB Atlas"""
    load_dotenv()
    try:
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            raise ValueError("MONGODB_URI non trouvée dans les variables d'environnement")
        
        masked_uri = re.sub(r':([^@]+)@', ':****@', mongodb_uri)
        print(f"🔗 Connexion à MongoDB: {masked_uri}")
        
        client = MongoClient(mongodb_uri)
        client.admin.command('ping')
        print("✅ Connecté à MongoDB Atlas avec succès")
        return client
    except Exception as e:
        print(f"❌ Erreur de connexion MongoDB: {e}")
        return None

def save_statistics_to_mongodb(line, statistics_data):
    """Sauvegarde les résultats statistiques dans MongoDB en documents séparés"""
    client = get_mongodb_connection()
    if not client:
        print("❌ Impossible de se connecter à MongoDB pour sauvegarder les résultats")
        return False
    
    try:
        db = client['107_DEF_KPI_dashboard']
        
        # 1. Sauvegarder les variables individuellement
        variables_collection = db['statistics_variables']
        variables_count = 0
        
        for var_name, var_data in statistics_data.get("Variables", {}).items():
            if var_data:  # Vérifier que les données ne sont pas vides
                variable_doc = {
                    "line": line,
                    "variable_name": var_name,
                    **var_data
                }
                variables_collection.update_one(
                    {"line": line, "variable_name": var_name},
                    {"$set": variable_doc},
                    upsert=True
                )
                variables_count += 1
        
        # 2. Sauvegarder les relations individuellement
        relations_collection = db['statistics_relations']
        relations_count = 0
        
        for rel_key, rel_data in statistics_data.get("Relations", {}).items():
            if rel_data and "variables" in rel_data:
                # Déterminer le type de relation
                rel_type = "unknown"
                if "quantitatives" in rel_key:
                    rel_type = "quantitative"
                elif "qualitatives" in rel_key:
                    rel_type = "qualitative"
                elif "quant_qual" in rel_key:
                    rel_type = "quant_qual"
                
                relation_doc = {
                    "line": line,
                    "relation_key": rel_key,
                    "type": rel_type,
                    "variables": rel_data["variables"],
                    "data": {k: v for k, v in rel_data.items() if k != "variables"},
                    "chart_data": rel_data.get("chart_data", {})
                }
                relations_collection.update_one(
                    {"line": line, "relation_key": rel_key},
                    {"$set": relation_doc},
                    upsert=True
                )
                relations_count += 1
        
        # 3. Sauvegarder les métadonnées principales
        main_collection = db['statistics_results']
        main_doc = {
            "Ligne": line,
            "metadata": {
                "total_variables": variables_count,
                "total_relations": relations_count,
                "generated_at": pd.Timestamp.now().isoformat(),
                "imputation_method": "4fill"
            }
        }
        
        main_collection.update_one(
            {"Ligne": line},
            {"$set": main_doc},
            upsert=True
        )
        
        print(f"✅ Résultats sauvegardés pour la ligne {line}")
        print(f"   - {variables_count} variables sauvegardées")
        print(f"   - {relations_count} relations sauvegardées")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde dans MongoDB: {e}")
        import traceback
        traceback.print_exc()
        return False
    
# Fonction pour récupérer les données d'une ligne spécifique
def get_line_data(line_number):
    """Récupère les données pour une ligne spécifique depuis MongoDB"""
    db = get_mongodb_connection()
    if not db:
        return None
    
    try:
        collection_name = f"line_{line_number}_data"
        collection = db[collection_name]
        data = list(collection.find({}))
        
        print(f"📊 {len(data)} documents récupérés pour la ligne {line_number}")
        
        for doc in data:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
        
        return data
        
    except Exception as e:
        print(f"Erreur lors de la récupération des données: {e}")
        return None
    
def expand_nested_columns(df):
    """Développe les colonnes contenant des dictionnaires"""
    expanded_dfs = []
    for col in df.columns:
        if df[col].apply(lambda x: isinstance(x, dict)).any():
            expanded = pd.json_normalize(df[col])
            expanded.columns = [f"{col}.{subcol}" for subcol in expanded.columns]
            expanded_dfs.append(expanded)
        else:
            expanded_dfs.append(df[[col]])
    return pd.concat(expanded_dfs, axis=1)

def get_data_from_mongodb(line, method='4fill'):
    """Récupère les données depuis MongoDB pour une ligne spécifique"""
    client = get_mongodb_connection()
    if not client:
        return {"error": "Impossible de se connecter à MongoDB"}
    
    try:
        db_name = '107_DEF_KPI_dashboard'
        db = client[db_name]
        collection = db['kpidatas']
        

        line_letter = line.replace('107', '')  # Transforme "107D" en "D"
        
        query = {
            'source_line': line_letter,
            'imputation_method': method  # Utilise le paramètre ici
        }
        documents = list(collection.find(query))
        
        if not documents:
            # Message d'erreur plus clair
            return {"error": f"Aucune donnée trouvée pour la ligne {line_letter} avec la méthode '{method}'"}
        
        print(f"✅ {len(documents)} documents récupérés pour la ligne {line_letter} (méthode: {method})")
        
        df = pd.DataFrame(documents)
        df = expand_nested_columns(df)
        
        if '_id' in df.columns:
            df = df.drop('_id', axis=1)
        
        print(f"📋 Dimensions initiales du DataFrame: {df.shape}")
        return df
    except Exception as e:
        return {"error": f"Erreur MongoDB: {str(e)}"}

def reconstruct_dataframe(documents):
    """
    Reconstruit un DataFrame pandas à partir des documents MongoDB
    en recréant la structure hiérarchique des colonnes
    """
    all_keys = set()
    for doc in documents:
        extract_keys(doc, all_keys, prefix=[])
    
    multiindex_columns = []
    column_mapping = {}
    
    metadata_fields = ['_id', 'source_line', 'import_date', 'original_filenames', 
                      'imputation_method', 'original_row_index', 'date_c', 'mois', 
                      'date_num', 'semaine', 'poste', 'heure']
    
    for key_path in all_keys:
        if not any(excluded in key_path for excluded in metadata_fields):
            path_parts = key_path.split('.')
            cleaned_parts = [part.strip() for part in path_parts if part.strip()]
            if cleaned_parts:
                column_tuple = tuple(cleaned_parts)
                multiindex_columns.append(column_tuple)
                column_mapping[key_path] = column_tuple
    
    df = pd.DataFrame(columns=pd.MultiIndex.from_tuples(multiindex_columns))
    
    for i, doc in enumerate(documents):
        if i % 1000 == 0:
            print(f"  > Traitement du document {i}/{len(documents)}")
        
        row_data = {}
        for key_path, column_tuple in column_mapping.items():
            value = get_nested_value(doc, key_path.split('.'))
            row_data[column_tuple] = value
        
        df = pd.concat([df, pd.DataFrame([row_data])], ignore_index=True)
    
    return df

def extract_keys(obj, keys_set, current_path):
    """Extrait récursivement toutes les clés d'un document MongoDB"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            new_path = current_path + [key]
            path_str = '.'.join(new_path)
            keys_set.add(path_str)
            extract_keys(value, keys_set, new_path)
    elif isinstance(obj, list):
        for item in obj:
            extract_keys(item, keys_set, current_path)

def get_nested_value(obj, key_path):
    """Obtient une valeur imbriquée à partir d'un chemin de clés"""
    current = obj
    for key in key_path:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return np.nan
    return current

def normalize_name(name_parts):
    if isinstance(name_parts, str):
        return re.sub(r'\s+', ' ', name_parts).strip()
    cleaned_parts = [re.sub(r'\s+', ' ', str(part).strip()) for part in name_parts]
    return '.'.join(cleaned_parts)

exclude_cols = [
    ('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Unnamed: 0_level_2'),
    ('Unnamed: 0_level_0', 'Unnamed: 0_level_1', 'Date c'),
    ('107 F', 'Unnamed: 1_level_1', 'Mois'),
    ('107 F', 'Unnamed: 2_level_1', 'Date '),
    ('107 F', 'Unnamed: 3_level_1', 'Semaine'),
    ('107 F', 'Unnamed: 3_level_1', 'semaine'),
    ('107 F', 'Unnamed: 4_level_1', 'Poste'),
    ('107 F', 'Unnamed: 5_level_1', 'Heure'),
    ('107 E', 'Unnamed: 1_level_1', 'Mois'),
    ('107 E', 'Unnamed: 2_level_1', 'Date '),
    ('107 E', 'Unnamed: 3_level_1', 'Semaine'),
    ('107 E', 'Unnamed: 3_level_1', 'semaine'),
    ('107 E', 'Unnamed: 4_level_1', 'Poste'),
    ('107 E', 'Unnamed: 5_level_1', 'Heure'),
    ('107 D', 'Unnamed: 1_level_1', 'Mois'),
    ('107 D', 'Unnamed: 2_level_1', 'Date '),
    ('107 D', 'Unnamed: 3_level_1', 'Semaine'),
    ('107 D', 'Unnamed: 3_level_1', 'semaine'),
    ('107 D', 'Unnamed: 4_level_1', 'Poste'),
    ('107 D', 'Unnamed: 5_level_1', 'Heure'),
    ('Valeurs', ' ', 'Nbr HM'),
    ('Valeurs', ' ', 'Unnamed: 91_level_2'),
    ('Valeurs', ' ', 'Unnamed: 92_level_2'),
]

qualitative_cols = [
    ('Valeurs', ' "CIV" si SE suivi CIV> =41,5 et "SP" sinon ', 'Qualité')
]

def get_data(file_path):
    try:
        print(f"\n--- Lecture du fichier : {file_path} ---")
        df = pd.read_excel(file_path, header=[0, 1, 2])
        print("  > Dimensions brutes :", df.shape)

        df = df.drop(df.index[0]).drop(df.columns[0], axis=1).drop(df.columns[-1], axis=1)
        df = df.drop(columns=exclude_cols, errors='ignore')
        df.columns = [normalize_name(col) for col in df.columns]

        qual_col_normalized = [normalize_name(c) for c in qualitative_cols]
        cols_to_convert = [col for col in df.columns if col not in qual_col_normalized]
        df[cols_to_convert] = df[cols_to_convert].apply(pd.to_numeric, errors='coerce')
        if len(df) > 4541:
            df = df.iloc[:4541]
        print("  > Dimensions après nettoyage :", df.shape)
        return df
    except Exception as e:
        return {"error": f"Erreur de lecture du fichier {file_path} : {str(e)}"}

def analyze_quantitative(series):
    series = series.dropna()
    if len(series) == 0:
        return {}

    print(f"    - Quantitative : {series.name} (n={len(series)})")

    bins = np.linspace(series.min(), series.max(), 51)
    bins = np.unique(bins)
    counts = pd.cut(series, bins=bins, include_lowest=True, right=True).value_counts().sort_index()
    cumulative_count = 0
    distribution_table = []
    for i, count in enumerate(counts):
        cumulative_count += count
        if i < len(bins)-1:
            distribution_table.append({
                "classe": f"[{bins[i]:.2f}, {bins[i+1]:.2f}]",
                "effectif": int(count),
                "cumulatif": int(cumulative_count)
            })
    frequency_polygon = []
    for i in range(len(bins)-1):
        midpoint = (bins[i] + bins[i+1]) / 2
        count_value = 0
        for j, count_item in enumerate(counts.items()):
            if j == i:
                count_value = count_item[1]
                break
        frequency_polygon.append({
            "x": float(midpoint),
            "y": float(count_value)
        })

    mode = series.mode().iloc[0] if not series.mode().empty else None
    median = series.median()
    mean = series.mean()
    std_dev = series.std()
    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1
    range_val = series.max() - series.min()
    cv = std_dev / mean if mean != 0 else None
    skewness = skew(series)
    kurtosis_val = kurtosis(series)
    x_norm = np.linspace(series.min(), series.max(), 100)
    y_norm = norm.pdf(x_norm, mean, std_dev)
    
    bin_width = (series.max() - series.min()) / 50
    y_norm = y_norm * bin_width * len(series)
    
    print(f"      Moyenne={mean:.2f}, Médiane={median:.2f}, Écart-type={std_dev:.2f}")

    return {
        "type": "quantitative",
        "distribution_table": distribution_table,
        "tendance_centrale": {
            "mode": mode,
            "moyenne": mean,
            "mediane": median
        },
        "quartiles": {
            "Q1": q1,
            "Q2": median,
            "Q3": q3
        },
        "dispersion": {
            "ecart_type": std_dev,
            "ecart_interquartile": iqr,
            "etendue": range_val
        },
        "forme": {
            "coeff_variance": cv,
            "coeff_skewness": skewness,
            "kurtosis": kurtosis_val
        },
        "chart_data": {
            "histogram": [
                {"bin": item["classe"], "count": item["effectif"]} 
                for item in distribution_table
            ],
            "boxplot": {
                "min": float(series.min()),
                "q1": float(q1),
                "median": float(median),
                "q3": float(q3),
                "max": float(series.max())
            },
            "normal_distribution": [
                {"x": float(x), "y": float(y)} for x, y in zip(x_norm, y_norm)
            ],
            "frequency_polygon": frequency_polygon,
            "summary_stats": {
                "mean": float(mean),
                "std_dev": float(std_dev),
                "sample_size": len(series)
            }
        }
    }

def analyze_qualitative(series):
    series = series.dropna()
    if len(series) == 0:
        return {}

    col = series.name
    print(f"    - Qualitative : {col} (n={len(series)})")

    distribution = series.value_counts().reset_index()
    distribution.columns = ["modalite", "effectif"]

    print(f"      Top modalités : {distribution.head(3).to_dict('records')}")

    return {
        "type": "qualitative",
        f"{col}_distribution": distribution.to_dict('records'),
        f"{col}_mode": series.mode().iloc[0] if not series.mode().empty else None,
        "chart_data": {
            "bar_chart": distribution.to_dict('records'),
            "categories": list(series.unique()),
            "sample_size": len(series)
        }
    }

def analyze_relations(df):
    relations = {}
    print("\n--- Analyse des relations ---")
    relation_counter = 1

    qual_cols = [c for c in df.columns if df[c].dtype == 'object']
    print(f"  Qualitative variables found: {len(qual_cols)}")

    if len(qual_cols) >= 2:
        max_combinations = min(3, len(qual_cols))
        for i in range(max_combinations):
            for j in range(i + 1, min(i + 4, len(qual_cols))):
                if j < len(qual_cols):
                    c1, c2 = qual_cols[i], qual_cols[j]
                    print(f"  > Analyzing qualitative relation: {c1} vs {c2}")

                    try:
                        contingency_table = pd.crosstab(df[c1], df[c2])

                        img_grouped = io.BytesIO()
                        contingency_table.plot(kind="bar", stacked=False)
                        plt.title(f"Grouped Bar Chart: {c1} vs {c2}")
                        plt.tight_layout()
                        plt.savefig(img_grouped, format='png')
                        plt.close()
                        img_grouped_base64 = base64.b64encode(img_grouped.getvalue()).decode('utf-8')

                        img_stacked = io.BytesIO()
                        contingency_table.plot(kind="bar", stacked=True)
                        plt.title(f"Stacked Bar Chart: {c1} vs {c2}")
                        plt.tight_layout()
                        plt.savefig(img_stacked, format='png')
                        plt.close()
                        img_stacked_base64 = base64.b64encode(img_stacked.getvalue()).decode('utf-8')

                        relations[f"relation_{relation_counter}_qualitatives"] = {
                            "variables": [c1, c2],
                            "tableau_contingence": contingency_table.to_dict(),
                            "graphiques": {
                                "barre_groupe": f"data:image/png;base64,{img_grouped_base64}",
                                "barre_empile": f"data:image/png;base64,{img_stacked_base64}"
                            }
                        }
                        relation_counter += 1
                        print(f"    ✓ Qualitative relation generated")

                    except Exception as e:
                        print(f"    ✗ Error with {c1} vs {c2}: {str(e)}")

    quant_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    print(f"  Quantitative variables found: {len(quant_cols)}")

    target_vars_list = [
    ('TSP', "Cuve D'attaque (bouillie)", 'Densité bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%P2O5 TOT bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%P2O5  SE bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%Acide libre bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%H2O bouillie'),
    ('TSP', "Cuve D'attaque (bouillie)", '%CaO bouillie'),
    ('TSP', 'Sortie granulateur', '%P2O5  SE+SC gran'),
    ('TSP', 'Sortie granulateur', '%P2O5 SE granu'),
    ('TSP', 'Sortie granulateur', '%Acide libre granul'),
    ('TSP', 'Sortie granulateur', '%P2O5 total granu'),
    ('TSP', 'Sortie granulateur', '%H2O tq granu'),
    ('PRODUIT FINI TSP', 'Détermination ', '%P2O5  TOT PF'),
    ('PRODUIT FINI TSP', 'Détermination ', '%P2O5  SE+SC PF'),
    ('PRODUIT FINI TSP', 'Détermination ', '%H2O Tq PF'),
    ('PRODUIT FINI TSP', 'Détermination ', '% AL  à l\'eau PF'),
    ('PRODUIT FINI TSP', 'Détermination ', '% AL à l\'acetone PF'),
    ('PRODUIT FINI TSP', 'Détermination ', '%P2O5 SE PF '),
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

    target_vars_normalized = [normalize_name(t) for t in target_vars_list]

    if len(quant_cols) >= 2:
        for target_col in target_vars_normalized:
            if target_col not in quant_cols:
                continue

            for other_col in quant_cols:
                if target_col == other_col:
                    continue
                if other_col in target_vars_normalized:
                    continue

                print(f"  > Analyzing quantitative relation: {target_col} vs {other_col}")

                try:
                    sub_df = df[[target_col, other_col]].dropna()

                    if not sub_df.empty and len(sub_df) > 10:
                        cov = sub_df[target_col].cov(sub_df[other_col])
                        corr, _ = pearsonr(sub_df[target_col], sub_df[other_col])

                        slope, intercept = np.polyfit(sub_df[target_col], sub_df[other_col], 1)
                        img_scatter = io.BytesIO()
                        plt.figure(figsize=(6,4))
                        sns.regplot(x=target_col, y=other_col, data=sub_df)
                        plt.title(f"Linear Regression: {target_col} vs {other_col}")
                        plt.tight_layout()
                        plt.savefig(img_scatter, format='png')
                        plt.close()
                        img_scatter_base64 = base64.b64encode(img_scatter.getvalue()).decode('utf-8')

                        relations[f"relation_{relation_counter}_quantitatives"] = {
                            "variables": [target_col, other_col],
                            "covariance": float(cov),
                            "correlation": float(corr),
                            "regression_lineaire": {
                                "pente": float(slope),
                                "ordonnee_origine": float(intercept)
                            },
                            "chart_data": {
                                "scatter_data": [
                                    {"x": float(row[target_col]), "y": float(row[other_col])}
                                    for _, row in sub_df.iterrows()
                                ],
                                "regression_line": {
                                    "slope": float(slope),
                                    "intercept": float(intercept),
                                    "r_squared": float(corr ** 2)
                                },
                                "sample_size": len(sub_df)
                            }
                        }
                        relation_counter += 1
                        print(f"    ✓ Quantitative relation generated: corr={corr:.3f}")
                    else:
                        print(f"    ✗ Insufficient data for {target_col} vs {other_col}")

                except Exception as e:
                    print(f"    ✗ Error with {target_col} vs {other_col}: {str(e)}")

    print(f"  Analyzing quantitative/qualitative relations")
    quant_col_name = 'Valeurs.%P2O5 SE PF si on a une valeur et la valeur précédant si %P2O5 SE PF =0.SE suivi CIV %'
    qual_col_name = 'Valeurs."CIV" si SE suivi CIV> =41,5 et "SP" sinon.Qualité'
    p2o5_pf_col = 'PRODUIT FINI TSP.Détermination.%P2O5 SE PF' 

    if quant_col_name in df.columns and qual_col_name in df.columns:
        print(f"  > Analyzing specific quant/qual relation: {quant_col_name} vs {qual_col_name}")
        
        try:
            df_filtered = df[df[p2o5_pf_col].notna()]
            sub_df = df_filtered[[quant_col_name, qual_col_name]].dropna()
            agg_mean_std = sub_df.groupby(qual_col_name)[quant_col_name].agg(['mean', 'std']).reset_index()
            agg_median_quartiles = sub_df.groupby(qual_col_name)[quant_col_name].agg(['median', lambda x: x.quantile(0.25), lambda x: x.quantile(0.75)]).reset_index()
            agg_median_quartiles.columns = [qual_col_name, 'median', 'Q1', 'Q3']
            img_box = io.BytesIO()
            plt.figure(figsize=(6,4))
            sns.boxplot(x=qual_col_name, y=quant_col_name, data=sub_df)
            plt.title(f"Box Plot: {quant_col_name} by {qual_col_name}")
            plt.tight_layout()
            plt.savefig(img_box, format='png')
            plt.close()
            img_box_base64 = base64.b64encode(img_box.getvalue()).decode('utf-8')

            relations[f"relation_{relation_counter}_quant_qual"] = {
                "variables": [quant_col_name, qual_col_name],
                "tableau_moy_ecart_type": agg_mean_std.to_dict('records'),
                "tableau_mediane_quartiles": agg_median_quartiles.to_dict('records'),
                "chart_data": {
                    "boxplot_data": [],
                    "summary_by_category": {}
                }
            }
            for _, row in agg_median_quartiles.iterrows():
                category = row[qual_col_name]
                relations[f"relation_{relation_counter}_quant_qual"]["chart_data"]["boxplot_data"].append({
                    "category": category,
                    "min": float(sub_df[sub_df[qual_col_name] == category][quant_col_name].min()),
                    "q1": float(row['Q1']),
                    "median": float(row['median']),
                    "q3": float(row['Q3']),
                    "max": float(sub_df[sub_df[qual_col_name] == category][quant_col_name].max())
                })
            for _, row in agg_mean_std.iterrows():
                category = row[qual_col_name]
                relations[f"relation_{relation_counter}_quant_qual"]["chart_data"]["summary_by_category"][category] = {
                    "mean": float(row['mean']),
                    "std_dev": float(row['std'])
                }
            relation_counter += 1
            print(f"    ✓ Quantitative/qualitative relation generated")

        except Exception as e:
            print(f"    ✗ Error with {quant_col_name} vs {qual_col_name}: {str(e)}")
    else:
        print(f"    ✗ Requested columns not found: {quant_col_name} or {qual_col_name}")
            
    print(f"  Total relations generated: {len(relations)}")
    return relations



def convert_numpy_types(obj):
    """
    Recursively converts numpy types and problematic float values 
    (NaN, Infinity) to JSON-serializable formats.
    """
    if isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None  # Replace NaN/Infinity with null
        return float(obj)
    if isinstance(obj, np.ndarray):
        return [convert_numpy_types(item) for item in obj.tolist()]
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    if pd.isna(obj):
        return None
    return obj

def analyze_column(series, col_name):
    try:
        numeric_series = pd.to_numeric(series, errors='raise')
        return analyze_quantitative(numeric_series)
    except (ValueError, TypeError):
        return analyze_qualitative(series)

def analyze_file_from_mongodb(line):
    """Analyse les données depuis MongoDB pour une ligne spécifique et sauvegarde dans Azure Cosmos DB"""
    print(f"\n{'='*60}")
    print(f"📊 DÉBUT DE L'ANALYSE POUR LA LIGNE {line}")
    print(f"{'='*60}")
    
    df = get_data_from_mongodb(line)
    
    if isinstance(df, dict) and "error" in df:
        print(f"❌ Erreur: {df['error']}")
        return df
    
    if df.empty:
        return {"error": "DataFrame vide après récupération depuis MongoDB"}

    columns_to_exclude = [
        'source_line', 'heure', 'semaine', 'date_c', 'mois', 'date_num',
        'imputation_method', 'poste', '107 D.Mois', '107 D.Date', 
        '107 D.Semaine', '107 D.Poste', '107 D.Heure', '__v', 'createdAt',
        'import_date', 'original_filenames.file1', 'original_filenames.file2',
        'original_row_index', 'updatedAt'
    ]
    
    df_filtered = df.drop(columns=columns_to_exclude, errors='ignore')
    
    print(f"✅ {len(columns_to_exclude)} colonnes spécifiées pour exclusion.")
    print(f"📋 Dimensions du DataFrame après exclusion : {df_filtered.shape}")

    results = {
        "Ligne": line, 
        "Variables": {}, 
        "Relations": {}
    }
    
    print(f"\n--- Analyse des variables restantes ({len(df_filtered.columns)} colonnes) ---")
    
    for i, col in enumerate(df_filtered.columns):
        print(f"  [{i+1}/{len(df_filtered.columns)}] Analyse de: {col}")
        results["Variables"][col] = analyze_column(df_filtered[col], col)
    
    results["Relations"] = analyze_relations(df_filtered)
    
    results = convert_numpy_types(results)
    
    # Sauvegarder directement dans Azure Cosmos DB
    success = save_statistics_to_mongodb(line, results)
    
    if success:
        print(f"✅✅✅ RÉSULTATS SAUVEGARDÉS DANS AZURE COSMOS DB ✅✅✅")
        return {"success": True, "saved_to": "azure_cosmos_db"}
    else:
        print(f"❌❌❌ ÉCHEC DE LA SAUVEGARDE DANS AZURE COSMOS DB ❌❌❌")
        return {"error": "Échec de la sauvegarde dans Azure Cosmos DB"}
    

# Fonction principale pour analyser les 3 lignes
def analyze_all_lines():
    """Analyse les 3 lignes (107D, 107E, 107F) et sauvegarde dans Azure Cosmos DB"""
    lines = ['107D', '107E', '107F']
    results = {}
    
    for line in lines:
        print(f"\n{'='*80}")
        print(f"LANCEMENT DE L'ANALYSE POUR LA LIGNE: {line}")
        print(f"{'='*80}")
        
        result = analyze_file_from_mongodb(line)  # Plus de paramètre output_folder
        results[line] = result
        
        print(f"\n⏳ Attente de 2 secondes avant la prochaine ligne...")
        import time
        time.sleep(2)
    
    print(f"\n🎉 ANALYSE TERMINÉE POUR TOUTES LES LIGNES!")
    print(f"📁 Données sauvegardées dans Azure Cosmos DB")
    for line, result in results.items():
        if result.get('success'):
            print(f"   • {line}: ✅ Succès")
        else:
            print(f"   • {line}: ❌ ERREUR - {result.get('error', 'Unknown error')}")
    
    return results



if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        line_to_analyze = sys.argv[1]
        print(f"Argument détecté. Lancement de l'analyse pour la ligne unique : {line_to_analyze}")
        analyze_file_from_mongodb(line_to_analyze)  # Sans paramètre output_folder
    else:
        print("ℹ️ Aucun argument détecté. Lancement de l'analyse pour toutes les lignes (D, E, F).")
        analyze_all_lines()