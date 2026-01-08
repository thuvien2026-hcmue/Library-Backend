// controllers/pageController.js
import { supabase } from "../supabase.js";

// Vietnamese-safe slug
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

// GET all pages
export const getPages = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("page")
      .select("*")
      .order("id", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// GET a single page by ID
export const getPageById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const { data, error } = await supabase
      .from("page")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return res.status(404).json({ message: "Page not found" });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// CREATE a new page
export const createPage = async (req, res, next) => {
  try {
    let { name, slug, description } = req.body;

    if (!name) return res.status(400).json({ message: "Name is required" });

    if (!slug) slug = createSlug(name);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("page")
      .insert([
        {
          name,
          slug,
          description: description ?? "",
          created_at: now,
          updated_at: now,
        },
      ])
      .select("id")
      .single();

    if (error) {
      // unique violation (slug)
      if (error.code === "23505") {
        return res.status(400).json({ message: "Slug already exists" });
      }
      return res.status(400).json({ message: error.message });
    }

    res.json({ status: "success", id: data.id });
  } catch (err) {
    next(err);
  }
};

// UPDATE page
export const updatePage = async (req, res, next) => {
  try {
    const { id, name, description } = req.body;

    if (!id) return res.status(400).json({ message: "Missing page ID" });

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("page")
      .update({
        name,
        description: description ?? "",
        updated_at: now,
      })
      .eq("id", Number(id));

    if (error) return res.status(400).json({ message: error.message });

    res.json({ status: "success", message: "Page updated" });
  } catch (err) {
    next(err);
  }
};

// DELETE page (delete posts under this page too)
export const deletePage = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    // 1) delete posts of this page
    const { error: delPostsErr } = await supabase
      .from("post")
      .delete()
      .eq("page_id", id);

    if (delPostsErr) return res.status(400).json({ message: delPostsErr.message });

    // 2) delete page
    const { error: delPageErr, count } = await supabase
      .from("page")
      .delete({ count: "exact" })
      .eq("id", id);

    if (delPageErr) return res.status(400).json({ message: delPageErr.message });

    if (!count) return res.status(404).json({ message: "Page not found" });

    res.json({ status: "success", message: "Page deleted" });
  } catch (err) {
    next(err);
  }
};
