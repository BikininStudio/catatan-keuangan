import { sb, must } from '../supabase.js';
import { esc, today } from '../utils.js';
import { page, goto, setFlash, showFlash, errMsg } from '../ui.js';

export async function render({ params }) {
  const editing = params.id !== undefined;
  const categories = must(await sb.from('categories').select('id,nama,tipe').order('nama'));
  let d = { tipe: 'pengeluaran', category_id: '', jumlah: '', tanggal: today(), keterangan: '' };

  if (editing) {
    const tx = must(await sb.from('transactions').select('*').eq('id', Number(params.id) || 0).maybeSingle());
    if (!tx) {
      page(`<div class="card"><h2>Data tidak ditemukan</h2><p class="muted">Data yang Anda cari tidak ada atau bukan milik Anda.</p>
        <a class="btn" href="#/dashboard">Kembali ke Dashboard</a></div>`);
      return;
    }
    d = tx;
  }

  page(`<h1>${editing ? 'Edit Transaksi' : 'Tambah Transaksi'}</h1>
    <form id="f" class="card form narrow" novalidate>
      <div id="errs"></div>
      <label>Tipe <select name="tipe" id="tipe" required>
        <option value="pengeluaran" ${d.tipe === 'pengeluaran' ? 'selected' : ''}>Pengeluaran</option>
        <option value="pemasukan" ${d.tipe === 'pemasukan' ? 'selected' : ''}>Pemasukan</option></select></label>
      <label>Kategori <select name="category_id" id="category_id" required><option value="">-- pilih --</option>
        ${categories.map((c) => `<option value="${esc(c.id)}" data-tipe="${esc(c.tipe)}" ${Number(d.category_id) === c.id ? 'selected' : ''}>${esc(c.nama)}</option>`).join('')}</select></label>
      <label>Jumlah (Rp) <input type="number" name="jumlah" min="1" step="0.01" value="${esc(d.jumlah)}" required></label>
      <label>Tanggal <input type="date" name="tanggal" value="${esc(d.tanggal)}" required></label>
      <label>Keterangan <input type="text" name="keterangan" maxlength="255" value="${esc(d.keterangan)}"></label>
      <div class="row-gap"><button class="btn" type="submit">Simpan</button><a class="btn btn-ghost" href="#/transaksi">Batal</a></div>
    </form>`);

  // Tampilkan hanya kategori yang sesuai tipe (UC-14).
  const tipe = document.getElementById('tipe');
  const cat = document.getElementById('category_id');
  const sync = () => {
    [...cat.options].forEach((o) => {
      if (!o.value) return;
      const show = o.dataset.tipe === tipe.value;
      o.hidden = !show;
      o.disabled = !show;
      if (!show && o.selected) cat.value = '';
    });
  };
  tipe.addEventListener('change', sync);
  sync();

  document.getElementById('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
      tipe: f.tipe.value,
      category_id: Number(f.category_id.value) || 0,
      jumlah: f.jumlah.value,
      tanggal: f.tanggal.value,
      keterangan: f.keterangan.value.trim(),
    };
    const errors = [];
    const c = categories.find((x) => x.id === data.category_id);
    if (!['pemasukan', 'pengeluaran'].includes(data.tipe)) errors.push('Tipe transaksi tidak valid.');
    if (!c || c.tipe !== data.tipe) errors.push('Pilih kategori yang sesuai dengan tipe transaksi.');
    if (!(Number(data.jumlah) > 0) || Number(data.jumlah) > 9999999999999) errors.push('Jumlah harus berupa angka lebih dari 0.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.tanggal) || Number.isNaN(Date.parse(data.tanggal))) errors.push('Tanggal tidak valid.');
    if (data.keterangan.length > 255) errors.push('Keterangan maksimal 255 karakter.');
    if (errors.length) {
      document.getElementById('errs').innerHTML = errors.map((m) => `<div class="alert alert-error">${esc(m)}</div>`).join('');
      return;
    }
    data.jumlah = Number(data.jumlah);
    const btn = f.querySelector('button');
    btn.disabled = true;
    const { error } = editing
      ? await sb.from('transactions').update(data).eq('id', Number(params.id))
      : await sb.from('transactions').insert(data);
    if (error) { btn.disabled = false; showFlash('error', errMsg(error)); return; }
    setFlash('success', editing ? 'Transaksi berhasil diperbarui.' : 'Transaksi berhasil ditambahkan.');
    goto('transaksi');
  });
}
