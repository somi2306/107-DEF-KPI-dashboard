import axios from "axios";

// Centralise la configuration de l'API pour dev/prod
export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
    withCredentials: true // Envoie les cookies/headers d'authentification
});