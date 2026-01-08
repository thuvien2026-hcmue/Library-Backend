import { supabase } from "../supabase.js";

// 🔹 Vietnamese-safe slug generator
const createSlug = (str = "") =>
  String(str)
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
    const { data, error } = await supabase
      .from("post")
      .select("*, page:page_id (name)")
      .order("id", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    // map page_name like your SQL
    const rows = (data || []).map((p) => ({
      ...p,
      page_name: p.page?.name ?? null,
    }));

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// =======================================================
// GET POSTS BY PAGE ID
// =======================================================
export const getPostsByPageId = async (req, res, next) => {
  try {
    const page_id = Number(req.params.page_id);

    const { data, error } = await supabase
      .from("post")
      .select("id, name, slug, page:page_id (slug, name)")
      .eq("page_id", page_id)
      .order("id", { ascending: true });

    if (error) return res.status(400).json({ message: error.message });

    const rows = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      page_slug: p.page?.slug ?? null,
      page_name: p.page?.name ?? null,
    }));

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
    const id = Number(req.params.id);

    const { data, error } = await supabase
      .from("post")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data)
      return res.status(404).json({ message: "Post not found" });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// =======================================================
// GET POSTS BY PAGE SLUG (Tin tức / thông báo)
// =======================================================
export const getPostsByPageSlug = async (req, res) => {
  try {
    const { pageSlug } = req.params;

    // 1) find page id by slug
    const { data: page, error: pageErr } = await supabase
      .from("page")
      .select("id, slug")
      .eq("slug", pageSlug)
      .single();

    if (pageErr || !page) {
      return res.json({ success: true, data: [] });
    }

    // 2) fetch posts in that page
    const { data: posts, error } = await supabase
      .from("post")
      .select("name, slug, description, created_at, page_id")
      .eq("page_id", page.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch posts",
      });
    }

    const rows = (posts || []).map((p) => ({
      name: p.name,
      slug: p.slug,
      description: p.description,
      created_at: p.created_at,
      page_slug: page.slug,
    }));

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("getPostsByPageSlug error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posts",
    });
  }
};

// =======================================================
// GET POST BY SLUG (Frontend)
// =======================================================
export const getPostBySlug = async (req, res, next) => {
  try {
    const slug = req.params.slug;

    const { data, error } = await supabase
      .from("post")
      .select("*")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle(); // không throw nếu 0 row

    if (error) return res.status(400).json({ message: error.message });
    if (!data) return res.status(404).json({ message: "Post not found" });

    res.json(data);
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

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("post")
      .insert([
        {
          page_id: Number(page_id),
          name,
          slug,
          description: description ?? "",
          content: content ?? "",
          created_at: now,
          updated_at: now,
        },
      ])
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505")
        return res.status(400).json({ message: "Slug already exists" });
      return res.status(400).json({ message: error.message });
    }

    res.json({ status: "success", id: data.id });
  } catch (err) {
    next(err);
  }
};

// =======================================================
// UPDATE POST (update content only)
// =======================================================
export const updatePost = async (req, res, next) => {
  try {
    const { id, content } = req.body;

    if (!id) return res.status(400).json({ message: "Missing post ID" });

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("post")
      .update({ content, updated_at: now })
      .eq("id", Number(id));

    if (error) return res.status(400).json({ message: error.message });

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
    const id = Number(req.params.id);

    const { error, count } = await supabase
      .from("post")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) return res.status(400).json({ message: error.message });
    if (!count) return res.status(404).json({ message: "Post not found" });

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
    const parentId = Number(req.params.parentId);

    const { data, error } = await supabase
      .from("post")
      .select("id, page_id, parent_id, name, slug, description, created_at")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// =======================================================
// GET CHILD POST BY PARENT SLUG + CHILD SLUG
// =======================================================
export const getChildPostByParentAndChildSlug = async (req, res, next) => {
  try {
    const { parentSlug, childSlug } = req.params;

    // 1) find parent by slug
    const { data: parent, error: pErr } = await supabase
      .from("post")
      .select("id, slug, name")
      .eq("slug", parentSlug)
      .single();

    if (pErr || !parent) {
      return res.status(404).json({
        success: false,
        message: "Child post not found",
      });
    }

    // 2) find child by parent_id + child slug
    const { data: child, error: cErr } = await supabase
      .from("post")
      .select("id, page_id, parent_id, name, slug, description, content, created_at, updated_at")
      .eq("parent_id", parent.id)
      .eq("slug", childSlug)
      .single();

    if (cErr || !child) {
      return res.status(404).json({
        success: false,
        message: "Child post not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...child,
        parent_slug: parent.slug,
        parent_name: parent.name,
      },
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

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("post")
      .insert([
        {
          page_id: Number(page_id),
          parent_id: Number(parent_id),
          name,
          slug,
          description: description ?? "",
          content: content ?? "",
          created_at: now,
          updated_at: now,
        },
      ])
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505")
        return res.status(400).json({ message: "Slug already exists" });
      return res.status(400).json({ message: error.message });
    }

    res.json({ success: true, id: data.id });
  } catch (err) {
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

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("post")
      .update({
        name,
        description,
        content,
        updated_at: now,
      })
      .eq("id", Number(id));

    if (error) return res.status(400).json({ message: error.message });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
