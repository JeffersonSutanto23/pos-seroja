// Master list of permissions available in the system, grouped by module.
// Mirrors the "Shield" style: every permission is a discrete key that can be
// toggled on/off per role.
module.exports = [
  { key: 'dashboard.view', label: 'Lihat Dashboard', group: 'Dashboard' },

  { key: 'pos.access', label: 'Akses Kasir (POS)', group: 'Kasir' },

  { key: 'inventory.view', label: 'Lihat Inventory', group: 'Inventory' },
  { key: 'inventory.manage', label: 'Tambah/Edit/Hapus Barang', group: 'Inventory' },

  { key: 'purchases.view', label: 'Lihat Pembelian', group: 'Pembelian' },
  { key: 'purchases.manage', label: 'Input Pembelian', group: 'Pembelian' },

  { key: 'debts.view', label: 'Lihat Hutang/Piutang', group: 'Hutang/Piutang' },
  { key: 'debts.manage', label: 'Catat Pembayaran Hutang/Piutang', group: 'Hutang/Piutang' },

  { key: 'customers.manage', label: 'Kelola Data Customer', group: 'Master Data' },
  { key: 'suppliers.manage', label: 'Kelola Data Supplier', group: 'Master Data' },

  { key: 'sales_book.view', label: 'Lihat Pembukuan Penjualan', group: 'Pembukuan' },
  { key: 'purchases_book.view', label: 'Lihat Pembukuan Pembelian', group: 'Pembukuan' },

  { key: 'users.manage', label: 'Kelola Pengguna', group: 'Administrasi' },
  { key: 'roles.manage', label: 'Kelola Role & Hak Akses', group: 'Administrasi' },
];
