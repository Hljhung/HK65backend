import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Kết nối PostgreSQL (Render tự cấp DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Tạo bảng nếu chưa tồn tại
const createTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        score INT NOT NULL
      );
    `);
    console.log("✅ Bảng leaderboard đã sẵn sàng");
  } catch (err) {
    console.error("❌ Lỗi tạo bảng:", err);
  }
};

createTable();

// API lấy bảng xếp hạng
app.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT name, score FROM leaderboard ORDER BY score DESC LIMIT 10"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Lỗi /leaderboard:", err);
    res.status(500).send("Server error");
  }
});

// API lưu điểm
app.post("/leaderboard", async (req, res) => {
  const { name, score } = req.body;
  if (!name || !score) {
    return res.status(400).send("Thiếu dữ liệu");
  }

  try {
    await pool.query("INSERT INTO leaderboard (name, score) VALUES ($1, $2)", [
      name,
      score
    ]);
    res.send("✅ Lưu điểm thành công");
  } catch (err) {
    console.error("❌ Lỗi /leaderboard (POST):", err);
    res.status(500).send("Server error");
  }
});

// API reset leaderboard nếu người chơi là admin
app.post("/reset", async (req, res) => {
  const { name } = req.body;
  if (name !== "admin hljhung") {
    return res.status(403).send("Bạn không có quyền reset");
  }

  try {
    await pool.query("TRUNCATE leaderboard");
    res.send("✅ Bảng xếp hạng đã reset");
  } catch (err) {
    console.error("❌ Lỗi /reset:", err);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại cổng ${PORT}`);
});
