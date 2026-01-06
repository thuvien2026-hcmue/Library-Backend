import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

/* ===== SIGN UP ===== */
export const signup = async (req, res) => {
  const { username, name, email, password } = req.body;

  try {
    const [exist] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (exist.length)
      return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, name, email, password)
       VALUES (?, ?, ?, ?)`,
      [username, name, email, hashed]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Signup failed" });
  }
};

/* ===== SIGN IN ===== */
export const signin = async (req, res) => {
  const { email, password } = req.body;

  // 1️⃣ Validate input
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  try {
    // 2️⃣ Find user
    const [rows] = await pool.query(
      "SELECT id, username, name, email, password, role FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    // 3️⃣ Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 4️⃣ Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,     // 👈 useful for frontend
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
        algorithm: "HS256",
      }
    );

    // 5️⃣ Response (KHÔNG trả password)
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
    res.status(500).json({
      message: "Signin failed",
    });
  }
};


export const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, name, email, role FROM users WHERE id = ?",
      [req.user.id]
    );

    res.json(rows[0]);
  } catch {
    res.status(500).json({ message: "Failed to fetch user" });
  }
};
