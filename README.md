# POS Seroja Decor

Aplikasi Point of Sale untuk toko bahan bangunan, dibangun dengan Node.js + Express + SQLite + EJS + TailwindCSS.

## Fitur

- **Kasir (POS)**: transaksi cash & credit. Cash → customer opsional. Credit → wajib nama customer. Metode bayar: Tunai, Transfer BCA, QRIS.
- **Inventory Stok**: kelola barang, kategori, supplier, stok minimum, peringatan stok menipis.
- **Hutang / Piutang**: daftar piutang customer & hutang ke supplier, dengan pencatatan pembayaran cicilan.
- **Customer & Supplier**: data master + ringkasan transaksi.
- **Pembelian**: input pembelian barang dari supplier (otomatis menambah stok).
- **Pembukuan Penjualan & Pembelian**: rekap bulanan (tab Jan–Des) bergaya buku besar, sesuai format Excel toko.
- **Cetak Struk**:
  - Tunai → struk biasa.
  - Online (Transfer BCA / QRIS) → cetak 2 lembar: ASLI & COPY.
  - Struk kredit (belum lunas) memiliki desain berbeda dari struk cash (menampilkan sisa hutang).

## Menjalankan

```bash
npm install
npm start
```

Buka `http://localhost:3000`. Login default:

- `admin` / `admin123`
- `kasir` / `kasir123`

Database SQLite otomatis dibuat di `data/pos.db` saat pertama kali dijalankan, lengkap dengan data contoh (kategori, supplier, customer, produk).
