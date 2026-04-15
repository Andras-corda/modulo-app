const express = require('express');
const db      = require('../db');
const router  = express.Router();

function adminOnly(req, res, next) {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY)
    return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET /api/downloads
router.get('/', (req, res) => {
  try { res.json(db.getApp()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/downloads/track — incrémente le compteur app (public)
router.post('/track', (req, res) => {
  try {
    const app = db.getApp();
    app.appDownloads = (app.appDownloads ?? 0) + 1;
    db.updateApp({ appDownloads: app.appDownloads });
    res.json({ ok: true, total: app.appDownloads });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/downloads (admin)
router.put('/', adminOnly, (req, res) => {
  try { db.updateApp(req.body); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
