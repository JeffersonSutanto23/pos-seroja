const express = require('express');
const db = require('../db');
const { rupiah, dateID } = require('../utils/format');

const router = express.Router();

router.get('/:saleId', (req, res) => {
  const sale = db.prepare(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
    FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
    WHERE s.id = ?
  `).get(req.params.saleId);
  if (!sale) return res.status(404).send('Transaksi tidak ditemukan.');

  const items = db.prepare(`
    SELECT si.*, p.name as product_name, p.unit
    FROM sale_items si JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = ?
  `).all(sale.id);

  const isOnline = sale.payment_method === 'transfer_bca' || sale.payment_method === 'qris';
  const copies = isOnline ? ['ASLI', 'COPY'] : [null];

  res.render('receipt', { title: 'Struk', sale, items, copies, rupiah, dateID });
});

module.exports = router;
