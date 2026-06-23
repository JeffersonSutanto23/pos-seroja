const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

function hash(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT u.*, r.name as role_name FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    ORDER BY u.full_name ASC
  `).all();
  const roles = db.prepare('SELECT * FROM roles ORDER BY name').all();
  res.render('users', { title: 'Pengguna', users, roles });
});

router.post('/', (req, res) => {
  const { username, password, full_name, role_id } = req.body;
  try {
    db.prepare('INSERT INTO users (username, password, full_name, role_id) VALUES (?,?,?,?)')
      .run(username.trim(), hash(password), full_name.trim(), role_id || null);
  } catch (err) {
    return res.status(400).send('Gagal menambah pengguna: username mungkin sudah dipakai.');
  }
  res.redirect('/users');
});

router.post('/:id/update', (req, res) => {
  const { full_name, role_id, password } = req.body;
  if (password && password.trim()) {
    db.prepare('UPDATE users SET full_name=?, role_id=?, password=? WHERE id=?')
      .run(full_name.trim(), role_id || null, hash(password), req.params.id);
  } else {
    db.prepare('UPDATE users SET full_name=?, role_id=? WHERE id=?')
      .run(full_name.trim(), role_id || null, req.params.id);
  }
  res.redirect('/users');
});

router.post('/:id/toggle-active', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (user) {
    if (user.id === req.session.user.id) {
      return res.status(400).send('Tidak bisa menonaktifkan akun yang sedang login.');
    }
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, user.id);
  }
  res.redirect('/users');
});

router.post('/:id/delete', (req, res) => {
  if (Number(req.params.id) === req.session.user.id) {
    return res.status(400).send('Tidak bisa menghapus akun yang sedang login.');
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.redirect('/users');
});

module.exports = router;
