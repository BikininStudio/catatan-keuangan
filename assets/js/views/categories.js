import { sb, must } from '../supabase.js';
import { esc } from '../utils.js';
import { page, setFlash, renderFlash, showFlash, errMsg } from '../ui.js';

export async function render({ query }) {
  const cats = must(await sb.from('categories').select('id,nama,tipe').order('tipe').order('nama'));
  const edit = query.edit ? cats.find((c) => String(c.id) === query.edit) : null;

  const list = (tipe) => {
    const rows = cats.filter((c) => c.tipe === tipe);
    return `<div class="card"><h2>${tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}</h2><table class="table">
      ${rows.length ? rows.map((c) => `<tr><td>${esc(c.nama)}</td><td class="actions">
        <a class="btn btn-sm btn-ghost" href="#/kategori?edit=${esc(c.id)}">Edit</a>
        <button class="btn btn-sm btn-danger" data-del="${esc(c.id)}" type="button">Hapus</button></td></tr>`).join('')
        : '<tr><td class="muted">Belum ada kategori.</td></tr>'}</table></div>`;
  };

  page(`<h1>Kategori</h1>
    <form id="f" class="card inline-form">
      <input type="text" name="nama" placeholder="Nama kategori" maxlength="80" value="${esc(edit?.nama ?? '')}" required>
      <select name="tipe">
        <option value="pengeluaran" ${edit?.tipe === 'pengeluaran' ? 'selected' : ''}>Pengeluaran</option>
        <option value="pemasukan" ${edit?.tipe === 'pemasukan' ? 'selected' : ''}>Pemasukan</option></select>
      <button class="btn" type="submit">${edit ? 'Simpan Perubahan' : '+ Tambah Kategori'}</button>
      ${edit ? '<a class="btn btn-ghost" href="#/kategori">Batal</a>' : ''}
    </form>
    <div class="grid2">${list('pemasukan')}${list('pengeluaran')}</div>`);

  const done = async (msg) => {
    setFlash('success', msg);
    if (edit) { location.hash = '#/kategori'; return; }
    await render({ query: {} });
    renderFlash();
  };

  document.getElementById('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = e.target.nama.value.trim();
    const tipe = e.target.tipe.value;
    if (!nama || nama.length > 80) { showFlash('error', 'Nama kategori wajib diisi (maksimal 80 karakter).'); return; }
    if (!['pemasukan', 'pengeluaran'].includes(tipe)) { showFlash('error', 'Tipe kategori tidak valid.'); return; }
    const { error } = edit
      ? await sb.from('categories').update({ nama, tipe }).eq('id', edit.id)
      : await sb.from('categories').insert({ nama, tipe });
    if (error) {
      showFlash('error', error.code === '23505' ? 'Kategori dengan nama dan tipe yang sama sudah ada.' : errMsg(error));
      return;
    }
    await done(edit ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.');
  });

  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Hapus kategori ini?')) return;
    const { error } = await sb.from('categories').delete().eq('id', Number(b.dataset.del));
    if (error) {
      showFlash('error', error.code === '23503' ? 'Kategori tidak dapat dihapus karena masih dipakai transaksi.' : errMsg(error));
      return;
    }
    await done('Kategori berhasil dihapus.');
  }));
}
