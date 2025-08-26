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
import numpy as np


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


# Chargement et nettoyage

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
        print("\n les info de df", df.info())
        return df
    except Exception as e:
        return {"error": f"Erreur de lecture du fichier {file_path} : {str(e)}"}



# Analyse des variables quantitatives


def analyze_quantitative(series):
    series = series.dropna()
    if len(series) == 0:
        return {}

    print(f"    - Quantitative : {series.name} (n={len(series)})")

    # Distribution en classes
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
        # Trouver le count correspondant à cette classe
        count_value = 0
        for j, count_item in enumerate(counts.items()):
            if j == i:
                count_value = count_item[1]
                break
        frequency_polygon.append({
            "x": float(midpoint),
            "y": float(count_value)
        })

    # Statistiques
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
    # Calcul de la loi normale pour le graphique
    x_norm = np.linspace(series.min(), series.max(), 100)
    y_norm = norm.pdf(x_norm, mean, std_dev)
    
    # Ajuster l'échelle pour qu'elle corresponde à l'histogramme
    # On multiplie par la largeur de bin et le nombre d'observations
    bin_width = (series.max() - series.min()) / 50  # 50 classes dans l'histogramme
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


# Analyse des variables qualitatives

def analyze_qualitative(series):
    import io, base64
    import matplotlib.pyplot as plt
    import seaborn as sns

    series = series.dropna()
    if len(series) == 0:
        return {}

    col = series.name
    print(f"    - Qualitative : {col} (n={len(series)})")

    # Table de distribution
    distribution = series.value_counts().reset_index()
    distribution.columns = ["modalite", "effectif"]

    # Print top 3 modalités
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




# Étude des relations

def analyze_relations(df):
    relations = {}
    print("\n--- Analyse des relations ---")
    relation_counter = 1

    # --- Two qualitative variables ---
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

                        # Graphs
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

    # --- Two quantitative variables ---
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

                        # Linear regression + graph
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

# Fonction principale

def analyze_file(file_path, output_folder="stats"):
    df = get_data(file_path)
    if isinstance(df, dict) and "error" in df:
        return df

    results = {"Fichier": file_path, "Variables": {}, "Relations": {}}
    print("\n--- Analyse des variables ---")

    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            results["Variables"][col] = analyze_quantitative(df[col])
        else:
            results["Variables"][col] = analyze_qualitative(df[col])

    results["Relations"] = analyze_relations(df)
    os.makedirs(output_folder, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(file_path))[0]
    output_file_name = f"{base_name}_stats.json"
    output_path = os.path.join(output_folder, output_file_name)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=4)

    print(f"\n>>> Résultats sauvegardés dans {output_path}\n")
    return {"message": f"Analyse sauvegardée dans {output_path}"}


# Lancer sur tes 3 fichiers avec les chemins locaux

if __name__ == "__main__":
    files = [
    r"C:\Users\user\stage pfa\backend\src\data\ligne D\Fusion_107D_KPIs nettoyé_4fill.xlsx",
    r"C:\Users\user\stage pfa\backend\src\data\ligne E\Fusion_107E_KPIs nettoyé_4fill.xlsx",
    r"C:\Users\user\stage pfa\backend\src\data\ligne F\Fusion_107F_KPIs nettoyé_4fill.xlsx"
    ]

    output_folder = "stats"

    for f in files:
        print(analyze_file(f, output_folder))