-- Aplikasi Pencatatan Keuangan Pribadi Berbasis Web (versi statis + Supabase)
-- Jalankan seluruh isi file ini di Supabase: SQL Editor -> New query -> Run.
-- Aman dijalankan ulang (idempotent) untuk skema; data tabel tidak dihapus.

create extension if not exists pgcrypto;

do $$ begin
  create type public.tipe_transaksi as enum ('pemasukan', 'pengeluaran');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- tabel
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nama       varchar(100) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nama    varchar(80) not null,
  tipe    public.tipe_transaksi not null,
  unique (user_id, nama, tipe)
);

create table if not exists public.transactions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id bigint not null references public.categories (id) on delete restrict,
  tipe        public.tipe_transaksi not null,
  jumlah      numeric(15, 2) not null check (jumlah > 0),
  tanggal     date not null,
  keterangan  varchar(255) not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists idx_tx_user_tanggal on public.transactions (user_id, tanggal);

create table if not exists public.budgets (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id bigint not null references public.categories (id) on delete cascade,
  bulan       smallint not null check (bulan between 1 and 12),
  tahun       smallint not null,
  batas       numeric(15, 2) not null check (batas > 0),
  unique (user_id, category_id, bulan, tahun)
);

-- ------------------------------------------- validasi kepemilikan kategori
create or replace function public.check_tx_category() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from categories c
                 where c.id = new.category_id and c.user_id = new.user_id and c.tipe = new.tipe) then
    raise exception 'Kategori tidak sesuai dengan pemilik atau tipe transaksi';
  end if;
  return new;
end $$;

drop trigger if exists trg_tx_category on public.transactions;
create trigger trg_tx_category before insert or update on public.transactions
  for each row execute function public.check_tx_category();

create or replace function public.check_budget_category() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from categories c
                 where c.id = new.category_id and c.user_id = new.user_id and c.tipe = 'pengeluaran') then
    raise exception 'Anggaran hanya untuk kategori pengeluaran milik sendiri';
  end if;
  return new;
end $$;

drop trigger if exists trg_budget_category on public.budgets;
create trigger trg_budget_category before insert or update on public.budgets
  for each row execute function public.check_budget_category();

-- ------------------------------- akun baru: profil + kategori default
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nama)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nama'), ''), split_part(new.email, '@', 1), 'Tamu Demo'));

  insert into categories (user_id, nama, tipe) values
    (new.id, 'Gaji', 'pemasukan'), (new.id, 'Uang Saku', 'pemasukan'), (new.id, 'Lainnya', 'pemasukan'),
    (new.id, 'Makanan', 'pengeluaran'), (new.id, 'Transportasi', 'pengeluaran'), (new.id, 'Tagihan', 'pengeluaran'),
    (new.id, 'Hiburan', 'pengeluaran'), (new.id, 'Lainnya', 'pengeluaran');

  -- Akun tamu (tombol "Coba demo") langsung diisi data contoh.
  if coalesce(new.is_anonymous, false) then
    perform seed_demo(new.id);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------ mode demo (akun tamu)
-- Data contoh 3 bulan terakhir + anggaran bulan ini untuk akun tamu.
create or replace function public.seed_demo(p_uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m int;
  awal date;
begin
  for m in 0..2 loop
    awal := (date_trunc('month', current_date) - make_interval(months => m))::date;
    insert into transactions (user_id, category_id, tipe, jumlah, tanggal, keterangan)
    select p_uid, c.id, c.tipe,
           case when v.tetap then v.jumlah else round(v.jumlah * (1 + 0.08 * ((m + v.hari) % 3 - 1)), -3) end,
           least(awal + v.hari - 1, current_date), v.ket
    from (values
      ('Gaji', 'pemasukan', 4500000, 1, true, 'Gaji bulanan'),
      ('Lainnya', 'pemasukan', 350000, 18, false, 'Jual barang bekas'),
      ('Tagihan', 'pengeluaran', 850000, 2, true, 'Kos bulanan'),
      ('Tagihan', 'pengeluaran', 120000, 5, true, 'Paket internet'),
      ('Makanan', 'pengeluaran', 420000, 3, false, 'Belanja bulanan'),
      ('Makanan', 'pengeluaran', 65000, 9, false, 'Makan siang kantor'),
      ('Makanan', 'pengeluaran', 180000, 16, false, 'Belanja sayur & lauk'),
      ('Makanan', 'pengeluaran', 95000, 24, false, 'Makan bareng teman'),
      ('Transportasi', 'pengeluaran', 150000, 4, false, 'Isi bensin'),
      ('Transportasi', 'pengeluaran', 60000, 13, false, 'Ojek online'),
      ('Transportasi', 'pengeluaran', 150000, 20, false, 'Isi bensin'),
      ('Hiburan', 'pengeluaran', 55000, 7, true, 'Langganan streaming'),
      ('Hiburan', 'pengeluaran', 120000, 21, false, 'Nonton bioskop'),
      ('Lainnya', 'pengeluaran', 75000, 27, false, 'Kado ulang tahun')
    ) as v(kat, tipe, jumlah, hari, tetap, ket)
    join categories c on c.user_id = p_uid and c.nama = v.kat and c.tipe = v.tipe::tipe_transaksi;
  end loop;

  insert into budgets (user_id, category_id, bulan, tahun, batas)
  select p_uid, c.id, extract(month from current_date)::smallint, extract(year from current_date)::smallint, v.batas
  from (values ('Makanan', 900000), ('Transportasi', 400000), ('Hiburan', 150000)) as v(kat, batas)
  join categories c on c.user_id = p_uid and c.nama = v.kat and c.tipe = 'pengeluaran';
end $$;

-- Hapus akun tamu yang umurnya lebih dari 1 hari (transaksi dihapus dulu karena FK kategori RESTRICT).
create or replace function public.hapus_tamu_demo() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from transactions where user_id in
    (select id from auth.users where is_anonymous and created_at < now() - interval '1 day');
  delete from auth.users where is_anonymous and created_at < now() - interval '1 day';
end $$;

-- Hanya dipanggil trigger / jadwal, tidak boleh dari aplikasi.
revoke execute on function public.seed_demo(uuid), public.hapus_tamu_demo() from public, anon, authenticated;

-- ------------------------------------------------- Row Level Security
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists categories_own on public.categories;
create policy categories_own on public.categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists transactions_own on public.transactions;
create policy transactions_own on public.transactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists budgets_own on public.budgets;
create policy budgets_own on public.budgets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Pengguna anonim (belum login) tidak boleh menyentuh data sama sekali.
revoke all on public.profiles, public.categories, public.transactions, public.budgets from anon;

-- ------------------------------------------- fungsi agregasi (RLS berlaku)
create or replace function public.ringkasan(p_dari date default null, p_sampai date default null)
returns table (pemasukan numeric, pengeluaran numeric)
language sql stable set search_path = public as $$
  select coalesce(sum(jumlah) filter (where tipe = 'pemasukan'), 0),
         coalesce(sum(jumlah) filter (where tipe = 'pengeluaran'), 0)
  from transactions
  where user_id = auth.uid()
    and (p_dari is null or tanggal >= p_dari)
    and (p_sampai is null or tanggal <= p_sampai);
$$;

create or replace function public.ringkasan_bulanan(p_tahun int)
returns table (bulan int, pemasukan numeric, pengeluaran numeric)
language sql stable set search_path = public as $$
  select extract(month from tanggal)::int,
         coalesce(sum(jumlah) filter (where tipe = 'pemasukan'), 0),
         coalesce(sum(jumlah) filter (where tipe = 'pengeluaran'), 0)
  from transactions
  where user_id = auth.uid() and extract(year from tanggal)::int = p_tahun
  group by 1;
$$;

create or replace function public.rekap_kategori(p_dari date, p_sampai date, p_tipe public.tipe_transaksi)
returns table (nama text, total numeric)
language sql stable set search_path = public as $$
  select c.nama::text, sum(t.jumlah)
  from transactions t join categories c on c.id = t.category_id
  where t.user_id = auth.uid() and t.tipe = p_tipe and t.tanggal between p_dari and p_sampai
  group by c.id, c.nama
  order by 2 desc;
$$;

create or replace function public.anggaran_bulan(p_bulan int, p_tahun int)
returns table (id bigint, kategori text, batas numeric, terpakai numeric)
language sql stable set search_path = public as $$
  select b.id, c.nama::text, b.batas,
         coalesce((select sum(t.jumlah) from transactions t
                   where t.user_id = b.user_id and t.category_id = b.category_id and t.tipe = 'pengeluaran'
                     and extract(month from t.tanggal) = b.bulan and extract(year from t.tanggal) = b.tahun), 0)
  from budgets b join categories c on c.id = b.category_id
  where b.user_id = auth.uid() and b.bulan = p_bulan and b.tahun = p_tahun
  order by c.nama;
$$;

revoke execute on function public.ringkasan(date, date), public.ringkasan_bulanan(int),
  public.rekap_kategori(date, date, public.tipe_transaksi), public.anggaran_bulan(int, int) from public, anon;
grant execute on function public.ringkasan(date, date), public.ringkasan_bulanan(int),
  public.rekap_kategori(date, date, public.tipe_transaksi), public.anggaran_bulan(int, int) to authenticated;
