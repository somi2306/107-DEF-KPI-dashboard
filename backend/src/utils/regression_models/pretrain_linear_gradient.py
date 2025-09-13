import numpy as np
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

# --- Classe Wrapper pour rendre le modèle compatible ---
class ManualLinearGradientModel:
    def __init__(self, theta, b):
        self.theta = theta
        self.b = b

    def predict(self, X):
        """Prédit les valeurs pour un X donné."""
        return np.dot(X, self.theta) + self.b

# --- Fonctions de Régression de votre notebook ---
def initialization(X):
    theta = np.random.randn(X.shape[1], 1) * 0.01
    b = np.random.randn(1) * 0.01
    return theta, b

def cout(y, y_pred):
    m = y.shape[0]
    return (1 / (2 * m)) * np.sum((y_pred - y) ** 2)

def gradients(X, y, y_pred):
    m = X.shape[0]
    gtheta = (1 / m) * np.dot(X.T, (y_pred - y))
    gb = (1 / m) * np.sum(y_pred - y)
    return gtheta, gb

def regression_lineaire(X, y, alpha, n_iterations):
    theta, b = initialization(X)
    for _ in range(n_iterations):
        y_pred = np.dot(X, theta) + b
        gtheta, gb = gradients(X, y, y_pred)
        theta -= alpha * gtheta
        b -= alpha * gb
    return theta, b

# --- Fonction d'entraînement principale ---
def train_linear_gradient(X_train, y_train, X_test, y_test):
    """
    Entraîne un modèle de régression linéaire avec descente de gradient.
    """
    # 1. Standardisation des données
    scaler_X = StandardScaler()
    scaler_y = StandardScaler()
    X_train_scaled = scaler_X.fit_transform(X_train)
    y_train_scaled = scaler_y.fit_transform(y_train.values.reshape(-1, 1))
    X_test_scaled = scaler_X.transform(X_test)
    y_test_scaled = scaler_y.transform(y_test.values.reshape(-1, 1))

    # 2. Entraînement avec la descente de gradient
    # Note: 10000 itérations peuvent être plus rapides pour les tests
    theta, b = regression_lineaire(X_train_scaled, y_train_scaled, alpha=0.05, n_iterations=10000)
    
    # 3. Création de l'objet modèle
    model = ManualLinearGradientModel(theta, b)

    # 4. Prédiction et dénormalisation
    y_pred_scaled = model.predict(X_test_scaled)
    y_test_real = scaler_y.inverse_transform(y_test_scaled)
    y_pred_real = scaler_y.inverse_transform(y_pred_scaled)

    # 5. Calcul des métriques
    metrics = {
        'r2_score': r2_score(y_test_real, y_pred_real),
        'mse': mean_squared_error(y_test_real, y_pred_real),
        'rmse': np.sqrt(mean_squared_error(y_test_real, y_pred_real))
    }
    
    scalers = {'X': scaler_X, 'y': scaler_y}
    return model, metrics, scalers