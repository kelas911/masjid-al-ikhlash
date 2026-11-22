/* Portal Masjid Al Ikhlash — utilitas: state global, format, ikon, hitung jam sholat */
(function () {
  'use strict';
  const AI = window.AI = {
    S: {
      pub: null, ver: '', adm: null, me: null, token: '', online: true,
      kf: { q: '', jenis: '', kategori: '', dari: '', sampai: '', n: 20 },   // filter kas
      kg: { q: '', kat: '', lalu: false },                                      // filter kegiatan
      at: 'donasi', dfil: 'Menunggu'                                            // tab admin & filter donasi
    }
  };

  AI.$ = (s, r) => (r || document).querySelector(s);
  AI.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  AI.esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  AI.safeUrl = u => { u = String(u || '').trim(); return /^https:\/\//i.test(u) || /^assets\//.test(u) || /^data:image\/(png|jpe?g|webp);base64,/.test(u) ? u : ''; };
  AI.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  AI.ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  /* ---------- format ---------- */
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN3 = BLN.map(b => b.slice(0, 3));
  const HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  AI.BLN = BLN;
  AI.rp = n => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  AI.rpS = n => (n < 0 ? '-' : '') + AI.rp(Math.abs(n));
  AI.ymd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; };
  AI.tgl = s => { const p = AI.ymd(s); return p ? `${p.d} ${BLN3[p.m - 1]} ${p.y}` : (s || ''); };
  AI.tglPanjang = s => { const p = AI.ymd(s); if (!p) return s || ''; const w = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); return `${HARI[w]}, ${p.d} ${BLN[p.m - 1]} ${p.y}`; };
  AI.tz = () => (AI.S.pub && AI.S.pub.profil.zona_waktu) || 'Asia/Jakarta';
  AI.zonaLabel = tz => ({ 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' }[tz] || 'WIB');
  AI.nowParts = (tz, d) => {
    const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz || AI.tz(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(d || new Date()).forEach(p => o[p.type] = p.value);
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute };
  };
  AI.today = tz => { const p = AI.nowParts(tz); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };
  AI.waLink = (no, teks) => { let s = String(no || '').replace(/\D/g, ''); if (s.startsWith('0')) s = '62' + s.slice(1); return s ? 'https://wa.me/' + s + (teks ? '?text=' + encodeURIComponent(teks) : '') : ''; };
  AI.inisial = n => String(n || '?').replace(/^(H\.|Hj\.|Drs?\.|Ir\.|Ust\.|Ustadz|Sdr\.?|Dr\.)\s*/gi, '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
  AI.fp = () => { let f = AI.ls.get('ai_fp'); if (!f) { f = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/[^\w-]/g, '').slice(0, 40); AI.ls.set('ai_fp', f); } return f; };

  AI.driveImg = u => { u = String(u || ''); const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?id=)([\w-]{15,})/); return m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1000' : u; };
  AI.pdfView = id => 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview';
  AI.pdfDown = id => 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id);
  AI.baris = (txt, sep) => String(txt || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => s.split(sep || '|').map(x => x.trim()));

  /* ---------- ikon (sprite inline; gaya garis) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    calplus: '<path d="M8 2v4"/><path d="M16 2v4"/><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M3 10h18"/><path d="M16 19h6"/><path d="M19 16v6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    pencil: '<path d="M21.2 6.8a1 1 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.3a.5.5 0 0 0 .6.7l4.4-1.3a2 2 0 0 0 .8-.5z"/><path d="m15 5 4 4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    pdf: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    sheet: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
    shieldok: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-1.8 5.4a2 2 0 0 1-1.3 1.3L7.8 16.2l1.8-5.4a2 2 0 0 1 1.3-1.3z"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    sliders: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    up: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>', dn: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    bank: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="m12 2 8 5H4z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    dl2: '<path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    mosque: '<path d="M12 2c1 2 3 3 3 5a3 3 0 0 1-6 0c0-2 2-3 3-5Z"/><path d="M4 22V12l4-2"/><path d="M20 22V12l-4-2"/><path d="M2 22h20"/><path d="M9 22v-5a3 3 0 0 1 6 0v5"/>'
  };
  AI.ic = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.info}</svg>`;
  AI.FB_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#dcf4e4"/><g fill="none" stroke="#0b5d36" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".55" transform="translate(120 70) scale(6.5)"><path d="M12 2c1 2 3 3 3 5a3 3 0 0 1-6 0c0-2 2-3 3-5Z"/><path d="M4 22V12l4-2"/><path d="M20 22V12l-4-2"/><path d="M2 22h20"/><path d="M9 22v-5a3 3 0 0 1 6 0v5"/></g></svg>');
  AI.img = (src, alt, cls, eager) => `<img src="${AI.esc(AI.safeUrl(src) || AI.FB_IMG)}" alt="${AI.esc(alt || '')}" class="${cls || ''}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" data-fb>`;

  /* ---------- toast ---------- */
  let tt;
  AI.toast = (msg, tipe) => {
    const el = AI.$('#toast'); if (!el) return;
    el.textContent = msg; el.className = 'toast show ' + (tipe || '');
    clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), tipe === 'err' ? 4500 : 2600);
  };

  /* ---------- hitung perkiraan jam sholat (metode Majelis Tarjih Muhammadiyah: Subuh −18° [Munas Tarjih XXXI 2020], Isya −18°, Ashar 1×) ---------- */
  const R = Math.PI / 180, sin = d => Math.sin(d * R), cos = d => Math.cos(d * R), tan = d => Math.tan(d * R);
  const asin = x => Math.asin(x) / R, acos = x => Math.acos(x) / R, atan2 = (y, x) => Math.atan2(y, x) / R, acot = x => Math.atan(1 / x) / R;
  const fixA = a => { a -= 360 * Math.floor(a / 360); return a; }, fixH = h => { h -= 24 * Math.floor(h / 24); return h; };
  function julian(y, m, d) { if (m <= 2) { y--; m += 12; } const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; }
  function sunPos(jd) {
    const D = jd - 2451545.0, g = fixA(357.529 + 0.98560028 * D), q = fixA(280.459 + 0.98564736 * D), L = fixA(q + 1.915 * sin(g) + 0.020 * sin(2 * g)),
      e = 23.439 - 0.00000036 * D, RA = fixH(atan2(cos(e) * sin(L), cos(L)) / 15);
    return { decl: asin(sin(e) * sin(L)), eq: q / 15 - RA };
  }
  AI.hitungSholat = function (y, m, d, lat, lon, tzJam) {
    const jd = julian(y, m, d) - lon / (15 * 24);
    const mid = t => fixH(12 - sunPos(jd + t).eq);
    const angleT = (ang, t, ccw) => { const dc = sunPos(jd + t).decl, c = (-sin(ang) - sin(dc) * sin(lat)) / (cos(dc) * cos(lat)); if (c > 1 || c < -1) return NaN; const x = acos(c) / 15; return mid(t) + (ccw ? -x : x); };
    const asrT = (f, t) => { const dc = sunPos(jd + t).decl; return angleT(-acot(f + tan(Math.abs(lat - dc))), t, false); };
    let T = {
      subuh: angleT(18, 5 / 24, true), terbit: angleT(0.833, 6 / 24, true), dzuhur: mid(12 / 24), ashar: asrT(1, 13 / 24),
      maghrib: angleT(0.833, 18 / 24, false), isya: angleT(18, 18 / 24, false)
    };
    const adj = tzJam - lon / 15, ih = { subuh: 2, terbit: -2, dzuhur: 2, ashar: 2, maghrib: 2, isya: 2 };   // ihtiyat 2 menit (Pedoman Hisab Muhammadiyah)
    Object.keys(T).forEach(k => { T[k] = T[k] + adj + ih[k] / 60; });
    const out = {};
    Object.keys(T).forEach(k => { if (isNaN(T[k])) { out[k] = null; return; } const mnt = Math.round(fixH(T[k]) * 60); out[k] = mnt % 1440; });
    return out;                                   // menit sejak 00:00 waktu setempat
  };
  AI.jam = mnt => mnt == null ? '--:--' : String(Math.floor(mnt / 60)).padStart(2, '0') + ':' + String(mnt % 60).padStart(2, '0');
  AI.tzJam = tz => ({ 'Asia/Jakarta': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 }[tz] || 7);
})();
