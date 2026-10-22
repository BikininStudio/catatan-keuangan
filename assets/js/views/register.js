import { register } from '../auth.js';
import { esc } from '../utils.js';
import { page, goto, setFlash, showFlash, errMsg } from '../ui.js';

export async function render() {
  page(`<form id="f" class="card form" novalidate>
      <h2>Registrasi</h2>
      <div id="errs"></div>
      <label>Nama <input type="text" name="nama" maxlength="100" required autofocus></label>
      <label>Email <input type="email" name="email" required></label>
      <label>Password (min. 6 karakter) <input type="password" name="password" minlength="6" required></label>
      <label>Konfirmasi Password <input type="password" name="password2" minlength="6" required></label>
      <button class="btn" type="submit">Daftar</button>
      <p class="muted">Sudah punya akun? <a href="#/login">Login</a></p>
    </form>`, { guest: true });

  document.getElementById('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const nama = f.nama.value.trim();
    const email = f.email.value.trim();
    const errors = [];
    if (!nama || nama.length > 100) errors.push('Nama wajib diisi (maksimal 100 karakter).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Format email tidak valid.');
    if (f.password.value.length < 6) errors.push('Password minimal 6 karakter.');
    if (f.password.value !== f.password2.value) errors.push('Konfirmasi password tidak sama.');
    if (errors.length) {
      document.getElementById('errs').innerHTML = errors.map((m) => `<div class="alert alert-error">${esc(m)}</div>`).join('');
      return;
    }
    const btn = f.querySelector('button');
    btn.disabled = true;
    try {
      const active = await register(nama, email, f.password.value);
      setFlash('success', active ? 'Registrasi berhasil. Silakan login.'
        : 'Registrasi berhasil. Cek email Anda untuk konfirmasi, lalu login.');
      goto('login');
    } catch (err) {
      document.getElementById('errs').innerHTML = '';
      showFlash('error', errMsg(err));
      btn.disabled = false;
    }
  });
}
