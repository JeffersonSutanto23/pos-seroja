const express = require('express');
const db = require('../db');
const { rupiah } = require('../utils/format');

const router = express.Router();

router.get('/', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    ORDER BY p.name ASC
  `).all();
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
  res.render('inventory', { title: 'Inventory Stok', products, categories, suppliers, rupiah });
});

router.post('/', (req, res) => {
  const { sku, name, category_id, unit, cost_price, sell_price, stock, min_stock, supplier_id } = req.body;
  db.prepare(`
    INSERT INTO products (sku, name, category_id, unit, cost_price, sell_price, stock, min_stock, supplier_id)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(sku || null, name, category_id || null, unit || 'pcs', Number(cost_price) || 0, Number(sell_price) || 0, Number(stock) || 0, Number(min_stock) || 0, supplier_id || null);
  res.redirect('/inventory');
});

router.post('/:id/update', (req, res) => {
  const { name, category_id, unit, cost_price, sell_price, stock, min_stock, supplier_id, sku } = req.body;
  db.prepare(`
    UPDATE products SET sku=?, name=?, category_id=?, unit=?, cost_price=?, sell_price=?, stock=?, min_stock=?, supplier_id=?
    WHERE id = ?
  `).run(sku || null, name, category_id || null, unit, Number(cost_price) || 0, Number(sell_price) || 0, Number(stock) || 0, Number(min_stock) || 0, supplier_id || null, req.params.id);
  res.redirect('/inventory');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.redirect('/inventory');
});

module.exports = router;
