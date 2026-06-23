const express = require('express');
const dayjs = require('dayjs');
const db = require('../db');
const { rupiah } = require('../utils/format');

const router = express.Router();

router.get('/', (req, res) => {
  const today = dayjs().format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

  const todaySales = db.prepare(`SELECT COALESCE(SUM(total),0) t FROM sales WHERE sale_date = ?`).get(today).t;
  const monthSales = db.prepare(`SELECT COALESCE(SUM(total),0) t FROM sales WHERE sale_date >= ?`).get(monthStart).t;
  const monthPurchases = db.prepare(`SELECT COALESCE(SUM(total),0) t FROM purchases WHERE purchase_date >= ?`).get(monthStart).t;
  const receivables = db.prepare(`SELECT COALESCE(SUM(total - paid_amount),0) t FROM sales WHERE status='belum_lunas'`).get().t;
  const payables = db.prepare(`SELECT COALESCE(SUM(total - paid_amount),0) t FROM purchases WHERE status='belum_lunas'`).get().t;
  const lowStock = db.prepare(`SELECT * FROM products WHERE stock <= min_stock AND is_active = 1 ORDER BY stock ASC LIMIT 8`).all();
  const recentSales = db.prepare(`
    SELECT s.*, c.name as customer_name FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    ORDER BY s.id DESC LIMIT 8
  `).all();

  res.render('dashboard', {
    title: 'Dashboard',
    todaySales, monthSales, monthPurchases, receivables, payables, lowStock, recentSales, rupiah,
  });
});

module.exports = router;
