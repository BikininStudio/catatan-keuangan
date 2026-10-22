import { sb, must } from '../supabase.js';
import { user } from '../auth.js';
import { esc, rupiah, namaBulan, parsePeriode, periodeStr, withStatus, cls } from '../utils.js';
import { page, setFlash, renderFlash, showFlash, errMsg } from '../ui.js';

export async function render({ query }) {
  const { bulan, tahun } = parsePeriode(query.periode);
  const periode = periodeStr(bulan, tahun);
  const [ang, cats] = await Promise.all([
    sb.rpc('anggaran_bulan', { p_bulan: bulan, p_tahun: tahun }),
    sb.from('categories').select('id,nama').eq('tipe', 'pengeluaran').order('nama'),
  ]).then((rs) => rs.map(must));
  const budgets = withStatus(ang);

  page(`<div class="row-between"><h1>Anggaran</h1>
      <div class="inline-form"><input type="month" id="periode" value="${esc(periode)}"></div></div>
    <form id="f" class="card inline-form">
      <select name="category_id" required><option value="">-- kategori pengeluaran --</option>
        ${cats.map((c) => `<option value="${esc(c.id)}">${esc(c.nama)}</option>`).join('')}</select>
      <input type="number" name="batas" min="1" step="0.01" placeholder="Batas (Rp)" required>
      <button class="btn" type="submit">Simpan Anggaran</button>
      <small class="muted">Menyimpan kategori yang sudah ada akan memperbarui batasnya.</small>
    </form>
    <div class="card"><h2>Anggaran ${esc(namaBulan(bulan))} ${esc(tahun)}</h2>
      ${budgets.length ? budgets.map((b) => `<div class="budget">
        <div class="row-between"><strong>${esc(b.kategori)}</strong><span>
          <span class="badge st-${cls(b.status)}">${esc(b.status)}</span>
          <button class="btn btn-sm btn-danger" data-del="${esc(b.id)}" type="button" style="margin-left:8px">Hapus</button></span></div>
        <div class="bar-track"><div class="bar-fill st-${cls(b.status)}" style="width:${Math.min(100, b.persen)}%"></div></div>
        <small class="muted">${esc(rupiah(b.terpakai))} dari ${esc(rupiah(b.batas))} (${esc(b.persen)}%)</small></div>`).join('')
        : '<p class="muted">Belum ada anggaran untuk periode ini.</p>'}</div>`);

  document.getElementById('periode').addEventListener('change', (e) => {
    if (e.target.value) location.hash = '#/anggaran?periode=' + e.target.value;
  });

  document.getElementById('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoryId = Number(e.target.category_id.value) || 0;
    const batas = Number(e.target.batas.value);
    if (!cats.some((c) => c.id === categoryId)) { showFlash('error', 'Pilih kategori pengeluaran.'); return; }
    if (!(batas > 0) || batas > 9999999999999) { showFlash('error', 'Batas anggaran harus berupa angka lebih dari 0.'); return; }
    const { error } = await sb.from('budgets').upsert(
      { user_id: user.id, category_id: categoryId, bulan, tahun, batas },
      { onConflict: 'user_id,category_id,bulan,tahun' });
    if (error) { showFlash('error', errMsg(error)); return; }
    setFlash('success', 'Anggaran berhasil disimpan.');
    await render({ query });
    renderFlash();
  });

  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Hapus anggaran ini?')) return;
    const { error } = await sb.from('budgets').delete().eq('id', Number(b.dataset.del));
    if (error) { showFlash('error', errMsg(error)); return; }
    setFlash('success', 'Anggaran berhasil dihapus.');
    await render({ query });
    renderFlash();
  }));
}
