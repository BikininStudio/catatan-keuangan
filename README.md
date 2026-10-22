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

## Keamanan
- Anon key memang publik; data dilindungi **Row Level Security**: setiap tabel hanya bisa dibaca/diubah pemilik baris (`user_id = auth.uid()`).
- Output di-escape (anti XSS), password di-hash oleh Supabase Auth, sesi berakhir setelah 30 menit tidak aktif.
