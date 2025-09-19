import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score

def train_gradient_boosting(X_train, y_train, X_test, y_test):
    """
    Entraîne un modèle GradientBoostingRegressor.
    Ce modèle n'utilise pas de standardisation.
    """
    # 1. Initialiser le modèle avec les hyperparamètres
    model = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, random_state=42)

    # 2. Entraîner le modèle directement sur les données non standardisées
    model.fit(X_train, y_train)

    # 3. Faire des prédictions
    y_pred = model.predict(X_test)

    # 4. Calculer les métriques de performance
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