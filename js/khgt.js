/* Portal Masjid Al Ikhlash — Kalender Hijriah Global Tunggal (KHGT) Muhammadiyah, dihitung di browser.
 * Kriteria (Munas Tarjih XXXII 2024 / Kongres Turki 2016):
 *  1. Bulan baru dimulai keesokan harinya bila SEBELUM pukul 24.00 UTC, di daratan mana pun di bumi,
 *     saat matahari terbenam: tinggi hilal geosentrik >= 5° dan elongasi geosentrik >= 8°.
 *  2. Parameter lanjutan: bila (1) baru terpenuhi setelah 24.00 UTC, bulan baru tetap dimulai keesokan harinya
 *     asalkan ijtimak terjadi sebelum fajar di Selandia Baru DAN kriteria terpenuhi di daratan benua Amerika.
 * Posisi Bulan: deret utama Meeus (Astronomical Algorithms, bab 47) — galat ± 0,01°.
 * Hasil awal bulan disimpan di localStorage agar hitungan berat hanya terjadi sekali per bulan per perangkat.
 */
(function () {
  'use strict';
  const AI = window.AI;
  const RD = Math.PI / 180, sin = d => Math.sin(d * RD), cos = d => Math.cos(d * RD);
  const asin = x => Math.asin(Math.max(-1, Math.min(1, x))) / RD, atan2 = (y, x) => Math.atan2(y, x) / RD;
  const n360 = a => a - 360 * Math.floor(a / 360), n180 = a => { a = n360(a); return a > 180 ? a - 360 : a; };
  const DT = 69 / 86400;                                   // ΔT ≈ 69 detik (TT − UT)

  /* ---------- Matahari (Meeus bab 25, presisi rendah ± 0,01°) ---------- */
  function sun(jd) {
    const T = (jd + DT - 2451545) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T, M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
    const om = 125.04 - 1934.136 * T, lon = n360(L0 + C - 0.00569 - 0.00478 * sin(om));
    const eps = 23.439291 - 0.0130042 * T + 0.00256 * cos(om);
    return { lon, ra: n360(atan2(cos(eps) * sin(lon), cos(lon))), dec: asin(sin(eps) * sin(lon)), L0: n360(L0) };
  }

  /* ---------- Bulan (Meeus bab 47) — [D, M, M', F, koefisien 1e-6°] ---------- */
  const TL = [[0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],
    [0,1,-1,0,-40923],[1,0,0,0,-34720],[0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],
    [2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],[2,0,2,0,3994],[4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],[2,0,-1,2,-2602],[2,-1,-2,0,2390],
    [1,0,1,0,-2348],[2,-2,0,0,2236],[0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],[2,0,1,-2,-1773],[2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],
    [2,1,1,0,-810],[4,-1,-2,0,759],[0,2,-1,0,-713],[2,2,-1,0,-700],[2,1,-2,0,691],[2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],[4,-1,0,0,520],[1,0,-2,0,-487],
    [2,1,0,-2,-399],[0,0,2,-2,-381],[1,1,1,0,351],[3,0,-2,0,-340],[4,0,-3,0,330],[2,-1,2,0,327],[0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294]];
  const TB = [[0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],
    [2,-1,0,-1,8216],[2,0,-2,-1,4324],[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
    [0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],[0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],[4,0,0,-1,1021],[4,0,-1,1,833]];
  function moon(jd) {
    const T = (jd + DT - 2451545) / 36525, T2 = T * T, T3 = T2 * T;
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868;
    const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699;
    const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000;
    const A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.29 * T, A3 = 313.45 + 481266.484 * T, E = 1 - 0.002516 * T - 0.0000074 * T2;
    let sl = 0, sb = 0;
    for (const t of TL) { const e = t[1] ? (Math.abs(t[1]) === 2 ? E * E : E) : 1; sl += t[4] * e * sin(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F); }
    for (const t of TB) { const e = t[1] ? (Math.abs(t[1]) === 2 ? E * E : E) : 1; sb += t[4] * e * sin(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F); }
    sl += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
    sb += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F) + 127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);
    const om = 125.04452 - 1934.136261 * T, lon = n360(Lp + sl / 1e6 - 0.00478 * sin(om)), lat = sb / 1e6;   // + nutasi bujur
    const eps = 23.439291 - 0.0130042 * T + 0.00256 * cos(om);
    return { lon, lat, ra: n360(atan2(sin(lon) * cos(eps) - Math.tan(lat * RD) * sin(eps), cos(lon))), dec: asin(sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(lon)) };
  }
  const gmst = jd => n360(280.46061837 + 360.98564736629 * (jd - 2451545));

  /* ---------- ijtimak (konjungsi geosentrik) ke-k sejak 6 Jan 2000 ---------- */
  function ijtimak(k) {
    let jd = 2451550.09766 + 29.530588861 * k;
    for (let i = 0; i < 8; i++) {
      const f = n180(moon(jd).lon - sun(jd).lon); jd -= f / 12.19;
      if (Math.abs(f) < 1e-6) break;
    }
    return jd;
  }

  /* ---------- terbenam / fajar (UT, JD) untuk tanggal sipil lokal X (JD tengah malam UT = X) ---------- */
  function sunEvent(X, lat, lon, h, pagi) {
    let t = X + 0.5 - lon / 360;
    for (let i = 0; i < 3; i++) {
      const s = sun(t), c = (sin(h) - sin(lat) * sin(s.dec)) / (cos(lat) * cos(s.dec));
      if (c > 1 || c < -1) return NaN;
      const eqt = n180(s.L0 - 0.0057183 - s.ra) / 15, H0 = Math.acos(c) / RD / 15;
      t = X + (12 - lon / 15 - eqt + (pagi ? -H0 : H0)) / 24;
    }
    return t;
  }

  /* ---------- peta daratan kasar (poligon [bujur, lintang]) ---------- */
  const NA = [[-168,65.5],[-166,68],[-156,71],[-125,70],[-95,72],[-80,66],[-62,60],[-55,52],[-60,46],[-66,44],[-70,41.5],[-74,40],[-76,35],[-81,31],[-80,25.5],[-82,26],[-83,29],[-85,30],[-89,30],[-94,29.5],[-97,26],[-97.5,22],[-97,19],[-94,18],[-91,19],[-90.5,21.3],[-87,21.5],[-88,16],[-84,15.8],[-83.2,11],[-81.5,9],[-79,9.5],[-77.3,8.6],[-77.8,7],[-80,7.5],[-82,8.2],[-85.7,10],[-86,12],[-88,13.2],[-91.5,14],[-94,16],[-96.5,15.7],[-102,17.9],[-105.5,20.5],[-105.7,22.7],[-109,25.7],[-112.5,29.5],[-114.7,31.7],[-114,30],[-110,24],[-109.5,23],[-112,25],[-115,28],[-117,32.5],[-120.6,34.6],[-124.3,40.3],[-124,46.2],[-124.7,48.4],[-123,49],[-127,50.5],[-130,54.5],[-133,57],[-137.5,58.5],[-141,60],[-147,61],[-152,59],[-154,57.5],[-158,56.7],[-162,55],[-158,58.5],[-162,58.8],[-164.5,60.5],[-165,62.5],[-164.5,63.2],[-161,64.5],[-166,64.6]];
  const SA = [[-77.3,8.6],[-75.5,10.8],[-71.5,12.4],[-70,11.5],[-64,10.7],[-61,10.5],[-57,6],[-52,5],[-50,1.8],[-48,-1],[-44,-2.5],[-39.5,-3],[-35,-5.5],[-35,-9],[-37.5,-12],[-39,-14],[-39.5,-18],[-40.5,-21.5],[-44,-23],[-48.5,-26],[-48.8,-28.5],[-51,-31],[-53.3,-34],[-57,-35],[-58.5,-38.5],[-62,-39],[-65,-41],[-63.5,-42.7],[-65.5,-45],[-67.5,-46.5],[-65.8,-47.8],[-69,-51],[-68.5,-52.5],[-70.5,-53.8],[-74,-52.5],[-75.5,-48],[-74,-44],[-73.5,-40],[-73.2,-37],[-71.5,-32],[-71.4,-28],[-70.5,-23],[-70.2,-18.5],[-75,-15.5],[-77,-12],[-79.6,-7.5],[-81.2,-6],[-80.5,-3.5],[-80,-1.5],[-80.1,0.8],[-78.8,1.6],[-77.4,4],[-77.5,7]];
  const AF = [[-17.5,14.7],[-16.5,19.5],[-17,21],[-15,24],[-13,27.5],[-9.8,29.5],[-9.5,32.5],[-6,35.8],[-2,35.1],[3,36.8],[10,37.3],[11,35],[11.5,33],[15.5,32],[20,30.8],[20,32.5],[23,32.6],[29,30.9],[32.3,31.3],[34.2,31.3],[34.5,28],[33.5,27],[35.5,24],[37.2,21],[38.5,18],[39.7,15.3],[43.3,12.5],[44.5,10.5],[51.2,11.8],[51,10.4],[49,6],[46.5,2.5],[41.5,-1.8],[39.5,-4.8],[39,-8],[40.5,-10.5],[40.5,-15],[37,-18],[35.3,-22],[35.5,-24],[32.8,-26],[32.4,-28.6],[30,-31.3],[27,-33.7],[22.5,-34],[20,-34.8],[18.4,-34.2],[17.8,-31.5],[15,-26.5],[14.4,-22.5],[11.7,-17],[12.1,-13],[13.6,-10.5],[12.2,-6],[9,-1],[9.5,3.5],[8.5,4.5],[6,4.3],[4.3,6.3],[1.5,6],[-2,4.8],[-7.5,4.4],[-12,7],[-13.3,9],[-15,11],[-16.8,12.5]];
  const EA = [[-10,36],[-10,44],[-5,48.5],[5,51.5],[8,54],[5,58],[5,62],[14,66],[180,66],[180,65],[170,60],[163,55],[156,51],[160,58],[142,59],[135,54],[141,52],[140,48],[135,43],[130,42.5],[129.5,35],[126,34.5],[125,39],[121.5,40.5],[122,37],[119,35],[121,32],[122,30],[118,24.5],[110,21],[108,21.5],[106,19],[109,12],[105,8.5],[100.5,13.5],[99,10],[103.5,1.3],[98,8],[98.5,16.5],[94,16],[92,22],[88,22],[86.5,20],[80,15.5],[80,10],[77.5,8],[73,17],[72.5,21],[67,24.5],[62,25.2],[57,25.8],[56,26.5],[51.5,27.5],[48,30],[50,26],[51.5,24],[56,26],[59.5,22.5],[57,18.8],[52,16],[45,12.8],[43,13],[39,21.5],[35,28],[34.3,31.3],[35.5,36],[30,36.2],[26,38],[26,40.5],[23,40],[22,37],[19.5,40],[15.5,45],[12.3,45.3],[16,41.5],[18.5,40.1],[15.6,38],[12,41.5],[9,44.3],[3,43.3],[0,39],[-0.6,37.6],[-5.5,36],[-9,37]];
  const AU = [[114,-22],[114,-26],[115,-34],[118,-35],[124,-34],[129,-31.5],[135,-35],[138,-35],[140,-38],[146,-39],[150,-37.5],[153.6,-28],[153,-25],[149,-20],[146,-18],[145.3,-15],[143.5,-14],[142.5,-10.7],[141.5,-13],[141.5,-17],[139,-17],[136.7,-15.5],[137,-12],[132,-11],[129.5,-15],[127,-14],[122,-17.5],[118.5,-20.3]];
  const BOX = [[95,106,-6,5.5],[105,115,-8.8,-6],[109,119,-4,7],[119,125,-5.5,1.5],[131,150,-10,-1],[117,126.5,5,18.5],[130,142,31,41.5],[139,145.5,41.5,45.5],[-6,2,50,58.6],[-10.5,-6,51.5,55.3],[43.3,50.5,-25.5,-12],[79.5,82,6,10],[166.5,178.5,-46.5,-34.5],[-85,-74,19.8,23],[-74.5,-68.3,17.6,20],[-24,-13.5,63.4,66]];
  function inPoly(x, y, P) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
    return c;
  }
  let LAND = null;                                         // [{la, lo, am}] — am = daratan benua Amerika
  function land() {
    if (LAND) return LAND;
    LAND = [];
    for (let la = -56; la <= 66; la += 1) for (let lo = -179; lo <= 180; lo += 1) {
      const am = inPoly(lo, la, NA) || inPoly(lo, la, SA);
      if (am || inPoly(lo, la, AF) || inPoly(lo, la, EA) || inPoly(lo, la, AU) || BOX.some(b => lo >= b[0] && lo <= b[1] && la >= b[2] && la <= b[3])) LAND.push({ la, lo, am });
    }
    return LAND;
  }

  /* ---------- uji kriteria 5°/8° saat terbenam pada tanggal lokal X ---------- */
  function memenuhi(p, X, jdIjt) {
    const t = sunEvent(X, p.la, p.lo, -0.8333, false);
    if (isNaN(t) || t <= jdIjt) return 0;
    const m = moon(t), s = sun(t);
    const el = Math.acos(cos(m.lat) * cos(m.lon - s.lon)) / RD;
    if (el < 8) return 0;
    const H = gmst(t) + p.lo - m.ra, alt = asin(sin(p.la) * sin(m.dec) + cos(p.la) * cos(m.dec) * cos(H));
    return alt >= 5 ? t : 0;
  }
  const NZ = { la: -41.29, lo: 174.78 };                  // Wellington, Selandia Baru

  /* awal bulan (JD tengah malam UT, 1 tanggal) untuk ijtimak ke-k */
  function hitungAwal(k) {
    const jc = ijtimak(k), X0 = Math.floor(jc - 0.5) + 0.5, L = land();
    for (let X = X0; X < X0 + 3; X++) {
      const batas = X + 1;                                  // pukul 24.00 UTC hari X
      let utama = false, amerika = false;
      for (const p of L) {
        const t = memenuhi(p, X, jc); if (!t) continue;
        if (t < batas) { utama = true; break; }
        if (p.am) amerika = true;
      }
      if (utama) return X + 1;
      if (amerika) { const fajr = sunEvent(X + 1, NZ.la, NZ.lo, -18, true); if (jc < fajr) return X + 1; }
    }
    return X0 + 3;
  }

  /* Koreksi manual bila Maklumat/KHGT resmi berbeda: { 'tahun-bulan': 'YYYY-MM-DD' (1 tanggal) } */
  const KOREKSI = {};
  const K0 = 327;                                           // ijtimak 15 Jun 2026 → 1 Muharram 1448 H (KHGT)
  const IDX0 = (1448 - 1) * 12;
  const ymdJD = (y, m, d) => Date.UTC(y, m - 1, d) / 864e5 + 2440587.5;
  const jdYmd = jd => { const t = new Date((jd - 2440587.5) * 864e5); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0'); };
  const CK = 'ai_khgt_v1';
  let cache = null;
  function awal(k) {
    const idx = IDX0 + (k - K0), key = Math.floor(idx / 12) + 1 + '-' + (idx % 12 + 1);
    if (KOREKSI[key]) { const p = AI.ymd(KOREKSI[key]); return ymdJD(p.y, p.m, p.d); }
    if (!cache) cache = (AI.ls && AI.ls.get(CK, {})) || {};
    if (cache[k] == null) { cache[k] = hitungAwal(k); AI.ls && AI.ls.set(CK, cache); }
    return cache[k];
  }

  const BULAN_H = ['Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jumadilawal', 'Jumadilakhir', 'Rajab', 'Syakban', 'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah'];   // ejaan resmi KHGT
  AI.BULAN_H = BULAN_H;
  const memo = {};
  /** 'YYYY-MM-DD' (Masehi) → { d, m, y, bulan, teks } menurut KHGT Muhammadiyah */
  AI.hijriah = function (s) {
    if (memo[s]) return memo[s];
    const p = AI.ymd(s); if (!p) return null;
    const X = ymdJD(p.y, p.m, p.d);
    let k = Math.floor((X - 2451550.09766) / 29.530588861);
    while (awal(k) > X) k--;
    while (awal(k + 1) <= X) k++;
    const idx = IDX0 + (k - K0), y = Math.floor(idx / 12) + 1, m = idx % 12 + 1, d = Math.round(X - awal(k)) + 1;
    return (memo[s] = { d, m, y, bulan: BULAN_H[m - 1], teks: `${d} ${BULAN_H[m - 1]} ${y} H` });
  };
  /** versi tanpa memblokir tampilan: kembalikan hasil bila sudah ada, bila belum hitung di latar lalu panggil cb */
  AI.hijriahNanti = function (s, cb) {
    if (memo[s]) return memo[s];
    setTimeout(() => { try { AI.hijriah(s); } catch (e) { memo[s] = null; } cb && cb(); }, 30);
    return null;
  };
  AI._khgt = { ijtimak, hitungAwal, awal, jdYmd, sun, moon };   // untuk uji
})();
