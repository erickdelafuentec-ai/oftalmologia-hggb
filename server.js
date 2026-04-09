const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Guardar datos
app.post('/api/save', async (req, res) => {
  const { key, value } = req.body;
  await pool.query(`INSERT INTO storage(key,value) VALUES($1,$2)
    ON CONFLICT(key) DO UPDATE SET value=$2, updated=NOW()`, [key, value]);
  res.json({ ok: true });
});

// Leer datos
app.get('/api/load/:key', async (req, res) => {
  const r = await pool.query('SELECT value FROM storage WHERE key=$1', [req.params.key]);
  res.json({ value: r.rows[0]?.value || null });
});

app.listen(process.env.PORT || 3000);