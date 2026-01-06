import express from "express";
import {
  getPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  getPostsByPageId,
  getPostsByPageSlug,
  getPostChildren,
  createChildPost,
  updateChildPost,
  getChildPostByParentAndChildSlug,
} from "../controllers/postController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ================= FRONTEND ROUTES (CỤ THỂ TRƯỚC) ================= */

// ✅ CHILD POST: /parentSlug/childSlug
router.get("/slug/:slug", getPostBySlug);
router.get("/by-page/:page_id", getPostsByPageId);
router.get("/list/:pageSlug", getPostsByPageSlug);
router.get("/children/:parentId", getPostChildren);
router.get(
  "/:parentSlug/:childSlug",
  getChildPostByParentAndChildSlug
);
// ================= CHILD ADMIN =================
router.post("/child/add", verifyToken, createChildPost);
router.post("/child/update", verifyToken, updateChildPost);


/* ================= ADMIN CRUD (CHUNG ĐỂ SAU) ================= */

router.get("/", getPosts);
router.post("/add", verifyToken, createPost);
router.post("/update", verifyToken, updatePost);

// ⚠️ ĐỂ CUỐI CÙNG
router.get("/:id", getPostById);
router.delete("/:id", verifyToken, deletePost);

export default router;
