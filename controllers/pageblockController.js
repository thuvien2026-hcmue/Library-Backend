// controllers/PageBlockController.js
import {pool} from "../db.js";

/**
 * GET blocks of a page
 * GET /api/page-blocks/page/:pageId
 */
export const getByPage = async (req, res) => {
  const { pageId } = req.params;

  const [rows] = await pool.query(
    "SELECT * FROM page_blocks WHERE page_id=? ORDER BY sort_order ASC",
    [pageId]
  );

  rows.forEach(r => {
    try {
      r.settings = JSON.parse(r.settings);
    } catch {
      r.settings = {};
    }
  });

  res.json(rows);
};

/**
 * CREATE block
 * POST /api/page-blocks
 */
export const create = async (req, res) => {
  const {
    page_id,
    block_type,
    title = "",
    settings = {},
    sort_order = 0,
    is_active = 1,
  } = req.body;

  await pool.query(
    `INSERT INTO page_blocks
     (page_id, block_type, title, settings, sort_order, is_active)
     VALUES (?,?,?,?,?,?)`,
    [page_id, block_type, title, JSON.stringify(settings), sort_order, is_active]
  );

  res.json({ success: true });
};

/**
 * UPDATE block
 * PUT /api/page-blocks/:id
 */
export const update = async (req, res) => {
  const { id } = req.params;
  const {
    block_type,
    title = "",
    settings = {},
    sort_order = 0,
    is_active = 1,
  } = req.body;

  await pool.query(
    `UPDATE page_blocks
     SET block_type=?, title=?, settings=?, sort_order=?, is_active=?
     WHERE id=?`,
    [
      block_type,
      title,
      JSON.stringify(settings),
      sort_order,
      is_active,
      id,
    ]
  );

  res.json({ success: true });
};


/**
 * DELETE block
 * DELETE /api/page-blocks/:id
 */
export const remove = async (req, res) => {
  await pool.query("DELETE FROM page_blocks WHERE id=?", [req.params.id]);
  res.json({ success: true });
};
