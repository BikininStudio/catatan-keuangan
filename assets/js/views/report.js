import { sb, must, fetchAll } from '../supabase.js';
import { esc, rupiah, namaBulan, parsePeriode, periodeStr, rangeBulan, downloadCsv } from '../utils.js';
import { page } from '../ui.js';

export async function render({ query }) {
  const { bulan, tahun } = parsePeriode(query.periode);
  const periode = periodeStr(bulan, tahun);
  const [dari, sampai] = rangeBulan(bulan, tahun);
  const [tot, masuk, keluar] = await Promise.all([
    sb.rpc('ringkasan', { p_dari: dari, p_sampai: sampai }),
    sb.rpc('rekap_kategori', { p_dari: dari, p_sampai: sampai, p_tipe: 'pemasukan' }),
    sb.rpc('rekap_kategori', { p_dari: dari, p_sampai: sampai, p_tipe: 'pengeluaran' }),
  ]).then((rs) => rs.map(must));
  const rows = await fetchAll(() => sb.from('transactions').select('id,tipe,jumlah,tanggal,keterangan,categories(nama)')
    .gte('tanggal', dari).lte('tanggal', sampai).order('tanggal').order('id'));

  const t = tot[0];
  const selisih = t.pemasukan - t.pengeluaran;
  const judul = `${namaBulan(bulan)} ${tahun}`;
  const rekap = (title, data) => `<div class="card"><h2>${esc(title)} per Kategori</h2>
    ${data.length ? `<table class="table">${data.map((r) => `<tr><td>${esc(r.nama)}</td><td class="num">${esc(rupiah(r.total))}</td></tr>`).join('')}</table>`
      : '<p class="muted">Tidak ada data.</p>'}</div>`;

  page(`<div class="row-between"><h1>Laporan Bulanan</h1>
      <div class="inline-form"><input type="month" id="periode" value="${esc(periode)}">
      <button class="btn" id="csv" type="button">Ekspor CSV</button></div></div>
    <section class="stats">
      <div class="card stat"><span class="muted">Pemasukan ${esc(judul)}</span><strong class="pos">${esc(rupiah(t.pemasukan))}</strong></div>
      <div class="card stat"><span class="muted">Pengeluaran</span><strong class="neg">${esc(rupiah(t.pengeluaran))}</strong></div>
      <div class="card stat"><span class="muted">Selisih</span><strong class="${selisih < 0 ? 'neg' : 'pos'}">${esc(rupiah(selisih))}</strong></div>
    </section>
    <div class="grid2">${rekap('Pemasukan', masuk)}${rekap('Pengeluaran', keluar)}</div>
    <div class="card"><h2>Rincian Transaksi</h2>
      ${rows.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th class="num">Jumlah</th></tr></thead>
        ${rows.map((r) => `<tr><td>${esc(r.tanggal)}</td><td>${esc(r.categories?.nama)}</td><td>${esc(r.keterangan)}</td>
          <td class="num ${r.tipe === 'pemasukan' ? 'pos' : 'neg'}">${r.tipe === 'pemasukan' ? '+' : '-'}${esc(rupiah(r.jumlah))}</td></tr>`).join('')}
        </table></div>` : '<p class="muted">Tidak ada transaksi pada periode ini.</p>'}</div>`);

  document.getElementById('periode').addEventListener('change', (e) => {
    if (e.target.value) location.hash = '#/laporan?periode=' + e.target.value;
  });
  document.getElementById('csv').addEventListener('click', () => {
    downloadCsv(`laporan-${periode}.csv`, ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Keterangan'],
      rows.map((r) => [r.tanggal, r.tipe, r.categories?.nama, Number(r.jumlah).toFixed(2), r.keterangan]));
  });
}
