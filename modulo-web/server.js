const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT ?? 3000;

// ── Middlewares ───────────────────────────────────────────────────────────────

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting 200 req / 15 min
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
}));

// Statique (modules JS buildés + SPA publique)
app.use(express.static(path.join(__dirname, 'public')));

// Routes 

app.use('/api/modules',   require('./routes/modules'));
app.use('/api/downloads', require('./routes/downloads'));
app.use('/api/themes',    require('./routes/themes'));

// Health 

app.get('/health', (req, res) => {
  const { getStats } = require('./db');
  const stats = getStats();
  res.json({ status: 'ok', modules: stats.total, uptime: Math.floor(process.uptime()), version: require('./db').getApp().version });
});

// SPA fallback 

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Modulo Web] http://0.0.0.0:${PORT}`);
  console.log(`[Modulo Web] Base de données : data/db.json`);
  console.log(`[Modulo Web] Modules : ${require('./db').getStats().total}`);
});
