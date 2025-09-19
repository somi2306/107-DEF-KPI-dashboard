import numpy as np
from sklearn.linear_model import Lasso, Ridge
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

def train_lasso(X_train, y_train, X_test, y_test):
    """
    Entraîne un modèle de régression Lasso avec standardisation des données.
    """
    #  Initialiser et adapter les scalers
    scaler_X = StandardScaler()
    scaler_y = StandardScaler()
    X_train_scaled = scaler_X.fit_transform(X_train)
    y_train_scaled = scaler_y.fit_transform(y_train.values.reshape(-1, 1))
    X_test_scaled = scaler_X.transform(X_test)
    y_test_scaled = scaler_y.transform(y_test.values.reshape(-1, 1))

    #  Initialiser et entraîner le modèle Lasso
    model = Lasso(alpha=0.1, random_state=42)
    model.fit(X_train_scaled, y_train_scaled)

    #  Faire des prédictions et les dénormaliser
    # On reshape la prédiction en tableau 2D (colonne)
    y_pred_scaled = model.predict(X_test_scaled).reshape(-1, 1)
    
    y_test_real = scaler_y.inverse_transform(y_test_scaled)
    y_pred_real = scaler_y.inverse_transform(y_pred_scaled)

    #  Calculer les métriques
    metrics = {
        'r2_score': r2_score(y_test_real, y_pred_real),
        'mse': mean_squared_error(y_test_real, y_pred_real),
        'rmse': np.sqrt(mean_squared_error(y_test_real, y_pred_real))
    }
    
    scalers = {'X': scaler_X, 'y': scaler_y}
    return model, metrics, scalers

def train_ridge(X_train, y_train, X_test, y_test):
    """
    Entraîne un modèle de régression Ridge avec standardisation des données.
    """
    #  Initialiser et adapter les scalers
    scaler_X = StandardScaler()
    scaler_y = StandardScaler()
    X_train_scaled = scaler_X.fit_transform(X_train)
    y_train_scaled = scaler_y.fit_transform(y_train.values.reshape(-1, 1))
    X_test_scaled = scaler_X.transform(X_test)
    y_test_scaled = scaler_y.transform(y_test.values.reshape(-1, 1))

    #  Initialiser et entraîner le modèle Ridge
    model = Ridge(alpha=0.1, random_state=42)
    model.fit(X_train_scaled, y_train_scaled)

    #  Faire des prédictions et les dénormaliser

    # On reshape la prédiction en tableau 2D (colonne)
    y_pred_scaled = model.predict(X_test_scaled).reshape(-1, 1)

    y_test_real = scaler_y.inverse_transform(y_test_scaled)
    y_pred_real = scaler_y.inverse_transform(y_pred_scaled)

    #  Calculer les métriques
    metrics = {
        'r2_score': r2_score(y_test_real, y_pred_real),
        'mse': mean_squared_error(y_test_real, y_pred_real),
        'rmse': np.sqrt(mean_squared_error(y_test_real, y_pred_real))
    }
    
    scalers = {'X': scaler_X, 'y': scaler_y}
    return model, metrics, scalers