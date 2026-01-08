import { supabase } from "../supabase.js";

/**
 * CONFIG
 * - Bucket name: News
 * - Folder: Image
 */
const BUCKET = "News";
const FOLDER = "Image";

/* ========================
   UPLOAD IMAGE TO SUPABASE
======================== */
export const uploadMedia = async (req, res) => {
  try {
    const file = req.file;
    const { post_id } = req.body;

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const ext = file.originalname.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`;

    // path trong bucket (folder + filename)
    const filePath = `${FOLDER}/${fileName}`;

    // 1) Upload lên storage
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (upErr) {
      console.error(upErr);
      return res.status(500).json({ message: "Upload failed" });
    }

    // 2) Lấy public url
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const fileUrl = pub.publicUrl;

    // 3) Lưu DB (table media)
    const { data: inserted, error: insErr } = await supabase
      .from("media")
      .insert([
        {
          file_name: file.originalname,
          file_path: fileUrl, // bạn đang lưu URL
          file_type: file.mimetype,
          post_id: post_id ? Number(post_id) : null,
        },
      ])
      .select("id, file_name, file_path, file_type, post_id")
      .single();

    if (insErr) {
      console.error(insErr);

      // optional: rollback storage nếu insert DB fail
      await supabase.storage.from(BUCKET).remove([filePath]);

      return res.status(500).json({ message: insErr.message });
    }

    res.json({ uploaded: true, url: fileUrl, media: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
};

/* ========================
   GET MEDIA BY POST
======================== */
export const getMediaByPost = async (req, res) => {
  try {
    const postId = Number(req.params.postId);

    const { data, error } = await supabase
      .from("media")
      .select("*")
      .eq("post_id", postId)
      .order("id", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot load media" });
  }
};

/* ========================
   DELETE MEDIA
======================== */
export const deleteMedia = async (req, res) => {
  try {
    const id = Number(req.params.id);

    // 1) get media row
    const { data: media, error: getErr } = await supabase
      .from("media")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !media) {
      return res.status(404).json({ message: "Not found" });
    }

    // 2) Từ public URL -> lấy path trong bucket (Image/xxx.jpg)
    // URL dạng: .../storage/v1/object/public/News/Image/filename.jpg
    const idx = media.file_path.indexOf(`/${BUCKET}/`);
    const objectPath = idx !== -1 ? media.file_path.slice(idx + BUCKET.length + 2) : null;
    // objectPath giờ sẽ là "Image/filename.jpg"

    if (objectPath) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([objectPath]);
      if (rmErr) console.error("Storage remove error:", rmErr);
    }

    // 3) delete DB row
    const { error: delErr } = await supabase.from("media").delete().eq("id", id);
    if (delErr) return res.status(400).json({ message: delErr.message });

    res.json({ status: "success", message: "Media deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot delete media" });
  }
};

/* ========================
   GET MEDIA GROUPED BY POST
======================== */
export const getMediaGroupedByPost = async (req, res) => {
  try {
    // Join post title bằng foreign table select (Supabase)
    // Requires: media.post_id references post.id (FK) OR name table mapping đúng.
    const { data: rows, error } = await supabase
      .from("media")
      .select(`
        id,
        file_name,
        file_path,
        file_type,
        post_id,
        post:post_id ( id, name, slug )
      `)
      .order("post_id", { ascending: false })
      .order("id", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    const grouped = {};
    (rows || []).forEach((row) => {
      const key = row.post_id ?? "no_post";
      if (!grouped[key]) {
        grouped[key] = {
          post_id: row.post_id,
          post_title: row.post?.name || "Unassigned",
          medias: [],
        };
      }
      grouped[key].medias.push({
        id: row.id,
        file_name: row.file_name,
        file_path: row.file_path,
        file_type: row.file_type,
      });
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cannot load media" });
  }
};

/* ========================
   UPDATE MEDIA IMAGE (overwrite same path)
======================== */
export const updateMediaImage = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const file = req.file;

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    // 1) get media row
    const { data: media, error: getErr } = await supabase
      .from("media")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !media) {
      return res.status(404).json({ message: "Media not found" });
    }

    // 2) Từ URL -> object path trong bucket
    const idx = media.file_path.indexOf(`/${BUCKET}/`);
    const objectPath =
      idx !== -1 ? media.file_path.slice(idx + BUCKET.length + 2) : null; // "Image/filename.jpg"

    if (!objectPath) {
      return res.status(400).json({ message: "Cannot detect storage path from file_path" });
    }

    // 3) overwrite same objectPath
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (upErr) return res.status(500).json({ message: upErr.message });

    // 4) update metadata in DB (URL giữ nguyên)
    const { error: updErr } = await supabase
      .from("media")
      .update({
        file_name: file.originalname,
        file_type: file.mimetype,
      })
      .eq("id", id);

    if (updErr) return res.status(400).json({ message: updErr.message });

    res.json({ success: true, url: media.file_path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update media failed" });
  }
};
