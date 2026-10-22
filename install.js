// PWA: daftar service worker, tombol "Instal aplikasi", dan pesan saat offline.
// Berdiri sendiri (tidak mengubah kode aplikasi di assets/js); gayanya disuntik dari sini.
(() => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

  const DISMISS_KEY = 'kk_install_tutup';
  const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const dismissed = () => {
    try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_MS; } catch { return false; }
  };

  const css = `
    .pwa-install { position: fixed; right: 16px; bottom: 16px; z-index: 50; display: flex; align-items: center; gap: 2px;
      background: var(--primary, #2563eb); border-radius: 999px; box-shadow: 0 6px 20px rgba(15, 23, 42, .25); }
    .pwa-install button { font: inherit; color: #fff; background: none; border: 0; cursor: pointer; }
    .pwa-install .pwa-go { padding: 10px 6px 10px 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .pwa-install .pwa-x { padding: 10px 14px 10px 8px; opacity: .8; font-size: 1.1rem; line-height: 1; }
    .pwa-install button:hover { opacity: 1; filter: brightness(1.1); }
    .pwa-tip { position: fixed; right: 16px; bottom: 72px; z-index: 50; max-width: 280px; padding: 12px 14px;
      background: var(--card, #fff); color: var(--text, #1e293b); border: 1px solid var(--line, #e2e8f0);
      border-radius: 12px; box-shadow: 0 6px 20px rgba(15, 23, 42, .18); font-size: .92rem; }
    .pwa-tip p { margin: 0 0 6px; }
    .pwa-tip ol { margin: 0; padding-left: 18px; }`;

  let deferred = null;
  let box = null;

  function hide() {
    box?.remove();
    document.querySelector('.pwa-tip')?.remove();
    box = null;
  }

  function showTip() {
    if (document.querySelector('.pwa-tip')) { document.querySelector('.pwa-tip').remove(); return; }
    const tip = document.createElement('div');
    tip.className = 'pwa-tip';
    tip.setAttribute('role', 'dialog');
    tip.innerHTML = `<p><strong>Pasang di iPhone/iPad</strong></p>
      <ol><li>Ketuk tombol <strong>Bagikan</strong> (kotak dengan panah ke atas) di Safari.</li>
      <li>Pilih <strong>Tambah ke Layar Utama</strong>, lalu <strong>Tambah</strong>.</li></ol>`;
    document.body.append(tip);
  }

  function show() {
    if (box || standalone || dismissed()) return;
    if (!document.getElementById('pwa-style')) {
      const st = document.createElement('style');
      st.id = 'pwa-style';
      st.textContent = css;
      document.head.append(st);
    }
    box = document.createElement('div');
    box.className = 'pwa-install';
    box.innerHTML = `<button class="pwa-go" type="button"><span aria-hidden="true">⬇</span> Instal aplikasi</button>
      <button class="pwa-x" type="button" aria-label="Tutup">×</button>`;
    box.querySelector('.pwa-go').addEventListener('click', async () => {
      if (!deferred) { showTip(); return; }
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      deferred = null;
      if (choice?.outcome === 'accepted') hide();
    });
    box.querySelector('.pwa-x').addEventListener('click', () => {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* abaikan */ }
      hide();
    });
    document.body.append(box);
  }

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    show();
  });
  addEventListener('appinstalled', hide);
  if (ios && !standalone) addEventListener('load', show);

  // Tanpa internet aplikasi tertahan di "Memuat..." atau menampilkan "Failed to fetch";
  // ganti dengan pesan yang jelas, dan muat ulang otomatis begitu koneksi kembali.
  const offlineCard = () => {
    const app = document.getElementById('app');
    if (navigator.onLine || !app || document.getElementById('pwa-offline')) return;
    const t = app.textContent.trim();
    if (!/^Memuat/.test(t) && !/Failed to fetch|NetworkError|Tidak dapat terhubung/i.test(t)) return;
    app.innerHTML = `<div class="card" id="pwa-offline"><h2>Tidak ada koneksi internet</h2>
      <p class="muted">Data keuangan disimpan online. Sambungkan internet, halaman akan dimuat ulang otomatis.</p>
      <button class="btn" type="button" id="pwa-reload">Muat ulang</button></div>`;
    document.getElementById('pwa-reload').addEventListener('click', () => location.reload());
  };
  addEventListener('load', () => {
    const app = document.getElementById('app');
    if (app) new MutationObserver(offlineCard).observe(app, { childList: true, subtree: true });
    setTimeout(offlineCard, 3000);
  });
  addEventListener('online', () => { if (document.getElementById('pwa-offline')) location.reload(); });
})();
