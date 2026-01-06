import { pool } from "../db.js";

// 🔹 Vietnamese-safe slug generator
const createSlug = (str) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// =======================================================
// GET ALL POSTS
// =======================================================
export const getPosts = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT post.*, page.name AS page_name 
       FROM post 
       JOIN page ON post.page_id = page.id
       ORDER BY post.id DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const getPostsByPageId = async (req, res, next) => {
  try {
    const { page_id } = req.params;

    const [rows] = await pool.query(
      `SELECT 
          post.id,
          post.name,
          post.slug,
          page.slug AS page_slug,
          page.name AS page_name
      FROM post
      JOIN page ON post.page_id = page.id
      WHERE post.page_id = ?
      ORDER BY post.id ASC`,
      [page_id]
    );


    res.json(rows);
  } catch (err) {
    next(err);
  }
};


// =======================================================
// GET POST BY ID
// =======================================================
export const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query("SELECT * FROM post WHERE id = ?", [id]);

    if (rows.length === 0)
      return res.status(404).json({ message: "Post not found" });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// =======================================================
// GET POST TINTUC AND THONG BAO
// =======================================================
export const getPostsByPageSlug = async (req, res) => {
  try {
    const { pageSlug } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        post.name,
        post.slug,
        post.description,
        post.created_at,
        page.slug AS page_slug
      FROM post
      JOIN page ON post.page_id = page.id
      WHERE page.slug = ?
      ORDER BY post.created_at DESC
      `,
      [pageSlug]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("getPostsByPageSlug error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posts"
    });
  }
};


// =======================================================
// GET POST BY SLUG (Frontend)
// =======================================================
export const getPostBySlug = async (req, res, next) => {
  try {
    const slug = req.params.slug;

    const [rows] = await pool.query(
      "SELECT * FROM post WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Post not found" });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};


// =======================================================
// CREATE POST
// =======================================================
export const createPost = async (req, res, next) => {
  try {
    let { page_id, name, slug, description, content } = req.body;

    if (!page_id)
      return res.status(400).json({ message: "Page ID is required" });

    if (!name) return res.status(400).json({ message: "Name is required" });

    if (!slug) slug = createSlug(name);

    const now = new Date();

    const [result] = await pool.query(
      `INSERT INTO post (page_id, name, slug, description, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [page_id, name, slug, description ?? "", content ?? "", now, now]
    );

    res.json({ status: "success", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(400).json({ message: "Slug already exists" });
    next(err);
  }
};

// =======================================================
// UPDATE POST
// =======================================================
export const updatePost = async (req, res, next) => {
  try {
    const { id, content } = req.body;

    if (!id)
      return res.status(400).json({ message: "Missing post ID" });

    const now = new Date();

    await pool.query(
      `UPDATE post
       SET content = ?, updated_at = ?
       WHERE id = ?`,
      [content, now, id]
    );

    res.json({ status: "success", message: "Content updated" });

  } catch (err) {
    next(err);
  }
};



// =======================================================
// DELETE POST
// =======================================================
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query("DELETE FROM post WHERE id = ?", [id]);

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Post not found" });

    res.json({ status: "success", message: "Post deleted" });
  } catch (err) {
    next(err);
  }
};


// =======================================================
// GET CHILD POSTS BY PARENT POST
// =======================================================
export const getPostChildren = async (req, res, next) => {
  try {
    const { parentId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        id,
        page_id,
        parent_id,
        name,
        slug,
        description,
        created_at
      FROM post
      WHERE parent_id = ?
      ORDER BY created_at DESC
      `,
      [parentId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// =======================================================
// GET CHILD POSTS BY PARENT POST SLUG
// =======================================================
export const getChildPostByParentAndChildSlug = async (req, res, next) => {
  try {
    const { parentSlug, childSlug } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        child.id,
        child.page_id,
        child.parent_id,
        child.name,
        child.slug,
        child.description,
        child.content,
        child.created_at,
        child.updated_at,
        parent.slug AS parent_slug,
        parent.name AS parent_name
      FROM post AS parent
      JOIN post AS child ON child.parent_id = parent.id
      WHERE parent.slug = ?
        AND child.slug = ?
      LIMIT 1
      `,
      [parentSlug, childSlug]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Child post not found"
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
};


// =======================================================
// CREATE CHILD POST
// =======================================================
export const createChildPost = async (req, res, next) => {
  try {
    let { page_id, parent_id, name, slug, description, content } = req.body;

    if (!page_id || !parent_id || !name)
      return res.status(400).json({ message: "Missing required fields" });

    if (!slug) slug = createSlug(name);

    const now = new Date();

    const [result] = await pool.query(
      `
      INSERT INTO post 
      (page_id, parent_id, name, slug, description, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [page_id, parent_id, name, slug, description ?? "", content ?? "", now, now]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(400).json({ message: "Slug already exists" });
    next(err);
  }
};

// =======================================================
// UPDATE CHILD POST
// =======================================================
export const updateChildPost = async (req, res, next) => {
  try {
    const { id, name, description, content } = req.body;

    if (!id) return res.status(400).json({ message: "Missing ID" });

    await pool.query(
      `
      UPDATE post
      SET name = ?, description = ?, content = ?, updated_at = ?
      WHERE id = ?
      `,
      [name, description, content, new Date(), id]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
