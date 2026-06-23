const express = require('express');
const db = require('../db');

const router = express.Router();

function permissionsByGroup() {
  const perms = db.prepare('SELECT * FROM permissions ORDER BY group_name, label').all();
  const grouped = {};
  perms.forEach(p => {
    if (!grouped[p.group_name]) grouped[p.group_name] = [];
    grouped[p.group_name].push(p);
  });
  return grouped;
}

router.get('/', (req, res) => {
  const roles = db.prepare(`
    SELECT r.*, (SELECT COUNT(*) FROM users WHERE role_id = r.id) as user_count
    FROM roles r ORDER BY r.name ASC
  `).all();
  res.render('roles', { title: 'Role & Hak Akses', roles });
});

router.get('/new', (req, res) => {
  res.render('role-form', { title: 'Tambah Role', role: null, groupedPermissions: permissionsByGroup(), rolePermissionKeys: [] });
});

router.post('/', (req, res) => {
  const { name, description, permissions } = req.body;
  const keys = Array.isArray(permissions) ? permissions : (permissions ? [permissions] : []);
  const result = db.transaction(() => {
    const r = db.prepare('INSERT INTO roles (name, description) VALUES (?,?)').run(name.trim(), description || null);
    const roleId = r.lastInsertRowid;
    if (keys.length) {
      const permIds = db.prepare(`SELECT id FROM permissions WHERE key IN (${keys.map(() => '?').join(',')})`).all(...keys);
      const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?,?)');
      permIds.forEach(p => stmt.run(roleId, p.id));
    }
    return roleId;
  })();
  res.redirect('/roles');
});

router.get('/:id/edit', (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).send('Role tidak ditemukan.');
  const rolePermissionKeys = db.prepare(`
    SELECT p.key FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    WHERE rp.role_id = ?
  `).all(role.id).map(r => r.key);
  res.render('role-form', { title: 'Edit Role', role, groupedPermissions: permissionsByGroup(), rolePermissionKeys });
});

router.post('/:id/update', (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).send('Role tidak ditemukan.');
  const { name, description, permissions } = req.body;
  const keys = Array.isArray(permissions) ? permissions : (permissions ? [permissions] : []);

  db.transaction(() => {
    db.prepare('UPDATE roles SET name=?, description=? WHERE id=?').run(name.trim(), description || null, role.id);
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(role.id);
    if (keys.length) {
      const permIds = db.prepare(`SELECT id FROM permissions WHERE key IN (${keys.map(() => '?').join(',')})`).all(...keys);
      const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?,?)');
      permIds.forEach(p => stmt.run(role.id, p.id));
    }
  })();
  res.redirect('/roles');
});

router.post('/:id/delete', (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).send('Role tidak ditemukan.');
  if (role.is_system) return res.status(400).send('Role bawaan sistem tidak bisa dihapus.');
  const userCount = db.prepare('SELECT COUNT(*) c FROM users WHERE role_id = ?').get(role.id).c;
  if (userCount > 0) return res.status(400).send('Role masih digunakan oleh pengguna, pindahkan dahulu sebelum menghapus.');
  db.prepare('DELETE FROM roles WHERE id = ?').run(role.id);
  res.redirect('/roles');
});

module.exports = router;
