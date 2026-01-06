import express from "express";
import {
  submitFormResult,
  getAllFormResults,
  getPagesWithFormResults,
  getPostsWithFormResults,
  getFormResultsByPost,
  getFormResultsByPage,
  getFormResultDetail,
  deleteFormResult,
} from "../controllers/formResultController.js";

// import { verifyToken, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ================= PUBLIC ================= */
router.post("/submit", submitFormResult);

/* ================= ADMIN ================= */
// router.use(verifyToken);

/* --- choose what to view first --- */
router.get("/forms/pages", getPagesWithFormResults);
router.get("/forms/posts", getPostsWithFormResults);

/* --- results list --- */
router.get("/page/:pageId", getFormResultsByPage);
router.get("/post/:postId", getFormResultsByPost);

/* --- misc --- */
router.get("/", getAllFormResults);

/* --- detail & delete (MUST BE LAST) --- */
router.get("/:id", getFormResultDetail);
router.delete("/:id", deleteFormResult);

export default router;
