// Isi dari Supabase: Project Settings -> API.
// Project URL dan anon (public) key aman ditaruh di sini karena data dilindungi Row Level Security.
// JANGAN PERNAH memasukkan service_role key ke file ini.
export const SUPABASE_URL = 'https://izrvgyfxuukmehyrdtyk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_teDiM1rjqdA70BGRLEThig_BjBm5v4B';

// Sesi berakhir otomatis setelah tidak aktif selama ini (NFR-09: 30 menit).
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const PER_PAGE = 10;
