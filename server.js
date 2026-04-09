const express = require('express');
const { Pool } = require('pg');
const path    = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));

// ── Base de datos ──────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS storage (
        key     TEXT PRIMARY KEY,
        value   TEXT,
        updated TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ Base de datos lista');
  } catch(e) {
    console.error('❌ Error DB:', e.message);
  }
}

// ── API RUTAS (ANTES del static) ──────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/storage/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  try {
    await pool.query(
      `INSERT INTO storage(key, value, updated)
       VALUES($1, $2, NOW())
       ON CONFLICT(key) DO UPDATE SET value=$2, updated=NOW()`,
      [key, JSON.stringify(value)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Error guardando:', key, e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/storage', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM storage');
    const data = {};
    result.rows.forEach(row => {
      try { data[row.key] = JSON.parse(row.value); }
      catch { data[row.key] = row.value; }
    });
    res.json(data);
  } catch (e) {
    console.error('Error cargando:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Archivos estáticos (DESPUÉS del API) ──────────────────────
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Arrancar ──────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
  });
});
