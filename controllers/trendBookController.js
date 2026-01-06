import { pool } from "../db.js"; // đúng nếu db.js export { pool }
import { supabase } from "../supabase.js";

function slugify(str = "") {
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function makeUniqueSlug(baseSlug) {
  let base = baseSlug || "trend-book";
  let i = 0;

  while (true) {
    const trySlug = i === 0 ? base : `${base}-${i}`;
    const [exists] = await pool.query(
      "SELECT id FROM trend_books WHERE slug=? LIMIT 1",
      [trySlug]
    );
    if (!exists.length) return trySlug;
    i++;
  }
}

/* ✅ GET by slug */
export async function getTrendBookBySlug(req, res) {
  const { slug } = req.params;

  const [rows] = await pool.query(
    "SELECT id, name, slug, content, image FROM trend_books WHERE slug=? LIMIT 1",
    [slug]
  );

  if (!rows.length) return res.status(404).json({ message: "Not found" });
  res.json(rows[0]);
}

/* ✅ LIST */
export async function listTrendBooks(req, res) {
  const q = (req.query.q || "").trim();
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const offset = (page - 1) * limit;

  const where = q ? `WHERE name LIKE ? OR slug LIKE ?` : "";
  const params = q ? [`%${q}%`, `%${q}%`, limit, offset] : [limit, offset];

  const [rows] = await pool.query(
    `
      SELECT id, name, slug, image
      FROM trend_books
      ${where}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
    params
  );

  const [countRows] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM trend_books
      ${where}
    `,
    q ? [`%${q}%`, `%${q}%`] : []
  );

  res.json({
    data: rows,
    total: countRows[0]?.total || 0,
    page,
    limit,
  });
}

/* ✅ GET by id */
export async function getTrendBookById(req, res) {
  const id = parseInt(req.params.id, 10);
  const [rows] = await pool.query(
    "SELECT id, name, slug, content, image FROM trend_books WHERE id=? LIMIT 1",
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: "Not found" });
  res.json(rows[0]);
}

/* ✅ CREATE (auto slug, no timestamps) */
export async function createTrendBook(req, res) {
  const { name, content = "", image = "" } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Missing name" });
  }

  const baseSlug = slugify(name);
  const slug = await makeUniqueSlug(baseSlug);

  const [result] = await pool.query(
    "INSERT INTO trend_books (name, slug, content, image) VALUES (?,?,?,?)",
    [name.trim(), slug, content, image]
  );

  const [rows] = await pool.query(
    "SELECT id, name, slug, content, image FROM trend_books WHERE id=? LIMIT 1",
    [result.insertId]
  );

  res.json(rows[0]);
}

/* ✅ UPDATE (không đụng slug nếu bạn không gửi slug) */
export async function updateTrendBook(req, res) {
  const { id, content, name, image, slug } = req.body;
  if (!id) return res.status(400).json({ message: "Missing id" });

  // nếu có gửi slug => check unique
  if (slug && slug.trim()) {
    const [dup] = await pool.query(
      "SELECT id FROM trend_books WHERE slug=? AND id<>? LIMIT 1",
      [slug.trim(), id]
    );
    if (dup.length) return res.status(409).json({ message: "Slug already exists" });
  }

  await pool.query(
    `
      UPDATE trend_books
      SET
        content = COALESCE(?, content),
        name    = COALESCE(?, name),
        slug    = COALESCE(?, slug),
        image   = COALESCE(?, image)
      WHERE id = ?
    `,
    [
      content ?? null,
      name ? name.trim() : null,
      slug ? slug.trim() : null,
      image ?? null,
      id,
    ]
  );

  const [rows] = await pool.query(
    "SELECT id, name, slug, content, image FROM trend_books WHERE id=? LIMIT 1",
    [id]
  );
  res.json(rows[0]);
}

/* ✅ UPLOAD IMAGE (no updated_at) */
export async function uploadTrendBookImage(req, res) {
  try {
    const file = req.file;
    const { trend_book_id } = req.body;

    if (!file) return res.status(400).json({ message: "No file uploaded" });
    if (!trend_book_id) return res.status(400).json({ message: "Missing trend_book_id" });

    // ✅ filename unique
    const ext = (file.originalname || "").split(".").pop() || "png";
    const fileName = `trend_books/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;

    // ✅ upload buffer to supabase
    const { error } = await supabase.storage
      .from("News/Image") // bucket của bạn
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Upload failed" });
    }

    // ✅ public url
    const { data: publicUrl } = supabase.storage
      .from("News/Image")
      .getPublicUrl(fileName);

    const url = publicUrl.publicUrl;

    // ✅ update trend_books.image
    await pool.query("UPDATE trend_books SET image=? WHERE id=?", [
      url,
      parseInt(trend_book_id, 10),
    ]);

    res.json({ uploaded: true, url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
}


/* ✅ DELETE */
export async function deleteTrendBook(req, res) {
  const id = parseInt(req.params.id, 10);
  await pool.query("DELETE FROM trend_books WHERE id=?", [id]);
  res.json({ ok: true });
}
