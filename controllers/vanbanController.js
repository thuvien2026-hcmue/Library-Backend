import { pool } from "../db.js";
import { supabase } from "../supabase.js";
import fs from "fs";

/* =====================================================
   CREATE (UPLOAD PDF)
===================================================== */
export const createVanBan = async (req, res) => {
  try {
    const { tieu_de, so_hieu, mo_ta, category } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    const file = req.file;
    const filePath = `/Vanban/${Date.now()}_${file.originalname}`;

    // upload to Supabase
    const { error } = await supabase.storage
      .from("Congvan")
      .upload(filePath, fs.readFileSync(file.path), {
        contentType: file.mimetype,
      });

    fs.unlinkSync(file.path); // delete temp file

    if (error) throw error;

    const { data } = supabase.storage
      .from("Congvan")
      .getPublicUrl(filePath);

    const [result] = await pool.query(
      `INSERT INTO vanban
        (tieu_de, so_hieu, mo_ta, file_name, file_path, file_size, category)
       VALUES (?,?,?,?,?,?,?)`,
      [
        tieu_de,
        so_hieu,
        mo_ta,
        file.originalname,
        data.publicUrl,
        file.size,
        category,
      ]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("createVanBan error:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   READ – LIST
===================================================== */
export const getAllVanBan = async (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM vanban`
  );

  const [rows] = await pool.query(
    `SELECT *
     FROM vanban
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  res.json({
    data: rows,
    total,
    totalPages: Math.ceil(total / limit),
    page,
  });
};


/* =====================================================
   READ – DETAIL
===================================================== */
export const getVanBanDetail = async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.query(
    `SELECT * FROM vanban WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json(rows[0]);
};

/* =====================================================
   UPDATE (metadata only)
===================================================== */
export const updateVanBan = async (req, res) => {
  const { id } = req.params;
  const { tieu_de, so_hieu, mo_ta, category } = req.body;

  await pool.query(
    `UPDATE vanban
     SET tieu_de=?, so_hieu=?, mo_ta=?, category=?
     WHERE id=?`,
    [tieu_de, so_hieu, mo_ta, category, id]
  );

  res.json({ success: true });
};

/* =====================================================
   DELETE (DB + SUPABASE FILE)
===================================================== */
export const deleteVanBan = async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.query(
    `SELECT file_path FROM vanban WHERE id=?`,
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "Not found" });
  }

  // extract path inside bucket
  const filePath = rows[0].file_path.split("/documents/")[1];

  await supabase.storage
    .from("documents")
    .remove([filePath]);

  await pool.query(`DELETE FROM vanban WHERE id=?`, [id]);

  res.json({ success: true });
};
