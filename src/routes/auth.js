const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

function hash(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function loadPermissions(roleId) {
  if (!roleId) return [];
  return db.prepare(`
    SELECT p.key FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    WHERE rp.role_id = ?
  `).all(roleId).map(r => r.key);
}

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.password !== hash(password)) {
    return res.render('login', { error: 'Username atau password salah.' });
  }
  if (!user.is_active) {
    return res.render('login', { error: 'Akun ini sudah dinonaktifkan. Hubungi administrator.' });
  }
  const role = user.role_id ? db.prepare('SELECT * FROM roles WHERE id = ?').get(user.role_id) : null;
  req.session.user = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role_id: user.role_id,
    role_name: role ? role.name : '-',
    permissions: loadPermissions(user.role_id),
  };
  res.redirect('/');
});

module.exports = router;
