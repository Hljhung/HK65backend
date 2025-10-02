import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 10000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// Tạo bảng nếu chưa có
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        username TEXT PRIMARY KEY,
        score INT NOT NULL
      )
    `);
    console.log("✅ Bảng leaderboard đã sẵn sàng");
  } catch (err) {
    console.error("Lỗi tạo bảng:", err);
  }
})();

// Lấy bảng xếp hạng
app.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM leaderboard ORDER BY score DESC LIMIT 20");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Gửi điểm
app.post("/submit", async (req, res) => {
  const { username, score } = req.body;
  if (!username || typeof score !== "number") {
    return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
  }

  try {
    const result = await pool.query("SELECT * FROM leaderboard WHERE username=$1", [username]);
    if (result.rows.length === 0) {
      await pool.query("INSERT INTO leaderboard (username, score) VALUES ($1, $2)", [username, score]);
    } else {
      if (score > result.rows[0].score) {
        await pool.query("UPDATE leaderboard SET score=$1 WHERE username=$2", [score, username]);
      }
    }
    res.json({ message: "Đã lưu điểm thành công" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
