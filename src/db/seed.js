const db = require('./index');
const crypto = require('crypto');
const ALL_PERMISSIONS = require('./permissions');

function hash(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

// --- Permissions ---------------------------------------------------------
const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (key, label, group_name) VALUES (?,?,?)');
ALL_PERMISSIONS.forEach(p => insertPerm.run(p.key, p.label, p.group));

// --- Roles ----------------------------------------------------------------
// Rename roles from earlier seed runs (Super Admin -> Manager, Kasir -> Admin)
// without touching their permissions or the users already assigned to them.
function renameRole(oldName, newName) {
  const old = db.prepare('SELECT * FROM roles WHERE name = ?').get(oldName);
  const existing = db.prepare('SELECT * FROM roles WHERE name = ?').get(newName);
  if (old && !existing) {
    db.prepare('UPDATE roles SET name = ? WHERE id = ?').run(newName, old.id);
    console.log(`Role renamed: ${oldName} -> ${newName}`);
  }
}
renameRole('Super Admin', 'Manager');
renameRole('Kasir', 'Admin');

function ensureRole(name, description, isSystem, permissionKeys) {
  let role = db.prepare('SELECT * FROM roles WHERE name = ?').get(name);
  if (!role) {
    const r = db.prepare('INSERT INTO roles (name, description, is_system) VALUES (?,?,?)').run(name, description, isSystem ? 1 : 0);
    role = { id: r.lastInsertRowid };
    const permIds = db.prepare(`SELECT id, key FROM permissions WHERE key IN (${permissionKeys.map(() => '?').join(',')})`).all(...permissionKeys);
    const linkStmt = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?,?)');
    permIds.forEach(p => linkStmt.run(role.id, p.id));
    console.log(`Role seeded: ${name}`);
  }
  return role.id;
}

const allKeys = ALL_PERMISSIONS.map(p => p.key);
const kasirKeys = ['dashboard.view', 'pos.access', 'inventory.view', 'debts.view', 'debts.manage', 'customers.manage'];

const superAdminRoleId = ensureRole('Manager', 'Akses penuh ke seluruh sistem.', 1, allKeys);
ensureRole('Admin', 'Akses kasir harian: POS, lihat stok, dan piutang.', 1, kasirKeys);

// --- Users ------------------------------------------------------------
// Migrate legacy `role` text column (admin/kasir) to role_id if present.
const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (userColumns.includes('role')) {
  const kasirRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('Admin');
  const legacyUsers = db.prepare('SELECT id, role FROM users WHERE role_id IS NULL').all();
  legacyUsers.forEach(u => {
    const roleId = u.role === 'admin' ? superAdminRoleId : kasirRole.id;
    db.prepare('UPDATE users SET role_id = ? WHERE id = ?').run(roleId, u.id);
  });
}

const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
if (userCount === 0) {
  db.prepare('INSERT INTO users (username, password, full_name, role_id) VALUES (?,?,?,?)')
    .run('admin', hash('admin123'), 'Administrator', superAdminRoleId);
  const kasirRoleId = db.prepare('SELECT id FROM roles WHERE name = ?').get('Admin').id;
  db.prepare('INSERT INTO users (username, password, full_name, role_id) VALUES (?,?,?,?)')
    .run('kasir', hash('kasir123'), 'Kasir Toko', kasirRoleId);
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
