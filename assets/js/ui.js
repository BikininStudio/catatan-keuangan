import { esc } from './utils.js';

let pending = null;

export const app = () => document.getElementById('app');

export function setFlash(type, msg) {
  pending = [type, msg];
}

export function renderFlash() {
  const box = document.getElementById('flash');
  if (box && pending) {
    box.innerHTML = `<div class="alert alert-${esc(pending[0])}">${esc(pending[1])}</div>`;
  }
  pending = null;
}

export function showFlash(type, msg) {
  setFlash(type, msg);
  renderFlash();
}

// Kerangka halaman: halaman tamu memakai kotak di tengah.
export function page(html, { guest = false } = {}) {
  app().innerHTML = guest
    ? `<div class="auth-box"><h1 class="brand-lg">Catatan Keuangan</h1>
       <p class="muted">Aplikasi Pencatatan Keuangan Pribadi</p><div id="flash"></div>${html}</div>`
    : `<div id="flash"></div>${html}`;
}

export function goto(route) {
  location.hash = '#/' + route;
}

// Pesan galat Supabase/Postgres -> Bahasa Indonesia.
export function errMsg(e) {
  const m = String(e?.message || e);
  if (e?.code === '23505') return 'Data dengan nilai yang sama sudah ada.';
  if (e?.code === '23503') return 'Data masih dipakai oleh data lain sehingga tidak dapat dihapus.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Tidak dapat terhubung ke server. Periksa koneksi internet.';
  return m;
}
