/* Portal Masjid Al Ikhlash — halaman publik: Beranda, Kas, Donasi, Kegiatan, Pengurus */
(function () {
  'use strict';
  const AI = window.AI, S = AI.S, { $, $$, esc, ic, rp, tgl } = AI;
  const EMPTY = { profil: {}, kas: [], kasTotal: { masuk: 0, keluar: 0, saldo: 0, n: 0 }, kegiatan: [], pengurus: [], galeri: [], jadwalSholat: null };
  const D = () => S.pub || EMPTY;
  AI.acts = AI.acts || {};
  const sig = {};                                   // tanda terakhir tiap halaman → lewati render ulang bila tak berubah
  const skel = () => '<div class="sk sk-h"></div><div class="sk sk-c"></div><div class="sk sk-c"></div><div class="sk sk-c"></div>';
  const ext = 'target="_blank" rel="noopener noreferrer"';

  /* ---------- kompres gambar di browser (hemat kuota & batas ukuran GAS) ---------- */
  AI.compress = function (file, max, q) {
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type)) return rej(new Error('Pilih berkas gambar (JPG/PNG/WebP).'));
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const k = Math.min(1, (max || 1000) / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const d = c.toDataURL('image/jpeg', q || 0.8);
        res({ mime: 'image/jpeg', data: d.split(',')[1], preview: d, name: file.name.replace(/\.\w+$/, '') });
      };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Gambar tidak bisa dibaca.')); };
      im.src = url;
    });
  };

  /* ========================= BERANDA ========================= */
  const NAMA_SHOLAT = { subuh: 'Subuh', terbit: 'Terbit', dzuhur: 'Dzuhur', ashar: 'Ashar', maghrib: 'Maghrib', isya: 'Isya' };
  function sholatCard() {
    const f = D().profil, j = D().jadwalSholat, hitung = f.hitung_jadwal !== 'tidak', tz = AI.tz(), np = AI.nowParts(tz);
    return `<section class="card sholat" id="sholat">
      <div class="card-head green pattern"><h2>${ic('clock')}Jadwal Sholat — ${AI.BLN[np.m - 1]} ${np.y}</h2><span class="pill light">${AI.zonaLabel(tz)}</span></div>
      ${hitung ? '<div id="pray-dyn"></div>' : '<div id="tgl-dyn"></div>'}
      ${j ? `<div class="pdf-row"><div class="pdf-ic">${ic('pdf')}</div><div class="pdf-t"><b>${esc(j.Judul || 'Jadwal Sholat')}</b><small>Jadwal resmi bulan ${esc(j.Bulan)}</small></div>
        <a class="btn gold sm" href="${esc(AI.pdfDown(j.FileID))}" ${ext}>${ic('download')}Unduh PDF</a></div>
        <button class="btn ghost block" data-act="pdf-toggle" aria-expanded="false">${ic('eye')}<span>Lihat Pratinjau PDF</span></button>
        <div class="pdf-box" id="pdf-box" hidden></div>`
        : `<p class="empty-s">${hitung ? '' : 'Jadwal sholat bulan ini belum diunggah.'}</p>`}
      ${hitung ? '<p class="hint pad">Jam di atas adalah perkiraan hasil hitung (metode Majelis Tarjih Muhammadiyah). Tanggal Hijriah mengikuti Kalender Hijriah Global Tunggal (KHGT). Rujukan resmi: jadwal PDF.</p>' : ''}
    </section>`;
  }
  let lastPray = '';
  /* hari & tanggal Masehi berjalan + tanggal Hijriah (KHGT Muhammadiyah) — tampil tepat di atas kolom Subuh */
  function tanggalHtml(tz) {
    const hari = AI.today(tz), h = AI.hijriahNanti ? AI.hijriahNanti(hari, () => { lastPray = ''; updatePrayer(); }) : null;
    return `<div class="tgl-strip">${ic('calendar')}<div><b>${esc(AI.tglPanjang(hari))}</b><span>${h ? esc(h.teks) : 'Menghitung tanggal Hijriah…'}</span></div></div>`;
  }
  function updatePrayer() {
    const tb = $('#tgl-dyn');
    if (tb) { const t = tanggalHtml(AI.tz()); if (t !== lastPray) { tb.innerHTML = t; lastPray = t; } return; }
    const box = $('#pray-dyn'); if (!box) return;
    const f = D().profil, tz = AI.tz(), np = AI.nowParts(tz), lat = parseFloat(f.lat), lon = parseFloat(f.lon), tj = AI.tzJam(tz);
    if (!isFinite(lat) || !isFinite(lon)) { const t = tanggalHtml(tz); if (t !== lastPray) { box.innerHTML = t; lastPray = t; } return; }
    const T = AI.hitungSholat(np.y, np.m, np.d, lat, lon, tj), now = np.h * 60 + np.mi;
    const wajib = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    let nx = wajib.find(k => T[k] != null && T[k] > now), sisa;
    if (nx) sisa = T[nx] - now;
    else { const bsk = AI.hitungSholat(...(function () { const d = new Date(Date.UTC(np.y, np.m - 1, np.d + 1)); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; })(), lat, lon, tj); nx = 'subuh'; sisa = bsk.subuh + 1440 - now; }
    const jam = sisa >= 60 ? `${Math.floor(sisa / 60)} jam ${sisa % 60} menit` : `${sisa} menit`;
    const html = `<div class="next-strip"><span class="dot"></span><span>${jam} menuju ${NAMA_SHOLAT[nx]} (${AI.jam(T[nx] != null && T[nx] > now ? T[nx] : T.subuh)} ${AI.zonaLabel(tz)})</span><small>${esc(f.kota || '')}</small></div>
      ${tanggalHtml(tz)}
      <div class="pgrid">${Object.keys(NAMA_SHOLAT).map(k => `<div class="pt ${k === nx ? 'next' : ''} ${k === 'terbit' ? 'muted' : ''}">${k === nx ? '<i>BERIKUTNYA</i>' : ''}<small>${NAMA_SHOLAT[k]}</small><b>${AI.jam(T[k])}</b></div>`).join('')}</div>`;
    if (html !== lastPray) { box.innerHTML = html; lastPray = html; }
  }
  AI.updatePrayer = updatePrayer;
  AI.acts['pdf-toggle'] = (el) => {
    const box = $('#pdf-box'), j = D().jadwalSholat; if (!box || !j) return;
    const buka = box.hidden;
    if (buka && !box.firstChild) box.innerHTML = `<iframe src="${esc(AI.pdfView(j.FileID))}" title="Pratinjau jadwal sholat" loading="lazy"></iframe><p class="hint">Jika pratinjau kosong/diblokir browser, gunakan <a href="${esc(AI.pdfView(j.FileID))}" ${ext}>Buka di tab baru</a> atau tombol Unduh PDF.</p>`;
    box.hidden = !buka; el.setAttribute('aria-expanded', buka); el.querySelector('span').textContent = buka ? 'Sembunyikan Pratinjau' : 'Lihat Pratinjau PDF';
  };

  let sTimer = null, sIdx = 0, sPause = 0, sHover = false, sIO = null, sVisible = true;
  function stopSlider() { clearInterval(sTimer); sTimer = null; if (sIO) { sIO.disconnect(); sIO = null; } }
  function startSlider() {
    stopSlider(); const sl = $('#slider'); if (!sl) return;
    const tr = $('.track', sl), n = tr.children.length, dots = $$('.dots i', sl); sIdx = 0; if (n < 2) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    tr.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const i = Math.round(tr.scrollLeft / tr.clientWidth); sIdx = i; dots.forEach((d, k) => d.classList.toggle('on', k === i)); }); }, { passive: true });
    ['pointerdown', 'touchstart', 'wheel'].forEach(ev => tr.addEventListener(ev, () => { sPause = Date.now() + 5000; }, { passive: true }));
    sl.addEventListener('mouseenter', () => { sHover = true; }); sl.addEventListener('mouseleave', () => { sHover = false; });
    sIO = new IntersectionObserver(es => { sVisible = es[0].isIntersecting; }); sIO.observe(sl);
    sTimer = setInterval(() => {   // geser otomatis tiap 2 detik; jeda saat disentuh / tab tersembunyi / di luar layar
      if (document.hidden || AI.route !== 'beranda' || sHover || !sVisible || Date.now() < sPause) return;
      const nx = (sIdx + 1) % n; sIdx = nx;
      tr.scrollTo({ left: nx * tr.clientWidth, behavior: nx === 0 || reduce ? 'auto' : 'smooth' });
    }, 2000);
  }
  AI.startSlider = startSlider;

  function kontakBtns(f) {
    const wa = AI.waLink(f.whatsapp || f.telepon, 'Assalamu\'alaikum, saya ingin bertanya tentang ' + f.nama);
    const map = AI.safeUrl(f.maps_url) || (f.alamat ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(f.nama + ' ' + f.alamat) : '');
    return `<div class="kontak">${wa ? `<a class="btn soft" href="${esc(wa)}" ${ext}>${ic('chat')}WhatsApp</a>` : ''}${map ? `<a class="btn soft" href="${esc(map)}" ${ext}>${ic('compass')}Petunjuk</a>` : ''}${f.email ? `<a class="btn soft" href="mailto:${esc(f.email)}">${ic('mail')}Email</a>` : ''}${f.telepon && !wa ? `<a class="btn soft" href="tel:${esc(f.telepon)}">${ic('phone')}Telepon</a>` : ''}</div>`;
  }

  function renderBeranda() {
    const el = $('#p-beranda');
    if (!S.pub) { el.innerHTML = skel(); return; }
    const d = D(), f = d.profil, t = d.kasTotal, hero = AI.safeUrl(f.hero_url) || 'assets/ikhlas.jpg';
    const gal = d.galeri, mut = f.mutiara_teks;
    stopSlider(); lastPray = '';
    el.innerHTML = `
    <section class="hero">
      <div class="hero-img"><img src="${esc(hero)}" alt="Gedung ${esc(f.nama)}" data-fb="assets/ikhlas.jpg" fetchpriority="high" decoding="async"></div>
      <div class="hero-scrim"></div><div class="hero-pattern"></div>
      <img class="hero-badge" src="assets/logo-muhammadiyah.webp" alt="Lambang Muhammadiyah" width="56" height="56">
      <div class="hero-body"><span class="pill gold">${ic('chat')}Assalamu'alaikum Jamaah</span><h1>${esc(f.nama)}</h1>
      <p>${ic('pin')}${esc(f.tagline)}${f.kota ? ' • ' + esc(f.kota) : ''}</p></div>
    </section>
    <nav class="card quick" aria-label="Akses cepat">
      <a href="#/kas" data-go="kas"><span class="qi">${ic('wallet')}</span>Laporan Kas</a>
      <a href="#/donasi" data-go="donasi"><span class="qi">${ic('heart')}</span>Infaq Online</a>
      <a href="#/kegiatan" data-go="kegiatan"><span class="qi">${ic('calendar')}</span>Jadwal Kajian</a>
      <a href="#/pengurus" data-go="pengurus"><span class="qi">${ic('users')}</span>Profil &amp; Takmir</a>
    </nav>
    ${sholatCard()}
    ${gal.length ? `<section class="sec"><div class="sec-head"><h2>${ic('image')}Galeri Kegiatan</h2><a href="#/kegiatan" data-go="kegiatan">Lihat Semua ${ic('right')}</a></div>
      <div class="slider" id="slider"><div class="track">${gal.map((x, i) => `<figure class="slide">${AI.img(x.FotoURL, x.Judul || 'Foto kegiatan', '', i === 0)}<figcaption>${x.Judul ? `<b>${esc(x.Judul)}</b>` : ''}${x.Deskripsi ? `<span>${esc(x.Deskripsi)}</span>` : ''}</figcaption></figure>`).join('')}</div>
      ${gal.length > 1 ? `<div class="dots" aria-hidden="true">${gal.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</div></section>` : ''}
    ${mut ? `<section class="card hikmah"><span class="hk-ic">${ic('bulb')}</span><div><small>MUTIARA HIKMAH</small><blockquote>“${esc(mut)}”</blockquote>${f.mutiara_sumber ? `<cite>${esc(f.mutiara_sumber)}</cite>` : ''}</div></section>` : ''}
    <section class="card saldo pattern-soft"><div class="sec-head tight"><h2>${ic('bank')}Saldo Kas Masjid</h2><span class="pill soft">${t.n ? t.n + ' transaksi' : 'Belum ada transaksi'}</span></div>
      <div class="saldo-box"><small>Total Dana Tersedia</small><b class="num">${rp(t.saldo)}</b><a class="btn primary sm" href="#/kas" data-go="kas">Buku Kas ${ic('right')}</a></div>
      <div class="duo"><div class="mini in">${ic('up')}<div><small>Total Pemasukan</small><b class="num">${rp(t.masuk)}</b></div></div><div class="mini out">${ic('dn')}<div><small>Total Pengeluaran</small><b class="num">${rp(t.keluar)}</b></div></div></div>
    </section>
    <section class="card tentang"><h2>${ic('mosque')}Tentang ${esc(f.nama)}</h2>${f.deskripsi ? `<p>${esc(f.deskripsi)}</p>` : ''}${f.alamat ? `<p class="alamat">${ic('pin')}${esc(f.alamat)}</p>` : ''}${kontakBtns(f)}</section>
    <div id="install-slot"></div>`;
    updatePrayer(); startSlider();
    if (AI.installPrompt) AI.showInstall();
  }

  /* ========================= KAS ========================= */
  function kasFiltered() {
    const f = S.kf, q = f.q.trim().toLowerCase();
    return D().kas.filter(r => (!f.jenis || r[2] === f.jenis) && (!f.kategori || r[3] === f.kategori) && (!f.dari || r[1] >= f.dari) && (!f.sampai || r[1] <= f.sampai) && (!q || (r[3] + ' ' + r[4] + ' ' + r[6]).toLowerCase().includes(q)));
  }
  AI.kasFiltered = kasFiltered;
  function kasOut() {
    const out = $('#kas-out'); if (!out) return;
    const rows = kasFiltered(), show = rows.slice(0, S.kf.n);
    let masuk = 0, keluar = 0; rows.forEach(r => { if (r[2] === 'Pemasukan') masuk += r[5]; else keluar += r[5]; });
    const aktif = S.kf.q || S.kf.jenis || S.kf.kategori || S.kf.dari || S.kf.sampai;
    out.innerHTML = `<div class="list-head"><h2>Rincian Buku Kas</h2><span>${aktif ? 'Hasil filter' : 'Urutan terbaru'}</span></div>
      <p class="count">Menampilkan <b>${show.length}</b> dari <b>${rows.length}</b> mutasi${aktif ? ` · <span class="in-t">+${rp(masuk)}</span> · <span class="out-t">-${rp(keluar)}</span>` : ''}</p>
      ${show.length ? `<table class="kas-table"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th class="r">Nominal</th></tr></thead><tbody>
      ${show.map(r => { const m = r[2] === 'Pemasukan'; return `<tr class="${m ? 'in' : 'out'}"><td class="c-tgl">${tgl(r[1])}</td><td class="c-jenis"><span class="chip ${m ? 'in' : 'out'}">${esc(r[2])}</span></td><td class="c-kat">${esc(r[3])}</td><td class="c-ket">${esc(r[4]) || '<span class="mut">—</span>'}</td><td class="c-nom"><b>${m ? '+' : '-'}${rp(r[5])}</b>${r[6] ? `<small>${esc(r[6])}</small>` : ''}</td></tr>`; }).join('')}
      </tbody></table>` : `<div class="empty">${ic('search')}<p>${D().kas.length ? 'Tidak ada transaksi yang cocok dengan filter.' : 'Belum ada transaksi kas.'}</p></div>`}
      ${rows.length > show.length ? `<button class="btn ghost block" data-act="kas-more">${ic('refresh')}Muat Lebih Banyak (${rows.length - show.length})</button>` : ''}`;
  }
  AI.kasOut = kasOut;
  function renderKas() {
    const el = $('#p-kas');
    if (!S.pub) { el.innerHTML = skel(); return; }
    const d = D(), t = d.kasTotal, f = S.kf, kats = Array.from(new Set(d.kas.map(r => r[3]))).filter(Boolean).sort();
    el.innerHTML = `
    <section class="card banner"><span class="bn-ic">${ic('shieldok')}</span><div><span class="pill soft sm">Prinsip Amanah</span><h2>Laporan Transparansi Keuangan Terbuka</h2><p>Informasi kas dapat diakses seluruh jamaah sebagai bentuk akuntabilitas takmir.</p></div></section>
    <section class="card saldo-big pattern"><div class="row"><span class="lbl">${ic('bank')}Saldo Kas Tersedia</span><span class="pill light">${ic('clock')}Real-time</span></div><b class="big num">${rp(t.saldo)}</b><small>Dihitung dari seluruh pemasukan dikurangi pengeluaran</small></section>
    <div class="duo"><div class="card stat in"><small>Total Pemasukan</small><b class="num">${rp(t.masuk)}</b></div><div class="card stat out"><small>Total Pengeluaran</small><b class="num">${rp(t.keluar)}</b></div></div>
    <section class="card filters" id="kas-filters">
      <label class="search">${ic('search')}<input type="search" data-kas="q" placeholder="Cari transaksi atau keterangan…" value="${esc(f.q)}" aria-label="Cari transaksi" autocomplete="off"></label>
      <div class="two"><label class="sel"><select data-kas="jenis" aria-label="Filter jenis"><option value="">Semua Jenis</option><option ${f.jenis === 'Pemasukan' ? 'selected' : ''}>Pemasukan</option><option ${f.jenis === 'Pengeluaran' ? 'selected' : ''}>Pengeluaran</option></select>${ic('down')}</label>
      <label class="sel"><select data-kas="kategori" aria-label="Filter kategori"><option value="">Semua Kategori</option>${kats.map(k => `<option ${f.kategori === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>${ic('down')}</label></div>
      <div class="two dates"><label class="fld sm"><span>Dari tanggal</span><input type="date" data-kas="dari" value="${esc(f.dari)}"></label><label class="fld sm"><span>Sampai tanggal</span><input type="date" data-kas="sampai" value="${esc(f.sampai)}"></label></div>
      <button class="link-btn" data-act="kas-reset">${ic('x')}Atur ulang filter</button>
    </section>
    ${S.me ? `<section class="card admin-dl"><div><b>${ic('lock')}Unduh Laporan (Admin)</b><small>Mengikuti filter yang sedang aktif.</small></div><div class="btns"><button class="btn tint" data-act="ekspor" data-fmt="xlsx">${ic('sheet')}Excel</button><button class="btn tint" data-act="ekspor" data-fmt="pdf">${ic('pdf')}PDF</button></div></section>` : ''}
    <section id="kas-out"></section>
    <section class="card note">${ic('info')}<p>Arsip fisik rekening koran dan bukti transaksi tersimpan rapi di sekretariat takmir.</p></section>`;
    kasOut();
  }
  AI.acts['kas-more'] = () => { S.kf.n += 20; kasOut(); };
  AI.acts['kas-reset'] = () => { S.kf = { q: '', jenis: '', kategori: '', dari: '', sampai: '', n: 20 }; sig.kas = ''; renderKas(); };

  /* ========================= DONASI ========================= */
  let dProg = 0;
  function programs() { const l = AI.baris(D().profil.program_donasi).map(a => ({ n: a[0], k: a[1] || '' })); return l.length ? l : [{ n: 'Infaq Umum', k: '' }]; }
  const fmtNom = v => { const d = String(v).replace(/\D/g, '').replace(/^0+/, ''); return d ? Number(d).toLocaleString('id-ID') : ''; };
  function renderDonasi() {
    const el = $('#p-donasi');
    if (!S.pub) { el.innerHTML = skel(); return; }
    const f = D().profil, pr = programs(); if (dProg >= pr.length) dProg = 0;
    const qris = AI.safeUrl(f.qris_url);
    el.innerHTML = `
    <section class="card intro"><span class="bn-ic">${ic('heart')}</span><div><h2>Infaq &amp; Sedekah Jariyah</h2><p>Salurkan sedekah terbaik Anda untuk kemakmuran masjid dan syiar dakwah persyarikatan.</p></div></section>
    <div class="sec-head"><h2>Pilih Program Kebaikan</h2></div>
    <div class="progs" role="radiogroup" aria-label="Program donasi">${pr.map((p, i) => `<button type="button" role="radio" aria-checked="${i === dProg}" class="prog ${i === dProg ? 'sel' : ''}" data-act="prog" data-i="${i}">${i === dProg ? `<span class="ck">${ic('check')}</span>` : ''}<b>${esc(p.n)}</b><small>${esc(p.k)}</small></button>`).join('')}</div>
    <section class="card rek pattern"><div class="rek-top"><span class="pill light">${ic('bank')}${esc(f.bank_nama || 'Rekening')}</span></div>
      <div class="rek-box"><small>Nomor Rekening Donasi</small><div class="rek-row"><b class="num" id="norek">${esc(f.bank_norek || '—')}</b>${f.bank_norek ? `<button class="btn gold sm" data-act="copy" data-v="${esc(f.bank_norek)}">${ic('copy')}Salin</button>` : ''}</div><small>a.n. ${esc(f.bank_atasnama || f.nama)}</small></div>
      ${qris ? `<div class="qris"><div class="row"><b>QRIS Standar Nasional</b><span class="pill soft sm">Bebas Biaya Admin</span></div><img src="${esc(qris)}" alt="Kode QRIS ${esc(f.nama)}" loading="lazy" data-fb><small>Bisa via GoPay, OVO, Dana, ShopeePay, dan mobile banking lainnya</small></div>` : ''}
    </section>
    <section class="card formcard"><div class="fh"><span class="bn-ic sm">${ic('send')}</span><div><h2>Form Konfirmasi Transfer</h2><p>Bantu kami mencatat amanah donasi secara transparan.</p></div></div>
    <form id="don-form" novalidate autocomplete="off">
      <label class="fld"><span>Program Donasi</span><input type="text" name="program" value="${esc(pr[dProg].n)}" readonly></label>
      <div class="fld"><span class="split">Nama Donatur <label class="chk"><input type="checkbox" name="anonim"> Hamba Allah</label></span><input type="text" name="nama" maxlength="80" placeholder="Contoh: Ahmad Dahlan" autocomplete="name"></div>
      <label class="fld"><span class="split">Nomor WhatsApp <em>Opsional</em></span><input type="tel" name="wa" inputmode="tel" maxlength="18" placeholder="0812-3456-7890" autocomplete="tel"></label>
      <div class="fld"><span>Nominal Donasi</span><div class="chips2">${[50000, 100000, 250000, 500000].map(v => `<button type="button" class="chip-n" data-act="nom" data-v="${v}">${rp(v)}</button>`).join('')}</div>
        <div class="rp-in"><i>Rp</i><input type="text" name="nominal" inputmode="numeric" placeholder="0" aria-label="Nominal donasi"></div></div>
      <label class="fld"><span>Tanggal Transfer</span><input type="date" name="tanggal" value="${AI.today()}"></label>
      <div class="fld"><span>Unggah Bukti Transfer <em>Opsional</em></span><label class="drop" id="drop">${ic('upload')}<b>Ketuk untuk memilih foto / screenshot</b><small>JPG, PNG, atau WebP — otomatis dikecilkan</small><input type="file" name="bukti" accept="image/*" hidden></label></div>
      <label class="fld"><span class="split">Doa / Pesan Kebaikan <em>Opsional</em></span><textarea name="pesan" rows="3" maxlength="300" placeholder="Tuliskan permohonan doa atau hajat agar diaminkan jamaah…"></textarea></label>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn gold block lg" type="submit" id="don-btn">${ic('send')}Kirim Konfirmasi Donasi</button>
    </form></section>
    <section class="card note">${ic('shieldok')}<p><b>Prinsip Akuntabel &amp; Amanah.</b> Penerimaan donasi dan infaq diperbarui secara live di tab <a href="#/kas" data-go="kas">Kas Masjid</a> setelah diverifikasi takmir.</p></section>`;
  }
  AI.acts.prog = el => { dProg = +el.dataset.i; renderDonasi(); };
  AI.acts.nom = el => { const i = $('#don-form [name=nominal]'); i.value = fmtNom(el.dataset.v); $$('.chip-n').forEach(c => c.classList.toggle('on', c === el)); };
  AI.acts.copy = async el => { try { await navigator.clipboard.writeText(el.dataset.v); AI.toast('Nomor rekening disalin ✔'); } catch (e) { const r = document.createRange(); r.selectNodeContents($('#norek')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); AI.toast('Tekan lama untuk menyalin'); } };
  let buktiFile = null;
  async function kirimDonasi(form) {
    const v = n => form.elements[n];
    const anonim = v('anonim').checked, nama = v('nama').value.trim(), nominal = Number(v('nominal').value.replace(/\D/g, ''));
    if (!anonim && !nama) { AI.toast('Isi nama donatur atau centang “Hamba Allah”.', 'err'); v('nama').focus(); return; }
    if (!nominal || nominal < 1000) { AI.toast('Nominal donasi minimal Rp1.000.', 'err'); v('nominal').focus(); return; }
    const btn = $('#don-btn'); btn.disabled = true; btn.innerHTML = 'Mengirim…';
    try {
      let bukti = null;
      if (buktiFile) { const c = await AI.compress(buktiFile, 1100, 0.78); bukti = { mime: c.mime, data: c.data }; }
      await AI.api('donasi.kirim', { program: v('program').value, nama, anonim, wa: v('wa').value, nominal, tanggal: v('tanggal').value, pesan: v('pesan').value, website: v('website').value, fp: AI.fp(), bukti }, { auth: false });
      buktiFile = null; renderDonasi();
      AI.sheet(`<div class="thanks"><span class="big-ic">${ic('check')}</span><h2>Jazakumullahu khairan</h2><p>Konfirmasi donasi Anda sudah kami terima dan akan diverifikasi takmir. Setelah terverifikasi, donasi tampil di laporan kas.</p><button class="btn primary block" data-act="close">Tutup</button></div>`);
    } catch (e) { AI.toast(e.message, 'err'); btn.disabled = false; btn.innerHTML = ic('send') + 'Kirim Konfirmasi Donasi'; }
  }

  /* ========================= KEGIATAN ========================= */
  function gcal(k, tz) {
    const p = AI.ymd(k.Tanggal); if (!p) return '';
    const d8 = `${p.y}${String(p.m).padStart(2, '0')}${String(p.d).padStart(2, '0')}`;
    let dates;
    if (k.JamMulai) { const a = k.JamMulai.replace(':', '') + '00', b = (k.JamSelesai || k.JamMulai).replace(':', '') + '00'; dates = `${d8}T${a}/${d8}T${b}`; }
    else { const n = new Date(Date.UTC(p.y, p.m - 1, p.d + 1)); dates = d8 + '/' + n.getUTCFullYear() + String(n.getUTCMonth() + 1).padStart(2, '0') + String(n.getUTCDate()).padStart(2, '0'); }
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(k.Judul) + '&dates=' + dates + '&ctz=' + encodeURIComponent(tz) + '&location=' + encodeURIComponent(k.Lokasi || '') + '&details=' + encodeURIComponent([k.Pemateri && 'Pemateri: ' + k.Pemateri, k.Deskripsi].filter(Boolean).join('\n'));
  }
  function kegList() {
    const tz = AI.tz(), today = AI.today(tz), g = S.kg, q = g.q.trim().toLowerCase();
    let l = D().kegiatan.filter(k => (g.lalu ? k.Tanggal < today : k.Tanggal >= today) && (!g.kat || k.Kategori === g.kat) && (!q || (k.Judul + ' ' + k.Pemateri + ' ' + k.Lokasi + ' ' + k.Kategori).toLowerCase().includes(q)));
    if (g.lalu) l = l.slice().reverse();
    return l;
  }
  function kegOut() {
    const out = $('#keg-out'); if (!out) return;
    const tz = AI.tz(), l = kegList();
    out.innerHTML = l.length ? l.map(k => { const p = AI.ymd(k.Tanggal), jam = k.JamMulai ? k.JamMulai + (k.JamSelesai ? ' – ' + k.JamSelesai : '') + ' ' + AI.zonaLabel(tz) : '';
      return `<article class="card keg"><div class="kh"><div class="dbox"><b>${String(p.d).padStart(2, '0')}</b><span>${AI.BLN[p.m - 1].slice(0, 3).toUpperCase()}</span><small>${p.y}</small></div>
      <div class="kt">${k.Kategori ? `<span class="chip soft">${esc(k.Kategori)}</span>` : ''}<h3>${esc(k.Judul)}</h3></div></div>
      <div class="kdetail">${k.Pemateri ? `<p>${ic('user')}<span>Pemateri: <b>${esc(k.Pemateri)}</b></span></p>` : ''}${jam ? `<p>${ic('clock')}<span>${esc(AI.tglPanjang(k.Tanggal).split(',')[0])}, ${esc(jam)}</span></p>` : `<p>${ic('clock')}<span>${esc(AI.tglPanjang(k.Tanggal))}</span></p>`}${k.Lokasi ? `<p>${ic('pin')}<span>${esc(k.Lokasi)}</span></p>` : ''}</div>
      ${k.Deskripsi ? `<p class="kdesc">${esc(k.Deskripsi)}</p>` : ''}
      ${!g_lalu() ? `<div class="kf"><a class="btn amber sm" href="${esc(gcal(k, tz))}" ${ext}>${ic('calplus')}Ingatkan Saya</a></div>` : ''}</article>`; }).join('')
      : `<div class="empty">${ic('calendar')}<p>${S.kg.lalu ? 'Belum ada kegiatan yang sudah lewat.' : 'Belum ada kegiatan mendatang.'}</p></div>`;
  }
  const g_lalu = () => S.kg.lalu;
  function renderKegiatan() {
    const el = $('#p-kegiatan');
    if (!S.pub) { el.innerHTML = skel(); return; }
    const tz = AI.tz(), today = AI.today(tz), d = D(), cats = Array.from(new Set(d.kegiatan.map(k => k.Kategori))).filter(Boolean).sort();
    const w = new Date(Date.UTC(...(p => [p.y, p.m - 1, p.d + 7])(AI.ymd(today)))), batas = `${w.getUTCFullYear()}-${String(w.getUTCMonth() + 1).padStart(2, '0')}-${String(w.getUTCDate()).padStart(2, '0')}`;
    const pekan = d.kegiatan.filter(k => k.Tanggal >= today && k.Tanggal <= batas).length;
    el.innerHTML = `
    <div class="ptitle"><h1>Jadwal Kegiatan &amp; Kajian</h1><p>Mari makmurkan masjid bersama keluarga dan jamaah.</p></div>
    <label class="search card-s">${ic('search')}<input type="search" data-keg="q" placeholder="Cari materi kajian, nama ustadz, kegiatan…" value="${esc(S.kg.q)}" aria-label="Cari kegiatan" autocomplete="off"></label>
    <div class="chips-row" role="tablist">${['', ...cats].map(c => `<button class="fchip ${S.kg.kat === c ? 'on' : ''}" data-act="keg-kat" data-v="${esc(c)}">${S.kg.kat === c ? ic('check') : ''}${c ? esc(c) : 'Semua'}</button>`).join('')}</div>
    <section class="card banner"><span class="bn-ic dark">${ic('calendar')}</span><div><span class="pill soft sm">AGENDA PEKAN INI</span><h2>${pekan ? pekan + ' Agenda Siap Dihadiri' : 'Belum ada agenda pekan ini'}</h2><p>Dalam 7 hari ke depan.</p></div></section>
    <div class="seg"><button class="${S.kg.lalu ? '' : 'on'}" data-act="keg-lalu" data-v="0">Mendatang</button><button class="${S.kg.lalu ? 'on' : ''}" data-act="keg-lalu" data-v="1">Sudah Lewat</button></div>
    <div id="keg-out" class="stack"></div>
    <section class="card note">${ic('bulb')}<p><b>Punya usulan kajian atau kegiatan?</b> Sampaikan kepada bidang Dakwah &amp; Tabligh takmir masjid.</p></section>`;
    kegOut();
  }
  AI.acts['keg-kat'] = el => { S.kg.kat = el.dataset.v; sig.kegiatan = ''; renderKegiatan(); };
  AI.acts['keg-lalu'] = el => { S.kg.lalu = el.dataset.v === '1'; sig.kegiatan = ''; renderKegiatan(); };

  /* ========================= PENGURUS ========================= */
  function avatar(p, cls) { return p.FotoURL ? `<span class="av ${cls || ''}">${AI.img(p.FotoURL, p.Nama)}</span>` : `<span class="av ini ${cls || ''}">${esc(AI.inisial(p.Nama))}</span>`; }
  function renderPengurus() {
    const el = $('#p-pengurus');
    if (!S.pub) { el.innerHTML = skel(); return; }
    const d = D(), f = d.profil, hero = AI.safeUrl(f.hero_url) || 'assets/ikhlas.jpg', fokus = AI.baris(f.fokus_periode);
    el.innerHTML = `
    <section class="card profil"><div class="ph"><img src="${esc(hero)}" alt="" data-fb="assets/ikhlas.jpg" loading="lazy"><span class="pill light top">${ic('shieldok')}${esc(f.tagline)}</span><div class="ph-b">${f.tahun_berdiri ? `<span>★ Berdiri sejak ${esc(f.tahun_berdiri)}</span>` : '<span></span>'}${f.periode ? `<span class="pill green">Periode Aktif ${esc(f.periode)}</span>` : ''}</div></div>
      <div class="pb"><h1>${esc(f.nama)}</h1>${f.alamat ? `<p class="alamat">${ic('pin')}${esc(f.alamat)}</p>` : ''}
      ${f.visi_misi ? `<div class="visi"><span>${ic('bulb')}</span><div><small>VISI &amp; MISI UMAT</small><p>${esc(f.visi_misi)}</p></div></div>` : ''}${kontakBtns(f)}</div></section>
    <div class="sec-head"><h2>Struktur Pengurus Takmir</h2>${f.periode ? `<span class="pill green sm">${esc(f.periode)}</span>` : ''}</div>
    ${d.pengurus.length ? `<div class="pgrid2">${d.pengurus.map((p, i) => `<button class="card pcard" data-act="peng" data-i="${i}">${avatar(p)}<span class="chip soft">${esc(p.Jabatan)}</span><b>${esc(p.Nama)}</b>${p.MasaBakti ? `<small>${esc(p.MasaBakti)}</small>` : ''}</button>`).join('')}</div>` : `<div class="empty">${ic('users')}<p>Data pengurus belum diisi.</p></div>`}
    ${fokus.length ? `<section class="card fokus"><div class="sec-head tight"><h2>${ic('check')}Fokus Amanah Periode</h2></div>${fokus.map((a, i) => `<div class="fk ${i % 2 ? 'g' : ''}"><b>${esc(a[0])}</b>${a[1] ? `<p>${esc(a[1])}</p>` : ''}</div>`).join('')}</section>` : ''}`;
  }
  AI.acts.peng = el => {
    const p = D().pengurus[+el.dataset.i]; if (!p) return;
    AI.sheet(`<div class="pdet">${avatar(p, 'xl')}<span class="chip soft">${esc(p.Jabatan)}</span><h2>${esc(p.Nama)}</h2>${p.MasaBakti ? `<small>Masa bakti ${esc(p.MasaBakti)}</small>` : ''}${p.Profil ? `<p>${esc(p.Profil)}</p>` : '<p class="mut">Profil singkat belum diisi.</p>'}<button class="btn primary block" data-act="close">Tutup</button></div>`);
  };

  /* ========================= pendaftaran render ========================= */
  const R = AI.render = { beranda: renderBeranda, kas: renderKas, donasi: renderDonasi, kegiatan: renderKegiatan, pengurus: renderPengurus };
  const SIG = {
    beranda: () => S.ver + '|' + (S.pub ? 1 : 0), kas: () => S.ver + '|' + (S.pub ? 1 : 0) + (S.me ? 'a' : ''), kegiatan: () => S.ver + '|' + AI.today() + (S.pub ? 1 : 0),
    pengurus: () => S.ver + '|' + (S.pub ? 1 : 0), donasi: () => JSON.stringify(D().profil) + (S.pub ? 1 : 0)
  };
  AI.renderPublic = function (force) {
    Object.keys(R).forEach(k => { const s = SIG[k](); if (force || sig[k] !== s) { sig[k] = s; R[k](); } });
  };
  AI.resetSig = () => { Object.keys(sig).forEach(k => sig[k] = ''); };

  /* ---------- delegasi input halaman publik ---------- */
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset && t.dataset.kas) { S.kf[t.dataset.kas] = t.value; S.kf.n = 20; requestAnimationFrame(kasOut); }
    else if (t.dataset && t.dataset.keg) { S.kg[t.dataset.keg] = t.value; requestAnimationFrame(kegOut); }
    else if (t.name === 'nominal' && t.form && t.form.id === 'don-form') { t.value = fmtNom(t.value); $$('.chip-n').forEach(c => c.classList.remove('on')); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset && t.dataset.kas) { S.kf[t.dataset.kas] = t.value; S.kf.n = 20; kasOut(); }
    else if (t.name === 'bukti' && t.form && t.form.id === 'don-form') { buktiFile = t.files[0] || null; $('#drop b').textContent = buktiFile ? '✔ ' + buktiFile.name : 'Ketuk untuk memilih foto / screenshot'; }
    else if (t.name === 'anonim' && t.form && t.form.id === 'don-form') { const n = t.form.elements.nama; n.disabled = t.checked; if (t.checked) n.value = ''; }
  });
  document.addEventListener('submit', e => { if (e.target.id === 'don-form') { e.preventDefault(); kirimDonasi(e.target); } });
})();
