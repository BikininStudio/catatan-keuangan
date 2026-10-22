import { sb, must } from '../supabase.js';
import { PER_PAGE } from '../config.js';
import { esc, rupiah } from '../utils.js';
import { page, setFlash, renderFlash, showFlash, errMsg } from '../ui.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function render({ query }) {
  const f = {};
  ['q', 'tipe', 'category_id', 'dari', 'sampai'].forEach((k) => { f[k] = (query[k] || '').trim(); });
  const pageNo = Math.max(1, parseInt(query.page, 10) || 1);

  const categories = must(await sb.from('categories').select('id,nama,tipe').order('tipe').order('nama'));

  let qb = sb.from('transactions')
    .select('id,tipe,jumlah,tanggal,keterangan,category_id,categories(nama)', { count: 'exact' });
  if (['pemasukan', 'pengeluaran'].includes(f.tipe)) qb = qb.eq('tipe', f.tipe);
  if (/^\d+$/.test(f.category_id)) qb = qb.eq('category_id', Number(f.category_id));
  if (DATE_RE.test(f.dari)) qb = qb.gte('tanggal', f.dari);
  if (DATE_RE.test(f.sampai)) qb = qb.lte('tanggal', f.sampai);
  const kw = f.q.replace(/[%_\\",()*]/g, ' ').trim();
  if (kw) {
    const ids = must(await sb.from('categories').select('id').ilike('nama', `%${kw}%`)).map((c) => c.id);
    const parts = [`keterangan.ilike.*${kw}*`];
    if (ids.length) parts.push(`category_id.in.(${ids.join(',')})`);
    qb = qb.or(parts.join(','));
  }
  const from = (pageNo - 1) * PER_PAGE;
  const res = await qb.order('tanggal', { ascending: false }).order('id', { ascending: false }).range(from, from + PER_PAGE - 1);
  if (res.error && res.error.code !== 'PGRST103') throw res.error;
  const rows = res.data || [];
  const total = res.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const link = (p) => '#/transaksi?' + new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page: p });

  page(`<div class="row-between"><h1>Transaksi</h1><a href="#/transaksi/baru" class="btn">+ Tambah Transaksi</a></div>
    <form id="filter" class="card filters">
      <input type="search" name="q" value="${esc(f.q)}" placeholder="Cari keterangan/kategori">
      <select name="tipe"><option value="">Semua tipe</option>
        <option value="pemasukan" ${f.tipe === 'pemasukan' ? 'selected' : ''}>Pemasukan</option>
        <option value="pengeluaran" ${f.tipe === 'pengeluaran' ? 'selected' : ''}>Pengeluaran</option></select>
      <select name="category_id"><option value="">Semua kategori</option>
        ${categories.map((c) => `<option value="${esc(c.id)}" ${f.category_id === String(c.id) ? 'selected' : ''}>${esc(c.nama)} (${esc(c.tipe)})</option>`).join('')}</select>
      <input type="date" name="dari" value="${esc(f.dari)}" title="Dari tanggal">
      <input type="date" name="sampai" value="${esc(f.sampai)}" title="Sampai tanggal">
      <button class="btn" type="submit">Filter</button>
      <a class="btn btn-ghost" href="#/transaksi">Reset</a>
    </form>
    <div class="card">
      ${rows.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th class="num">Jumlah</th><th></th></tr></thead><tbody>
        ${rows.map((t) => `<tr><td>${esc(t.tanggal)}</td><td>${esc(t.categories?.nama)}</td><td>${esc(t.keterangan)}</td>
          <td class="num ${t.tipe === 'pemasukan' ? 'pos' : 'neg'}">${t.tipe === 'pemasukan' ? '+' : '-'}${esc(rupiah(t.jumlah))}</td>
          <td class="actions"><a class="btn btn-sm btn-ghost" href="#/transaksi/ubah/${esc(t.id)}">Edit</a>
            <button class="btn btn-sm btn-danger" data-del="${esc(t.id)}" type="button">Hapus</button></td></tr>`).join('')}
        </tbody></table></div>
        <div class="pager"><span class="muted">${esc(total)} transaksi, halaman ${esc(pageNo)} dari ${esc(pages)}</span>
          ${pageNo > 1 ? `<a class="btn btn-sm btn-ghost" href="${esc(link(pageNo - 1))}">&laquo; Sebelumnya</a>` : ''}
          ${pageNo < pages ? `<a class="btn btn-sm btn-ghost" href="${esc(link(pageNo + 1))}">Berikutnya &raquo;</a>` : ''}</div>`
        : '<p class="muted">Data tidak ditemukan.</p>'}
    </div>`);

  document.getElementById('filter').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    new FormData(e.target).forEach((v, k) => { if (String(v).trim()) p.set(k, String(v).trim()); });
    location.hash = '#/transaksi' + (p.toString() ? '?' + p : '');
  });

  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Hapus transaksi ini?')) return;
    const { error } = await sb.from('transactions').delete().eq('id', Number(b.dataset.del));
    if (error) { showFlash('error', errMsg(error)); return; }
    setFlash('success', 'Transaksi berhasil dihapus.');
    await render({ query });
    renderFlash();
  }));
}
