import express from "express";
// Importez la nouvelle fonction
import { checkAdminStatusByClerkId } from "../controllers/adminController.js"; 
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

// La route POST /check appelle maintenant la fonction qui vérifie par clerkId
router.post("/check", checkAdminStatusByClerkId); 

// ... (vos autres routes admin si vous en avez)

export default router;