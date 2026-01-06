import express from "express";
import { getMe, signin, signup } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/me", verifyToken, getMe);

export default router;
