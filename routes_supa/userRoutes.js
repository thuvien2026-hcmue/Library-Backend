import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
} from "../controllers_supa/userController.js";

import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getUsers);
router.get("/:id", verifyToken, getUserById);
router.post("/", verifyToken, createUser);
router.put("/:id", verifyToken, updateUser);

export default router;
