const express = require('express');
const db = require('../db');
const { rupiah } = require('../utils/format');

const router = express.Router();

router.get('/', (req, res) => {
  const customers = db.prepare(`
    SELECT c.*,
      (SELECT COALESCE(SUM(total),0) FROM sales WHERE customer_id = c.id) as total_belanja,
      (SELECT COALESCE(SUM(total - paid_amount),0) FROM sales WHERE customer_id = c.id AND status='belum_lunas') as outstanding
    FROM customers c ORDER BY c.name ASC
  `).all();
  res.render('customers', { title: 'Customer', customers, rupiah });
});

router.post('/', (req, res) => {
  const { name, phone, address } = req.body;
  db.prepare('INSERT INTO customers (name, phone, address) VALUES (?,?,?)').run(name, phone || null, address || null);
  res.redirect('/customers');
});

router.post('/:id/update', (req, res) => {
  const { name, phone, address } = req.body;
  db.prepare('UPDATE customers SET name=?, phone=?, address=? WHERE id=?').run(name, phone || null, address || null, req.params.id);
  res.redirect('/customers');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.redirect('/customers');
});

module.exports = router;
