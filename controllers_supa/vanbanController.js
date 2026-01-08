import { supabase } from "../supabase.js";
import fs from "fs";

const BUCKET = "Congvan";
const FOLDER = "Vanban";

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

    // objectPath trong bucket (không có dấu / ở đầu)
    const objectPath = `${FOLDER}/${Date.now()}_${file.originalname}`;

    // upload to Supabase (đọc file temp từ multer diskStorage)
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, fs.readFileSync(file.path), {
        contentType: file.mimetype,
        upsert: false,
      });

    // xóa file temp
    try { fs.unlinkSync(file.path); } catch {}

    if (upErr) {
      console.error(upErr);
      return res.status(500).json({ success: false, message: upErr.message });
    }

    // public url
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const publicUrl = pub.publicUrl;

    // insert DB (Supabase)
    const { data: inserted, error: insErr } = await supabase
      .from("vanban")
      .insert([
        {
          tieu_de,
          so_hieu,
          mo_ta,
          category,
          file_name: file.originalname,
          file_path: publicUrl, // lưu public url
          file_size: file.size,
        },
      ])
      .select("id")
      .single();

    if (insErr) {
      console.error(insErr);
      // optional rollback storage
      await supabase.storage.from(BUCKET).remove([objectPath]);
      return res.status(500).json({ success: false, message: insErr.message });
    }

    res.json({ success: true, id: inserted.id });
  } catch (err) {
    console.error("createVanBan error:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   READ – LIST (pagination + total)
===================================================== */
export const getAllVanBan = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("vanban")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return res.status(400).json({ message: error.message });

    const total = count || 0;

    res.json({
      data: data || [],
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed" });
  }
};

/* =====================================================
   READ – DETAIL
===================================================== */
export const getVanBanDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const { data, error } = await supabase
      .from("vanban")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return res.status(404).json({ message: "Not found" });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed" });
  }
};

/* =====================================================
   UPDATE (metadata only)
===================================================== */
export const updateVanBan = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { tieu_de, so_hieu, mo_ta, category } = req.body;

    const { error } = await supabase
      .from("vanban")
      .update({ tieu_de, so_hieu, mo_ta, category })
      .eq("id", id);

    if (error) return res.status(400).json({ success: false, message: error.message });

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   DELETE (DB + SUPABASE FILE)
===================================================== */
export const deleteVanBan = async (req, res) => {
  try {
    const id = Number(req.params.id);

    // 1) get record
    const { data: row, error: getErr } = await supabase
      .from("vanban")
      .select("file_path")
      .eq("id", id)
      .single();

    if (getErr || !row) return res.status(404).json({ message: "Not found" });

    // 2) convert public URL -> objectPath in bucket
    // URL thường có: /storage/v1/object/public/<BUCKET>/<OBJECT_PATH>
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = row.file_path.indexOf(marker);
    const objectPath = idx !== -1 ? row.file_path.slice(idx + marker.length) : null;

    if (objectPath) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([objectPath]);
      if (rmErr) console.error("remove storage error:", rmErr);
    }

    // 3) delete DB row
    const { error: delErr } = await supabase.from("vanban").delete().eq("id", id);
    if (delErr) return res.status(400).json({ success: false, message: delErr.message });

    res.json({ success: true });
  } catch (err) {
    console.error("deleteVanBan error:", err);
    res.status(500).json({ success: false });
  }
};
