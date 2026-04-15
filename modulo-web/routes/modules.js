const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const db      = require('../db');

const router      = express.Router();
const MODULES_DIR = path.join(__dirname, '../public/modules');

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, MODULES_DIR),
  filename:    (_, file, cb) => cb(null, file.originalname),
});
const upload = multer({
  storage,
  fileFilter: (_, file, cb) =>
    file.originalname.endsWith('.js') ? cb(null, true) : cb(new Error('Fichiers .js uniquement')),
  limits: { fileSize: 2 * 1024 * 1024 },
});

function adminOnly(req, res, next) {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY)
    return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// GET /api/modules/stats
router.get('/stats', (req, res) => {
  try { res.json(db.getStats()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/modules
router.get('/', (req, res) => {
  try { res.json(db.getModules({ category: req.query.category, q: req.query.q })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/modules/:id
router.get('/:id', (req, res) => {
  try {
    const mod = db.getModule(req.params.id);
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    res.json(mod);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/modules/:id/download — sert le fichier JS + incrémente compteur
router.get('/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(MODULES_DIR, `${id}.js`);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: 'Fichier JS introuvable' });

    db.incrementModuleDownloads(id);
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.js"`);
    res.sendFile(filePath);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/modules/:id/info
router.get('/:id/info', (req, res) => {
  try {
    const mod = db.getModule(req.params.id);
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    const filePath  = path.join(MODULES_DIR, `${mod.id}.js`);
    const available = fs.existsSync(filePath);
    res.json({
      version:   mod.version,
      size:      mod.size,
      downloads: mod.downloads ?? 0,
      scriptUrl: mod.scriptUrl,
      available,
      bytes:     available ? fs.statSync(filePath).size : null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/modules (admin)
router.post('/', adminOnly, (req, res) => {
  try { db.upsertModule(req.body); res.status(201).json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/modules/:id (admin) — upsert complet
router.put('/:id', adminOnly, (req, res) => {
  try {
    db.upsertModule({ ...req.body, id: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/modules/:id (admin)
router.delete('/:id', adminOnly, (req, res) => {
  try {
    db.deleteModule(req.params.id);
    const fp = path.join(MODULES_DIR, `${req.params.id}.js`);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/modules/:id/upload (admin) — dépose le fichier JS buildé
router.post('/:id/upload', adminOnly, upload.single('file'), (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const dest = path.join(MODULES_DIR, `${id}.js`);
    if (req.file.path !== dest) fs.renameSync(req.file.path, dest);

    const sizeKb   = `${Math.round(fs.statSync(dest).size / 1024)} KB`;
    const baseUrl  = process.env.RAILWAY_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
    const scriptUrl = `${baseUrl}/modules/${id}.js`;

    db.upsertModule({ id, scriptUrl, size: sizeKb });
    res.json({ ok: true, scriptUrl, size: sizeKb });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
