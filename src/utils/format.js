function rupiah(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function dateID(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}-${m}-${y}`;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUNI', 'JULI', 'AGT', 'SEP', 'OKT', 'NOV', 'DES'];

module.exports = { rupiah, dateID, MONTHS };
