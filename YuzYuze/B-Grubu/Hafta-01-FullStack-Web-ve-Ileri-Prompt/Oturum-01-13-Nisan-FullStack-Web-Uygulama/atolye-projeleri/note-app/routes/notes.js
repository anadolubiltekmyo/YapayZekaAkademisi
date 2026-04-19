const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All note routes require authentication
router.use(authMiddleware);

// Get all notes for the current user
router.get('/', (req, res) => {
  const { search, sort } = req.query;
  let query = 'SELECT * FROM notes WHERE user_id = ?';
  const params = [req.user.id];

  if (search) {
    query += ' AND (title LIKE ? OR content LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  // Pinned notes first, then sort by chosen criteria
  if (sort === 'title') {
    query += ' ORDER BY pinned DESC, title COLLATE NOCASE ASC';
  } else if (sort === 'created') {
    query += ' ORDER BY pinned DESC, created_at DESC';
  } else {
    query += ' ORDER BY pinned DESC, updated_at DESC';
  }

  const notes = db.prepare(query).all(...params);
  res.json({ notes });
});

// Get single note
router.get('/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!note) {
    return res.status(404).json({ error: 'Not bulunamadı' });
  }
  res.json({ note });
});

// Create note
router.post('/', (req, res) => {
  const { title, content, color } = req.body;

  if (!title && !content) {
    return res.status(400).json({ error: 'Başlık veya içerik gereklidir' });
  }

  const result = db.prepare(
    'INSERT INTO notes (user_id, title, content, color) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, title || '', content || '', color || '#ffffff');

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ note });
});

// Update note
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) {
    return res.status(404).json({ error: 'Not bulunamadı' });
  }

  const { title, content, color, pinned } = req.body;

  db.prepare(
    'UPDATE notes SET title = ?, content = ?, color = ?, pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
  ).run(
    title !== undefined ? title : existing.title,
    content !== undefined ? content : existing.content,
    color !== undefined ? color : existing.color,
    pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned,
    req.params.id,
    req.user.id
  );

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json({ note });
});

// Toggle pin
router.patch('/:id/pin', (req, res) => {
  const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) {
    return res.status(404).json({ error: 'Not bulunamadı' });
  }

  db.prepare('UPDATE notes SET pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(existing.pinned ? 0 : 1, req.params.id);

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json({ note });
});

// Delete note
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) {
    return res.status(404).json({ error: 'Not bulunamadı' });
  }

  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Not silindi' });
});

module.exports = router;
