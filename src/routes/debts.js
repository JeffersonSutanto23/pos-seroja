const express = require('express');
const db = require('../db');
const { rupiah, dateID } = require('../utils/format');

const router = express.Router();

function requireManage(req, res, next) {
  if (req.session.user.permissions.includes('debts.manage')) return next();
  res.status(403).render('403', { title: 'Akses Ditolak' });
}

router.get('/', (req, res) => {
  const receivables = db.prepare(`
    SELECT s.*, c.name as customer_name, (s.total - s.paid_amount) as remaining
    FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
    WHERE s.status = 'belum_lunas' ORDER BY s.sale_date ASC
  `).all();
  const payables = db.prepare(`
    SELECT p.*, s.name as supplier_name, (p.total - p.paid_amount) as remaining
    FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.status = 'belum_lunas' ORDER BY p.purchase_date ASC
  `).all();
  res.render('debts', { title: 'Hutang / Piutang', receivables, payables, rupiah, dateID });
});

router.post('/receivable/:id/pay', requireManage, (req, res) => {
  const amount = Number(req.body.amount) || 0;
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (sale && amount > 0) {
    const newPaid = Math.min(sale.paid_amount + amount, sale.total);
    const status = newPaid >= sale.total ? 'lunas' : 'belum_lunas';
    db.prepare('UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?').run(newPaid, status, sale.id);
    db.prepare('INSERT INTO sale_payments (sale_id, amount, payment_method) VALUES (?,?,?)').run(sale.id, amount, req.body.payment_method || 'cash');
  }
  res.redirect('/debts');
});

router.post('/payable/:id/pay', requireManage, (req, res) => {
  const amount = Number(req.body.amount) || 0;
  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (purchase && amount > 0) {
    const newPaid = Math.min(purchase.paid_amount + amount, purchase.total);
    const status = newPaid >= purchase.total ? 'lunas' : 'belum_lunas';
    db.prepare('UPDATE purchases SET paid_amount = ?, status = ? WHERE id = ?').run(newPaid, status, purchase.id);
    db.prepare('INSERT INTO purchase_payments (purchase_id, amount, payment_method) VALUES (?,?,?)').run(purchase.id, amount, req.body.payment_method || 'cash');
  }
  res.redirect('/debts');
});

module.exports = router;
