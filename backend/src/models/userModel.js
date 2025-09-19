import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		fullName: {
			type: String,
			required: true,
		},
		imageUrl: {
			type: String,
			required: true,
		},
		clerkId: {
			type: String,
			required: true,
			unique: true,
		},// alors chaque user a un clerkId unique, c'est l'id de l'utilisateur dans Clerk 
		role: {
        type: String,
        enum: ['admin', 'user'], // Définit les rôles possibles
        default: 'user'         // Par défaut, tout nouvel utilisateur est un 'user'
    }
	},
	{ timestamps: true } // timestamps ajoute createdAt et updatedAt automatiquement
);

export const User = mongoose.model("User", userSchema);
