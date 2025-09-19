import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

def train_random_forest(X_train, y_train, X_test, y_test):
    """
    Entraîne un modèle RandomForestRegressor.
    Ce modèle n'utilise pas de standardisation.
    """
    #  Initialiser le modèle avec les hyperparamètres
    model = RandomForestRegressor(
    n_estimators=80,       # Un peu moins d'arbres
    max_depth=6,           # Arbres nettement moins profonds
    min_samples_leaf=40,   # Feuilles plus "difficiles" à créer
    random_state=42,
    n_jobs=-1# n_jobs=-1 pour utiliser tous les coeurs CPU
) 

    #  Entraîner le modèle directement sur les données non standardisées
    model.fit(X_train, y_train)

    #  Faire des prédictions
    y_pred = model.predict(X_test)

    #  Calculer les métriques de performance
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    metrics = {
        'r2_score': r2,
        'mse': mse,
        'rmse': rmse
    }
    
    # 5. Renvoyer None pour les scalers pour maintenir la compatibilité
    return model, metrics, None