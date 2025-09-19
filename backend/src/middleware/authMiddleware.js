import { clerkClient } from "@clerk/express";

export const protectRoute = async (req, res, next) => {

    /*
    req : la requête HTTP
    res : la réponse HTTP
    next : une fonction à appeler pour passer au middleware suivant (ou à la route suivante) dans la chaîne de traitement.
    */
	if (!req.auth.userId) {
		return res.status(401).json({ message: "Unauthorized - you must be logged in" });
	}
	next();
};

export const requireAdmin = async (req, res, next) => {
	try {
		// req.auth.userId vient du middleware de Clerk qui s'exécute avant
		if (!req.auth.userId) {
			return res.status(401).json({ message: "Non autorisé" });
		}

		// Chercher l'utilisateur dans la base de données MongoDB
		const user = await User.findOne({ clerkId: req.auth.userId });

		if (!user) {
			return res.status(404).json({ message: "Utilisateur non trouvé dans la base de données" });
		}

		// Vérifier si le rôle de l'utilisateur est 'admin'
		if (user.role !== 'admin') {
			return res.status(403).json({ message: "Accès refusé. Requiert le rôle d'administrateur." });
		}

		// Si l'utilisateur est un admin, on continue
		next();
	} catch (error) {
		console.error("Erreur dans le middleware requireAdmin:", error);
		next(error);
	}
};