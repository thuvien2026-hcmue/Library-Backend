import { supabase } from "../supabase.js";

const BUCKET = "News";
const FOLDER = "Image/trend_books";

// 🔹 slugify
function slugify(str = "") {
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// 🔹 make unique slug (Supabase)
async function makeUniqueSlug(baseSlug) {
  const base = baseSlug || "trend-book";
  let i = 0;

  while (true) {
    const trySlug = i === 0 ? base : `${base}-${i}`;

    const { data, error } = await supabase
      .from("trend_books")
      .select("id")
      .eq("slug", trySlug)
      .limit(1);

    if (error) throw error;
    if (!data?.length) return trySlug;

    i++;
  }
}

/* ✅ GET by slug */
export async function getTrendBookBySlug(req, res) {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from("trend_books")
      .select("id, name, slug, content, image")
      .eq("slug", slug)
      .single();

    if (error || !data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed" });
  }
}

/* ✅ LIST (search + pagination) */
export async function listTrendBooks(req, res) {
  try {
    const q = (req.query.q || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("trend_books")
      .select("id, name, slug, image", { count: "exact" })
      .order("id", { ascending: false })
      .range(from, to);

    // Supabase search: dùng ilike
    if (q) {
      // OR: name ilike %q% OR slug ilike %q%
      query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
    }

    const { data, error, count } = await query;

    if (error) return res.status(400).json({ message: error.message });

    res.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed" });
  }
}

/* ✅ GET by id */
export async function getTrendBookById(req, res) {
  try {
    const id = Number(req.params.id);

    const { data, error } = await supabase
      .from("trend_books")
      .select("id, name, slug, content, image")
      .eq("id", id)
      .single();

    if (error || !data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed" });
  }
}

/* ✅ CREATE (auto slug) */
export async function createTrendBook(req, res) {
  try {
    const { name, content = "", image = "" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Missing name" });
    }

    const baseSlug = slugify(name);
    const slug = await makeUniqueSlug(baseSlug);

    const { data, error } = await supabase
      .from("trend_books")
      .insert([
        {
          name: name.trim(),
          slug,
          content,
          image,
        },
      ])
      .select("id, name, slug, content, image")
      .single();

    if (error) {
      // unique violation
      if (error.code === "23505") {
        return res.status(409).json({ message: "Slug already exists" });
      }
      return res.status(400).json({ message: error.message });
    }

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed" });
  }
}

/* ✅ UPDATE (không đụng slug nếu bạn không gửi slug) */
export async function updateTrendBook(req, res) {
  try {
    const { id, content, name, image, slug } = req.body;
    if (!id) return res.status(400).json({ message: "Missing id" });

    const bookId = Number(id);

    // nếu có gửi slug => check unique (slug phải khác id hiện tại)
    if (slug && slug.trim()) {
      const { data: dup, error: dupErr } = await supabase
        .from("trend_books")
        .select("id")
        .eq("slug", slug.trim())
        .neq("id", bookId)
        .limit(1);

      if (dupErr) return res.status(400).json({ message: dupErr.message });
      if (dup?.length) return res.status(409).json({ message: "Slug already exists" });
    }

    const patch = {};
    if (content !== undefined) patch.content = content;
    if (name && name.trim()) patch.name = name.trim();
    if (slug && slug.trim()) patch.slug = slug.trim();
    if (image !== undefined) patch.image = image;

    const { data, error } = await supabase
      .from("trend_books")
      .update(patch)
      .eq("id", bookId)
      .select("id, name, slug, content, image")
      .single();

    if (error) return res.status(400).json({ message: error.message });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed" });
  }
}

/* ✅ UPLOAD IMAGE (update trend_books.image) */
export async function uploadTrendBookImage(req, res) {
  try {
    const file = req.file;
    const { trend_book_id } = req.body;

    if (!file) return res.status(400).json({ message: "No file uploaded" });
    if (!trend_book_id) return res.status(400).json({ message: "Missing trend_book_id" });

    const ext = (file.originalname || "").split(".").pop() || "png";
    const objectPath = `${FOLDER}/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;

    // upload buffer to supabase
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (upErr) {
      console.error(upErr);
      return res.status(500).json({ message: "Upload failed" });
    }

    // public url
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const url = pub.publicUrl;

    // update trend_books.image
    const { error: updErr } = await supabase
      .from("trend_books")
      .update({ image: url })
      .eq("id", Number(trend_book_id));

    if (updErr) return res.status(400).json({ message: updErr.message });

    res.json({ uploaded: true, url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
}

/* ✅ DELETE */
export async function deleteTrendBook(req, res) {
  try {
    const id = Number(req.params.id);

    const { error } = await supabase.from("trend_books").delete().eq("id", id);
    if (error) return res.status(400).json({ message: error.message });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed" });
  }
}
