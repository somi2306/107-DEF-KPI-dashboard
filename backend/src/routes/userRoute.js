import { Router } from "express";
import { protectRoute } from "../middleware/authMiddleware.js";
import {
    getAllUsers,
    
    updateUserProfile,
    addEmailAddress,
    attemptEmailAddressVerification,
    updatePassword,
    getAllUserSessions,
    revokeUserSession,
} from "../controllers/userController.js";

const router = Router();

router.get("/", protectRoute, getAllUsers);
router.put("/profile", protectRoute, updateUserProfile);
router.post("/email", protectRoute, addEmailAddress);
router.post("/email/verify", protectRoute, attemptEmailAddressVerification);
router.put("/password", protectRoute, updatePassword);
router.get("/sessions", protectRoute, getAllUserSessions);
router.delete("/sessions/:sessionId", protectRoute, revokeUserSession);

export default router;