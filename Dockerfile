# --- STAGE 1: Construire le Frontend ---
# Utilise une image Node pour l'environnement de build
FROM node:20 AS frontend-builder

# Définit le répertoire de travail pour le frontend
WORKDIR /app/frontend

# Copie les fichiers de dépendances et les installe
COPY frontend/package*.json ./
RUN npm install

# Copie le reste des sources du frontend
COPY frontend/ ./

# Exécute le build pour générer les fichiers statiques dans /app/frontend/dist
RUN npm run build


# --- STAGE 2: Construire l'Image Finale du Backend ---
# Utilise la même image de base que le backend original
FROM node:20

# Installe Python et les dépendances système
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Crée et active un environnement virtuel pour Python
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Installe les dépendances Python
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Définit le répertoire de travail pour le code du backend
WORKDIR /app

# Copie les dépendances du backend et les installe
COPY backend/package*.json ./
RUN npm install --production

# Copie le code source du backend
COPY backend/src ./src

# Copie les fichiers statiques du frontend construits à partir de l'étape précédente
COPY --from=frontend-builder /app/frontend/dist /frontend/dist

# Expose le port sur lequel le serveur écoute
EXPOSE 5000

# Commande pour démarrer le serveur
CMD [ "node", "src/index.js" ]