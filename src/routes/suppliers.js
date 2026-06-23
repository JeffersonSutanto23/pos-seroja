const express = require('express');
const db = require('../db');
const { rupiah } = require('../utils/format');

const router = express.Router();

router.get('/', (req, res) => {
  const suppliers = db.prepare(`
    SELECT s.*,
      (SELECT COALESCE(SUM(total),0) FROM purchases WHERE supplier_id = s.id) as total_pembelian,
      (SELECT COALESCE(SUM(total - paid_amount),0) FROM purchases WHERE supplier_id = s.id AND status='belum_lunas') as outstanding
    FROM suppliers s ORDER BY s.name ASC
  `).all();
  res.render('suppliers', { title: 'Supplier', suppliers, rupiah });
});

router.post('/', (req, res) => {
  const { name, phone, address } = req.body;
  db.prepare('INSERT INTO suppliers (name, phone, address) VALUES (?,?,?)').run(name, phone || null, address || null);
  res.redirect('/suppliers');
});

router.post('/:id/update', (req, res) => {
  const { name, phone, address } = req.body;
  db.prepare('UPDATE suppliers SET name=?, phone=?, address=? WHERE id=?').run(name, phone || null, address || null, req.params.id);
  res.redirect('/suppliers');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.redirect('/suppliers');
});

module.exports = router;
