// controllers/PageBlockController.js
import { supabase } from "../supabase.js";

/**
 * GET blocks of a page
 * GET /api/page-blocks/page/:pageId
 */
export const getByPage = async (req, res) => {
  const pageId = Number(req.params.pageId);

  const { data: rows, error } = await supabase
    .from("page_blocks")
    .select("*")
    .eq("page_id", pageId)
    .order("sort_order", { ascending: true });

  if (error) return res.status(400).json({ message: error.message });

  // Nếu settings là jsonb => không cần parse
  // Nếu settings là text => parse fallback
  const normalized = (rows || []).map((r) => {
    if (r && typeof r.settings === "string") {
      try {
        return { ...r, settings: JSON.parse(r.settings) };
      } catch {
        return { ...r, settings: {} };
      }
    }
    return { ...r, settings: r.settings ?? {} };
  });

  res.json(normalized);
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

  // Nếu settings là text => đổi settings: JSON.stringify(settings)
  const { data, error } = await supabase
    .from("page_blocks")
    .insert([
      {
        page_id: Number(page_id),
        block_type,
        title,
        settings, // jsonb recommended
        sort_order: Number(sort_order),
        is_active: Number(is_active),
      },
    ])
    .select("id")
    .single();

  if (error) return res.status(400).json({ success: false, message: error.message });

  res.json({ success: true, id: data.id });
};

/**
 * UPDATE block
 * PUT /api/page-blocks/:id
 */
export const update = async (req, res) => {
  const id = Number(req.params.id);

  const {
    block_type,
    title = "",
    settings = {},
    sort_order = 0,
    is_active = 1,
  } = req.body;

  const { error } = await supabase
    .from("page_blocks")
    .update({
      block_type,
      title,
      settings, // nếu text => JSON.stringify(settings)
      sort_order: Number(sort_order),
      is_active: Number(is_active),
    })
    .eq("id", id);

  if (error) return res.status(400).json({ success: false, message: error.message });

  res.json({ success: true });
};

/**
 * DELETE block
 * DELETE /api/page-blocks/:id
 */
export const remove = async (req, res) => {
  const id = Number(req.params.id);

  const { error } = await supabase.from("page_blocks").delete().eq("id", id);

  if (error) return res.status(400).json({ success: false, message: error.message });

  res.json({ success: true });
};
