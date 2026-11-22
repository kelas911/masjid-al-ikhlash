/* Portal Masjid Al Ikhlash — klien REST ke Google Apps Script (tanpa iframe / google.script.run) */
(function () {
  'use strict';
  const AI = window.AI, S = AI.S;

  const URL_ = () => String((window.APP_CONFIG || {}).GAS_URL || '').trim();
  // Placeholder ditolak (aturan R1): URL harus /exec Web App asli (atau localhost untuk pengujian lokal)
  AI.configOk = () => /^(https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec|http:\/\/localhost:\d+\/exec)$/.test(URL_()) && !/GANTI|XXXX/i.test(URL_());

  function ApiError(msg, code) { const e = new Error(msg); e.code = code || 'ERR'; return e; }
  AI.ApiError = ApiError;

  async function req(url, opt, timeout) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), timeout || 30000);
    try {
      const r = await fetch(url, Object.assign({ signal: c.signal, redirect: 'follow', cache: 'no-store' }, opt));
      return await r.json();
    } catch (e) {
      throw ApiError(e.name === 'AbortError' ? 'Koneksi lambat. Coba lagi.' : 'Tidak ada koneksi internet.', 'NET');
    } finally { clearTimeout(t); }
  }

  /* GET data publik — permintaan kembar menumpang promise yang sama (dedupe in-flight) */
  let inflight = null;
  AI.apiBoot = function (since) {
    if (!AI.configOk()) return Promise.reject(ApiError('Konfigurasi belum lengkap: isi GAS_URL di js/config.js.', 'CONFIG'));
    if (inflight) return inflight;
    const u = URL_() + '?action=boot' + (since ? '&since=' + encodeURIComponent(since) : '');
    const run = async () => {
      let r;
      try { r = await req(u, {}, 25000); }
      catch (e) { if (e.code === 'NET') { await new Promise(s => setTimeout(s, 700)); r = await req(u, {}, 25000); } else throw e; }  // 1× ulang (jaringan HP)
      if (!r.success) throw ApiError(r.message || 'Gagal memuat data.', r.code);
      return r;
    };
    inflight = run().finally(() => { inflight = null; });
    return inflight;
  };

  /* POST — Content-Type WAJIB text/plain agar tidak memicu CORS preflight di GAS. Token ikut di body. */
  AI.api = async function (action, data, opt) {
    opt = opt || {};
    if (!AI.configOk()) throw ApiError('Konfigurasi belum lengkap: isi GAS_URL di js/config.js.', 'CONFIG');
    const body = JSON.stringify({ action, token: opt.auth === false ? undefined : S.token, data: data || {} });
    const r = await req(URL_(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body }, opt.timeout || 45000);
    if (!r.success) {
      if (r.code === 'AUTH' && opt.auth !== false) AI.authLost && AI.authLost();
      if (r.code === 'GANTI_SANDI') AI.forceChange && AI.forceChange();
      throw ApiError(r.message || 'Permintaan gagal.', r.code);
    }
    return r;
  };

  /* sesi: simpan token di localStorage (berumur pendek & bisa dicabut dari server) */
  function expOf(t) { try { const b = t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(b + '==='.slice((b.length + 3) % 4))).x || 0; } catch (e) { return 0; } }
  AI.sesiMuat = function () {
    const s = AI.ls.get('ai_sess');
    if (s && s.token && expOf(s.token) > Date.now()) { S.token = s.token; S.me = s.me; } else AI.ls.del('ai_sess');
  };
  AI.sesiSimpan = function (token, me) { S.token = token; S.me = me; AI.ls.set('ai_sess', { token, me }); };
  AI.sesiHapus = function () { S.token = ''; S.me = null; S.adm = null; AI.ls.del('ai_sess'); };
})();
