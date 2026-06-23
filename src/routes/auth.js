const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

function hash(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
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
  req.session.user = { id: user.id, username: user.username, full_name: user.full_name, role: user.role };
  res.redirect('/');
});

module.exports = router;
