// controllers/pageController.js
import { pool } from "../db.js";

// GET all pages
export const getPages = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM page ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET a single page by ID
export const getPageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query("SELECT * FROM page WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Page not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// CREATE a new page
export const createPage = async (req, res, next) => {
  try {
    let { name, slug, description } = req.body;

    if (!name) return res.status(400).json({ message: "Name is required" });

    // Custom Vietnamese-safe slug
    const createSlug = (str) => {
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    };

    // auto-generate slug if missing
    if (!slug) {
      slug = createSlug(name);
    }

    const now = new Date();

    const [result] = await pool.query(
      "INSERT INTO page (name, slug, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [name, slug, description ?? "", now, now]
    );

    res.json({ status: "success", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Slug already exists" });
    }
    next(err);
  }
};

// UPDATE page
export const updatePage = async (req, res, next) => {
  try {
    const { id, name, description } = req.body;

    if (!id) return res.status(400).json({ message: "Missing page ID" });

    const now = new Date();

    await pool.query(
      "UPDATE page SET name = ?, description = ?, updated_at = ? WHERE id = ?",
      [name, description ?? "", now, id]
    );

    res.json({ status: "success", message: "Page updated" });
  } catch (err) {
    next(err);
  }
};


// DELETE page
export const deletePage = async (req, res, next) => {
  try {
    const { id } = req.params;

    // delete all posts under this page too
    await pool.query("DELETE FROM post WHERE page_id = ?", [id]);

    const [result] = await pool.query("DELETE FROM page WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Page not found" });
    }

    res.json({ status: "success", message: "Page deleted" });
  } catch (err) {
    next(err);
  }
};
