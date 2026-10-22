export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const rupiah = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September',
  'Oktober', 'November', 'Desember'];
export const namaBulan = (m) => BULAN[m] || '';

const pad = (n) => String(n).padStart(2, '0');

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "YYYY-MM" -> {bulan, tahun}; default bulan berjalan.
export function parsePeriode(p) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(p || '');
  if (m) return { bulan: Number(m[2]), tahun: Number(m[1]) };
  const d = new Date();
  return { bulan: d.getMonth() + 1, tahun: d.getFullYear() };
}

export const periodeStr = (bulan, tahun) => `${tahun}-${pad(bulan)}`;

export function rangeBulan(bulan, tahun) {
  const last = new Date(tahun, bulan, 0).getDate();
  return [`${tahun}-${pad(bulan)}-01`, `${tahun}-${pad(bulan)}-${pad(last)}`];
}

// Status anggaran: aman (<80%), hampir habis (80-100%), melebihi (>100%).
export function budgetStatus(persen) {
  return persen > 100 ? 'melebihi' : persen >= 80 ? 'hampir habis' : 'aman';
}

export function withStatus(rows) {
  return rows.map((r) => {
    const persen = r.batas > 0 ? Math.round((r.terpakai / r.batas) * 1000) / 10 : 0;
    return { ...r, persen, status: budgetStatus(persen) };
  });
}

export const cls = (status) => status.replace(' ', '-');

// CSV UTF-8 (BOM agar Excel membaca benar); sel berawalan = + - @ dinetralkan (CSV injection).
export function downloadCsv(filename, header, rows) {
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const text = '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
