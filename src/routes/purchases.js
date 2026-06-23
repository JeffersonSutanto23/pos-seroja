const express = require('express');
const dayjs = require('dayjs');
const db = require('../db');
const { rupiah, dateID } = require('../utils/format');

const router = express.Router();

router.get('/', (req, res) => {
  const purchases = db.prepare(`
    SELECT p.*, s.name as supplier_name FROM purchases p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    ORDER BY p.id DESC LIMIT 200
  `).all();
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
  const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name').all();
  res.render('purchases', { title: 'Pembelian', purchases, suppliers, products, rupiah, dateID });
});

router.post('/', (req, res) => {
  try {
    const { supplier_id, purchase_date, invoice_no, items, paid_amount, notes } = req.body;
    const cart = JSON.parse(items || '[]');
    if (!cart.length) return res.status(400).json({ error: 'Item pembelian kosong.' });

    db.transaction(() => {
      let total = 0;
      cart.forEach(i => { total += Number(i.price) * Number(i.qty); });
      const paid = Number(paid_amount) || 0;
      const status = paid >= total ? 'lunas' : 'belum_lunas';

      const result = db.prepare(`
        INSERT INTO purchases (invoice_no, purchase_date, supplier_id, total, paid_amount, status, notes)
        VALUES (?,?,?,?,?,?,?)
      `).run(invoice_no || null, purchase_date || dayjs().format('YYYY-MM-DD'), supplier_id, total, paid, status, notes || null);

      const purchaseId = result.lastInsertRowid;
      const itemStmt = db.prepare(`INSERT INTO purchase_items (purchase_id, product_id, qty, price, subtotal) VALUES (?,?,?,?,?)`);
      const stockStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      cart.forEach(i => {
        const subtotal = Number(i.price) * Number(i.qty);
        itemStmt.run(purchaseId, i.product_id, i.qty, i.price, subtotal);
        stockStmt.run(i.qty, i.product_id);
      });

      if (paid > 0) {
        db.prepare('INSERT INTO purchase_payments (purchase_id, amount, payment_method) VALUES (?,?,?)').run(purchaseId, paid, 'cash');
      }
    })();

    res.redirect('/purchases');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

module.exports = router;
