
import mongoose from "mongoose";

// On utilise async car la connexion à MongoDB est une opération asynchrone - elle prend un certain temps et se fait en arrière-plan.
// Pas nécessaire d'utiliser dotenv ici car il est déjà utilisé dans index.js
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to Azure MongoDB ${conn.connection.host}`); // conn.connection.host te donne le nom de l'hôte Mongo (ex: localhost ou cluster)
  } catch (error) {
    console.log(`Failed to connect to Azure MongoDB`, error);
    process.exit(1); // arrête le programme si la connexion échoue, le @ est pour le succès
  }
};