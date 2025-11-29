# 📊 KPI Dashboard (107-DEF)

Ce projet est une application complète de tableau de bord (Dashboard) permettant la visualisation de données, le suivi de KPI et l'analyse prédictive. Il combine une interface utilisateur moderne et réactive avec un backend puissant intégrant des capacités de traitement de données via Python.

---

## 🏗 Architecture & Technologies

Le projet est divisé en deux parties principales :

### 🎨 Frontend
* **Framework** : React 19 + TypeScript (via [Vite](https://vitejs.dev/))
* **Styling** : TailwindCSS v4
* **Visualisation** : Plotly.js, Recharts, Nivo
* **State Management** : Zustand, TanStack Query
* **Authentification** : Clerk
* **UI Components** : Radix UI, Lucide React, Framer Motion

### ⚙️ Backend
* **Serveur** : Node.js avec Express
* **Base de données** : MongoDB (via Mongoose)
* **Data Science & ML** : Python (intégré via `child_process`)
    * _Bibliothèques_ : Pandas, NumPy, Scikit-learn, Matplotlib, Seaborn
* **Temps réel** : Socket.io
* **Upload & Parsing** : Multer, CSV-parser

---

## 🚀 Installation et Configuration

### 1. Prérequis
* **Node.js** (v18+ recommandé)
* **Python** (v3.8+ avec pip)
* **MongoDB** (Instance locale ou URI Atlas)
* **Docker & Docker Compose** (Optionnel, pour un déploiement rapide)

### 2. Variables d'environnement

> [!IMPORTANT]
> Vous devez configurer les variables d'environnement avant de lancer l'application.

Créez les fichiers `.env` dans les dossiers respectifs en suivant les modèles `.env.example` :

**Backend (`backend/.env`)**
```env
PORT=5000
MONGODB_URI=votre_uri_mongodb
CLERK_PUBLISHABLE_KEY=votre_clerk_publishable_key
CLERK_SECRET_KEY=votre_clerk_secret_key
```
**Frontend (`frontend/.env`)**
```env
VITE_CLERK_PUBLISHABLE_KEY=votre_clerk_publishable_key
```

---

## 🛠️ Démarrage Rapide (Méthode Recommandée)

> [!TIP]
> Si Docker est installé sur votre machine, c'est la méthode la plus simple pour lancer l'application complète sans gérer les dépendances locales.

Lancez l'application avec une seule commande :

```bash
docker-compose up --build
```
Une fois lancé, accédez à :

* Frontend : http://localhost:5173

* Backend : http://localhost:5000

---

## 💻 Démarrage Manuel (Développement)

Si vous souhaitez lancer les services séparément sans Docker, suivez ces étapes :

### 1. Installation des dépendances

* **Backend (Node & Python) :**
```bash
cd backend
npm install

# Installation des dépendances Python pour l'analyse de données
pip install -r requirements.txt
```

* **Frontend :**
```bash
cd frontend
npm install
```

### 2. Lancer l'application

Ouvrez deux terminaux séparés :

* **Terminal 1 : Backend :**
```bash
# Dans le dossier backend
npm run dev
# Pour la production : npm start
```

* **Terminal 2 : Frontend :**
```bash
# Dans le dossier frontend
npm run dev
```

---

## 📦 Scripts Disponibles

Voici les commandes principales définies dans les fichiers `package.json` :

| Contexte | Commande | Description |
| :--- | :--- | :--- |
| **Racine** | `npm run build` | Installe toutes les dépendances (Python/Node) et compile le frontend. |
| **Racine** | `npm start` | Démarre le serveur backend (sert souvent les fichiers statiques en prod). |
| **Backend** | `npm run dev` | Lance le serveur avec nodemon (redémarrage auto). |
| **Backend** | `npm start` | Lance le serveur avec node classique. |
| **Frontend** | `npm run dev` | Lance le serveur de développement Vite. |
| **Frontend** | `npm run build` | Compile le projet TS et génère les fichiers de production. |
| **Frontend** | `npm run lint` | Vérifie la qualité du code avec ESLint. |

---

## 📝 Fonctionnalités Clés

* **🔐 Authentification Sécurisée** : Gestion complète des utilisateurs via Clerk.
* **📂 Import de Données** : Support natif des fichiers CSV et Excel pour l'analyse.
* **📈 Tableaux de Bord Interactifs** : Graphiques dynamiques rendus avec Plotly et Recharts.
* **🤖 Analyse Statistique & ML** : Scripts Python exécutés côté serveur pour régressions, calculs statistiques et visualisations avancées.
* **⚡ Temps Réel** : Mises à jour instantanées des données via Socket.io.
