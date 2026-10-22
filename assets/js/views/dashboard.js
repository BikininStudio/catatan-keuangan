import { sb, must } from '../supabase.js';
import { esc, rupiah, namaBulan, parsePeriode, rangeBulan, withStatus, cls } from '../utils.js';
import { page } from '../ui.js';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

export async function render() {
  const { bulan, tahun } = parsePeriode();
  const [dari, sampai] = rangeBulan(bulan, tahun);
  const [all, bln, monthly, kat, recent, ang] = await Promise.all([
    sb.rpc('ringkasan', { p_dari: null, p_sampai: null }),
    sb.rpc('ringkasan', { p_dari: dari, p_sampai: sampai }),
    sb.rpc('ringkasan_bulanan', { p_tahun: tahun }),
    sb.rpc('rekap_kategori', { p_dari: dari, p_sampai: sampai, p_tipe: 'pengeluaran' }),
    sb.from('transactions').select('id,tipe,jumlah,tanggal,keterangan,categories(nama)')
      .order('tanggal', { ascending: false }).order('id', { ascending: false }).limit(5),
    sb.rpc('anggaran_bulan', { p_bulan: bulan, p_tahun: tahun }),
  ]).then((rs) => rs.map(must));

  const tAll = all[0], tBln = bln[0];
  const saldo = tAll.pemasukan - tAll.pengeluaran;
  const budgets = withStatus(ang);
  const perBulan = Array.from({ length: 12 }, (_, i) => monthly.find((m) => m.bulan === i + 1) || { pemasukan: 0, pengeluaran: 0 });
  const judul = `${namaBulan(bulan)} ${tahun}`;

  page(`<h1>Dashboard</h1>
    <section class="stats">
      <div class="card stat"><span class="muted">Total Saldo</span><strong class="${saldo < 0 ? 'neg' : ''}">${esc(rupiah(saldo))}</strong></div>
      <div class="card stat"><span class="muted">Pemasukan ${esc(judul)}</span><strong class="pos">${esc(rupiah(tBln.pemasukan))}</strong></div>
      <div class="card stat"><span class="muted">Pengeluaran ${esc(judul)}</span><strong class="neg">${esc(rupiah(tBln.pengeluaran))}</strong></div>
    </section>
    <section class="grid2">
      <div class="card"><h2>Pengeluaran per Kategori</h2>
        ${kat.length ? '<canvas id="chartKategori" height="220"></canvas>' : '<p class="muted">Belum ada pengeluaran bulan ini.</p>'}</div>
      <div class="card"><h2>Tren Tahun ${esc(tahun)}</h2><canvas id="chartBulan" height="220"></canvas></div>
    </section>
    <section class="grid2">
      <div class="card">
        <div class="row-between"><h2>Transaksi Terbaru</h2><a href="#/transaksi/baru" class="btn btn-sm">+ Tambah</a></div>
        ${recent.length ? `<table class="table">${recent.map((t) => `<tr>
          <td>${esc(t.tanggal)}</td>
          <td>${esc(t.categories?.nama)}<br><small class="muted">${esc(t.keterangan)}</small></td>
          <td class="num ${t.tipe === 'pemasukan' ? 'pos' : 'neg'}">${t.tipe === 'pemasukan' ? '+' : '-'}${esc(rupiah(t.jumlah))}</td></tr>`).join('')}</table>`
          : '<p class="muted">Belum ada transaksi.</p>'}
      </div>
      <div class="card">
        <div class="row-between"><h2>Anggaran Bulan Ini</h2><a href="#/anggaran" class="btn btn-sm btn-ghost">Kelola</a></div>
        ${budgets.length ? budgets.map((b) => `<div class="budget">
          <div class="row-between"><span>${esc(b.kategori)}</span><span class="badge st-${cls(b.status)}">${esc(b.status)}</span></div>
          <div class="bar-track"><div class="bar-fill st-${cls(b.status)}" style="width:${Math.min(100, b.persen)}%"></div></div>
          <small class="muted">${esc(rupiah(b.terpakai))} dari ${esc(rupiah(b.batas))} (${esc(b.persen)}%)</small></div>`).join('')
          : '<p class="muted">Belum ada anggaran bulan ini.</p>'}
      </div>
    </section>`);

  if (window.Chart) {
    if (kat.length) {
      new Chart(document.getElementById('chartKategori'), {
        type: 'doughnut',
        data: { labels: kat.map((k) => k.nama), datasets: [{ data: kat.map((k) => Number(k.total)), backgroundColor: COLORS }] },
        options: { plugins: { legend: { position: 'bottom' } } },
      });
    }
    new Chart(document.getElementById('chartBulan'), {
      type: 'bar',
      data: {
        labels: Array.from({ length: 12 }, (_, i) => namaBulan(i + 1).slice(0, 3)),
        datasets: [
          { label: 'Pemasukan', data: perBulan.map((m) => Number(m.pemasukan)), backgroundColor: '#16a34a' },
          { label: 'Pengeluaran', data: perBulan.map((m) => Number(m.pengeluaran)), backgroundColor: '#dc2626' },
        ],
      },
      options: { plugins: { legend: { position: 'bottom' } } },
    });
  }
}
