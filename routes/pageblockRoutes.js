import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { create, getByPage, remove, update } from "../controllers/pageblockController.js";

const router = express.Router();

router.get("/page/:pageId", getByPage);
router.post("/", verifyToken, create);
router.put("/:id", verifyToken, update);
router.delete("/:id", verifyToken, remove);

export default router;
