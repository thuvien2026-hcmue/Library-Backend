import bcrypt from "bcryptjs";
import { pool } from "../db.js";

/* GET ALL USERS */
export const getUsers = async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, username, name, email, role FROM users"
  );
  res.json(rows);
};

/* GET USER BY ID */
export const getUserById = async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, username, name, email, role FROM users WHERE id = ?",
    [req.params.id]
  );
  res.json(rows[0]);
};

/* CREATE USER */
export const createUser = async (req, res) => {
  const { username, name, email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (username, name, email, password, role)
     VALUES (?, ?, ?, ?, ?)`,
    [username, name, email, hashed, role]
  );

  res.json({ success: true });
};

/* UPDATE USER */
export const updateUser = async (req, res) => {
  const { name, email, role } = req.body;

  await pool.query(
    "UPDATE users SET name=?, email=?, role=? WHERE id=?",
    [name, email, role, req.params.id]
  );

  res.json({ success: true });
};
