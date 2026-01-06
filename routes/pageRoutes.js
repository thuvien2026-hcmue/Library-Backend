// routes/pageRoutes.js
import express from "express";
import {
  getPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
} from "../controllers/pageController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getPages);
router.get("/:id", getPageById);
router.post("/add", verifyToken, createPage);
router.put("/update", verifyToken, updatePage);
router.delete("/:id", verifyToken, deletePage);

export default router;
