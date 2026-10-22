import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_ANON_KEY.startsWith('ISI_');
export const sb = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Lempar error Supabase agar ditangkap pemanggil.
export function must(res) {
  if (res.error) throw res.error;
  return res.data;
}

// Ambil semua baris (PostgREST membatasi 1000 baris per permintaan).
export async function fetchAll(make) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const data = must(await make().range(from, from + 999));
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
