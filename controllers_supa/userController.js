import bcrypt from "bcryptjs";
import { supabase } from "../supabase.js";

/* GET ALL USERS */
export const getUsers = async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, name, email, role");

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
};

/* GET USER BY ID */
export const getUserById = async (req, res) => {
  const id = Number(req.params.id);

  const { data, error } = await supabase
    .from("users")
    .select("id, username, name, email, role")
    .eq("id", id)
    .single(); // lấy 1 row

  if (error) return res.status(404).json({ error: error.message });

  res.json(data);
};

/* CREATE USER */
export const createUser = async (req, res) => {
  try {
    const { username, name, email, password, role } = req.body;

    if (!password) return res.status(400).json({ error: "Password is required" });

    const hashed = await bcrypt.hash(String(password), 10);

    const { data, error } = await supabase
      .from("users")
      .insert([{ username, name, email, password: hashed, role }])
      .select("id, username, name, email, role")
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, user: data });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
};

/* UPDATE USER */
export const updateUser = async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, role } = req.body;

  const { data, error } = await supabase
    .from("users")
    .update({ name, email, role })
    .eq("id", id)
    .select("id, username, name, email, role")
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json({ success: true, user: data });
};
