const express = require('express');
const dayjs = require('dayjs');
const db = require('../db');
const { rupiah, MONTHS } = require('../utils/format');

const router = express.Router();

router.get('/', (req, res) => {
  const year = Number(req.query.year) || dayjs().year();
  const month = Number(req.query.month) || dayjs().month() + 1; // 1-12

  const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
  const rows = db.prepare(`
    SELECT sale_date,
      SUM(CASE WHEN payment_type = 'cash' THEN total ELSE 0 END) as cash,
      SUM(CASE WHEN payment_type = 'credit' THEN total ELSE 0 END) as credit,
      SUM(total) as total
    FROM sales
    WHERE strftime('%Y', sale_date) = ? AND strftime('%m', sale_date) = ?
    GROUP BY sale_date
  `).all(String(year), String(month).padStart(2, '0'));

  const rowMap = {};
  rows.forEach(r => { rowMap[r.sale_date] = r; });

  const days = [];
  let monthTotal = { cash: 0, credit: 0, total: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSunday = dayjs(dateStr).day() === 0;
    const data = rowMap[dateStr];
    if (data) {
      monthTotal.cash += data.cash;
      monthTotal.credit += data.credit;
      monthTotal.total += data.total;
    }
    days.push({ date: dateStr, isSunday, data });
  }

  res.render('sales-book', { title: 'Pembukuan Penjualan', year, month, days, monthTotal, MONTHS, rupiah });
});

module.exports = router;
