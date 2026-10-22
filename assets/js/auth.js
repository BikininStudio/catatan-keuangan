import { sb } from './supabase.js';
import { SESSION_TIMEOUT_MS } from './config.js';
import { setFlash, goto } from './ui.js';

export let user = null;
export const nama = () => user?.user_metadata?.nama || user?.email || '';

const KEY = 'kk_last_active';
const touch = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* abaikan */ } };
const idleExpired = () => {
  try { return Date.now() - Number(localStorage.getItem(KEY) || 0) > SESSION_TIMEOUT_MS; } catch { return false; }
};

export async function initAuth() {
  const { data } = await sb.auth.getSession();
  user = data.session?.user ?? null;
  if (user && idleExpired()) {
    await logout();
    setFlash('error', 'Sesi berakhir karena tidak aktif 30 menit. Silakan login kembali.');
  }
  sb.auth.onAuthStateChange((_event, session) => { user = session?.user ?? null; });

  // Pantau aktivitas pengguna; logout otomatis bila terlalu lama tidak aktif.
  let last = 0;
  ['click', 'keydown', 'touchstart'].forEach((ev) =>
    addEventListener(ev, () => {
      if (user && Date.now() - last > 5000) { last = Date.now(); touch(); }
    }, { passive: true }));
  setInterval(async () => {
    if (user && idleExpired()) {
      await logout();
      setFlash('error', 'Sesi berakhir karena tidak aktif 30 menit. Silakan login kembali.');
      goto('login'); // router menampilkan pesan setelah halaman login dirender
    }
  }, 15000);
}

export async function login(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (/Email not confirmed/i.test(error.message)) throw new Error('Email belum dikonfirmasi. Cek kotak masuk email Anda.');
    throw new Error('Email atau password salah.');
  }
  user = data.user;
  touch();
}

// Mode demo: akun tamu anonim (Supabase Anonymous Sign-in). Tiap pengunjung dapat data contoh
// sendiri (diisi trigger handle_new_user) dan akun tamu dihapus otomatis oleh hapus_tamu_demo().
export async function loginDemo() {
  const { data, error } = await sb.auth.signInAnonymously({ options: { data: { nama: 'Tamu Demo' } } });
  if (error) throw new Error('Mode demo sedang tidak tersedia. Coba lagi nanti.');
  user = data.user;
  touch();
}

// Mengembalikan true bila akun langsung aktif, false bila perlu konfirmasi email.
export async function register(namaLengkap, email, password) {
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { nama: namaLengkap } } });
  if (error) throw error;
  if (data.user && data.user.identities?.length === 0) throw new Error('Email sudah terdaftar.');
  if (data.session) {
    // Registrasi tidak langsung login: ikuti alur aplikasi (login manual).
    await sb.auth.signOut();
    user = null;
    return true;
  }
  return false;
}

export async function logout() {
  await sb.auth.signOut();
  user = null;
}
