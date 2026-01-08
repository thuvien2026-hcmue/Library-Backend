// routes/mediaRoutes.js
import express from "express";
import multer from "multer";
import {
  uploadMedia,
  getMediaByPost,
  deleteMedia,
  getMediaGroupedByPost,
  updateMediaImage,
} from "../controllers_supa/mediaController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// ✅ CMS / Blocks / Gallery / Hero
router.post("/upload", verifyToken, upload.single("file"), uploadMedia);

// ✅ Replace image
router.put("/:id", verifyToken, upload.single("file"), updateMediaImage);

router.get("/group-by-post", getMediaGroupedByPost);
router.get("/post/:postId", getMediaByPost);
router.delete("/:id", verifyToken, deleteMedia);

export default router;
