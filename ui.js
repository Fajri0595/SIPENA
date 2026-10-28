// ============================================================
// SIPENA — ui.js
// Utilitas tampilan: ikon, badge, modal, toast, event delegation,
// CSV, unduh/cetak, paginasi.
// ============================================================
(function () {
  const SP = (window.SP = window.SP || {});

  SP.esc = function (s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  SP.$ = function (sel, root) { return (root || document).querySelector(sel); };
  SP.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  SP.debounce = function (fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; };
  SP.n = function (x) { return Number(x || 0).toLocaleString('id-ID'); };
  SP.inisial = function (nama) {
    const p = String(nama || '?').replace(/^(Dr\.|Prof\.|Ust\.|Ustadz|Ustadzah|Ustzh\.|Mr\.|Ms\.)\s+/i, '').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[1][0] : '')).toUpperCase();
  };

  // ---------------- Ikon (gaya garis, 24x24) ----------------
  const P = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    sliders: '<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><path d="M14 2v4"/><path d="M8 10v4"/><path d="M16 18v4"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>', chevronUp: '<path d="m18 15-6-6-6 6"/>', chevronRight: '<path d="m9 18 6-6-6-6"/>', chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>', minus: '<path d="M5 12h14"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    shieldX: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m14.5 9.5-5 5"/><path d="m9.5 9.5 5 5"/>',
    cap: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    menu: '<path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/>',
    copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>', stop: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
    trending: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    qr: '<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    cloudOff: '<path d="m2 2 20 20"/><path d="M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.31-.2"/><path d="M21.53 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7 7 0 0 0 10 5.07"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    google: null
  };
  SP.icon = function (nama, cls) {
    if (nama === 'google') {
      return '<svg class="i ' + (cls || '') + '" viewBox="0 0 48 48" style="stroke:none;fill:none"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
    }
    return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[nama] || P.info) + '</svg>';
  };

  // ---------------- Badge status ----------------
  const BADGE = {
    LULUS: ['b-ok', 'Lulus', 'checkCircle'], TIDAK_LULUS: ['b-bad', 'Tidak Lulus', 'xCircle'], BELUM: ['b-null', 'Belum Diisi', 'clock'],
    WAJIB_MENGULANG: ['b-warn', 'Wajib Mengulang', 'rotate'], SEDANG_MENGULANG: ['b-info', 'Sedang Mengulang', 'refresh'],
    SELESAI: ['b-ok', 'Selesai Lulus', 'check'], BELUM_LENGKAP: ['b-null', 'Belum Lengkap', 'clock'],
    AKTIF: ['b-ok', 'Aktif', 'checkCircle'], NONAKTIF: ['b-null', 'Nonaktif', 'minus'], ARSIP: ['b-null', 'Arsip', 'folder'],
    DITERBITKAN: ['b-ok', 'Diterbitkan', 'checkCircle'], SIAP_CETAK: ['b-warn', 'Siap Cetak', 'printer'],
    TERKIRIM: ['b-ok', 'Terkirim', 'mail'], ANTRE: ['b-null', 'Antrean', 'clock'], GAGAL: ['b-bad', 'Gagal Kirim', 'xCircle'], BELUM_KIRIM: ['b-null', 'Belum Dikirim', 'mail'],
    BERJALAN: ['b-info', 'Sedang Berjalan', 'refresh'], BERAKHIR: ['b-null', 'Berakhir', 'clock'], DICABUT: ['b-bad', 'Dicabut', 'xCircle'],
    DIBATALKAN: ['b-bad', 'Dibatalkan', 'xCircle'], DIGANTI: ['b-null', 'Diganti', 'minus'], VALID: ['b-ok', 'Valid', 'check'], ERROR: ['b-bad', 'Error', 'x'], TIMPANG: ['b-bad', 'Timpang', 'alert']
  };
  SP.badge = function (k, label, tanpaIkon) {
    const b = BADGE[k] || ['b-neutral', k, 'info'];
    return '<span class="badge ' + b[0] + '">' + (tanpaIkon ? '' : SP.icon(b[2])) + SP.esc(label || b[1]) + '</span>';
  };
  SP.chip = function (teks, kelas) { return '<span class="chip ' + (kelas || '') + '">' + SP.esc(teks) + '</span>'; };

  // ---------------- Komponen halaman ----------------
  SP.header = function (o) {
    const cr = (o.crumbs || []).map(function (c, i, a) {
      return (i === a.length - 1 ? '<b>' + SP.esc(c[0]) + '</b>' : '<a href="' + (c[1] || '#') + '">' + SP.esc(c[0]) + '</a>' + SP.icon('chevronRight', 'sm'));
    }).join(' ');
    return (o.crumbs ? '<nav class="crumbs">' + cr + '</nav>' : '') +
      (o.back ? '<a class="back" href="' + o.back[1] + '">' + SP.icon('arrowLeft') + SP.esc(o.back[0]) + '</a>' : '') +
      '<div class="ph"><div>' + (o.eyebrow ? '<div class="eyebrow">' + SP.esc(o.eyebrow) + '</div>' : '') +
      '<h1 class="h1">' + SP.esc(o.judul) + '</h1>' + (o.desc ? '<p class="lead">' + o.desc + '</p>' : '') + (o.sub || '') + '</div>' +
      (o.aksi ? '<div class="ph-act">' + o.aksi + '</div>' : '') + '</div>';
  };
  SP.stat = function (o) {
    return '<div class="card stat ' + (o.kelas || '') + '"><span class="cap">' + SP.esc(o.label) + '</span>' +
      (o.ikon ? '<div class="ico ' + (o.warna || '') + '">' + SP.icon(o.ikon, 'lg') + '</div>' : '') +
      '<div class="val num">' + o.nilai + (o.satuan ? '<small>' + SP.esc(o.satuan) + '</small>' : '') + '</div>' +
      (o.progress !== undefined ? '<div class="mt8">' + SP.prog(o.progress, o.progWarna) + '</div>' : '') +
      (o.foot ? '<div class="foot">' + o.foot + '</div>' : '') + '</div>';
  };
  SP.prog = function (pct, warna) { return '<div class="prog"><i class="' + (warna || '') + '" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>'; };
  SP.callout = function (o) {
    return '<div class="callout ' + (o.tipe || '') + ' ' + (o.edge ? 'edge' : '') + '"><div class="ic">' + SP.icon(o.ikon || 'info', 'lg') + '</div><div class="grow"><div class="ct">' + o.judul +
      (o.tag ? '<span class="tagx">' + SP.esc(o.tag) + '</span>' : '') + '</div><div class="tx">' + o.teks + '</div></div>' + (o.aksi || '') + '</div>';
  };
  SP.kosong = function (ikon, judul, teks, aksi) {
    return '<div class="empty"><div class="ic">' + SP.icon(ikon || 'info', 'xl') + '</div><h3 class="h3">' + SP.esc(judul) + '</h3><p>' + teks + '</p>' + (aksi ? '<div class="mt16">' + aksi + '</div>' : '') + '</div>';
  };
  SP.skeletonHalaman = function () {
    return '<div class="sk" style="height:34px;width:40%;margin-bottom:12px"></div><div class="sk" style="height:18px;width:60%;margin-bottom:28px"></div>' +
      '<div class="grid4 mb16">' + [1, 2, 3, 4].map(function () { return '<div class="sk" style="height:130px"></div>'; }).join('') + '</div><div class="sk" style="height:320px"></div>';
  };

  // ---------------- Tanggal & angka ----------------
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  // Jam mengikuti waktu SERVER (selisih dihitung saat memuat data) agar konsisten dengan batas tanggal di backend
  SP.selisihWaktu = 0;
  SP.sekarang = function () { return new Date(Date.now() + SP.selisihWaktu); };
  SP.hariIni = function () { return SP.sekarang().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); };
  SP.tgl = function (iso, panjang) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso || '—';
    return Number(m[3]) + ' ' + (panjang ? BLN_PANJANG : BLN)[Number(m[2]) - 1] + ' ' + m[1];
  };
  SP.waktu = function (s) {
    const m = String(s || '').match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    return m ? SP.tgl(m[1]) + ', ' + m[2] + ' WIB' : (s || '—');
  };
  SP.jamWIB = function () { return SP.sekarang().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB'; };
  SP.selisihHari = function (iso) {
    if (!iso) return null;
    const a = new Date(iso + 'T00:00:00+07:00').getTime(), b = new Date(SP.hariIni() + 'T00:00:00+07:00').getTime();
    return Math.round((a - b) / 86400000);
  };
  SP.pct = function (a, b) { return b ? Math.round((a * 1000) / b) / 10 : null; };
  SP.pctStr = function (v) { return v === null || v === undefined ? '—' : (Number.isInteger(v) ? v : v.toFixed(1)) + '%'; };
  SP.semLabel = function (s) { return s === 'GENAP' ? 'Genap' : 'Ganjil'; };

  // ---------------- Toast & modal ----------------
  SP.toast = function (pesan, tipe, ms) {
    tipe = tipe || 'ok';
    const wrap = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + tipe;
    el.setAttribute('role', tipe === 'err' ? 'alert' : 'status');
    el.innerHTML = SP.icon({ ok: 'checkCircle', err: 'xCircle', info: 'info', warn: 'alert' }[tipe] || 'info') + '<div class="grow">' + pesan + '</div>';
    wrap.appendChild(el);
    const t = setTimeout(function () { el.remove(); }, ms || (tipe === 'err' ? 7000 : 4000));
    el.addEventListener('click', function () { clearTimeout(t); el.remove(); });
    return el;
  };

  const modalStack = [];
  SP.modal = function (o) {
    const ov = document.getElementById('overlay');
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true" style="--w:' + (o.lebar || 560) + 'px"><div class="modal-h"><h2 class="h2">' + SP.esc(o.judul || '') + '</h2>' +
      '<button class="btn btn-ghost btn-sm" data-modal-x aria-label="Tutup">' + SP.icon('x') + '</button></div><div class="modal-b">' + (o.isi || '') + '</div>' +
      (o.footer ? '<div class="modal-f">' + o.footer + '</div>' : '') + '</div>';
    ov.appendChild(bg);
    const h = {
      el: bg, body: bg.querySelector('.modal-b'),
      tutup: function () {
        const i = modalStack.indexOf(h); if (i >= 0) modalStack.splice(i, 1); bg.remove(); if (o.onClose) o.onClose();
        // jika pemuatan data di latar belakang tertunda karena modal terbuka, render sekarang
        if (SP.perluRender && !document.querySelector('.modal-bg')) { SP.perluRender = false; if (SP.renderUlang) SP.renderUlang(); }
      }
    };
    bg.addEventListener('mousedown', function (e) { if (e.target === bg && !o.statis) h.tutup(); });
    bg.querySelector('[data-modal-x]').addEventListener('click', h.tutup);
    modalStack.push(h);
    const f = bg.querySelector('input:not([type=hidden]),select,textarea');
    if (f && !o.tanpaFokus) setTimeout(function () { f.focus(); }, 30);
    return h;
  };
  SP.tutupModal = function () { const h = modalStack[modalStack.length - 1]; if (h) h.tutup(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') SP.tutupModal(); });

  SP.konfirmasi = function (o) {
    return new Promise(function (res) {
      let selesai = false;
      const m = SP.modal({
        judul: o.judul || 'Konfirmasi', lebar: o.lebar || 480, tanpaFokus: true,
        isi: '<p>' + (o.pesan || '') + '</p>',
        footer: '<button class="btn btn-outline" data-k="0">' + SP.esc(o.batal || 'Batal') + '</button><button class="btn ' + (o.bahaya ? 'btn-danger' : 'btn-primary') + '" data-k="1">' + SP.esc(o.ya || 'Ya, Lanjutkan') + '</button>',
        onClose: function () { if (!selesai) { selesai = true; res(false); } }
      });
      m.el.querySelectorAll('[data-k]').forEach(function (b) {
        b.addEventListener('click', function () { selesai = true; res(b.dataset.k === '1'); m.tutup(); });
      });
      const ya = m.el.querySelector('[data-k="1"]'); if (ya) ya.focus();
    });
  };

  // ---------------- Event delegation ----------------
  SP.actions = {}; SP.inputs = {}; SP.changes = {}; SP.parts = {};
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || el.classList.contains('disabled')) return;
    const fn = SP.actions[el.dataset.act];
    if (fn) { if (el.tagName === 'A' && !el.hasAttribute('data-native')) e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('input', function (e) { const el = e.target.closest('[data-in]'); if (el && SP.inputs[el.dataset.in]) SP.inputs[el.dataset.in](el, e); });
  document.addEventListener('change', function (e) { const el = e.target.closest('[data-ch]'); if (el && SP.changes[el.dataset.ch]) SP.changes[el.dataset.ch](el, e); });
  SP.refresh = function (nama) {
    const el = document.querySelector('[data-part="' + nama + '"]');
    if (el && SP.parts[nama]) { el.innerHTML = SP.parts[nama](); }
  };

  // ---------------- Paginasi ----------------
  SP.paginate = function (arr, page, per) {
    const total = arr.length, pages = Math.max(1, Math.ceil(total / per));
    const p = Math.min(Math.max(1, page || 1), pages);
    return { items: arr.slice((p - 1) * per, p * per), page: p, pages: pages, total: total, dari: total ? (p - 1) * per + 1 : 0, sampai: Math.min(total, p * per) };
  };
  SP.pagerHtml = function (act, pg) {
    if (pg.pages <= 1) return '';
    const nums = [];
    for (let i = 1; i <= pg.pages; i++) if (i === 1 || i === pg.pages || Math.abs(i - pg.page) <= 1) nums.push(i);
    let out = '<div class="pager"><button data-act="' + act + '" data-p="' + (pg.page - 1) + '" ' + (pg.page <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya">' + SP.icon('chevronLeft') + '</button>';
    let prev = 0;
    nums.forEach(function (n) {
      if (n - prev > 1) out += '<button disabled>…</button>';
      out += '<button data-act="' + act + '" data-p="' + n + '" class="' + (n === pg.page ? 'on' : '') + '">' + n + '</button>';
      prev = n;
    });
    return out + '<button data-act="' + act + '" data-p="' + (pg.page + 1) + '" ' + (pg.page >= pg.pages ? 'disabled' : '') + ' aria-label="Berikutnya">' + SP.icon('chevronRight') + '</button></div>';
  };

  // ---------------- CSV ----------------
  SP.csvParse = function (teks) {
    teks = String(teks).replace(/^\uFEFF/, '');
    const baris1 = teks.split(/\r?\n/)[0] || '';
    const sep = (baris1.match(/;/g) || []).length > (baris1.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < teks.length; i++) {
      const c = teks[i];
      if (q) {
        if (c === '"') { if (teks[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && teks[i + 1] === '\n') i++; row.push(cur); cur = ''; rows.push(row); row = []; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
  };
  SP.csvBuat = function (headers, rows) {
    const q = function (v) { v = String(v === undefined || v === null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [headers].concat(rows).map(function (r) { return r.map(q).join(','); }).join('\r\n');
  };

  // ---------------- Unduh & cetak ----------------
  SP.unduh = function (nama, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 1000);
  };
  SP.unduhCsv = function (nama, headers, rows) { SP.unduh(nama, '\uFEFF' + SP.csvBuat(headers, rows), 'text/csv;charset=utf-8'); };
  SP.unduhBase64 = function (nama, b64, mime) {
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    SP.unduh(nama, new Blob([arr], { type: mime }), mime);
  };
  SP.bukaBase64 = function (b64, mime) {
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    window.open(URL.createObjectURL(new Blob([arr], { type: mime })), '_blank');
  };
  SP.cetakTabel = function (judul, headers, rows, sub) {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentWindow.document;
    d.open();
    d.write('<html><head><title>' + SP.esc(judul) + '</title><style>body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:18px}h1{font-size:16px;margin:0 0 4px}p{margin:0 0 12px;color:#555}' +
      'table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left}th{background:#e8efe9}</style></head><body><h1>' + SP.esc(judul) + '</h1><p>' + SP.esc(sub || '') + '</p><table><thead><tr>' +
      headers.map(function (h) { return '<th>' + SP.esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + SP.esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></body></html>');
    d.close();
    setTimeout(function () { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(function () { f.remove(); }, 2000); }, 300);
  };
  SP.salin = function (teks) {
    const ok = function () { SP.toast('Disalin ke papan klip', 'ok', 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(ok, ok); else ok();
  };
  SP.bacaFile = function (file) {
    return new Promise(function (res, rej) { const r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(file); });
  };
  // Perkecil gambar (kanvas) agar ukuran kecil sebelum diunggah
  SP.kecilkanGambar = function (file, maks, mime) {
    return new Promise(function (res, rej) {
      const img = new Image();
      img.onload = function () {
        const sk = Math.min(1, maks / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * sk); c.height = Math.round(img.height * sk);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL(mime || 'image/jpeg', 0.85));
      };
      img.onerror = function () { rej(new Error('Gambar tidak dapat dibaca.')); };
      img.src = URL.createObjectURL(file);
    });
  };
})();
