const express = require('express');
const dayjs = require('dayjs');
const db = require('../db');
const { rupiah } = require('../utils/format');

const router = express.Router();

function generateInvoiceNo() {
  const today = dayjs().format('YYYYMMDD');
  const count = db.prepare(`SELECT COUNT(*) c FROM sales WHERE invoice_no LIKE ?`).get(`INV-${today}-%`).c;
  return `INV-${today}-${String(count + 1).padStart(4, '0')}`;
}

router.get('/', (req, res) => {
  const products = db.prepare(`SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC`).all();
  const customers = db.prepare(`SELECT * FROM customers ORDER BY name ASC`).all();
  res.render('pos', { title: 'Kasir (POS)', products, customers, rupiah });
});

router.post('/checkout', (req, res) => {
  try {
    const { items, payment_type, payment_method, customer_id, new_customer_name, discount, paid_amount, notes } = req.body;
    const cart = JSON.parse(items || '[]');
    if (!cart.length) return res.status(400).json({ error: 'Keranjang kosong.' });

    if (payment_type === 'credit' && !customer_id && !new_customer_name) {
      return res.status(400).json({ error: 'Nama customer wajib diisi untuk transaksi kredit.' });
    }

    const result = db.transaction(() => {
      let custId = customer_id ? Number(customer_id) : null;
      if (!custId && new_customer_name) {
        const r = db.prepare('INSERT INTO customers (name) VALUES (?)').run(new_customer_name.trim());
        custId = r.lastInsertRowid;
      }

      let subtotal = 0;
      const productStmt = db.prepare('SELECT * FROM products WHERE id = ?');
      const stockStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      const validatedItems = [];

      for (const it of cart) {
        const product = productStmt.get(it.product_id);
        if (!product) throw new Error(`Produk tidak ditemukan (ID ${it.product_id})`);
        if (product.stock < it.qty) throw new Error(`Stok ${product.name} tidak cukup (sisa ${product.stock})`);
        const lineTotal = product.sell_price * Number(it.qty);
        subtotal += lineTotal;
        validatedItems.push({ product, qty: Number(it.qty), price: product.sell_price, subtotal: lineTotal });
      }

      const disc = Number(discount) || 0;
      const total = Math.max(subtotal - disc, 0);
      const paid = payment_type === 'cash' ? total : (Number(paid_amount) || 0);
      const status = paid >= total ? 'lunas' : 'belum_lunas';
      const invoiceNo = generateInvoiceNo();

      const saleRes = db.prepare(`
        INSERT INTO sales (invoice_no, sale_date, customer_id, payment_type, payment_method, subtotal, discount, total, paid_amount, status, notes, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(invoiceNo, dayjs().format('YYYY-MM-DD'), custId, payment_type, payment_method, subtotal, disc, total, paid, status, notes || null, req.session.user.id);

      const saleId = saleRes.lastInsertRowid;
      const itemStmt = db.prepare(`INSERT INTO sale_items (sale_id, product_id, qty, price, subtotal) VALUES (?,?,?,?,?)`);
      for (const it of validatedItems) {
        itemStmt.run(saleId, it.product.id, it.qty, it.price, it.subtotal);
        stockStmt.run(it.qty, it.product.id);
      }

      if (paid > 0) {
        db.prepare(`INSERT INTO sale_payments (sale_id, amount, payment_method) VALUES (?,?,?)`)
          .run(saleId, paid, payment_method);
      }

      return saleId;
    })();

    res.json({ success: true, sale_id: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
