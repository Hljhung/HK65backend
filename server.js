// server.js
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      username VARCHAR(50) PRIMARY KEY,
      score INT NOT NULL
    );
  `);
}
initDB().catch(err => {
  console.error("Failed to init DB:", err);
  process.exit(1);
});

// GET toàn bộ bảng xếp hạng (giảm dần)
app.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query("SELECT username, score FROM leaderboard ORDER BY score DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// GET kiểm tra 1 username
app.get("/player/:username", async (req, res) => {
  const username = req.params.username;
  try {
    const result = await pool.query("SELECT score FROM leaderboard WHERE username = $1", [username]);
    if (result.rows.length) {
      res.json({ exists: true, score: result.rows[0].score });
    } else {
      res.json({ exists: false, score: null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// POST lưu điểm (chỉ cập nhật nếu điểm mới cao hơn)
app.post("/submit", async (req, res) => {
  const { username, score } = req.body;
  if (!username || typeof score !== "number") {
    return res.status(400).json({ error: "Invalid input" });
  }
  try {
    await pool.query(
      `INSERT INTO leaderboard (username, score) VALUES ($1, $2)
       ON CONFLICT (username)
       DO UPDATE SET score = GREATEST(leaderboard.score, EXCLUDED.score);`,
      [username, score]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
