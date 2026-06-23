const db = require('./index');
const crypto = require('crypto');

function hash(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
if (userCount === 0) {
  db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)')
    .run('admin', hash('admin123'), 'Administrator', 'admin');
  db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)')
    .run('kasir', hash('kasir123'), 'Kasir Toko', 'kasir');
  console.log('Users seeded: admin/admin123, kasir/kasir123');
}

const catCount = db.prepare('SELECT COUNT(*) c FROM categories').get().c;
if (catCount === 0) {
  ['Cat & Pelapis', 'Semen & Bahan Bangunan', 'Pipa & Plumbing', 'Listrik', 'Hardware & Perkakas', 'Lainnya']
    .forEach(name => db.prepare('INSERT INTO categories (name) VALUES (?)').run(name));
  console.log('Categories seeded');
}

const supCount = db.prepare('SELECT COUNT(*) c FROM suppliers').get().c;
if (supCount === 0) {
  ['NIPPON PAINT', 'PMP', 'BENNY', 'UNION', 'AWANG', 'INATEC', 'BAHAGIA', 'DUNIA PVC', 'PRIMA', 'HARMONI TOBA JAYA', 'PROPAN']
    .forEach(name => db.prepare('INSERT INTO suppliers (name) VALUES (?)').run(name));
  console.log('Suppliers seeded');
}

const custCount = db.prepare('SELECT COUNT(*) c FROM customers').get().c;
if (custCount === 0) {
  ['Bpk. Hartono', 'Toko Maju Jaya', 'CV Bangun Sentosa'].forEach(name =>
    db.prepare('INSERT INTO customers (name) VALUES (?)').run(name)
  );
  console.log('Customers seeded');
}

const prodCount = db.prepare('SELECT COUNT(*) c FROM products').get().c;
if (prodCount === 0) {
  const catCat = db.prepare("SELECT id FROM categories WHERE name='Cat & Pelapis'").get().id;
  const catSemen = db.prepare("SELECT id FROM categories WHERE name='Semen & Bahan Bangunan'").get().id;
  const catPipa = db.prepare("SELECT id FROM categories WHERE name='Pipa & Plumbing'").get().id;
  const nippon = db.prepare("SELECT id FROM suppliers WHERE name='NIPPON PAINT'").get().id;
  const dunia = db.prepare("SELECT id FROM suppliers WHERE name='DUNIA PVC'").get().id;

  const items = [
    ['CAT-001', 'Cat Nippon Vinilex 5kg', catCat, 'kaleng', 95000, 125000, 30, 5, nippon],
    ['CAT-002', 'Cat Nippon Weatherbond 5kg', catCat, 'kaleng', 150000, 195000, 20, 5, nippon],
    ['SMN-001', 'Semen Tiga Roda 50kg', catSemen, 'sak', 62000, 70000, 100, 20, null],
    ['PVC-001', 'Pipa PVC 1/2 inch', catPipa, 'batang', 18000, 25000, 80, 10, dunia],
    ['PVC-002', 'Pipa PVC 3/4 inch', catPipa, 'batang', 22000, 30000, 60, 10, dunia],
  ];
  const stmt = db.prepare(`INSERT INTO products (sku,name,category_id,unit,cost_price,sell_price,stock,min_stock,supplier_id)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  items.forEach(i => stmt.run(...i));
  console.log('Products seeded');
}

console.log('Seed complete.');
