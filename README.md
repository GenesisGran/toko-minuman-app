# POS Toko Minuman - Sistem Kasir Modern

Sistem Point of Sale (POS) berbasis web yang dirancang khusus untuk toko minuman. Aplikasi ini memudahkan pengelolaan transaksi harian, pemantauan stok barang, dan laporan keuntungan secara real-time.

## 🚀 Fitur Utama

- **Kasir (Point of Sale):**
  - Pencarian produk cepat.
  - Dua mode harga (Grosir/Retail).
  - Validasi stok real-time (mencegah stok minus).
  - Cetak struk belanja otomatis.
- **Manajemen Inventaris:**
  - Update stok masuk secara detail.
  - Riwayat stok masuk.
  - Pengurangan stok otomatis setiap transaksi.
- **Laporan & Analytics:**
  - Grafik pendapatan harian.
  - Perhitungan laba bersih (Omzet - Modal).
  - Statistik produk terlaris.
- **Riwayat Penjualan:**
  - Filter rentang tanggal.
  - Pencarian nota tertentu.
  - Cetak ulang struk dari riwayat.

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS, Framer Motion (Animations)
- **Database:** Supabase (PostgreSQL)
- **Icons:** Lucide React
- **Deployment:** Vercel

## ⚙️ Cara Instalasi Lokal

1. Clone repository ini.
2. Install dependensi:
   ```bash
   npm install
   ```
3. Buat file `.env` dan tambahkan kredensial Supabase Anda:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_KEY=your_supabase_anon_key
   ```
4. Jalankan aplikasi:
   ```bash
   npm run dev
   ```

## 🌐 Deployment di Vercel

Aplikasi ini sudah siap untuk dideploy ke Vercel:
1. Hubungkan repository GitHub Anda ke Vercel.
2. Tambahkan **Environment Variables** (`VITE_SUPABASE_URL` dan `VITE_SUPABASE_KEY`) di dashboard Vercel.
3. Klik Deploy.

---
*Dikembangkan untuk efisiensi operasional Toko Minuman.*
