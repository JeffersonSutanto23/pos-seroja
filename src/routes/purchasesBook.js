const express = require('express');
const dayjs = require('dayjs');
const db = require('../db');
const { rupiah, MONTHS } = require('../utils/format');

const router = express.Router();

router.get('/', (req, res) => {
  const year = Number(req.query.year) || dayjs().year();
  const month = Number(req.query.month) || dayjs().month() + 1;
  const ym = `${year}-${String(month).padStart(2, '0')}`;

  const purchases = db.prepare(`
    SELECT p.purchase_date, p.total, s.name as supplier_name
    FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE strftime('%Y-%m', p.purchase_date) = ?
    ORDER BY p.purchase_date ASC
  `).all(ym);

  // Top suppliers this month become their own column (like NIPPON / P M P in the spreadsheet)
  const supplierTotals = {};
  purchases.forEach(p => {
    supplierTotals[p.supplier_name] = (supplierTotals[p.supplier_name] || 0) + p.total;
  });
  const topSuppliers = Object.entries(supplierTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(e => e[0]);

  const columnTotals = {};
  topSuppliers.forEach(s => columnTotals[s] = 0);
  let grandTotal = 0;
  purchases.forEach(p => {
    grandTotal += p.total;
    if (topSuppliers.includes(p.supplier_name)) columnTotals[p.supplier_name] += p.total;
  });

  res.render('purchases-book', { title: 'Pembukuan Pembelian', year, month, purchases, topSuppliers, columnTotals, grandTotal, MONTHS, rupiah });
});

module.exports = router;
