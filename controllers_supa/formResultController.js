import { supabase } from "../supabase.js";

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

    const { data, error } = await supabase
      .from("form_results")
      .insert([
        {
          page_id,
          post_id,
          page_slug,
          post_slug,
          form_data, // Supabase tự stringify JSON
          ip_address: ip,
          user_agent: userAgent,
        },
      ])
      .select("id")
      .single();

    if (error) throw error;

    res.json({
      success: true,
      id: data.id,
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
  const { data, error } = await supabase
    .from("form_results")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json(error);

  res.json(data);
};

/* =====================================================
   ADMIN – PAGES WITH FORM RESULTS
===================================================== */
export const getPagesWithFormResults = async (req, res) => {
  const { data, error } = await supabase.rpc("pages_with_form_results");

  if (error) return res.status(500).json(error);

  res.json(data);
};

/* =====================================================
   ADMIN – POSTS WITH FORM RESULTS
===================================================== */
export const getPostsWithFormResults = async (req, res) => {
  const { data, error } = await supabase.rpc("posts_with_form_results");

  if (error) return res.status(500).json(error);

  res.json(data);
};

/* =====================================================
   ADMIN – BY PAGE
===================================================== */
export const getFormResultsByPage = async (req, res) => {
  const { pageId } = req.params;

  const { data, error } = await supabase
    .from("form_results")
    .select("*")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json(error);

  res.json(data);
};

/* =====================================================
   ADMIN – BY POST
===================================================== */
export const getFormResultsByPost = async (req, res) => {
  const { postId } = req.params;

  const { data, error } = await supabase
    .from("form_results")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json(error);

  res.json(data);
};

/* =====================================================
   ADMIN – DETAIL
===================================================== */
export const getFormResultDetail = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("form_results")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return res.status(404).json({ success: false });
  }

  res.json(data);
};

/* =====================================================
   ADMIN – DELETE
===================================================== */
export const deleteFormResult = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("form_results")
    .delete()
    .eq("id", id);

  if (error) return res.status(500).json(error);

  res.json({ success: true });
};
