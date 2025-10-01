const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Kết nối database qua DATABASE_URL (Render cung cấp)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Khởi tạo DB (tạo bảng nếu chưa có)
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        username VARCHAR(50) PRIMARY KEY,
        score INT NOT NULL
      );
    `);
    console.log("✅ Database initialized");
  } catch (err) {
    console.error("❌ Failed to init DB:", err);
  }
}

// API: Lấy bảng xếp hạng (sắp xếp theo điểm giảm dần)
app.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username, score FROM leaderboard ORDER BY score DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// API: Gửi điểm
app.post("/submit", async (req, res) => {
  const { username, score } = req.body;

  if (!username || typeof score !== "number") {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    await pool.query(
      `
      INSERT INTO leaderboard (username, score)
      VALUES ($1, $2)
      ON CONFLICT (username)
      DO UPDATE SET score = GREATEST(leaderboard.score, EXCLUDED.score);
      `,
      [username, score]
    );

    res.json({ success: true, message: "Score saved successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Khởi chạy server
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`✅ Server running on ${PORT}`);
  await initDB();
});
