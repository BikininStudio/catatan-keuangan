import { login, loginDemo } from '../auth.js';
import { page, goto, showFlash } from '../ui.js';

export async function render() {
  page(`<form id="f" class="card form" novalidate>
      <h2>Login</h2>
      <label>Email <input type="email" name="email" required autofocus></label>
      <label>Password <input type="password" name="password" required></label>
      <button class="btn" type="submit">Masuk</button>
      <p class="muted">Belum punya akun? <a href="#/register">Daftar</a></p>
    </form>
    <div class="card form demo-box">
      <button class="btn btn-ghost" id="btn-demo" type="button">Coba demo tanpa daftar</button>
      <p class="muted">Langsung masuk dengan data contoh. Data demo terhapus otomatis setelah 1 hari.</p>
    </div>`, { guest: true });

  document.getElementById('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value.trim();
    if (!email || !f.password.value) { showFlash('error', 'Email dan password wajib diisi.'); return; }
    const btn = f.querySelector('button');
    btn.disabled = true;
    try {
      await login(email, f.password.value);
      goto('dashboard');
    } catch (err) {
      showFlash('error', err.message);
      btn.disabled = false;
    }
  });

  const demo = document.getElementById('btn-demo');
  demo.addEventListener('click', async () => {
    demo.disabled = true;
    try {
      await loginDemo();
      goto('dashboard');
    } catch (err) {
      showFlash('error', err.message);
      demo.disabled = false;
    }
  });
  // Link dari portofolio (…/?demo=1) langsung masuk mode demo.
  if (new URLSearchParams(location.search).has('demo')) demo.click();
}
