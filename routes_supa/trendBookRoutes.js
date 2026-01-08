import express from "express";
import multer from "multer";
import fs from "fs";
import {
  listTrendBooks,
  getTrendBookById,
  getTrendBookBySlug,
  createTrendBook,
  updateTrendBook,
  deleteTrendBook,
  uploadTrendBookImage,
} from "../controllers_supa/trendBookController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ✅ LIST
router.get("/", listTrendBooks);

router.get("/slug/:slug", getTrendBookBySlug);
router.get("/:id", getTrendBookById);

// ✅ CREATE
router.post("/create", verifyToken, createTrendBook);

// ✅ UPDATE
router.post("/update", verifyToken, updateTrendBook);

// ✅ DELETE (optional)
router.delete("/:id", verifyToken, deleteTrendBook);

// ✅ UPLOAD cover image
const uploadDir = "uploads/trend_books";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/upload-image",
  verifyToken,
  upload.single("file"), 
  uploadTrendBookImage
);


export default router;
