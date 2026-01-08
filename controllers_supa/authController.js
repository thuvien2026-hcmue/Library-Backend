import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../supabase.js";

/* ===== SIGN UP ===== */
export const signup = async (req, res) => {
  const { username, name, email, password } = req.body;

  try {
    if (!email || !password || !username) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 1) check email exists
    const { data: exist, error: existErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (existErr) return res.status(400).json({ message: existErr.message });

    if (exist && exist.length) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 2) hash password
    const hashed = await bcrypt.hash(String(password), 10);

    // 3) insert user
    const { error: insErr } = await supabase.from("users").insert([
      {
        username,
        name,
        email,
        password: hashed,
        // role: "user" // nếu muốn set mặc định
      },
    ]);

    if (insErr) return res.status(400).json({ message: insErr.message });

    res.json({ success: true });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
};

/* ===== SIGN IN ===== */
export const signin = async (req, res) => {
  const { email, password } = req.body;

  // 1) Validate input
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // 2) Find user by email
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, name, email, password, role")
      .eq("email", email)
      .single(); // lấy đúng 1 row

    // Supabase: nếu không tìm thấy thường sẽ error (PGRST116)
    if (error || !user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3) Compare password
    const match = await bcrypt.compare(String(password), user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 4) Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
        algorithm: "HS256",
      }
    );

    // 5) Response (không trả password)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ message: "Signin failed" });
  }
};

/* ===== GET ME ===== */
// req.user.id lấy từ middleware verifyToken của bạn
export const getMe = async (req, res) => {
  try {
    const id = Number(req.user.id);

    const { data, error } = await supabase
      .from("users")
      .select("id, username, name, email, role")
      .eq("id", id)
      .single();

    if (error) return res.status(400).json({ message: error.message });

    res.json(data);
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};
