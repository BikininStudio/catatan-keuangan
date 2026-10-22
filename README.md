# Aplikasi Pencatatan Keuangan Pribadi Berbasis Web (GitHub Pages + Supabase)


**Aplikasi online:** https://bikininstudio.github.io/catatan-keuangan/
Frontend statis (HTML/CSS/JavaScript) di GitHub Pages. Database dan autentikasi di Supabase
(PostgreSQL + Auth + Row Level Security).

## 1. Siapkan Supabase
1. Daftar di https://supabase.com lalu **New project** (catat password database, boleh bebas).
2. Menu **SQL Editor -> New query**, tempel seluruh isi `supabase/schema.sql`, klik **Run**.
   Harus muncul "Success". Cek di **Table Editor** ada tabel `profiles`, `categories`, `transactions`, `budgets`.
3. **Authentication -> Providers -> Email**: matikan **Confirm email** (supaya registrasi langsung bisa login), Save.
4. **Project Settings -> API Keys**: salin **Publishable key** (`sb_publishable_...`, atau anon key `eyJ...` di tab Legacy).
   Project URL ada di **Project Settings -> General / Data API** (`https://<project-ref>.supabase.co`).
   Jangan pernah memakai atau membagikan **Secret key / service_role**.

## 2. Isi konfigurasi
Edit `assets/js/config.js`: isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY`.

## 3. Jalankan lokal
```
python -m http.server 8080
```
Buka http://localhost:8080 (ES module tidak bisa dibuka lewat klik dua kali file `index.html`).

## 4. Publikasi ke GitHub Pages
1. Buat repo GitHub, upload seluruh isi folder ini (bukan folder pembungkusnya) ke root repo.
2. **Settings -> Pages -> Build and deployment**: Source = Deploy from a branch, Branch = `main`, folder `/ (root)`, Save.
3. Tunggu 1-2 menit, alamat: `https://USERNAME.github.io/NAMA-REPO/`.
4. Di Supabase **Authentication -> URL Configuration**, isi **Site URL** dengan alamat itu.
   Kalau aplikasi dipasang di lebih dari satu alamat, tambahkan semuanya di **Redirect URLs**
   (mis. `https://USERNAME.github.io/NAMA-REPO/**`) supaya link konfirmasi email kembali ke alamat tempat mendaftar.

## 5. Mode demo (tombol "Coba demo tanpa daftar")
Pengunjung masuk sebagai akun tamu anonim. Tiap tamu dapat data contoh sendiri (3 bulan transaksi + anggaran),
jadi tidak saling melihat atau mengacak data orang lain. Link `.../?demo=1` langsung masuk mode demo.
1. Jalankan ulang `supabase/schema.sql` di SQL Editor (aman diulang; menambah `seed_demo` dan `hapus_tamu_demo`).
2. **Authentication -> Sign In / Providers**: aktifkan **Allow anonymous sign-ins**, Save.
3. Hapus tamu lama otomatis: **Integrations -> Cron** (aktifkan pg_cron) lalu jalankan di SQL Editor:
   ```sql
   select cron.schedule('hapus-tamu-demo', '0 3 * * *', 'select public.hapus_tamu_demo()');
   ```
4. Opsional, bila ada yang menyalahgunakan: **Authentication -> Rate Limits** (batas sign-in anonim per jam),
   atau pasang CAPTCHA di **Authentication -> Attack Protection**.

## 6. Instal sebagai aplikasi (PWA)
Aplikasi bisa dipasang seperti aplikasi biasa, dengan ikon sendiri dan jendela tanpa address bar:
- **Tombol "Instal aplikasi"** muncul di kanan bawah halaman (Chrome/Edge/Android; di iPhone menampilkan petunjuk).
- **Laptop (Chrome/Edge):** klik tombol itu, atau ikon **Instal** di ujung address bar.
- **Android (Chrome):** menu ⋮ -> **Instal aplikasi** / **Tambahkan ke layar utama**.
- **iPhone (Safari):** tombol Bagikan -> **Tambah ke Layar Utama**.

File PWA: `manifest.webmanifest`, `sw.js`, `install.js` (tombol instal + pesan offline), dan folder `icons/`. Service worker cuma menyimpan file aplikasi;
data keuangan (Supabase) selalu diambil langsung dari internet dan tidak disimpan di cache.
Kalau menambah file JS baru, tambahkan juga ke daftar `SHELL` di `sw.js` dan naikkan nomor `CACHE`.

## 7. Supaya Supabase tidak "tertidur"
Project Supabase gratis di-pause otomatis bila 7 hari tanpa aktivitas. Workflow
`.github/workflows/supabase-keepalive.yml` memanggil fungsi `ping()` setiap hari, jadi project tetap aktif.
- Butuh fungsi `ping()` dari `schema.sql` (jalankan ulang file itu, atau cukup bagian "ping").
- Kalau ping gagal, workflow berwarna merah dan GitHub mengirim email. Buka dashboard Supabase lalu klik **Restore**.
- Tes manual: tab **Actions** -> **Supabase keepalive** -> **Run workflow**.

## Keamanan
- Anon key memang publik; data dilindungi **Row Level Security**: setiap tabel hanya bisa dibaca/diubah pemilik baris (`user_id = auth.uid()`).
- Output di-escape (anti XSS), password di-hash oleh Supabase Auth, sesi berakhir setelah 30 menit tidak aktif.
