import { user, nama, logout } from './auth.js';
import { esc } from './utils.js';
import { app, setFlash, renderFlash, goto } from './ui.js';
import * as login from './views/login.js';
import * as register from './views/register.js';
import * as dashboard from './views/dashboard.js';
import * as transactions from './views/transactions.js';
import * as transactionForm from './views/transaction-form.js';
import * as categories from './views/categories.js';
import * as budgets from './views/budgets.js';
import * as report from './views/report.js';

// [pola, view, halaman tamu?]
const ROUTES = [
  ['login', login, true],
  ['register', register, true],
  ['dashboard', dashboard, false],
  ['transaksi', transactions, false],
  ['transaksi/baru', transactionForm, false],
  ['transaksi/ubah/:id', transactionForm, false],
  ['kategori', categories, false],
  ['anggaran', budgets, false],
  ['laporan', report, false],
];

const MENU = [['dashboard', 'Dashboard'], ['transaksi', 'Transaksi'], ['kategori', 'Kategori'],
  ['anggaran', 'Anggaran'], ['laporan', 'Laporan']];

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  return { path: path.replace(/\/$/, ''), query: Object.fromEntries(new URLSearchParams(qs)) };
}

function match(path) {
  const segs = path.split('/');
  for (const [pattern, view, guest] of ROUTES) {
    const ps = pattern.split('/');
    if (ps.length !== segs.length) continue;
    const params = {};
    if (ps.every((p, i) => (p.startsWith(':') ? (params[p.slice(1)] = segs[i]) !== '' : p === segs[i]))) {
      return { view, guest, params };
    }
  }
  return null;
}

function renderNav(active) {
  const bar = document.getElementById('topbar');
  bar.innerHTML = `<div class="wrap bar">
    <a class="brand" href="#/dashboard">Catatan Keuangan</a>
    <nav>${MENU.map(([k, l]) => `<a href="#/${k}" class="${active === k ? 'active' : ''}">${esc(l)}</a>`).join('')}</nav>
    <div class="logout"><span class="who">${esc(nama())}</span>
    <button class="btn btn-ghost" id="btn-logout" type="button">Logout</button></div></div>`;
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await logout();
    setFlash('success', 'Anda telah logout.');
    goto('login');
  });
}

async function route() {
  const { path, query } = parseHash();
  const m = match(path);
  if (!m) { goto(user ? 'dashboard' : 'login'); return; }
  if (!m.guest && !user) { setFlash('error', 'Silakan login terlebih dahulu.'); goto('login'); return; }
  if (m.guest && user) { goto('dashboard'); return; }

  document.body.classList.toggle('guest', m.guest);
  if (!m.guest) renderNav(path.split('/')[0]);
  app().innerHTML = '<p class="muted">Memuat...</p>';
  try {
    await m.view.render({ params: m.params, query });
  } catch (e) {
    app().innerHTML = `<div class="card"><h2>Terjadi kesalahan</h2><p class="muted">${esc(e.message || e)}</p>
      <a class="btn" href="#/dashboard">Kembali ke Dashboard</a></div>`;
  }
  renderFlash();
}

export function startRouter() {
  addEventListener('hashchange', route);
  route();
}
