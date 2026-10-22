import { configured } from './supabase.js';

const root = document.getElementById('app');

if (!configured) {
  root.innerHTML = `<div class="card"><h2>Konfigurasi belum diisi</h2>
    <p>Isi <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON_KEY</code> di <code>assets/js/config.js</code>
    (lihat README.md), lalu muat ulang halaman.</p></div>`;
} else {
  const { initAuth } = await import('./auth.js');
  const { startRouter } = await import('./router.js');
  await initAuth();
  startRouter();
}
