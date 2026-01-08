import { pool } from "../db.js";

/* =====================================================
   SUBMIT FORM (PUBLIC)
===================================================== */
export const submitFormResult = async (req, res) => {
  try {
    const {
      page_id = null,
      post_id = null,
      page_slug = null,
      post_slug = null,
      form_data,
    } = req.body;

    if (!form_data || typeof form_data !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid form data",
      });
    }

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      null;

    const userAgent = req.headers["user-agent"] || null;

    const [result] = await pool.query(
      `INSERT INTO form_results
        (page_id, post_id, page_slug, post_slug, form_data, ip_address, user_agent)
       VALUES (?,?,?,?,?,?,?)`,
      [
        page_id,
        post_id,
        page_slug,
        post_slug,
        JSON.stringify(form_data),
        ip,
        userAgent,
      ]
    );

    res.json({
      success: true,
      id: result.insertId,
    });
  } catch (err) {
    console.error("submitFormResult error:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   ADMIN – LIST ALL
===================================================== */
export const getAllFormResults = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM form_results ORDER BY created_at DESC`
  );
  res.json(rows);
};

/* =====================================================
   ADMIN – PAGES WITH FORM RESULTS
===================================================== */
export const getPagesWithFormResults = async (req, res) => {
  const [rows] = await pool.query(`
    SELECT 
      p.id,
      p.name,
      p.slug,
      COUNT(fr.id) AS total
    FROM form_results fr
    JOIN page p ON p.id = fr.page_id
    WHERE fr.page_id IS NOT NULL
    GROUP BY p.id
    ORDER BY total DESC
  `);

  res.json(rows);
};

/* =====================================================
   ADMIN – POSTS WITH FORM RESULTS
===================================================== */
export const getPostsWithFormResults = async (req, res) => {
  const [rows] = await pool.query(`
    SELECT 
      po.id,
      po.name,
      po.slug,
      COUNT(fr.id) AS total
    FROM form_results fr
    JOIN post po ON po.id = fr.post_id
    WHERE fr.post_id IS NOT NULL
    GROUP BY po.id
    ORDER BY total DESC
  `);

  res.json(rows);
};

/* =====================================================
   ADMIN – BY PAGE
===================================================== */
export const getFormResultsByPage = async (req, res) => {
  const { pageId } = req.params;

  const [rows] = await pool.query(
    `SELECT * FROM form_results
     WHERE page_id = ?
     ORDER BY created_at DESC`,
    [pageId]
  );

  res.json(rows);
};

/* =====================================================
   ADMIN – BY POST
===================================================== */
export const getFormResultsByPost = async (req, res) => {
  const { postId } = req.params;

  const [rows] = await pool.query(
    `SELECT * FROM form_results
     WHERE post_id = ?
     ORDER BY created_at DESC`,
    [postId]
  );

  res.json(rows);
};

/* =====================================================
   ADMIN – DETAIL
===================================================== */
export const getFormResultDetail = async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.query(
    `SELECT * FROM form_results WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ success: false });
  }

  res.json(rows[0]);
};

/* =====================================================
   ADMIN – DELETE
===================================================== */
export const deleteFormResult = async (req, res) => {
  const { id } = req.params;

  await pool.query(`DELETE FROM form_results WHERE id = ?`, [id]);

  res.json({ success: true });
};
