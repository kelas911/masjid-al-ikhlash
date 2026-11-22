/* Portal Masjid Al Ikhlash — kerangka aplikasi: router tanpa reload, bottom sheet, cache instan (SWR), PWA */
(function () {
  'use strict';
  const AI = window.AI, S = AI.S, { $, $$, esc, ic } = AI;
  const acts = AI.acts = AI.acts || {};

  /* ========================= NAVIGASI (SPA — pindah menu tanpa jaringan) ========================= */
  const ROUTES = ['beranda', 'kas', 'donasi', 'kegiatan', 'pengurus', 'admin'];
  const LABEL = { beranda: 'Beranda', kas: 'Kas', donasi: 'Donasi', kegiatan: 'Kegiatan', pengurus: 'Pengurus', admin: 'Panel Takmir' };
  const NAVIC = { beranda: 'mosque', kas: 'wallet', donasi: 'heart', kegiatan: 'calendar', pengurus: 'users' };
  const scrollMem = {};
  S.route = AI.route = '';

  function parseHash() { const m = /^#\/?([a-z]+)/.exec(location.hash || ''); return m && ROUTES.indexOf(m[1]) > -1 ? m[1] : 'beranda'; }

  function show(r, opt) {
    opt = opt || {};
    if (r === 'admin' && !S.me) { r = 'beranda'; history.replaceState(null, '', '#/beranda'); setTimeout(AI.openLogin, 0); }
    if (r === S.route && !opt.force) return;
    if (S.route) scrollMem[S.route] = window.scrollY;
    S.route = AI.route = r;
    ROUTES.forEach(k => { const el = $('#p-' + k); if (el) el.hidden = k !== r; });
    $$('#bnav a').forEach(a => { const on = a.dataset.go === r; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    $('#hd-sub').textContent = LABEL[r];
    document.title = (r === 'beranda' ? '' : LABEL[r] + ' · ') + ((S.pub && S.pub.profil.nama) || 'Masjid Al Ikhlash');
    window.scrollTo(0, scrollMem[r] || 0);
    if (r === 'beranda') { AI.updatePrayer && AI.updatePrayer(); }
    if (r === 'admin') { AI.renderAdmin(); if (S.me && S.me.wajibGanti) AI.forceChange(); else if (!S.adm) AI.loadAdmin(); }
  }
  AI.go = function (r) {
    if (ROUTES.indexOf(r) < 0) r = 'beranda';
    if (location.hash !== '#/' + r) location.hash = '#/' + r; else show(r);
  };
  window.addEventListener('hashchange', () => show(parseHash()));

  /* ========================= HEADER & NAV ========================= */
  AI.renderHeader = function () {
    const me = S.me;
    $('#hd-act').innerHTML = `<button class="tk ${me ? 'on' : ''}" data-act="takmir" aria-label="${me ? 'Buka panel takmir' : 'Masuk takmir'}">${ic('shield')}<span>${me ? 'Panel' : 'Takmir'}</span></button>` +
      (me ? `<button class="avt" data-act="takmir" aria-label="Akun ${esc(me.nama || me.username)}">${esc(AI.inisial(me.nama || me.username))}</button>` : `<span class="avt guest" aria-hidden="true">${ic('user')}</span>`);
    if (S.pub) $('#hd-nama').textContent = S.pub.profil.nama || 'Masjid Al Ikhlash';
  };
  acts.takmir = () => { if (!S.me) AI.openLogin(); else if (S.me.wajibGanti) AI.forceChange(); else AI.go('admin'); };

  function renderNav() {
    $$('#bnav a').forEach(a => { const k = a.dataset.go; a.innerHTML = ic(NAVIC[k]) + '<span>' + LABEL[k] + '</span>'; });
  }

  /* ========================= BOTTOM SHEET & KONFIRMASI ========================= */
  let sheetLock = false, lastFocus = null, confirmRes = null;
  AI.sheet = function (html, opt) {
    opt = opt || {};
    if (confirmRes) { confirmRes(false); confirmRes = null; }
    sheetLock = !!opt.lock; lastFocus = document.activeElement;
    $('#sheet-body').innerHTML = html;
    const ov = $('#overlay'); ov.hidden = false; document.body.classList.add('noscroll');
    requestAnimationFrame(() => { ov.classList.add('open'); const f = $('#sheet-body input:not([type=hidden]):not([hidden]), #sheet-body textarea, #sheet-body select'); (f && !/Android|iPhone/i.test(navigator.userAgent) ? f : $('#sheet')).focus({ preventScroll: true }); });
  };
  AI.closeSheet = function (force) {
    if (sheetLock && !force) return;
    sheetLock = false;
    const ov = $('#overlay'); if (ov.hidden) return;
    if (confirmRes) { confirmRes(false); confirmRes = null; }
    ov.classList.remove('open'); document.body.classList.remove('noscroll');
    setTimeout(() => { if (!ov.classList.contains('open')) { ov.hidden = true; $('#sheet-body').innerHTML = ''; } }, 180);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { } }
  };
  AI.confirm = function (msg, label, danger) {
    return new Promise(res => {
      AI.sheet(`<div class="confirm"><span class="big-ic ${danger ? 'warn' : ''}">${ic(danger ? 'trash' : 'info')}</span><p>${esc(msg)}</p>
        <div class="two"><button class="btn ghost" data-act="cf-no">Batal</button><button class="btn ${danger ? 'danger' : 'primary'}" data-act="cf-yes">${esc(label || 'Ya')}</button></div></div>`);
      confirmRes = res;
    });
  };
  acts['cf-yes'] = () => { const r = confirmRes; confirmRes = null; AI.closeSheet(); r && r(true); };
  acts['cf-no'] = () => AI.closeSheet();
  acts.close = () => AI.closeSheet();
  acts['close-scrim'] = () => AI.closeSheet();
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#overlay').hidden) AI.closeSheet(); });

  /* ========================= DELEGASI KLIK ========================= */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a && acts[a.dataset.act]) { e.preventDefault(); acts[a.dataset.act](a, e); return; }
    const g = e.target.closest('a[data-go]');
    if (g && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); AI.go(g.dataset.go); }
  });
  // gambar gagal dimuat → gambar cadangan (sekali saja)
  document.addEventListener('error', e => {
    const im = e.target;
    if (!im || im.tagName !== 'IMG' || !im.hasAttribute('data-fb') || im.dataset.fbDone) return;
    im.dataset.fbDone = '1';
    const fb = im.getAttribute('data-fb'); im.src = fb && fb !== im.getAttribute('src') ? fb : AI.FB_IMG;
  }, true);

  /* ========================= DATA: tampil instan dari cache, segarkan di latar (SWR) ========================= */
  let lastSync = 0;
  function netUI() { const n = $('#net'); if (n) n.hidden = S.online; }
  function afterData() {
    AI.renderHeader(); AI.renderPublic();
    if (S.route === 'admin') AI.renderAdmin();
    if (S.route) document.title = (S.route === 'beranda' ? '' : LABEL[S.route] + ' · ') + S.pub.profil.nama;
  }
  function loadError(e) {
    const html = `<div class="card empty err-card">${ic('cloud')}<h2>${e.code === 'CONFIG' ? 'Konfigurasi belum lengkap' : 'Data belum bisa dimuat'}</h2><p>${esc(e.message)}</p>${e.code === 'CONFIG' ? '' : '<button class="btn primary" data-act="retry">Coba lagi</button>'}</div>`;
    ['beranda', 'kas', 'donasi', 'kegiatan', 'pengurus'].forEach(k => { $('#p-' + k).innerHTML = html; });
    AI.resetSig();
  }
  acts.retry = () => { ['beranda', 'kas', 'donasi', 'kegiatan', 'pengurus'].forEach(k => { $('#p-' + k).innerHTML = '<div class="sk sk-h"></div><div class="sk sk-c"></div><div class="sk sk-c"></div>'; }); AI.refreshAll(true); };

  AI.refreshAll = async function (force) {
    if (!AI.configOk()) { if (!S.pub) loadError(AI.ApiError('Isi GAS_URL di js/config.js dengan URL Web App (…/exec).', 'CONFIG')); return; }
    lastSync = Date.now();
    try {
      const r = await AI.apiBoot(force ? '' : S.ver);
      if (!S.online) { S.online = true; netUI(); }
      if (r.same) return;
      if (S.pub && Number(r.ver) < Number(S.ver)) return;           // jawaban basi (kalah balapan dengan tulis admin)
      S.pub = r.data; S.ver = r.ver; AI.ls.set('ai_boot', { ver: r.ver, data: r.data });
      afterData();
    } catch (e) {
      if (e.code === 'NET') { S.online = false; netUI(); }
      if (!S.pub) loadError(e);
    }
  };

  // segarkan saat tab kembali aktif / koneksi pulih; polling ringan hanya saat tab terlihat & pengguna aktif
  let lastTouch = Date.now();
  ['pointerdown', 'keydown', 'scroll'].forEach(ev => addEventListener(ev, () => { lastTouch = Date.now(); }, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastSync > 20000) AI.refreshAll(); });
  addEventListener('online', () => { S.online = true; netUI(); AI.refreshAll(); });
  addEventListener('offline', () => { S.online = false; netUI(); });
  setInterval(() => { if (!document.hidden && Date.now() - lastTouch < 5 * 60000) AI.refreshAll(); }, 60000);
  setInterval(() => { if (!document.hidden && S.route === 'beranda') AI.updatePrayer && AI.updatePrayer(); }, 20000);

  /* ========================= PWA: pasang ke layar utama & service worker ========================= */
  AI.installPrompt = null;
  AI.showInstall = function () {
    const slot = $('#install-slot'); if (!slot || !AI.installPrompt) return;
    slot.innerHTML = `<section class="card install"><img src="assets/icon-192.png" alt="" width="44" height="44"><div><b>Pasang aplikasi di layar utama</b><small>Buka lebih cepat, tetap bisa dibaca saat sinyal lemah.</small></div><button class="btn gold sm" data-act="install">Pasang</button></section>`;
  };
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); AI.installPrompt = e; AI.showInstall(); });
  addEventListener('appinstalled', () => { AI.installPrompt = null; const s = $('#install-slot'); if (s) s.innerHTML = ''; AI.toast('Aplikasi terpasang ✔'); });
  acts.install = async () => { const p = AI.installPrompt; if (!p) return; p.prompt(); try { await p.userChoice; } catch (e) { } AI.installPrompt = null; const s = $('#install-slot'); if (s) s.innerHTML = ''; };

  if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.protocol + '//' + location.hostname)) {
    addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { }); });
  }

  /* ========================= MULAI ========================= */
  function start() {
    renderNav();
    AI.sesiMuat();
    const c = AI.ls.get('ai_boot');
    if (c && c.data && c.data.profil) { S.pub = c.data; S.ver = c.ver || ''; }
    AI.renderHeader();
    AI.renderPublic(true);                           // dari cache lokal → tampil 0 ms, tanpa menunggu server
    show(parseHash(), { force: true });
    AI.refreshAll();                                 // sinkron di latar belakang; bila versi sama → tanpa unduh ulang
    if (S.me && S.route !== 'admin') { /* data admin dimuat saat panel dibuka */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
