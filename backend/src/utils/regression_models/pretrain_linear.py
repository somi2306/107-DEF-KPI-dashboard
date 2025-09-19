import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

def train_linear_regression(X_train, y_train, X_test, y_test):
    """
    Entraîne un modèle de régression linéaire avec standardisation des données.
    """
    #  Initialiser les scalers
    scaler_X = StandardScaler()
    scaler_y = StandardScaler()

    #  Adapter les scalers sur les données d'entraînement et les transformer
    X_train_scaled = scaler_X.fit_transform(X_train)
    # y_train doit être un tableau 2D pour le scaler, d'où .values.reshape(-1, 1)
    y_train_scaled = scaler_y.fit_transform(y_train.values.reshape(-1, 1))

    #  Transformer les données de test avec les scalers déjà adaptés
    X_test_scaled = scaler_X.transform(X_test)
    y_test_scaled = scaler_y.transform(y_test.values.reshape(-1, 1))

    #  Entraîner le modèle sur les données standardisées
    model = LinearRegression()
    model.fit(X_train_scaled, y_train_scaled)

    #  Faire des prédictions (elles seront aussi standardisées)
    y_pred_scaled = model.predict(X_test_scaled)

    #  Dénormaliser les prédictions et les vraies valeurs pour calculer les métriques
    y_test_real = scaler_y.inverse_transform(y_test_scaled)
    y_pred_real = scaler_y.inverse_transform(y_pred_scaled)

    #  Calculer les métriques de performance
    mse = mean_squared_error(y_test_real, y_pred_real)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test_real, y_pred_real)
    
    metrics = {
        'r2_score': r2,
        'mse': mse,
        'rmse': rmse
    }
    
    # On retourne le modèle, les métriques ET les scalers pour les sauvegarder
    scalers = {'X': scaler_X, 'y': scaler_y}
    
    return model, metrics, scalers