// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ROUTES
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";
import pageblockRoutes from "./routes/pageblockRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import formResultRoutes from "./routes/formResultRoutes.js";
import vanbanRoutes from "./routes/vanbanRoutes.js";
import trendbookRoutes from "./routes/trendBookRoutes.js";
import histatsRoutes from "./routes/histatsRoutes.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/page-blocks", pageblockRoutes);
app.use("/api/form-results", formResultRoutes);
app.use("/api/vanban", vanbanRoutes);
app.use("/api/trend-books", trendbookRoutes);

app.use("/api/histats", histatsRoutes);


// Media Route
app.use("/api/media", mediaRoutes);

// health check
app.get("/health", (req, res) => res.json({ ok: true }));

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
