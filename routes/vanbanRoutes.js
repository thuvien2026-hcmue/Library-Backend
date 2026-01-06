import express from "express";
import multer from "multer";
import {
  createVanBan,
  getAllVanBan,
  getVanBanDetail,
  updateVanBan,
  deleteVanBan,
} from "../controllers/vanbanController.js";

const upload = multer({ dest: "uploads/" });
const router = express.Router();

/* CRUD */
router.post("/", upload.single("file"), createVanBan);
router.get("/", getAllVanBan);
router.get("/:id", getVanBanDetail);
router.put("/:id", updateVanBan);
router.delete("/:id", deleteVanBan);

export default router;
