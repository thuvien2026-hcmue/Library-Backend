import { pool } from "../db.js";
import { supabase } from "../supabase.js";

/* ========================
   UPLOAD IMAGE TO SUPABASE
======================== */
export const uploadMedia = async (req, res) => {
    try {
        const file = req.file;
        const { post_id } = req.body;

        if (!file)
            return res.status(400).json({ message: "No file uploaded" });

        // Prepare filename
        const ext = file.originalname.split(".").pop();
        const fileName = `${Date.now()}.${ext}`;

        // Upload to Supabase
        const { data, error } = await supabase.storage
            .from("News/Image") // your bucket name
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
            });

        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Upload failed" });
        }

        // Get public URL
        const { data: publicUrl } = supabase.storage
            .from("News/Image")
            .getPublicUrl(fileName);

        const fileUrl = publicUrl.publicUrl;

        // Save to DB
        await pool.query(
            "INSERT INTO media (file_name, file_path, file_type, post_id) VALUES (?, ?, ?, ?)",
            [file.originalname, fileUrl, file.mimetype, post_id || null]
        );

        res.json({
            uploaded: true,
            url: fileUrl
        });

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
        const { postId } = req.params;

        const [rows] = await pool.query(
            "SELECT * FROM media WHERE post_id = ? ORDER BY id DESC",
            [postId]
        );

        res.json(rows);

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
        const { id } = req.params;

        const [[media]] = await pool.query(
            "SELECT * FROM media WHERE id = ?",
            [id]
        );

        if (!media)
            return res.status(404).json({ message: "Not found" });

        // Extract file name from URL
        const fileName = media.file_path.split("/").pop();

        // Delete from Supabase
        await supabase.storage
            .from("News/Image")
            .remove([fileName]);

        // Delete from DB
        await pool.query("DELETE FROM media WHERE id = ?", [id]);

        res.json({ status: "success", message: "Media deleted" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Cannot delete media" });
    }
};

export const getMediaGroupedByPost = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT 
        m.id,
        m.file_name,
        m.file_path,
        m.file_type,
        m.post_id,
        p.name AS post_title
      FROM media m
      LEFT JOIN post p ON m.post_id = p.id
      ORDER BY m.post_id DESC, m.id DESC
    `);

        // GROUP BY post_id
        const grouped = {};

        rows.forEach((row) => {
            const key = row.post_id || "no_post";

            if (!grouped[key]) {
                grouped[key] = {
                    post_id: row.post_id,
                    post_title: row.post_title || "Unassigned",
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

export const updateMediaImage = async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file;
        console.log("FILE:", req.file);
        console.log("ID:", req.params.id);


        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // 1️⃣ Get media
        const [[media]] = await pool.query(
            "SELECT * FROM media WHERE id = ?",
            [id]
        );

        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }

        // 2️⃣ Extract EXISTING filename from URL
        const fileName = media.file_path.split("/").pop();

        // 3️⃣ Upload WITH SAME PATH (overwrite)
        const { error } = await supabase.storage
            .from("News/Image")
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true, // 🔥 overwrite
            });

        if (error) throw error;

        // 4️⃣ Update ONLY metadata (URL KHÔNG ĐỔI)
        await pool.query(
            `UPDATE media 
       SET file_name = ?, file_type = ?
       WHERE id = ?`,
            [file.originalname, file.mimetype, id]
        );

        res.json({
            success: true,
            url: media.file_path, // 👈 same URL
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Update media failed" });
    }
};

