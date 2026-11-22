/* Portal Masjid Al Ikhlash — Panel Admin / Takmir (login, CRUD optimistis, donasi, ekspor, impor) */
(function () {
  'use strict';
  const AI = window.AI, S = AI.S, { $, $$, esc, ic, rp, tgl } = AI, acts = AI.acts;
  const ext = 'target="_blank" rel="noopener noreferrer"';
  const TABS = [['donasi', 'Donasi', 'heart'], ['kas', 'Kas', 'wallet'], ['kegiatan', 'Kegiatan', 'calendar'], ['pengurus', 'Pengurus', 'users'], ['galeri', 'Galeri', 'image'],
    ['jadwal', 'Jadwal Sholat', 'clock'], ['profil', 'Profil', 'mosque'], ['impor', 'Impor Data', 'upload'], ['akun', 'Akun', 'key']];
  const fmtNom = v => { const d = String(v).replace(/\D/g, '').replace(/^0+/, ''); return d ? Number(d).toLocaleString('id-ID') : ''; };
  const ST = ['Aktif', 'Nonaktif'];

  /* ---------- definisi formulir ---------- */
  const F = {
    kas: [{ k: 'Tanggal', t: 'date', req: 1 }, { k: 'Jenis', t: 'sel', o: ['Pemasukan', 'Pengeluaran'] }, { k: 'Kategori', t: 'text', req: 1, list: 'dl-kat', max: 40, ph: 'Infaq Jumat, Operasional…' },
      { k: 'Keterangan', t: 'area', rows: 2, max: 200 }, { k: 'Nominal', t: 'nom', req: 1, l: 'Nominal (Rp)' }, { k: 'Sumber', t: 'text', max: 40, ph: 'Kas Fisik / Transfer Bank' }],
    kegiatan: [{ k: 'Judul', t: 'text', req: 1, max: 120 }, { k: 'Tanggal', t: 'date', req: 1 }, { k: 'JamMulai', t: 'time', l: 'Jam mulai' }, { k: 'JamSelesai', t: 'time', l: 'Jam selesai' },
      { k: 'Kategori', t: 'text', list: 'dl-kat', max: 40, ph: 'Kajian Rutin, Sholat Jumat…' }, { k: 'Pemateri', t: 'text', max: 120 }, { k: 'Lokasi', t: 'text', max: 120 },
      { k: 'Deskripsi', t: 'area', rows: 3, max: 500 }, { k: 'Status', t: 'sel', o: ST }],
    pengurus: [{ k: 'Nama', t: 'text', req: 1, max: 100 }, { k: 'Jabatan', t: 'text', req: 1, max: 60 }, { k: 'MasaBakti', t: 'text', l: 'Masa bakti', max: 30, ph: '2024–2028' },
      { k: 'FotoURL', t: 'img', kind: 'pengurus', l: 'Foto' }, { k: 'Profil', t: 'area', l: 'Profil singkat', rows: 3, max: 400 }, { k: 'Urutan', t: 'int', ph: 'angka kecil tampil lebih dulu' }, { k: 'Status', t: 'sel', o: ST }],
    galeri: [{ k: 'FotoURL', t: 'img', kind: 'galeri', l: 'Foto', req: 1 }, { k: 'Judul', t: 'text', max: 100 }, { k: 'Deskripsi', t: 'text', max: 200 }, { k: 'Tanggal', t: 'date', l: 'Tanggal (opsional)', opt: 1 }, { k: 'Urutan', t: 'int' }, { k: 'Status', t: 'sel', o: ST }]
  };
  const JUDUL = { kas: 'Transaksi Kas', kegiatan: 'Kegiatan', pengurus: 'Pengurus', galeri: 'Foto Galeri' };

  function fld(f, v) {
    const val = v[f.k] == null ? '' : v[f.k], lab = `<span>${esc(f.l || f.k)}${f.req ? ' <i class="rq">*</i>' : ''}</span>`, hint = f.hint ? `<small class="hint">${esc(f.hint)}</small>` : '';
    if (f.t === 'area') return `<label class="fld">${lab}<textarea name="${f.k}" rows="${f.rows || 3}" maxlength="${f.max || 1000}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>${hint}</label>`;
    if (f.t === 'sel') return `<label class="fld">${lab}<select name="${f.k}">${f.o.map(o => `<option value="${esc(o.v || o)}" ${String(val) === String(o.v || o) ? 'selected' : ''}>${esc(o.l || o)}</option>`).join('')}</select>${hint}</label>`;
    if (f.t === 'img') return `<div class="fld"><span>${esc(f.l || f.k)}${f.req ? ' <i class="rq">*</i>' : ''}</span><div class="imgf"><span class="av prev">${val ? AI.img(val, '') : ic('image')}</span><div class="grow"><input type="text" name="${f.k}" value="${esc(val)}" placeholder="Tempel tautan https://… atau unggah" inputmode="url"><label class="btn tint sm">${ic('upload')}<em>Unggah foto</em><input type="file" accept="image/*" hidden data-upl="${f.kind}"></label></div></div>${hint}</div>`;
    const type = { date: 'date', time: 'time', int: 'number', nom: 'text', text: 'text' }[f.t] || 'text';
    return `<label class="fld">${lab}<input type="${type}" name="${f.k}" value="${esc(f.t === 'nom' && val ? fmtNom(val) : val)}" ${f.t === 'nom' ? 'inputmode="numeric"' : ''} ${f.max ? `maxlength="${f.max}"` : ''} ${f.list ? `list="${f.list}"` : ''} placeholder="${esc(f.ph || '')}" ${f.t === 'int' ? 'inputmode="numeric"' : ''} autocomplete="off">${hint}</label>`;
  }
  const katList = ent => { const s = new Set(ent === 'kas' ? (S.pub ? S.pub.kas.map(r => r[3]) : []) : (S.pub ? S.pub.kegiatan.map(k => k.Kategori) : [])); return `<datalist id="dl-kat">${Array.from(s).filter(Boolean).sort().map(x => `<option value="${esc(x)}">`).join('')}</datalist>`; };

  /* ---------- konversi & util lokal ---------- */
  const kasObj = r => ({ ID: r[0], Tanggal: r[1], Jenis: r[2], Kategori: r[3], Keterangan: r[4], Nominal: r[5], Sumber: r[6], DonasiID: r[7] });
  const kasArr = o => [o.ID, o.Tanggal, o.Jenis, o.Kategori, o.Keterangan || '', Number(o.Nominal) || 0, o.Sumber || '', o.DonasiID || ''];
  const sortKas = a => a.slice().sort((x, y) => y[1].localeCompare(x[1]));
  function recalc() { let m = 0, k = 0; S.pub.kas.forEach(r => { if (r[2] === 'Pemasukan') m += r[5]; else k += r[5]; }); S.pub = Object.assign({}, S.pub, { kasTotal: { masuk: m, keluar: k, saldo: m - k, n: S.pub.kas.length } }); }
  function derivePub() {
    if (!S.adm || !S.pub) return;
    const a = S.adm, ak = x => x.Status === 'Aktif', num = x => Number(x) || 0;
    S.pub = Object.assign({}, S.pub, {
      kegiatan: a.kegiatan.filter(ak).sort((x, y) => (x.Tanggal + x.JamMulai).localeCompare(y.Tanggal + y.JamMulai)),
      pengurus: a.pengurus.filter(ak).sort((x, y) => num(x.Urutan) - num(y.Urutan)),
      galeri: a.galeri.filter(ak).sort((x, y) => num(x.Urutan) - num(y.Urutan)),
      jadwalSholat: a.jadwal.find(ak) || null
    });
  }
  const snap = () => ({ pub: S.pub, adm: S.adm, ver: S.ver });
  const restore = s => { S.pub = s.pub; S.adm = s.adm; S.ver = s.ver; };
  function commit() {
    derivePub();
    AI.ls.set('ai_boot', { ver: S.ver, data: S.pub });
    AI.renderPublic(true); renderAdmin();
  }

  /* ========================= AUTH ========================= */
  AI.openLogin = function () {
    AI.sheet(`<form id="login-form" class="aform" autocomplete="on"><div class="lg-h"><span class="big-ic">${ic('shield')}</span><h2>Masuk Takmir</h2><p>Khusus pengurus/admin. Jamaah tidak perlu masuk.</p></div>
      <label class="fld"><span>Nama pengguna</span><input name="username" autocomplete="username" autocapitalize="none" required></label>
      <label class="fld"><span>Kata sandi</span><input name="password" type="password" autocomplete="current-password" required></label>
      <p class="err" id="lg-err" role="alert"></p>
      <button class="btn primary block lg" type="submit">${ic('lock')}Masuk</button></form>`);
    setTimeout(() => { const i = $('#login-form [name=username]'); i && i.focus(); }, 60);
  };
  async function doLogin(form) {
    const b = $('button[type=submit]', form), err = $('#lg-err'); err.textContent = ''; b.disabled = true; b.textContent = 'Memeriksa…';
    try {
      const r = await AI.api('auth.login', { username: form.elements.username.value, password: form.elements.password.value }, { auth: false });
      AI.sesiSimpan(r.data.token, r.data.me); AI.closeSheet(); AI.renderHeader();
      if (r.data.me.wajibGanti) AI.forceChange(); else AI.enterAdmin();
    } catch (e) { err.textContent = e.message; b.disabled = false; b.innerHTML = ic('lock') + 'Masuk'; }
  }
  AI.forceChange = function () {
    if ($('#chg-form')) return;
    AI.sheet(`<form id="chg-form" class="aform"><div class="lg-h"><span class="big-ic warn">${ic('key')}</span><h2>Ganti Kata Sandi Awal</h2><p>Demi keamanan, sandi awal wajib diganti sebelum Anda dapat mengelola data.</p></div>
      <label class="fld"><span>Kata sandi saat ini</span><input name="lama" type="password" autocomplete="current-password" required></label>
      <label class="fld"><span>Kata sandi baru</span><input name="baru" type="password" autocomplete="new-password" minlength="10" required><small class="hint">Minimal 10 karakter, mengandung huruf dan angka.</small></label>
      <label class="fld"><span>Ulangi kata sandi baru</span><input name="ulang" type="password" autocomplete="new-password" required></label>
      <p class="err" id="chg-err" role="alert"></p><button class="btn primary block lg" type="submit">Simpan &amp; Lanjut</button></form>`, { lock: true });
  };
  async function doChange(form) {
    const err = $('#chg-err', form.closest('.sheet') || document), v = n => form.elements[n].value; err.textContent = '';
    if (v('baru') !== v('ulang')) { err.textContent = 'Pengulangan kata sandi tidak sama.'; return; }
    const b = $('button[type=submit]', form); b.disabled = true;
    try {
      const r = await AI.api('auth.ganti', { lama: v('lama'), baru: v('baru') });
      AI.sesiSimpan(r.data.token, r.data.me); AI.closeSheet(true); AI.toast('Kata sandi berhasil diganti ✔');
      if (S.route === 'admin') { AI.loadAdmin(); renderAdmin(); } else AI.enterAdmin();
    } catch (e) { err.textContent = e.message; b.disabled = false; }
  }
  AI.enterAdmin = function () { AI.go('admin'); AI.loadAdmin(); };
  AI.authLost = function () {
    if (!S.token) return;
    AI.sesiHapus(); AI.renderHeader(); AI.renderPublic(true);
    if (S.route === 'admin') AI.go('beranda');
    AI.toast('Sesi berakhir. Silakan masuk lagi.', 'err'); setTimeout(AI.openLogin, 300);
  };
  acts.logout = () => { AI.sesiHapus(); AI.renderHeader(); AI.renderPublic(true); AI.go('beranda'); AI.toast('Anda sudah keluar.'); };
  acts['keluar-semua'] = async () => { try { await AI.api('auth.keluarSemua'); } catch (e) { } AI.sesiHapus(); AI.renderHeader(); AI.renderPublic(true); AI.go('beranda'); AI.toast('Semua perangkat dikeluarkan.'); };

  /* ========================= DATA ADMIN ========================= */
  let loading = false;
  AI.loadAdmin = async function () {
    if (!S.token || loading) return; loading = true;
    try { const r = await AI.api('admin.data'); S.adm = r.data; renderAdmin(); }
    catch (e) { if (e.code !== 'AUTH') { AI.toast(e.message, 'err'); const b = $('#adm-body'); if (b && !S.adm) b.innerHTML = `<div class="empty">${ic('cloud')}<p>${esc(e.message)}</p><button class="btn primary" data-act="adm-reload">Coba lagi</button></div>`; } }
    finally { loading = false; }
  };
  acts['adm-reload'] = () => AI.loadAdmin();
  acts.tab = el => { S.at = el.dataset.v; renderAdmin(); };

  function renderAdmin() {
    const el = $('#p-admin'); if (!el) return;
    if (!S.me) { el.innerHTML = ''; return; }
    const menunggu = S.adm ? S.adm.donasi.filter(d => d.Status === 'Menunggu').length : 0;
    // pertahankan scroll tab & fokus input pencarian saat render ulang
    el.innerHTML = `<section class="card adm-head pattern"><div><small>Panel Takmir</small><h1>Assalamu'alaikum, ${esc(S.me.nama || S.me.username)}</h1></div><button class="btn light sm" data-act="logout">${ic('logout')}Keluar</button></section>
      <div class="chips-row tabs" role="tablist">${TABS.map(t => `<button role="tab" aria-selected="${S.at === t[0]}" class="fchip ${S.at === t[0] ? 'on' : ''}" data-act="tab" data-v="${t[0]}">${ic(t[2])}${t[1]}${t[0] === 'donasi' && menunggu ? `<b class="badge">${menunggu}</b>` : ''}</button>`).join('')}</div>
      <div id="adm-body">${S.adm ? tabBody() : '<div class="sk sk-c"></div><div class="sk sk-c"></div>'}</div>`;
    const t = $('.tabs .on', el); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  AI.renderAdmin = renderAdmin;
  function tabBody() {
    switch (S.at) {
      case 'donasi': return tabDonasi(); case 'kas': return tabKas(); case 'kegiatan': return tabEnt('kegiatan'); case 'pengurus': return tabEnt('pengurus');
      case 'galeri': return tabEnt('galeri'); case 'jadwal': return tabJadwal(); case 'profil': return tabProfil(); case 'impor': return tabImpor(); case 'akun': return tabAkun();
    } return '';
  }
  const add = (ent, label) => `<button class="btn primary block" data-act="ent-add" data-ent="${ent}">${ic('plus')}${label}</button>`;
  const btnsRow = (ent, id, del) => `<div class="ra"><button class="icb" data-act="ent-edit" data-ent="${ent}" data-id="${esc(id)}" aria-label="Ubah">${ic('pencil')}</button>${del === false ? '' : `<button class="icb red" data-act="ent-del" data-ent="${ent}" data-id="${esc(id)}" aria-label="Hapus">${ic('trash')}</button>`}</div>`;

  /* ---------- Donasi ---------- */
  function tabDonasi() {
    const l = S.adm.donasi, f = S.dfil, rows = l.filter(d => f === 'Semua' || d.Status === f);
    const cnt = s => l.filter(d => d.Status === s).length;
    return `<div class="seg wrap4">${['Menunggu', 'Terverifikasi', 'Ditolak', 'Semua'].map(s => `<button class="${f === s ? 'on' : ''}" data-act="dfil" data-v="${s}">${s}${s !== 'Semua' ? ` <b>${cnt(s)}</b>` : ''}</button>`).join('')}</div>
    <div class="stack">${rows.length ? rows.map(d => `<article class="card don"><div class="dtop"><div><b>${esc(d.NamaDonatur)}</b><small>${esc(d.Program)} · ${tgl(d.TanggalTransfer)}</small></div><span class="chip ${d.Status === 'Terverifikasi' ? 'ver' : d.Status === 'Ditolak' ? 'out' : 'wait'}">${esc(d.Status)}</span></div>
      <div class="dnom num">${rp(d.Nominal)}</div>${d.Pesan ? `<p class="dmsg">“${esc(d.Pesan)}”</p>` : ''}
      <div class="dmeta">${d.WhatsApp ? `<a href="${esc(AI.waLink(d.WhatsApp))}" ${ext}>${ic('chat')}${esc(d.WhatsApp)}</a>` : ''}${d.adaBukti ? `<button class="link-btn" data-act="bukti" data-id="${esc(d.ID)}">${ic('image')}Lihat bukti</button>` : '<span class="mut">Tanpa bukti</span>'}</div>
      <div class="dact">${d.Status !== 'Terverifikasi' ? `<button class="btn primary sm" data-act="dst" data-id="${esc(d.ID)}" data-s="Terverifikasi">${ic('check')}Verifikasi</button>` : `<button class="btn ghost sm" data-act="dst" data-id="${esc(d.ID)}" data-s="Menunggu">Batalkan verifikasi</button>`}${d.Status === 'Menunggu' ? `<button class="btn danger sm" data-act="dst" data-id="${esc(d.ID)}" data-s="Ditolak">${ic('x')}Tolak</button>` : ''}</div></article>`).join('')
      : `<div class="empty">${ic('heart')}<p>Tidak ada donasi berstatus “${f}”.</p></div>`}</div>`;
  }
  acts.dfil = el => { S.dfil = el.dataset.v; renderAdmin(); };
  acts.dst = async el => {
    const id = el.dataset.id, st = el.dataset.s, s = snap();
    if (st === 'Ditolak' && !(await AI.confirm('Tolak konfirmasi donasi ini?', 'Tolak'))) return;
    S.adm = Object.assign({}, S.adm, { donasi: S.adm.donasi.map(d => d.ID === id ? Object.assign({}, d, { Status: st }) : d) }); renderAdmin();
    try {
      const r = await AI.api('admin.donasiStatus', { id, status: st }), x = r.data;
      S.adm = Object.assign({}, S.adm, { donasi: S.adm.donasi.map(d => d.ID === id ? Object.assign({}, d, x.donasi, { adaBukti: d.adaBukti }) : d) });
      let kas = S.pub.kas;
      if (x.kasDihapus) kas = kas.filter(r => r[0] !== x.kasDihapus);
      if (x.kas) kas = sortKas([kasArr(x.kas)].concat(kas.filter(r => r[0] !== x.kas.ID)));
      S.pub = Object.assign({}, S.pub, { kas, kasTotal: x.kasTotal }); S.ver = r.ver; commit();
      AI.toast(st === 'Terverifikasi' ? 'Terverifikasi — otomatis tercatat di Kas ✔' : 'Status diperbarui ✔');
    } catch (e) { restore(s); commit(); AI.toast(e.message, 'err'); }
  };
  acts.bukti = async el => {
    el.disabled = true;
    try { const r = await AI.api('admin.donasiBukti', { id: el.dataset.id }); AI.sheet(`<div class="pdet"><h2>Bukti Transfer</h2><img class="bukti" alt="Bukti transfer" src="data:${esc(r.data.mime)};base64,${r.data.data}"><button class="btn primary block" data-act="close">Tutup</button></div>`); }
    catch (e) { AI.toast(e.message, 'err'); } el.disabled = false;
  };

  /* ---------- Kas ---------- */
  let akq = '', akn = 30;
  function tabKas() {
    const q = akq.trim().toLowerCase(), all = S.pub.kas.filter(r => !q || (r[3] + ' ' + r[4] + ' ' + r[6]).toLowerCase().includes(q)), rows = all.slice(0, akn);
    return `${add('kas', 'Tambah Transaksi')}
    <label class="search card-s">${ic('search')}<input type="search" id="akq" placeholder="Cari transaksi…" value="${esc(akq)}" autocomplete="off" aria-label="Cari transaksi"></label>
    <div class="card admin-dl"><div><b>${ic('lock')}Unduh Laporan</b><small>Ikuti filter di halaman Kas.</small></div><div class="btns"><button class="btn tint" data-act="ekspor" data-fmt="xlsx">${ic('sheet')}Excel</button><button class="btn tint" data-act="ekspor" data-fmt="pdf">${ic('pdf')}PDF</button></div></div>
    <div class="stack tight">${rows.map(r => { const m = r[2] === 'Pemasukan'; return `<article class="card arow"><span class="chip ${m ? 'in' : 'out'}">${m ? '+' : '−'}</span><div class="am"><b>${esc(r[4] || r[3])}</b><small>${esc(r[3])} · ${tgl(r[1])}${r[7] ? ' · dari donasi' : ''}</small></div><div class="an ${m ? 'in' : 'out'}"><b class="num">${rp(r[5])}</b></div>${btnsRow('kas', r[0], !r[7])}</article>`; }).join('') || `<div class="empty">${ic('wallet')}<p>Belum ada transaksi.</p></div>`}</div>
    ${all.length > rows.length ? `<button class="btn ghost block" data-act="akn">Muat lebih banyak (${all.length - rows.length})</button>` : ''}`;
  }
  acts.akn = () => { akn += 30; renderAdmin(); };
  document.addEventListener('input', e => {
    if (e.target.id === 'akq') { akq = e.target.value; akn = 30; const pos = e.target.selectionStart; renderAdmin(); const i = $('#akq'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }
    else if (e.target.name === 'Nominal' && e.target.form && e.target.form.id === 'ent-form') e.target.value = fmtNom(e.target.value);
  });

  /* ---------- Entitas generik: Kegiatan / Pengurus / Galeri ---------- */
  function tabEnt(ent) {
    const l = S.adm[ent], lab = { kegiatan: 'Tambah Kegiatan', pengurus: 'Tambah Pengurus', galeri: 'Tambah Foto' }[ent];
    let body;
    if (ent === 'galeri') body = `<div class="gal-adm">${l.map(g => `<article class="card gcard"><div class="gimg">${AI.img(g.FotoURL, g.Judul)}<span class="chip ${g.Status === 'Aktif' ? 'ver' : 'out'}">${esc(g.Status)}</span></div><div class="gb"><b>${esc(g.Judul || 'Tanpa judul')}</b>${btnsRow('galeri', g.ID)}</div><button class="link-btn" data-act="gal-toggle" data-id="${esc(g.ID)}">${g.Status === 'Aktif' ? 'Sembunyikan dari slider' : 'Tampilkan di slider'}</button></article>`).join('')}</div>`;
    else body = `<div class="stack tight">${l.map(x => ent === 'kegiatan'
      ? `<article class="card arow"><div class="dbox mini"><b>${String(AI.ymd(x.Tanggal) ? AI.ymd(x.Tanggal).d : '').padStart(2, '0')}</b><span>${AI.ymd(x.Tanggal) ? AI.BLN[AI.ymd(x.Tanggal).m - 1].slice(0, 3).toUpperCase() : ''}</span></div><div class="am"><b>${esc(x.Judul)}</b><small>${tgl(x.Tanggal)}${x.JamMulai ? ' · ' + esc(x.JamMulai) : ''}${x.Pemateri ? ' · ' + esc(x.Pemateri) : ''}</small>${x.Status !== 'Aktif' ? '<span class="chip out sm">Nonaktif</span>' : ''}</div>${btnsRow('kegiatan', x.ID)}</article>`
      : `<article class="card arow">${x.FotoURL ? `<span class="av sm">${AI.img(x.FotoURL, x.Nama)}</span>` : `<span class="av ini sm">${esc(AI.inisial(x.Nama))}</span>`}<div class="am"><b>${esc(x.Nama)}</b><small>${esc(x.Jabatan)} · urutan ${esc(x.Urutan)}${x.Status !== 'Aktif' ? ' · Nonaktif' : ''}</small></div>${btnsRow('pengurus', x.ID)}</article>`).join('') || `<div class="empty">${ic('list')}<p>Belum ada data.</p></div>`}</div>`;
    return add(ent, lab) + (l.length ? '' : '') + body;
  }
  acts['gal-toggle'] = el => { const g = S.adm.galeri.find(x => x.ID === el.dataset.id); if (g) mutateSave('galeri', { Status: g.Status === 'Aktif' ? 'Nonaktif' : 'Aktif' }, g, true); };

  function getEx(ent, id) {
    if (ent === 'kas') { const r = S.pub.kas.find(x => x[0] === id); return r && kasObj(r); }
    return S.adm[ent].find(x => x.ID === id);
  }
  function openEntForm(ent, ex) {
    const defaults = ent === 'kas' ? { Tanggal: AI.today(), Jenis: 'Pemasukan' } : ent === 'kegiatan' ? { Tanggal: AI.today(), Status: 'Aktif' } : { Status: 'Aktif' };
    let fields = F[ent];
    if (ex && ex.DonasiID) fields = fields.filter(f => f.k !== 'Jenis');
    AI.sheet(`<form id="ent-form" class="aform" data-ent="${ent}" data-id="${ex ? esc(ex.ID) : ''}"><h2>${ex ? 'Ubah' : 'Tambah'} ${JUDUL[ent]}</h2>${ex && ex.DonasiID ? `<p class="hint">Entri ini berasal dari donasi terverifikasi; jenis tidak dapat diubah.</p>` : ''}
      ${fields.map(f => fld(f, ex || defaults)).join('')}${katList(ent)}<p class="err" id="ent-err" role="alert"></p>
      <button class="btn primary block lg" type="submit">${ic('check')}Simpan</button></form>`);
  }
  acts['ent-add'] = el => openEntForm(el.dataset.ent, null);
  acts['ent-edit'] = el => { const ex = getEx(el.dataset.ent, el.dataset.id); if (ex) openEntForm(el.dataset.ent, ex); };
  acts['ent-del'] = async el => {
    const ent = el.dataset.ent, id = el.dataset.id, ex = getEx(ent, id); if (!ex) return;
    if (!(await AI.confirm(`Hapus ${JUDUL[ent].toLowerCase()} ini? Tindakan tidak dapat dibatalkan.`, 'Hapus', true))) return;
    const s = snap();
    if (ent === 'kas') { S.pub = Object.assign({}, S.pub, { kas: S.pub.kas.filter(r => r[0] !== id) }); recalc(); }
    else S.adm = Object.assign({}, S.adm, { [ent]: S.adm[ent].filter(x => x.ID !== id) });
    commit();
    try { const r = await AI.api('admin.hapus', { entity: ent, id }); S.ver = r.ver; AI.ls.set('ai_boot', { ver: S.ver, data: S.pub }); AI.toast('Terhapus ✔'); }
    catch (e) { restore(s); commit(); AI.toast(e.message, 'err'); }
  };
  function readEnt(form) {
    const ent = form.dataset.ent, o = {};
    F[ent].forEach(f => { const el = form.elements[f.k]; if (!el) return; let v = el.value.trim(); if (f.t === 'nom') v = v.replace(/\D/g, ''); if (f.t === 'int') v = v === '' ? '' : Number(v); o[f.k] = v; });
    if (o.FotoURL) o.FotoURL = AI.driveImg(o.FotoURL);
    return o;
  }
  function checkEnt(ent, v) {
    for (const f of F[ent]) { if (f.req && (v[f.k] === '' || v[f.k] == null) && f.k in v) return `Kolom “${f.l || f.k}” wajib diisi.`; }
    if (ent === 'kas' && !(Number(v.Nominal) > 0)) return 'Nominal harus lebih dari 0.';
    if (v.FotoURL && !AI.safeUrl(v.FotoURL)) return 'Tautan foto harus diawali https://';
    return '';
  }
  async function mutateSave(ent, vals, ex, silent) {
    const s = snap(), isNew = !ex, tmp = ex ? ex.ID : 'tmp-' + Date.now(), row = Object.assign({}, ex || {}, vals, { ID: tmp });
    if (ent === 'kas') {
      S.pub = Object.assign({}, S.pub, { kas: sortKas(isNew ? [kasArr(row)].concat(S.pub.kas) : S.pub.kas.map(r => r[0] === tmp ? kasArr(Object.assign({}, row, { DonasiID: ex.DonasiID })) : r)) }); recalc();
    } else {
      if (!row.Status) row.Status = 'Aktif';
      const nx = isNew ? [row].concat(S.adm[ent]) : S.adm[ent].map(r => r.ID === tmp ? Object.assign({}, r, row) : r);
      S.adm = Object.assign({}, S.adm, { [ent]: ent === 'kegiatan' ? nx.sort((a, b) => (b.Tanggal + b.JamMulai).localeCompare(a.Tanggal + a.JamMulai)) : nx.sort((a, b) => (Number(a.Urutan) || 0) - (Number(b.Urutan) || 0)) });
    }
    AI.closeSheet(); commit(); if (!silent) AI.toast('Menyimpan…');
    try {
      const r = await AI.api('admin.simpan', { entity: ent, row: Object.assign({}, vals, { ID: isNew ? '' : ex.ID }) }), saved = r.data.row;
      if (ent === 'kas') S.pub = Object.assign({}, S.pub, { kas: S.pub.kas.map(x => x[0] === tmp ? kasArr(Object.assign({}, saved)) : x), kasTotal: r.data.kasTotal });
      else S.adm = Object.assign({}, S.adm, { [ent]: S.adm[ent].map(x => x.ID === tmp ? Object.assign({}, x, saved) : x) });
      S.ver = r.ver; commit(); AI.toast('Tersimpan ✔');
    } catch (e) { restore(s); commit(); AI.toast(e.message, 'err'); if (!silent && e.code !== 'AUTH') { openEntForm(ent, ex); const f = $('#ent-form'); Object.keys(vals).forEach(k => { if (f && f.elements[k]) f.elements[k].value = vals[k]; }); } }
  }

  /* ---------- unggah foto (kompres di browser → Drive) ---------- */
  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.matches && t.matches('input[type=file][data-upl]')) {
      const file = t.files[0]; if (!file) return;
      const wrap = t.closest('.imgf'), lab = t.closest('label'), em = $('em', lab), txt = em.textContent;
      try {
        em.textContent = 'Mengunggah…'; lab.classList.add('busy');
        const c = await AI.compress(file, 1000, 0.8);
        const r = await AI.api('admin.upload', { kind: t.dataset.upl, name: c.name, mime: c.mime, data: c.data }, { timeout: 90000 });
        const inp = $('input[type=text]', wrap); inp.value = r.data.url; $('.prev', wrap).innerHTML = `<img src="${c.preview}" alt="">`;
        AI.toast('Foto terunggah ✔');
      } catch (er) { AI.toast(er.message, 'err'); }
      em.textContent = txt; lab.classList.remove('busy'); t.value = '';
    }
  });

  /* ---------- Jadwal Sholat PDF ---------- */
  function tabJadwal() {
    const l = S.adm.jadwal, bln = AI.today().slice(0, 7);
    return `<form class="card aform" id="jad-form"><h2>${ic('upload')}Unggah Jadwal Bulan Baru</h2><p class="hint">Jadwal yang sedang Aktif otomatis dipindah ke Arsip.</p>
      <label class="fld"><span>Bulan jadwal</span><input type="month" name="bulan" value="${bln}" required></label>
      <label class="fld"><span>Judul (opsional)</span><input name="judul" maxlength="100" placeholder="Jadwal Imsakiyah Ramadhan 1448H"></label>
      <label class="drop" id="jad-drop">${ic('pdf')}<b>Pilih berkas PDF (maks. 5 MB)</b><input type="file" name="pdf" accept="application/pdf" hidden></label>
      <p class="err" id="jad-err" role="alert"></p><button class="btn primary block" type="submit">${ic('upload')}Unggah &amp; Aktifkan</button></form>
      <div class="stack tight">${l.map(j => `<article class="card arow"><span class="av ini sm">${ic('pdf')}</span><div class="am"><b>${esc(j.Judul)}</b><small>Bulan ${esc(j.Bulan)} · diunggah ${tgl(String(j.DiunggahPada).slice(0, 10))}</small></div><span class="chip ${j.Status === 'Aktif' ? 'ver' : 'soft'}">${esc(j.Status)}</span><a class="icb" href="${esc(AI.pdfDown(j.FileID))}" ${ext} aria-label="Unduh">${ic('download')}</a></article>`).join('') || `<div class="empty">${ic('pdf')}<p>Belum ada jadwal terunggah.</p></div>`}</div>`;
  }
  const b64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
  async function doJadwal(form) {
    const err = $('#jad-err'), f = form.elements.pdf.files[0], b = $('button[type=submit]', form); err.textContent = '';
    if (!f) { err.textContent = 'Pilih berkas PDF terlebih dahulu.'; return; }
    if (f.type !== 'application/pdf') { err.textContent = 'Berkas harus PDF.'; return; }
    if (f.size > 5 * 1024 * 1024) { err.textContent = 'Ukuran PDF melebihi 5 MB.'; return; }
    b.disabled = true; b.textContent = 'Mengunggah…';
    try {
      const r = await AI.api('admin.jadwalUnggah', { bulan: form.elements.bulan.value, judul: form.elements.judul.value, mime: 'application/pdf', name: f.name, data: await b64(f) }, { timeout: 120000 });
      S.adm = Object.assign({}, S.adm, { jadwal: r.data.jadwal }); S.ver = r.ver; commit(); AI.toast(r.message || 'Jadwal diunggah ✔');
    } catch (e) { err.textContent = e.message; b.disabled = false; b.innerHTML = ic('upload') + 'Unggah &amp; Aktifkan'; }
  }
  document.addEventListener('change', e => { if (e.target.name === 'pdf' && e.target.form && e.target.form.id === 'jad-form') { const f = e.target.files[0]; $('#jad-drop b').textContent = f ? '✔ ' + f.name : 'Pilih berkas PDF (maks. 5 MB)'; } });

  /* ---------- Profil ---------- */
  const PF = [
    ['Identitas', [{ k: 'nama', l: 'Nama masjid', t: 'text', max: 100 }, { k: 'tagline', l: 'Keterangan di bawah nama', t: 'text', max: 100 }, { k: 'kota', l: 'Kota/Kabupaten', t: 'text', max: 60 }, { k: 'alamat', l: 'Alamat', t: 'area', rows: 2 },
      { k: 'tahun_berdiri', l: 'Tahun berdiri', t: 'text', max: 10 }, { k: 'periode', l: 'Periode kepengurusan', t: 'text', max: 30 }, { k: 'deskripsi', l: 'Deskripsi singkat', t: 'area', rows: 2 }, { k: 'visi_misi', l: 'Visi & misi', t: 'area', rows: 3 },
      { k: 'fokus_periode', l: 'Fokus amanah periode', t: 'area', rows: 3, hint: 'Satu baris = Judul|Penjelasan' }]],
    ['Kontak', [{ k: 'whatsapp', l: 'WhatsApp takmir', t: 'text', max: 20, ph: '0812…' }, { k: 'telepon', l: 'Telepon', t: 'text', max: 20 }, { k: 'email', l: 'Email', t: 'text', max: 80 }, { k: 'maps_url', l: 'Tautan Google Maps (Petunjuk)', t: 'text', hint: 'Kosong = pencarian otomatis dari alamat' }]],
    ['Tampilan Beranda', [{ k: 'hero_url', l: 'Foto hero', t: 'img', kind: 'umum', hint: 'Kosong = foto bawaan (ikhlas.jpg)' }, { k: 'mutiara_teks', l: 'Mutiara hikmah', t: 'area', rows: 2 }, { k: 'mutiara_sumber', l: 'Sumber kutipan', t: 'text', max: 80 }]],
    ['Rekening & Donasi', [{ k: 'bank_nama', l: 'Nama bank', t: 'text', max: 60 }, { k: 'bank_norek', l: 'Nomor rekening', t: 'text', max: 40 }, { k: 'bank_atasnama', l: 'Atas nama', t: 'text', max: 80 }, { k: 'qris_url', l: 'Gambar QRIS', t: 'img', kind: 'umum' },
      { k: 'program_donasi', l: 'Program donasi', t: 'area', rows: 4, hint: 'Satu baris = Nama|Keterangan' }]],
    ['Jadwal Sholat', [{ k: 'zona_waktu', l: 'Zona waktu', t: 'sel', o: [{ v: 'Asia/Jakarta', l: 'WIB' }, { v: 'Asia/Makassar', l: 'WITA' }, { v: 'Asia/Jayapura', l: 'WIT' }] },
      { k: 'hitung_jadwal', l: 'Tampilkan perkiraan jam sholat hasil hitung', t: 'sel', o: ['ya', 'tidak'] }, { k: 'lat', l: 'Lintang (latitude)', t: 'text', max: 12 }, { k: 'lon', l: 'Bujur (longitude)', t: 'text', max: 12 }]]
  ];
  function tabProfil() {
    const p = S.pub.profil;
    return `<form id="prof-form" class="aform">${PF.map(g => `<section class="card pf"><h2>${g[0]}</h2>${g[1].map(f => fld(f, p)).join('')}</section>`).join('')}
      <p class="err" id="prof-err" role="alert"></p><button class="btn primary block lg" type="submit">${ic('check')}Simpan Profil</button></form>`;
  }
  async function doProfil(form) {
    const vals = {}, b = $('button[type=submit]', form), err = $('#prof-err'); err.textContent = '';
    PF.forEach(g => g[1].forEach(f => { const el = form.elements[f.k]; if (el) vals[f.k] = f.t === 'img' ? AI.driveImg(el.value.trim()) : el.value.trim(); }));
    b.disabled = true; b.textContent = 'Menyimpan…';
    try { const r = await AI.api('admin.profil', { values: vals }); S.pub = Object.assign({}, S.pub, { profil: r.data.profil }); S.ver = r.ver; commit(); AI.toast('Profil tersimpan ✔'); }
    catch (e) { err.textContent = e.message; AI.toast(e.message, 'err'); b.disabled = false; b.innerHTML = ic('check') + 'Simpan Profil'; }
  }

  /* ---------- Impor ---------- */
  let impHasil = null;
  function tabImpor() {
    return `<section class="card aform"><h2>${ic('upload')}Impor dari Spreadsheet Lama</h2><p class="hint">Hanya membaca spreadsheet lama (tidak diubah). Aman diulang — data yang sama tidak akan dobel. Gunakan akun Google yang sama dengan pemilik data lama.</p>
      <label class="fld"><span>URL / ID spreadsheet lama</span><input id="imp-src" placeholder="https://docs.google.com/spreadsheets/d/…" autocomplete="off"></label>
      <div class="chk-grid">${['KasMasjid', 'Donasi', 'JadwalKegiatan', 'PengurusMasjid', 'GaleriKegiatan'].map(n => `<label class="chk"><input type="checkbox" name="impsh" value="${n}" checked> ${n}</label>`).join('')}</div>
      <label class="chk"><input type="checkbox" id="imp-ow"> Timpa data yang sudah ada (kecuali Kas)</label>
      <div class="two"><button class="btn ghost" data-act="imp" data-dry="1">${ic('search')}Pindai (Dry-run)</button><button class="btn primary" data-act="imp" data-dry="0">${ic('upload')}Jalankan Impor</button></div></section>
      <div id="imp-out">${impHasil || ''}</div>`;
  }
  acts.imp = async el => {
    const dry = el.dataset.dry === '1', src = $('#imp-src').value.trim(), sh = $$('[name=impsh]:checked').map(x => x.value);
    if (!src) return AI.toast('Isi URL/ID spreadsheet lama.', 'err'); if (!sh.length) return AI.toast('Pilih minimal satu sheet.', 'err');
    if (!dry && !(await AI.confirm('Jalankan impor sekarang? Anda dapat memindai dulu untuk melihat ringkasan.', 'Jalankan'))) return;
    el.disabled = true; const t = el.innerHTML; el.textContent = 'Memproses…';
    try {
      const r = await AI.api(dry ? 'admin.importScan' : 'admin.importRun', { source: src, sheets: sh, overwrite: $('#imp-ow').checked }, { timeout: 120000 }), x = r.data;
      impHasil = `<section class="card"><h2>${dry ? 'Hasil Pindai (belum menulis apa pun)' : 'Impor Selesai'}</h2><p class="hint">Sumber: ${esc(x.source.nama)}</p><div class="tbl-s"><table class="kas-table s"><thead><tr><th>Data</th><th>Lama</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>${Object.keys(x.report).map(k => `<tr><td>${k}</td><td>${x.report[k].source}</td><td><b>${x.report[k].inserted}</b></td><td>${x.report[k].updated}</td><td>${x.report[k].skipped}</td></tr>`).join('')}</tbody></table></div>${x.warnings.length ? `<ul class="warn">${x.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}</section>`;
      if (!dry) { S.ver = r.ver; await AI.refreshAll(true); }
      renderAdmin();
    } catch (e) { AI.toast(e.message, 'err'); el.disabled = false; el.innerHTML = t; }
  };

  /* ---------- Akun ---------- */
  function tabAkun() {
    const u = (S.adm.pengguna || []).find(x => x.Username === S.me.username) || {};
    return `<section class="card"><h2>${ic('user')}${esc(S.me.nama)}</h2><p class="hint">Nama pengguna: <b>${esc(S.me.username)}</b> · Peran: ${esc(S.me.role)}${u.LoginTerakhir ? ' · Login terakhir ' + esc(String(u.LoginTerakhir).replace('T', ' ')) : ''}</p></section>
    <form class="card aform" id="pw-form"><h2>${ic('key')}Ganti Kata Sandi</h2>
      <label class="fld"><span>Kata sandi saat ini</span><input name="lama" type="password" autocomplete="current-password" required></label>
      <label class="fld"><span>Kata sandi baru</span><input name="baru" type="password" autocomplete="new-password" minlength="10" required><small class="hint">Minimal 10 karakter, huruf dan angka.</small></label>
      <label class="fld"><span>Ulangi kata sandi baru</span><input name="ulang" type="password" autocomplete="new-password" required></label>
      <p class="err" id="pw-err" role="alert"></p><button class="btn primary block" type="submit">Simpan Kata Sandi</button></form>
    <section class="card"><h2>${ic('shield')}Keamanan</h2><p class="hint">Keluarkan akun ini dari semua perangkat yang sedang masuk.</p><button class="btn danger block" data-act="keluar-semua">${ic('logout')}Keluar dari Semua Perangkat</button></section>`;
  }
  async function doPw(form) {
    const err = $('#pw-err'), v = n => form.elements[n].value; err.textContent = '';
    if (v('baru') !== v('ulang')) { err.textContent = 'Pengulangan kata sandi tidak sama.'; return; }
    try { const r = await AI.api('auth.ganti', { lama: v('lama'), baru: v('baru') }); AI.sesiSimpan(r.data.token, r.data.me); form.reset(); AI.toast('Kata sandi berhasil diganti ✔'); } catch (e) { err.textContent = e.message; }
  }

  /* ========================= EKSPOR EXCEL / PDF (hanya Admin; data difilter di server) ========================= */
  const loaded = {};
  const loadScript = u => loaded[u] || (loaded[u] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = () => { delete loaded[u]; rej(new Error('Pustaka ekspor gagal dimuat. Periksa koneksi internet.')); }; document.head.appendChild(s); }));
  const LIB = { xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', atable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js' };
  const csvSafe = v => typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
  function filterText() {
    const f = S.kf, p = [];
    if (f.jenis) p.push('Jenis: ' + f.jenis); if (f.kategori) p.push('Kategori: ' + f.kategori); if (f.q) p.push('Cari: “' + f.q + '”');
    if (f.dari || f.sampai) p.push('Periode: ' + (f.dari ? tgl(f.dari) : 'awal') + ' s.d. ' + (f.sampai ? tgl(f.sampai) : 'sekarang'));
    return p.length ? p.join(' · ') : 'Semua transaksi (tanpa filter)';
  }
  acts.ekspor = async el => {
    if (!S.token) return AI.openLogin();
    const fmt = el.dataset.fmt, t = el.innerHTML; el.disabled = true; el.textContent = 'Menyiapkan…';
    try {
      const { q, jenis, kategori, dari, sampai } = S.kf;
      const r = await AI.api('admin.ekspor', { filter: { q, jenis, kategori, dari, sampai } }), d = r.data;     // server memeriksa hak akses Admin
      if (!d.rows.length) throw new Error('Tidak ada data untuk diunduh dengan filter ini.');
      const ft = filterText(), stamp = AI.today().replace(/-/g, ''), waktu = String(d.waktu).replace('T', ' '), nama = d.profil.nama;
      if (fmt === 'xlsx') {
        await loadScript(LIB.xlsx);
        const aoa = [[nama], ['LAPORAN KAS MASJID'], [ft], ['Dicetak oleh ' + d.oleh + ' · ' + waktu], [], ['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Sumber', 'Nominal (Rp)']]
          .concat(d.rows.map(x => [x[1], x[2], csvSafe(x[3]), csvSafe(x[4]), csvSafe(x[6]), x[5]]))
          .concat([[], ['', '', '', 'Total Pemasukan', '', d.total.masuk], ['', '', '', 'Total Pengeluaran', '', d.total.keluar], ['', '', '', 'Saldo (hasil filter)', '', d.total.saldo]]);
        const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 12 }, { wch: 13 }, { wch: 20 }, { wch: 42 }, { wch: 16 }, { wch: 16 }];
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Laporan Kas'); XLSX.writeFile(wb, `Laporan-Kas-AlIkhlash-${stamp}.xlsx`);
      } else {
        await loadScript(LIB.jspdf); await loadScript(LIB.atable);
        const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' }), W = doc.internal.pageSize.getWidth();
        doc.setFillColor(11, 93, 54); doc.rect(0, 0, W, 64, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(nama, 36, 30);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('Laporan Kas Masjid', 36, 48);
        doc.setTextColor(60); doc.setFontSize(9); doc.text(ft, 36, 84); doc.text('Dicetak oleh ' + d.oleh + ' · ' + waktu, 36, 97);
        const R = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
        doc.autoTable({
          startY: 110, head: [['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Nominal']], body: d.rows.map(x => [tgl(x[1]), x[2], x[3], x[4] || '-', (x[2] === 'Pemasukan' ? '+' : '-') + R(x[5])]),
          styles: { fontSize: 8.5, cellPadding: 4 }, headStyles: { fillColor: [11, 93, 54] }, columnStyles: { 4: { halign: 'right', cellWidth: 90 } }, alternateRowStyles: { fillColor: [243, 248, 245] },
          foot: [['', '', '', 'Total Pemasukan', R(d.total.masuk)], ['', '', '', 'Total Pengeluaran', R(d.total.keluar)], ['', '', '', 'Saldo (hasil filter)', R(d.total.saldo)]], footStyles: { fillColor: [225, 249, 234], textColor: 20, fontStyle: 'bold', halign: 'right' }
        });
        doc.save(`Laporan-Kas-AlIkhlash-${stamp}.pdf`);
      }
      AI.toast('Laporan diunduh ✔');
    } catch (e) { AI.toast(e.message, 'err'); }
    el.disabled = false; el.innerHTML = t;
  };

  /* ---------- delegasi submit formulir admin ---------- */
  document.addEventListener('submit', e => {
    const f = e.target;
    if (f.id === 'login-form') { e.preventDefault(); doLogin(f); }
    else if (f.id === 'chg-form') { e.preventDefault(); doChange(f); }
    else if (f.id === 'pw-form') { e.preventDefault(); doPw(f); }
    else if (f.id === 'jad-form') { e.preventDefault(); doJadwal(f); }
    else if (f.id === 'prof-form') { e.preventDefault(); doProfil(f); }
    else if (f.id === 'ent-form') {
      e.preventDefault(); const ent = f.dataset.ent, vals = readEnt(f), msg = checkEnt(ent, vals);
      if (msg) { $('#ent-err').textContent = msg; return; }
      const ex = f.dataset.id ? getEx(ent, f.dataset.id) : null;
      if (f.dataset.id && !ex) { AI.closeSheet(); return; }
      mutateSave(ent, vals, ex);
    }
  });
})();
