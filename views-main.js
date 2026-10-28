// ============================================================
// SIPENA — views-main.js
// Dasbor, Kelas Saya, Input Nilai.
// ============================================================
(function () {
  const SP = window.SP;
  SP.views = SP.views || {};
  SP.ui = SP.ui || {};
  const esc = SP.esc;

  // ---------- util ----------
  function ringkasPenugasan(pg) {
    const k = SP.kemajuan(pg, SP.draft.baca(pg.id));
    const kelas = SP.X.kelas[pg.kelas_id] || {};
    return { pg: pg, kelas: kelas, k: k, prog: SP.kodeProgram(pg.bahasa, pg.semester) };
  }
  function labelProgramPg(pg) { return SP.bahasaLabel(pg.bahasa) + ' · ' + SP.semLabel(pg.semester); }
  function sisaHariBatas() {
    const b = SP.set().batas_penilaian; if (!b) return null;
    return { tgl: b, hari: SP.selisihHari(b) };
  }
  SP.tombolKelasBaru = '';

  // ============================================================
  // DASBOR
  // ============================================================
  SP.ui.dasbor = SP.ui.dasbor || { sem: '', tutupBanner: false };

  function persenProgram() {
    return SP.PROGRAM.map(function (p) {
      let l = 0, t = 0;
      SP.S.mahasiswa.forEach(function (m) { const s = SP.statusProgram(m.nim, p); if (s === 'LULUS') l++; else if (s === 'TIDAK_LULUS') t++; });
      return { p: p, lulus: l, tl: t, pct: SP.pct(l, l + t) };
    });
  }

  SP.parts.dasProgres = function () {
    const u = SP.ui.dasbor, s = SP.set();
    const semSel = u.sem || (s.tahun_ajaran_aktif + '|' + s.semester_aktif);
    const t = semSel.split('|');
    const list = SP.daftarPenugasanSaya().filter(function (p) { return p.tahun_ajaran === t[0] && p.semester === t[1] && p.status === 'AKTIF'; }).map(ringkasPenugasan);
    if (!list.length) return SP.kosong('book', 'Belum ada kelas pada semester ini', 'Penugasan kelas dibuat oleh Superadmin melalui menu Kelola Pengguna &amp; Kelas.');
    return list.sort(function (a, b) { return (a.k.pct || 0) - (b.k.pct || 0); }).slice(0, 8).map(function (r) {
      const pct = r.k.pct || 0, rendah = pct < 60, lengkap = r.k.total > 0 && r.k.belum === 0;
      return '<div class="hbar ' + (rendah ? 'low' : '') + '"><div class="t"><span><b>' + esc(r.kelas.nama) + '</b><span class="sub">' + esc(labelProgramPg(r.pg)) + '</span></span>' +
        '<span class="v">' + (lengkap ? SP.badge('LULUS', 'LENGKAP').replace('b-ok', 'b-ok') + ' ' : '') + r.k.terisi + ' / ' + r.k.total + ' Mhs <em>' + SP.pctStr(pct) + '</em></span></div>' +
        SP.prog(pct, rendah ? 'o' : '') + '</div>';
    }).join('');
  };
  SP.parts.dasProgram = function () {
    const d = persenProgram();
    return '<div class="vbars">' + d.map(function (x) {
      return '<div class="vbar"><div class="p num">' + (x.pct === null ? '—' : Math.round(x.pct) + '%') + '</div><div class="b" style="height:' + (x.pct === null ? 4 : Math.max(4, x.pct * 1.15)) + 'px;' + (x.p.indexOf('ING') === 0 ? 'background:#2F7D4B' : '') + '"></div><div class="l">' + SP.PROG_KODE[x.p] + '</div></div>';
    }).join('') + '</div><div class="legend">' + d.map(function (x) {
      return '<span><i style="background:' + (x.p.indexOf('ING') === 0 ? '#2F7D4B' : 'var(--primary)') + '"></i>' + esc(SP.PROG_SHORT[x.p]) + ' (' + SP.pctStr(x.pct) + ')</span>';
    }).join('') + '</div>' + SP.callout({ ikon: 'info', judul: 'Peraturan Kelulusan:', teks: 'Mahasiswa dinyatakan lulus dan berhak sertifikat hanya bila <b>keempat program</b> (Arab &amp; Inggris, Ganjil &amp; Genap) berstatus Lulus.' });
  };

  SP.views.dasbor = {
    judul: 'Dasbor',
    render: function () {
      const S = SP.S, s = SP.set(), admin = SP.isAdmin();
      const aktif = SP.penugasanAktifSaya().map(ringkasPenugasan);
      const mengulang = SP.jumlahMahasiswaMengulang();
      const baris = SP.barisKelulusan();
      const nLulus = baris.filter(function (b) { return b.akhir === 'LULUS'; }).length;
      const nWajib = baris.filter(function (b) { return b.akhir === 'WAJIB_MENGULANG'; }).length;
      let terisi = 0, total = 0, nArab = 0, nIng = 0;
      aktif.forEach(function (r) { terisi += r.k.terisi; total += r.k.total; if (r.pg.bahasa === 'ARAB') nArab++; else nIng++; });
      const pct = SP.pct(terisi, total);
      const batas = sisaHariBatas();
      const kelasUnik = {}; aktif.forEach(function (r) { kelasUnik[r.pg.kelas_id] = true; });
      const belumLengkap = aktif.filter(function (r) { return r.k.belum > 0; }).sort(function (a, b) { return b.k.belum - a.k.belum; });
      const totalTertunda = belumLengkap.reduce(function (a, r) { return a + r.k.belum; }, 0);
      const semOps = SP.opsiSemester();
      const semSel = SP.ui.dasbor.sem || (s.tahun_ajaran_aktif + '|' + s.semester_aktif);

      let h = '';
      if (mengulang > 0 && !SP.ui.dasbor.tutupBanner) {
        h += '<div class="banner"><div class="ic">' + SP.icon('alert', 'lg') + '</div><div class="tx"><b>Pemberitahuan Sistem:</b>' + mengulang + ' mahasiswa terdata wajib mengulang program bahasa pada semester berikutnya sesuai ketentuan kelulusan.</div>' +
          '<a class="btn btn-accent btn-sm" href="#/mengulang">LIHAT DAFTAR PENGULANGAN ' + SP.icon('arrowRight') + '</a><button class="btn btn-ghost btn-sm" data-act="tutupBanner" aria-label="Tutup">' + SP.icon('x') + '</button></div>';
      }
      h += SP.header({
        eyebrow: 'Konsol Akademik • ' + (admin ? 'Superadmin' : 'Tutor') + ' & Departemen Bahasa',
        judul: 'Ringkasan Penilaian & Perkuliahan',
        aksi: '<span class="chip">' + SP.icon('clock', 'sm') + ' Sinkronisasi terakhir: <span data-sync-time>' + SP.jamWIB() + '</span></span>' +
          '<button class="btn btn-primary" data-act="ekspDasbor">' + SP.icon('download') + ' Ekspor Rekap</button>'
      });

      if (!S.kelas.length && !S.penugasan.length) {
        return h + '<div class="card card-p">' + SP.kosong('book', 'Selamat datang di SIPENA',
          admin ? 'Belum ada data. Mulailah dengan mendaftarkan tutor, membuat kelas, lalu menugaskan tutor ke kelas.' : 'Anda belum memiliki penugasan kelas. Hubungi Superadmin untuk penugasan.',
          admin ? '<a class="btn btn-primary" href="#/pengguna">' + SP.icon('users') + ' Kelola Pengguna &amp; Kelas</a>' : '') + '</div>';
      }

      h += '<div class="grid4 mb16">' +
        SP.stat({ label: 'Kelas diampu', nilai: aktif.length, satuan: 'Kelas', ikon: 'book', warna: 'g', foot: '<span>' + nArab + ' Arab · ' + nIng + ' Inggris</span><span class="muted3">' + Object.keys(kelasUnik).length + ' rombel</span>' }) +
        SP.stat({ label: 'Nilai terisi', nilai: pct === null ? '—' : SP.pctStr(pct), satuan: terisi + '/' + total + ' Mhs', ikon: 'edit', warna: 'b', progress: pct || 0,
          foot: '<span>' + SP.icon('clock', 'sm') + ' ' + (batas ? 'Batas: ' + SP.tgl(batas.tgl, true) : 'Batas belum diatur') + '</span><b>' + (total - terisi) + ' Sisa</b>' }) +
        SP.stat({ label: 'Mahasiswa lulus', nilai: SP.n(nLulus), satuan: 'Mahasiswa', ikon: 'checkCircle', warna: 'g', foot: '<span>' + SP.icon('trending', 'sm') + ' ' + SP.pctStr(SP.pct(nLulus, baris.length)) + ' dari ' + SP.n(baris.length) + ' mahasiswa</span>' }) +
        SP.stat({ label: 'Wajib mengulang', nilai: SP.n(nWajib), satuan: 'Mahasiswa', ikon: 'rotate', warna: 'o', kelas: 'warn', foot: '<span class="badge b-warn">Perlu tindak lanjut</span><a href="#/mengulang"><b>Verifikasi</b></a>' }) +
        '</div>';

      h += '<div class="grid-main mb16"><div class="card card-p"><div class="row between top mb16"><div><h2 class="h2">Progres Input Nilai per Kelas</h2><p class="muted" style="font-size:13px">Pemenuhan entri status lulus/tidak lulus pada semester terpilih</p></div>' +
        '<select class="select" style="width:auto" data-ch="dasSem" aria-label="Semester">' + semOps.map(function (o) { return '<option value="' + o.v + '" ' + (o.v === semSel ? 'selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select></div>' +
        '<div data-part="dasProgres">' + SP.parts.dasProgres() + '</div></div>' +
        '<div class="card card-p"><div class="row between mb16"><h2 class="h2">Persentase Kelulusan Program</h2><span class="chip">TOTAL 4 MODUL</span></div><p class="muted mb16" style="font-size:13px">Akumulasi kelulusan per modul program</p><div data-part="dasProgram">' + SP.parts.dasProgram() + '</div></div></div>';

      h += '<div class="card"><div class="card-h"><div><h2 class="h2">Kelas dengan Nilai Belum Lengkap <span class="badge b-warn" style="vertical-align:middle">' + belumLengkap.length + ' KELAS</span></h2>' +
        '<p class="muted" style="font-size:13px">Kelas yang membutuhkan percepatan input nilai sebelum batas periode penilaian ditutup</p></div></div>';
      if (!belumLengkap.length) h += '<div class="card-b">' + SP.kosong('checkCircle', 'Semua nilai sudah lengkap', 'Tidak ada kelas dengan nilai tertunda pada semester aktif. Kerja bagus!') + '</div>';
      else {
        h += '<div class="tbl-wrap has-foot" style="border-radius:0;border-left:0;border-right:0"><table class="tbl cards"><thead><tr><th>Kelas</th><th>Program studi</th><th>Mata program</th><th>Tutor</th><th>Mahasiswa belum dinilai</th><th>Status</th><th class="right">Aksi</th></tr></thead><tbody>' +
          belumLengkap.map(function (r) {
            const dapat = SP.bolehTulis(r.pg);
            return '<tr><td data-l="Kelas"><span class="chip" style="font-weight:700">' + esc(r.kelas.nama) + '</span></td><td data-l="Program studi" class="nm"><b>' + esc(r.kelas.prodi || '—') + '</b><small>Angkatan ' + esc(r.kelas.angkatan || '—') + '</small></td>' +
              '<td data-l="Mata program">' + SP.icon(r.pg.bahasa === 'ARAB' ? 'edit' : 'globe', 'sm') + ' ' + esc(labelProgramPg(r.pg)) + '</td>' +
              '<td data-l="Tutor"><span class="row gap8"><span class="avatar sm lt">' + esc(SP.inisial(SP.namaUser(r.pg.tutor_email))) + '</span>' + esc(SP.namaUser(r.pg.tutor_email)) + '</span></td>' +
              '<td data-l="Belum dinilai"><span class="badge b-warn">' + SP.icon('clock') + r.k.belum + ' belum diisi</span></td><td data-l="Status"><span style="color:var(--primary);font-weight:600"><span class="dotp"></span> Aktif</span></td>' +
              '<td class="right"><a class="btn btn-primary btn-sm ' + (dapat ? '' : 'disabled') + '" href="#/nilai/' + encodeURIComponent(r.pg.id) + '">' + SP.icon('edit') + ' Isi Nilai Sekarang</a></td></tr>';
          }).join('') + '</tbody></table></div><div class="tbl-foot" style="border-left:0;border-right:0;border-bottom:0"><span>Menampilkan ' + belumLengkap.length + ' dari ' + belumLengkap.length + ' kelas belum tuntas • <b style="color:var(--danger)">Total ' + totalTertunda + ' mahasiswa tertunda</b></span><a href="#/kelas"><b>Buka Semua Kelas ' + SP.icon('arrowRight', 'sm') + '</b></a></div>';
      }
      return h + '</div>';
    }
  };
  SP.actions.tutupBanner = function () { SP.ui.dasbor.tutupBanner = true; SP.renderUlang(); };
  SP.changes.dasSem = function (el) { SP.ui.dasbor.sem = el.value; SP.refresh('dasProgres'); };
  SP.actions.ekspDasbor = function () {
    const rows = SP.penugasanAktifSaya().map(ringkasPenugasan).map(function (r) {
      return [r.kelas.nama, labelProgramPg(r.pg), SP.namaUser(r.pg.tutor_email), r.k.total, r.k.lulus, r.k.tl, r.k.belum, SP.pctStr(r.k.pct)];
    });
    if (!rows.length) return SP.toast('Tidak ada data untuk diekspor.', 'warn');
    SP.eksporXlsx('Rekap Progres Nilai', ['Kelas', 'Program', 'Tutor', 'Jumlah Mhs', 'Lulus', 'Tidak Lulus', 'Belum Diisi', 'Terisi (%)'], rows);
  };

  // ============================================================
  // KELAS SAYA
  // ============================================================
  SP.ui.kelas = SP.ui.kelas || { sem: '', program: '', peran: '', q: '' };

  function kartuKelas(pg, arsip) {
    const r = ringkasPenugasan(pg), k = r.k, peran = SP.peran(pg), admin = SP.isAdmin();
    const dapat = SP.bolehTulis(pg), tntas = k.total > 0 && k.belum === 0;
    const rendah = !arsip && k.belum > 0 && (k.pct || 0) < 60 && k.total > 0;
    const pgn = peran === 'PENGGANTI' ? SP.penggantiAktif(pg) : null;
    let chipPeran;
    if (peran === 'PENGGANTI') chipPeran = '<span class="chip warn">' + SP.icon('swap', 'sm') + ' Tutor Pengganti</span>';
    else if (peran === 'UTAMA') chipPeran = '<span class="chip">' + SP.icon('user', 'sm') + ' Tutor Utama</span>';
    else chipPeran = '<span class="chip nul">' + SP.icon('user', 'sm') + ' ' + esc(SP.namaUser(pg.tutor_email)) + '</span>';
    const bahasaChip = '<span class="tagx" style="background:' + (pg.bahasa === 'ARAB' ? 'var(--ok-bg);color:var(--ok-tx)' : 'var(--info-bg);color:var(--info-tx)') + '"><span class="dotp"></span> ' + esc(SP.bahasaLabel(pg.bahasa).toUpperCase()) + '</span>';
    let status;
    if (arsip) {
      const luluspct = k.total ? SP.pct(k.lulus, k.total) : null;
      status = '<div class="kbox" style="background:var(--ok-bg);color:var(--ok-tx)"><span>' + SP.icon('checkCircle', 'sm') + ' ' + k.lulus + '/' + k.total + ' mahasiswa lulus evaluasi</span><b>' + SP.pctStr(luluspct) + '</b></div>';
    } else {
      status = '<div class="pr-lbl"><span>Progres Penilaian</span><b class="num" style="' + (rendah ? 'color:var(--accent)' : '') + '">' + k.terisi + '/' + k.total + ' Terisi (' + SP.pctStr(k.pct || 0) + ')</b></div>' + SP.prog(k.pct || 0, rendah ? 'o' : '') +
        (tntas ? '<p class="mt8" style="font-size:13px;color:var(--ok-tx)">' + SP.icon('checkCircle', 'sm') + ' Selesai lengkap</p>' : rendah ? '<p class="mt8" style="font-size:13px;color:var(--accent-d)">' + SP.icon('alert', 'sm') + ' ' + k.belum + ' nilai belum diisi</p>' : '');
    }
    return '<div class="card kc ' + (peran === 'PENGGANTI' ? 'pengganti' : '') + ' ' + (arsip ? 'arsip' : '') + '"><div class="kb"><div class="kt">' + bahasaChip + (arsip ? '<span class="chip nul">' + SP.icon('folder', 'sm') + ' Terarsip</span>' : chipPeran) + '</div>' +
      '<div class="kn">' + esc(r.kelas.nama) + '</div><div class="ks">' + esc(r.kelas.prodi || '—') + ' · ' + esc(SP.semLabel(pg.semester) + ' ' + pg.tahun_ajaran) + '</div>' +
      (peran === 'PENGGANTI' ? '<p class="mt8" style="font-size:12.5px;color:var(--accent-d)">' + SP.icon('swap', 'sm') + ' Menggantikan ' + esc(SP.namaUser(pg.tutor_email)) + ' (s.d. ' + SP.tgl(pgn.selesai) + ')</p>' : '') +
      '<div class="kbox"><span class="row gap8">' + SP.icon('users', 'sm') + '<b>' + k.total + ' Mahasiswa</b></span><span class="muted">Angkatan ' + esc(r.kelas.angkatan || '—') + '</span></div>' + status + '</div>' +
      '<div class="kf">' + (arsip ? '<button class="btn btn-outline" data-act="lihatRiwayat" data-pg="' + esc(pg.id) + '">' + SP.icon('history') + ' Lihat Riwayat</button>'
        : (dapat ? '<a class="btn ' + (rendah ? 'btn-accent' : 'btn-primary') + '" href="#/nilai/' + encodeURIComponent(pg.id) + '">' + SP.icon(rendah ? 'alert' : 'edit') + ' Input Nilai</a>' : '<a class="btn btn-outline" href="#/nilai/' + encodeURIComponent(pg.id) + '">' + SP.icon('eye') + ' Lihat Nilai</a>') +
          '<button class="btn btn-outline" data-act="lihatRiwayat" data-pg="' + esc(pg.id) + '">Lihat Riwayat</button>') + '</div></div>';
  }

  SP.parts.kelasDaftar = function () {
    const u = SP.ui.kelas, s = SP.set();
    const semSel = u.sem || (s.tahun_ajaran_aktif + '|' + s.semester_aktif);
    const q = u.q.toLowerCase();
    let semua = SP.daftarPenugasanSaya().filter(function (p) {
      const k = SP.X.kelas[p.kelas_id]; if (!k) return false;
      if (u.program && p.bahasa !== u.program) return false;
      if (u.peran === 'UTAMA' && SP.peran(p) !== 'UTAMA') return false;
      if (u.peran === 'PENGGANTI' && SP.peran(p) !== 'PENGGANTI') return false;
      if (q && (k.nama + ' ' + (k.prodi || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    const tt = semSel.split('|');
    const aktif = semua.filter(function (p) { return p.tahun_ajaran === tt[0] && p.semester === tt[1] && p.status === 'AKTIF'; });
    const arsip = semua.filter(function (p) { return !(p.tahun_ajaran === tt[0] && p.semester === tt[1] && p.status === 'AKTIF'); })
      .sort(function (a, b) { return (b.tahun_ajaran + b.semester) < (a.tahun_ajaran + a.semester) ? -1 : 1; }).slice(0, 12);
    let h = '<div class="row between mb16"><h2 class="h2"><span class="dotp" style="color:var(--primary)"></span> Kelas Aktif ' + esc(SP.semLabel(tt[1]) + ' ' + tt[0]) + ' <span class="chip">' + aktif.length + ' Kelas</span></h2></div>';
    h += aktif.length ? '<div class="cgrid">' + aktif.map(function (p) { return kartuKelas(p, false); }).join('') + '</div>' : '<div class="card">' + SP.kosong('book', 'Tidak ada kelas aktif', 'Tidak ada kelas yang cocok dengan filter pada semester ini.') + '</div>';
    if (arsip.length) {
      h += '<div class="callout mt24"><div class="ic">' + SP.icon('folder', 'lg') + '</div><div class="grow"><div class="ct">Arsip Kelas Sebelumnya</div><div class="tx">Data tersimpan permanen di basis data SIPENA</div></div></div><div class="cgrid mt16">' +
        arsip.map(function (p) { return kartuKelas(p, true); }).join('') + '</div>';
    }
    return h;
  };

  SP.views.kelas = {
    judul: 'Kelas Saya',
    render: function () {
      const u = SP.ui.kelas, s = SP.set();
      const aktif = SP.penugasanAktifSaya().map(ringkasPenugasan);
      let total = 0, terisi = 0, nPengganti = 0;
      aktif.forEach(function (r) { total += r.k.total; terisi += r.k.terisi; if (SP.peran(r.pg) === 'PENGGANTI') nPengganti++; });
      const pct = SP.pct(terisi, total);
      const batas = sisaHariBatas();
      const semOps = SP.opsiSemester(), semSel = u.sem || (s.tahun_ajaran_aktif + '|' + s.semester_aktif);
      return SP.header({
        crumbs: [['Dasbor', '#/dasbor'], ['Kelas Saya']], judul: 'Kelas Saya',
        desc: 'Daftar kelas bimbingan aktif dan arsip semester sebelumnya yang diampu tutor dalam program standarisasi Bahasa Arab &amp; Inggris.',
        aksi: '<span class="pill-ta" style="background:var(--ok-bg);border-color:var(--ok-bd)"><i></i> Tahun Akademik ' + esc(s.tahun_ajaran_aktif) + '</span>'
      }) +
        '<div class="toolbar"><div class="field"><select class="select" data-ch="kelasSem" aria-label="Semester">' + semOps.map(function (o) { return '<option value="' + o.v + '" ' + (o.v === semSel ? 'selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><select class="select" data-ch="kelasProg" aria-label="Program"><option value="">Semua Program</option><option value="ARAB" ' + (u.program === 'ARAB' ? 'selected' : '') + '>Bahasa Arab</option><option value="INGGRIS" ' + (u.program === 'INGGRIS' ? 'selected' : '') + '>Bahasa Inggris</option></select></div>' +
        '<div class="field"><select class="select" data-ch="kelasPeran" aria-label="Peran"><option value="">Semua Peran</option><option value="UTAMA" ' + (u.peran === 'UTAMA' ? 'selected' : '') + '>Tutor Utama</option><option value="PENGGANTI" ' + (u.peran === 'PENGGANTI' ? 'selected' : '') + '>Tutor Pengganti</option></select></div>' +
        '<div class="sch">' + SP.icon('search') + '<input class="input" placeholder="Cari kelas…" data-in="kelasQ" value="' + esc(u.q) + '" aria-label="Cari kelas"></div></div>' +
        '<div class="grid4 mb16">' +
        SP.stat({ label: 'Kelas aktif', nilai: aktif.length, satuan: 'Sesi berjalan', ikon: 'cap' }) +
        SP.stat({ label: 'Mahasiswa terdaftar', nilai: SP.n(total), satuan: 'Orang', ikon: 'users', warna: 'g' }) +
        '<div class="card stat"><span class="cap">Nilai terisi</span><div class="row between"><div class="val num" style="color:var(--primary)">' + terisi + '<small>/ ' + total + '</small></div><div class="ring" style="--p:' + (pct || 0) + '"><span>' + Math.round(pct || 0) + '%</span></div></div></div>' +
        SP.stat({ label: 'Kelas pengganti', nilai: nPengganti, satuan: 'Temporer', ikon: 'swap', warna: 'o', kelas: 'warn' }) + '</div>' +
        '<div data-part="kelasDaftar">' + SP.parts.kelasDaftar() + '</div>' +
        '<div class="callout mt24"><div class="ic">' + SP.icon('shieldCheck', 'lg') + '</div><div class="grow tx">' + (batas ? 'Batas akhir pengisian nilai akhir Semester ' + esc(SP.semLabel(s.semester_aktif)) + ' adalah <b>' + SP.tgl(batas.tgl, true) + '</b>. ' : 'Batas akhir pengisian nilai belum diatur oleh Superadmin. ') + 'Pastikan seluruh nilai telah diverifikasi sebelum disimpan.</div></div>';
    }
  };
  SP.changes.kelasSem = function (el) { SP.ui.kelas.sem = el.value; SP.refresh('kelasDaftar'); };
  SP.changes.kelasProg = function (el) { SP.ui.kelas.program = el.value; SP.refresh('kelasDaftar'); };
  SP.changes.kelasPeran = function (el) { SP.ui.kelas.peran = el.value; SP.refresh('kelasDaftar'); };
  SP.inputs.kelasQ = SP.debounce(function (el) { SP.ui.kelas.q = el.value; SP.refresh('kelasDaftar'); }, 150);

  // Riwayat kelas (modal): daftar mahasiswa + 4 program
  SP.actions.lihatRiwayat = function (el) {
    const pg = SP.X.pg[el.dataset.pg]; if (!pg) return;
    const kelas = SP.X.kelas[pg.kelas_id], b = SP.barisRoster(pg);
    const nilaiCell = function (nim, p) { return SP.badge(SP.statusProgram(nim, p), null, true); };
    SP.modal({
      judul: 'Riwayat — ' + kelas.nama + ' · ' + labelProgramPg(pg), lebar: 920,
      isi: '<p class="muted mb16">' + esc(SP.semLabel(pg.semester) + ' ' + pg.tahun_ajaran) + ' · Tutor: ' + esc(SP.namaUser(pg.tutor_email)) + ' · ' + b.length + ' mahasiswa</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>NIM</th><th>Nama</th>' +
        SP.PROGRAM.map(function (p) { return '<th>' + esc(SP.PROG_SHORT[p]) + '</th>'; }).join('') + '<th>Status Akhir</th></tr></thead><tbody>' +
        b.map(function (r) {
          const kel = SP.kelulusan(r.nim);
          return '<tr><td class="mono">' + esc(r.nim) + '</td><td>' + esc(r.mhs ? r.mhs.nama : '—') + '</td>' + SP.PROGRAM.map(function (p) { return '<td>' + nilaiCell(r.nim, p) + '</td>'; }).join('') + '<td>' + SP.badge(kel.akhir) + '</td></tr>';
        }).join('') + '</tbody></table></div>',
      footer: '<button class="btn btn-outline" data-act="tutupModal">Tutup</button>'
    });
  };

  // ============================================================
  // INPUT NILAI
  // ============================================================
  SP.ui.nilai = SP.ui.nilai || { pgId: '', filter: 'semua', q: '', page: 1, per: 10 };

  function pgNilaiAktif() {
    const id = SP.ui.nilai.pgId; return id ? SP.X.pg[id] : null;
  }
  function draftNow() { const pg = pgNilaiAktif(); return pg ? SP.draft.baca(pg.id) : {}; }
  function tag(r) {
    if (r.status === 'TIDAK_LULUS') return '<span class="badge b-warn">' + SP.icon('rotate') + 'Wajib Ulang</span>';
    if (r.jenis === 'PENGULANGAN') return '<span class="badge b-info">Pengulangan</span>';
    if (r.jenis === 'PINDAHAN') return '<span class="badge b-neutral">Pindahan</span>';
    return '<span class="badge b-neutral">Reguler</span>';
  }

  SP.parts.nilaiProgres = function () {
    const pg = pgNilaiAktif(); if (!pg) return '';
    const k = SP.kemajuan(pg, draftNow());
    const p = function (n) { return SP.pctStr(SP.pct(n, k.total) || 0); };
    return '<div class="row between wrap mb16"><div class="row gap8"><span class="stat-ic" style="width:40px;height:40px;border-radius:10px;background:var(--callout);display:grid;place-items:center">' + SP.icon('chart', 'lg') + '</span><h2 class="h2">Progres Penilaian Kelas</h2></div>' +
      '<div class="row wrap gap8"><span class="chip">Total: ' + k.total + ' Mahasiswa</span><span class="chip ok">' + k.lulus + ' Lulus (' + p(k.lulus) + ')</span><span class="chip bad">' + k.tl + ' Tidak Lulus (' + p(k.tl) + ')</span><span class="chip nul">' + k.belum + ' Belum Diisi (' + p(k.belum) + ')</span></div></div>' +
      '<div class="prog lg"><i style="width:' + (k.total ? k.lulus / k.total * 100 : 0) + '%"></i><i class="r" style="width:' + (k.total ? k.tl / k.total * 100 : 0) + '%"></i><i class="g" style="width:' + (k.total ? k.belum / k.total * 100 : 0) + '%"></i></div>' +
      '<div class="legend mt8"><span><i style="background:var(--primary)"></i>Lulus (' + k.lulus + ')</span><span><i style="background:var(--danger)"></i>Tidak Lulus (' + k.tl + ')</span><span><i style="background:#C4CCC6"></i>Belum Diisi (' + k.belum + ')</span></div>';
  };

  SP.parts.nilaiFilter = function () {
    const pg = pgNilaiAktif(); if (!pg) return '';
    const u = SP.ui.nilai, k = SP.kemajuan(pg, draftNow());
    const chip = function (v, label, n, kls) { return '<button class="fchip ' + (u.filter === v ? 'on' : '') + '" data-act="nilaiFilter" data-v="' + v + '">' + label + ' <span class="n ' + (kls || '') + '">' + n + '</span></button>'; };
    return chip('semua', 'Semua', k.total) + chip('belum', 'Belum Diisi', k.belum, k.belum ? 'warn' : '') + chip('lulus', 'Lulus', k.lulus) + chip('tl', 'Tidak Lulus', k.tl, k.tl ? 'bad' : '') + chip('ulang', 'Mahasiswa Mengulang', k.mengulang);
  };

  function barisTersaring() {
    const pg = pgNilaiAktif(), u = SP.ui.nilai; if (!pg) return [];
    const q = u.q.toLowerCase();
    return SP.barisRoster(pg, draftNow()).filter(function (r) {
      if (u.filter === 'belum' && r.status !== 'BELUM') return false;
      if (u.filter === 'lulus' && r.status !== 'LULUS') return false;
      if (u.filter === 'tl' && r.status !== 'TIDAK_LULUS') return false;
      if (u.filter === 'ulang' && r.jenis !== 'PENGULANGAN') return false;
      if (q && (r.nim + ' ' + (r.mhs ? r.mhs.nama : '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function riwayatLain(r, pg) {
    const prog = SP.kodeProgram(pg.bahasa, pg.semester);
    return SP.PROGRAM.filter(function (p) { return p !== prog; }).map(function (p) {
      const s = SP.statusProgram(r.nim, p);
      return '<span class="chip ' + (s === 'LULUS' ? 'ok' : s === 'TIDAK_LULUS' ? 'bad' : 'nul') + '" style="font-size:11px">' + esc(SP.PROG_SHORT[p]) + ': ' + (s === 'LULUS' ? 'Lulus' : s === 'TIDAK_LULUS' ? 'Tdk Lulus' : 'Belum') + '</span>';
    }).join(' ');
  }

  SP.parts.nilaiTabel = function () {
    const pg = pgNilaiAktif(); if (!pg) return '';
    const u = SP.ui.nilai, dapat = SP.bolehTulis(pg);
    const semua = barisTersaring(), pgn = SP.paginate(semua, u.page, u.per);
    u.page = pgn.page;
    if (!pgn.total) return '<div class="card">' + SP.kosong('users', SP.kemajuan(pg).total ? 'Tidak ada data yang cocok' : 'Belum ada mahasiswa pada kelas ini', SP.kemajuan(pg).total ? 'Ubah filter atau kata kunci pencarian.' : 'Impor daftar mahasiswa melalui menu Impor Mahasiswa.', SP.kemajuan(pg).total ? '' : '<a class="btn btn-primary" href="#/impor">' + SP.icon('upload') + ' Impor Mahasiswa</a>') + '</div>';
    const btn = function (r, st, label, kls, ikon) {
      const on = r.status === st;
      return '<button ' + (dapat ? '' : 'disabled') + ' class="' + (on ? kls : '') + '" data-act="nilaiSet" data-nim="' + esc(r.nim) + '" data-st="' + st + '" aria-pressed="' + on + '">' + (on ? SP.icon(ikon, 'sm') : '') + label + '</button>';
    };
    return '<div class="tbl-wrap has-foot"><table class="tbl cards"><thead><tr><th>No</th><th>NIM</th><th>Nama Mahasiswa</th><th>Status Nilai Akhir</th><th>Riwayat Program Lain</th><th>Keterangan</th><th>Terakhir Diperbarui</th></tr></thead><tbody>' +
      pgn.items.map(function (r, i) {
        return '<tr class="' + (r.status === 'BELUM' ? 'rowwarn' : '') + '" data-nim="' + esc(r.nim) + '"><td data-l="No" class="num muted">' + String(pgn.dari + i).padStart(2, '0') + '</td><td data-l="NIM" class="mono"><b>' + esc(r.nim) + '</b></td>' +
          '<td data-l="Nama" class="nm"><b>' + esc(r.mhs ? r.mhs.nama : '—') + (r.ubah ? ' <span class="dotp" style="color:var(--accent)" title="Belum disimpan"></span>' : '') + '</b><small>' + esc((SP.X.kelas[pg.kelas_id] || {}).prodi || '') + '</small></td>' +
          '<td data-l="Status nilai"><div class="seg">' + btn(r, 'LULUS', 'Lulus', 'on-ok', 'check') + btn(r, 'TIDAK_LULUS', 'Tdk Lulus', 'on-bad', 'x') + btn(r, 'BELUM', 'Belum', 'on-null', 'minus') + '</div>' + (dapat ? '' : ' <span class="muted3">' + SP.icon('lock', 'sm') + '</span>') + '</td>' +
          '<td data-l="Riwayat program lain"><div class="row wrap gap4">' + riwayatLain(r, pg) + '</div></td><td data-l="Keterangan">' + tag(r) + '</td>' +
          '<td data-l="Diperbarui" class="muted" style="font-size:12.5px">' + (r.row ? SP.waktu(r.row.waktu_ubah) + '<br>oleh ' + esc(SP.namaUser(r.row.penginput).split(' ')[0]) : '— Belum ada<br>Draf') + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="tbl-foot"><span>Menampilkan ' + pgn.dari + ' – ' + pgn.sampai + ' dari <b>' + pgn.total + '</b> Mahasiswa <select class="select" style="width:auto;height:30px;margin-left:8px" data-ch="nilaiPer" aria-label="Baris per halaman">' + [10, 25, 50, 100].map(function (n) { return '<option ' + (n === u.per ? 'selected' : '') + '>' + n + '</option>'; }).join('') + '</select></span>' + SP.pagerHtml('nilaiHal', pgn) + '</div>';
  };

  SP.parts.nilaiBar = function () {
    const pg = pgNilaiAktif(); if (!pg) return '';
    const d = draftNow(), n = Object.keys(SP.barisRoster(pg, d).filter(function (r) { return r.ubah; })).length;
    const w = SP.draft.waktu(pg.id);
    return '<div class="st"><span class="dotg ' + (n ? 'o' : '') + '"></span>' + (n ? '<span>Draf otomatis tersimpan <b>' + esc(w) + '</b> · <b>' + n + '</b> perubahan belum disimpan</span>' : '<span data-sync></span>') + '</div>' +
      '<div class="row">' + (SP.bolehTulis(pg) ? '<button class="btn btn-outline" data-act="nilaiBatal" ' + (n ? '' : 'disabled') + '>Batal Perubahan</button><button class="btn btn-primary btn-lg" data-act="nilaiSimpan" ' + (n ? '' : 'disabled') + '>' + SP.icon('upload') + ' Simpan &amp; Publikasikan Nilai</button>' : '<span class="chip nul">' + SP.icon('lock', 'sm') + ' Mode hanya-baca</span>') + '</div>';
  };

  SP.views.nilai = {
    judul: 'Input Nilai',
    render: function (params) {
      const u = SP.ui.nilai;
      if (params && params[0]) u.pgId = decodeURIComponent(params[0]);
      const daftar = SP.daftarPenugasanSaya().filter(function (p) { return SP.X.kelas[p.kelas_id]; });
      if (!u.pgId || !SP.X.pg[u.pgId]) {
        const aktif = daftar.filter(SP.pgAktif).map(ringkasPenugasan).sort(function (a, b) { return b.k.belum - a.k.belum; });
        u.pgId = aktif.length ? aktif[0].pg.id : (daftar[0] ? daftar[0].id : '');
      }
      const pg = pgNilaiAktif();
      if (!pg) {
        return SP.header({ crumbs: [['Dasbor', '#/dasbor'], ['Input Nilai']], judul: 'Input Nilai Akhir' }) + '<div class="card">' + SP.kosong('edit', 'Belum ada kelas untuk dinilai', SP.isAdmin() ? 'Buat kelas dan penugasan tutor terlebih dahulu.' : 'Anda belum memiliki penugasan kelas. Hubungi Superadmin.', SP.isAdmin() ? '<a class="btn btn-primary" href="#/pengguna">Kelola Pengguna &amp; Kelas</a>' : '') + '</div>';
      }
      const kelas = SP.X.kelas[pg.kelas_id], batas = sisaHariBatas();
      const opsi = daftar.slice().sort(function (a, b) { return (SP.pgAktif(b) ? 1 : 0) - (SP.pgAktif(a) ? 1 : 0) || (a.kelas_id < b.kelas_id ? -1 : 1); }).map(function (p) {
        return '<option value="' + esc(p.id) + '" ' + (p.id === pg.id ? 'selected' : '') + '>' + esc(SP.kelasNama(p.kelas_id) + ' — ' + labelProgramPg(p) + ' (' + p.tahun_ajaran + (SP.pgAktif(p) ? '' : ', arsip') + ')') + '</option>';
      }).join('');
      return '<nav class="crumbs"><a href="#/dasbor">Dasbor</a>' + SP.icon('chevronRight', 'sm') + '<a href="#/kelas">Kelas Saya</a>' + SP.icon('chevronRight', 'sm') + '<span>' + esc(kelas.nama) + '</span>' + SP.icon('chevronRight', 'sm') + '<b>Input Nilai</b></nav>' +
        '<a class="back" href="#/kelas">' + SP.icon('arrowLeft') + ' Kembali ke Kelas Saya</a>' +
        '<div class="ph"><div><h1 class="h1">Input Nilai Akhir — Kelas ' + esc(kelas.nama) + '</h1><p class="lead">Program: <b>' + esc(SP.bahasaLabel(pg.bahasa)) + '</b> · ' + esc(SP.semLabel(pg.semester) + ' ' + pg.tahun_ajaran) + ' · Tutor: <b>' + esc(SP.namaUser(pg.tutor_email)) + '</b></p></div>' +
        '<div class="ph-act">' + (SP.pgAktif(pg) ? '<span class="chip ok">' + SP.icon('checkCircle', 'sm') + ' SEMESTER AKTIF</span>' : '<span class="chip nul">' + SP.icon('folder', 'sm') + ' ARSIP</span>') +
        '<div class="card" style="padding:10px 16px"><div class="cap">Batas penilaian</div><b>' + (batas ? SP.tgl(batas.tgl) + (batas.hari >= 0 ? ' (Sisa ' + batas.hari + ' Hari)' : ' (Terlewat)') : 'Belum diatur') + '</b></div></div></div>' +
        '<div class="field mb16" style="max-width:560px"><label for="pgSel">Kelas &amp; program</label><select id="pgSel" class="select" data-ch="nilaiPg">' + opsi + '</select></div>' +
        '<div class="card card-p mb16" data-part="nilaiProgres">' + SP.parts.nilaiProgres() + '</div>' +
        SP.callout({ ikon: 'info', judul: 'Ketentuan Penilaian Status Akhir Program', teks: 'Nilai yang diinput berupa status akhir program (<b>LULUS</b> / <b style="color:var(--danger)">TIDAK LULUS</b>). Mahasiswa yang berstatus “Tidak Lulus” otomatis wajib mengulang program tersebut pada semester ' + esc(SP.semLabel(pg.semester).toLowerCase()) + ' berikutnya. Nilai semester sebelumnya bersifat <b>hanya-baca</b> bagi tutor.' }) +
        '<div class="row between wrap mt16 mb16"><div class="filters" style="margin:0" data-part="nilaiFilter">' + SP.parts.nilaiFilter() + '</div><div class="row wrap"><div class="sch" style="position:relative;min-width:240px"><span style="position:absolute;left:12px;top:11px;color:var(--text3)">' + SP.icon('search') + '</span><input class="input" style="padding-left:38px" placeholder="Cari NIM atau Nama…" data-in="nilaiQ" value="' + esc(SP.ui.nilai.q) + '" aria-label="Cari mahasiswa"></div>' +
        (SP.bolehTulis(pg) ? '<button class="btn btn-outline" data-act="nilaiIsiCepat">' + SP.icon('zap') + ' Isi Cepat: Semua Lulus</button>' : '') + '<button class="btn btn-outline" data-act="nilaiEkspor">' + SP.icon('download') + ' Ekspor Draf</button></div></div>' +
        '<div data-part="nilaiTabel">' + SP.parts.nilaiTabel() + '</div><div class="savebar" data-part="nilaiBar">' + SP.parts.nilaiBar() + '</div>';
    },
    after: function () { SP.setSinkron(SP.sinkron.status); }
  };

  function segarkanNilai() { SP.refresh('nilaiProgres'); SP.refresh('nilaiFilter'); SP.refresh('nilaiTabel'); SP.refresh('nilaiBar'); SP.setSinkron(SP.sinkron.status); }

  SP.changes.nilaiPg = function (el) { SP.ui.nilai.pgId = el.value; SP.ui.nilai.page = 1; SP.ui.nilai.filter = 'semua'; location.hash = '#/nilai/' + encodeURIComponent(el.value); };
  SP.changes.nilaiPer = function (el) { SP.ui.nilai.per = Number(el.value); SP.ui.nilai.page = 1; SP.refresh('nilaiTabel'); };
  SP.inputs.nilaiQ = SP.debounce(function (el) { SP.ui.nilai.q = el.value; SP.ui.nilai.page = 1; SP.refresh('nilaiTabel'); }, 150);
  SP.actions.nilaiFilter = function (el) { SP.ui.nilai.filter = el.dataset.v; SP.ui.nilai.page = 1; SP.refresh('nilaiFilter'); SP.refresh('nilaiTabel'); };
  SP.actions.nilaiHal = function (el) { SP.ui.nilai.page = Number(el.dataset.p); SP.refresh('nilaiTabel'); };
  SP.actions.nilaiSet = function (el) {
    const pg = pgNilaiAktif(); if (!pg || !SP.bolehTulis(pg)) return;
    const d = SP.draft.baca(pg.id), nim = el.dataset.nim, st = el.dataset.st;
    const baris = SP.barisRoster(pg).filter(function (r) { return r.nim === nim; })[0];
    if (baris && baris.tersimpan === st) delete d[nim]; else d[nim] = st;
    SP.draft.tulis(pg.id, d); segarkanNilai();
  };
  SP.actions.nilaiBatal = async function () {
    const pg = pgNilaiAktif(); if (!pg) return;
    if (await SP.konfirmasi({ judul: 'Batalkan perubahan?', pesan: 'Semua perubahan yang belum disimpan pada kelas ini akan dibuang.', ya: 'Ya, Batalkan', bahaya: true })) { SP.draft.hapus(pg.id); segarkanNilai(); }
  };
  SP.actions.nilaiIsiCepat = async function () {
    const pg = pgNilaiAktif(); if (!pg || !SP.bolehTulis(pg)) return;
    const kosong = SP.barisRoster(pg, SP.draft.baca(pg.id)).filter(function (r) { return r.status === 'BELUM'; });
    if (!kosong.length) return SP.toast('Tidak ada mahasiswa yang belum diisi.', 'info');
    if (!(await SP.konfirmasi({ judul: 'Isi cepat', pesan: 'Tandai <b>' + kosong.length + '</b> mahasiswa yang belum diisi sebagai <b>LULUS</b>? Anda tetap dapat mengubahnya satu per satu sebelum menyimpan.', ya: 'Tandai Lulus' }))) return;
    const d = SP.draft.baca(pg.id); kosong.forEach(function (r) { d[r.nim] = 'LULUS'; }); SP.draft.tulis(pg.id, d); segarkanNilai();
  };
  SP.actions.nilaiEkspor = function () {
    const pg = pgNilaiAktif(); if (!pg) return;
    const b = SP.barisRoster(pg, draftNow());
    SP.unduhCsv('draf-nilai-' + SP.kelasNama(pg.kelas_id).replace(/\s+/g, '_') + '-' + SP.kodeProgram(pg.bahasa, pg.semester) + '.csv', ['NIM', 'Nama', 'Status', 'Keterangan'],
      b.map(function (r) { return [r.nim, r.mhs ? r.mhs.nama : '', r.status, r.jenis]; }));
  };
  SP.actions.nilaiSimpan = async function () {
    const pg = pgNilaiAktif(); if (!pg || !SP.bolehTulis(pg)) return;
    const ubah = SP.barisRoster(pg, SP.draft.baca(pg.id)).filter(function (r) { return r.ubah; });
    if (!ubah.length) return;
    const tl = ubah.filter(function (r) { return r.status === 'TIDAK_LULUS'; });
    if (tl.length && !(await SP.konfirmasi({
      judul: 'Simpan status “Tidak Lulus”?', ya: 'Ya, Simpan', bahaya: true,
      pesan: '<b>' + tl.length + ' mahasiswa</b> akan ditetapkan <b>Tidak Lulus</b> dan otomatis tercatat <b>wajib mengulang</b> program ini pada semester ' + esc(SP.semLabel(pg.semester).toLowerCase()) + ' berikutnya.<br><br>' + tl.slice(0, 5).map(function (r) { return '• ' + esc(r.mhs ? r.mhs.nama : r.nim); }).join('<br>') + (tl.length > 5 ? '<br>… dan ' + (tl.length - 5) + ' lainnya' : '')
    }))) return;
    // 1) terapkan secara lokal (optimistic) -> UI langsung berubah
    const now = SP.hariIni() + ' ' + SP.sekarang().toLocaleTimeString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const prog = SP.kodeProgram(pg.bahasa, pg.semester);
    const lokal = ubah.filter(function (r) { return r.row || r.status !== 'BELUM'; }).map(function (r) {
      return { id: 'N-' + r.nim + '-' + prog + '-' + r.siklus, nim: r.nim, program: prog, siklus: r.siklus, tahun_ajaran: pg.tahun_ajaran, semester: pg.semester,
        kelas_id: pg.kelas_id, status: r.status, penginput: SP.S.me.email, waktu_input: r.row ? r.row.waktu_input : now, waktu_ubah: now };
    });
    SP.setNilaiLokal(lokal);
    SP.draft.hapus(pg.id);
    // 2) antrekan ke outbox -> disinkronkan di latar belakang
    SP.Outbox.tambah({ action: 'simpanNilai', data: { penugasanId: pg.id, items: ubah.map(function (r) { return { nim: r.nim, status: r.status }; }) },
      label: SP.kelasNama(pg.kelas_id) + ' · ' + labelProgramPg(pg) });
    segarkanNilai();
    SP.toast('<b>' + ubah.length + ' perubahan</b> tersimpan di perangkat. Menyinkronkan ke server…', 'ok', 2500);
    SP.Outbox.flush().then(function (ok) { if (ok) SP.toast('Nilai berhasil disinkronkan ke server ✓', 'ok', 2500); segarkanNilai(); });
  };
  SP.onOpDitolak = function () { SP.muat().catch(function () { /* diam */ }); };
})();
