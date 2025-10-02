const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 Render tự cấp DATABASE_URL trong Environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Tạo bảng nếu chưa có
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE,
      score INT
    )
  `);
})();

// ✅ Lấy toàn bộ leaderboard
app.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query("SELECT name, score FROM leaderboard ORDER BY score DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});

// ✅ Lưu điểm
app.post("/leaderboard", async (req, res) => {
  const { name, score } = req.body;
  if (!name || score === undefined) {
    return res.status(400).send("Thiếu dữ liệu");
  }

  try {
    const existing = await pool.query("SELECT * FROM leaderboard WHERE name = $1", [name]);

    if (existing.rows.length > 0) {
      // Nếu có thì update nếu điểm mới cao hơn
      if (score > existing.rows[0].score) {
        await pool.query("UPDATE leaderboard SET score = $1 WHERE name = $2", [score, name]);
      }
    } else {
      // Nếu chưa có thì thêm mới
      await pool.query("INSERT INTO leaderboard (name, score) VALUES ($1, $2)", [name, score]);
    }

    res.send("Đã lưu điểm");
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});

// ✅ Reset bảng xếp hạng (dành cho admin hljhung)
app.post("/reset", async (req, res) => {
  try {
    await pool.query("DELETE FROM leaderboard");
    res.send("Đã reset bảng xếp hạng");
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi khi reset");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
