import { User } from "../models/userModel.js";


/**
 * Vérifie si un utilisateur est admin en se basant sur son clerkId.
 * Reçoit : { clerkId: "user_..." } dans le corps de la requête.
 * Renvoie : { admin: true } ou { admin: false }.
 */
export const checkAdminStatusByClerkId = async (req, res) => {
    try {
        // On récupère le clerkId depuis le corps de la requête
        const { clerkId } = req.body;

        if (!clerkId) {
            return res.status(400).json({ message: "L'ID de l'utilisateur (clerkId) est requis." });
        }

        // On cherche l'utilisateur dans la base de données par son clerkId
        const user = await User.findOne({ clerkId: clerkId });

        if (!user) {
            return res.status(200).json({ admin: false, message: "Utilisateur non trouvé." });
        }

        // On vérifie le rôle de l'utilisateur et on renvoie la réponse
        const isAdmin = user.role === 'admin';
        res.status(200).json({ admin: isAdmin });

    } catch (error) {
        console.error("Erreur dans checkAdminStatusByClerkId:", error);
        res.status(500).json({ message: "Erreur interne du serveur." });
    }
};