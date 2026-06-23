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

  // --- Grafik penjualan bulanan (filter per tahun) -----------------------
  const availableYears = db.prepare(`SELECT DISTINCT strftime('%Y', sale_date) y FROM sales ORDER BY y DESC`).all().map(r => r.y);
  const currentYear = String(dayjs().year());
  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear);
  const selectedYear = availableYears.includes(req.query.year) ? req.query.year : currentYear;

  const monthlyRows = db.prepare(`
    SELECT strftime('%m', sale_date) m, COALESCE(SUM(total),0) t
    FROM sales WHERE strftime('%Y', sale_date) = ? GROUP BY m
  `).all(selectedYear);
  const monthlySales = Array.from({ length: 12 }, (_, i) => {
    const row = monthlyRows.find(r => r.m === String(i + 1).padStart(2, '0'));
    return row ? row.t : 0;
  });

  // --- Produk paling populer & tidak populer ------------------------------
  const topProducts = db.prepare(`
    SELECT p.name, p.unit, SUM(si.qty) as qty_sold
    FROM sale_items si JOIN products p ON p.id = si.product_id
    GROUP BY si.product_id ORDER BY qty_sold DESC LIMIT 5
  `).all();
  const bottomProducts = db.prepare(`
    SELECT p.name, p.unit, COALESCE(SUM(si.qty), 0) as qty_sold
    FROM products p LEFT JOIN sale_items si ON si.product_id = p.id
    WHERE p.is_active = 1
    GROUP BY p.id ORDER BY qty_sold ASC LIMIT 5
  `).all();

  // --- Notifikasi: jatuh tempo piutang (2 bulan) & hutang (per supplier) -
  const receivableDueDate = dayjs().subtract(2, 'month').format('YYYY-MM-DD');
  const overdueReceivables = db.prepare(`
    SELECT s.*, c.name as customer_name FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    WHERE s.status = 'belum_lunas' AND s.sale_date <= ?
    ORDER BY s.sale_date ASC
  `).all(receivableDueDate);

  const overduePayables = db.prepare(`
    SELECT p.*, s.name as supplier_name, s.due_days
    FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.status = 'belum_lunas'
      AND date(p.purchase_date, '+' || s.due_days || ' days') <= date('now')
    ORDER BY p.purchase_date ASC
  `).all();

  res.render('dashboard', {
    title: 'Dashboard',
    todaySales, monthSales, monthPurchases, receivables, payables, lowStock, recentSales, rupiah,
    availableYears, selectedYear, monthlySales,
    topProducts, bottomProducts,
    overdueReceivables, overduePayables, dateID: require('../utils/format').dateID,
  });
});

module.exports = router;
