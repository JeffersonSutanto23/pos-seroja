const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'data', 'pos.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const conn = new DatabaseSync(dbPath);
conn.exec('PRAGMA journal_mode = WAL');
conn.exec('PRAGMA foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
conn.exec(schema);

// Migrate older databases (created before roles/permissions existed) in place.
const userColumns = conn.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userColumns.includes('role_id')) {
  conn.exec('ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id)');
}
if (!userColumns.includes('is_active')) {
  conn.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
}

const supplierColumns = conn.prepare("PRAGMA table_info(suppliers)").all().map(c => c.name);
if (!supplierColumns.includes('due_days')) {
  conn.exec('ALTER TABLE suppliers ADD COLUMN due_days INTEGER NOT NULL DEFAULT 30');
}

// Thin wrapper so the rest of the app can keep using the better-sqlite3-style API
// (db.prepare(sql).get/all/run, db.exec, db.transaction).
const db = {
  prepare(sql) {
    const stmt = conn.prepare(sql);
    return {
      get: (...params) => stmt.get(...params),
      all: (...params) => stmt.all(...params),
      run: (...params) => {
        const info = stmt.run(...params);
        return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
      },
    };
  },
  exec(sql) {
    return conn.exec(sql);
  },
  transaction(fn) {
    return (...args) => {
      conn.exec('BEGIN');
      try {
        const result = fn(...args);
        conn.exec('COMMIT');
        return result;
      } catch (err) {
        conn.exec('ROLLBACK');
        throw err;
      }
    };
  },
};

module.exports = db;
