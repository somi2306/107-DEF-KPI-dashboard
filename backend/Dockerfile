FROM node:20

# Installer Python
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Créer un virtual environment Python
RUN python3 -m venv /opt/venv

# Installer les dépendances dans le virtual environment
RUN /opt/venv/bin/pip install numpy pandas scikit-learn joblib pymongo python-dotenv matplotlib seaborn scipy openpyxl
# Créer l'alias python vers python3
RUN ln -s /usr/bin/python3 /usr/bin/python

# Ajouter le virtual environment au PATH
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Copier package.json d'abord
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le code source depuis le dossier src
#COPY . .

COPY src/ .

EXPOSE 5000
CMD ["node", "index.js"]