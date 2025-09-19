import express from "express";
import { checkAdminStatusByClerkId } from "../controllers/adminController.js"; 
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/check", checkAdminStatusByClerkId); 

export default router;