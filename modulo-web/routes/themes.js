const express = require('express');
const db      = require('../db');
const router  = express.Router();

function adminOnly(req, res, next) {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY)
    return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET /api/themes
router.get('/', (req, res) => {
  try {
    res.json(db.getThemes({
      tag: req.query.tag,
      q:   req.query.q,
    }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/themes/:id
router.get('/:id', (req, res) => {
  try {
    const theme = db.getTheme(req.params.id);
    if (!theme) return res.status(404).json({ error: 'Theme not found' });
    res.json(theme);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/themes/:id/download — incrémente le compteur (public)
router.post('/:id/download', (req, res) => {
  try {
    db.incrementThemeDownloads(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/themes (admin) — créer/modifier un thème
router.post('/', adminOnly, (req, res) => {
  try {
    db.upsertTheme(req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/themes/:id (admin)
router.delete('/:id', adminOnly, (req, res) => {
  try {
    db.deleteTheme(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
