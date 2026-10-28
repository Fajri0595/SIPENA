// ============================================================
// SIPENA — logic.js
// State aplikasi + aturan bisnis sisi klien (cermin dari Logika.gs).
// Semua perhitungan berjalan lokal sehingga UI terasa instan;
// server tetap menjadi sumber kebenaran dan memvalidasi ulang.
// ============================================================
(function () {
  const SP = window.SP;

  SP.PROGRAM = ['ARB_GJL', 'ING_GJL', 'ARB_GNP', 'ING_GNP'];
  SP.PROG_LABEL = { ARB_GJL: 'Bahasa Arab Ganjil', ING_GJL: 'Bahasa Inggris Ganjil', ARB_GNP: 'Bahasa Arab Genap', ING_GNP: 'Bahasa Inggris Genap' };
  SP.PROG_SHORT = { ARB_GJL: 'Arab Ganjil', ING_GJL: 'Inggris Ganjil', ARB_GNP: 'Arab Genap', ING_GNP: 'Inggris Genap' };
  SP.PROG_KODE = { ARB_GJL: 'ARB-1', ING_GJL: 'ENG-1', ARB_GNP: 'ARB-2', ING_GNP: 'ENG-2' };
  SP.kodeProgram = function (bahasa, sem) { return (bahasa === 'ARAB' ? 'ARB' : 'ING') + '_' + (sem === 'GANJIL' ? 'GJL' : 'GNP'); };
  SP.bahasaProgram = function (p) { return p.indexOf('ARB') === 0 ? 'ARAB' : 'INGGRIS'; };
  SP.bahasaLabel = function (b) { return b === 'ARAB' ? 'Bahasa Arab' : b === 'INGGRIS' ? 'Bahasa Inggris' : '—'; };
  SP.taBerikut = function (ta) { const a = String(ta).split('/').map(Number); return (a[0] + 1) + '/' + (a[1] + 1); };

  function baru() {
    return { me: null, pengaturan: {}, pengguna: [], kelas: [], penugasan: [], pengganti: [], km: [], mahasiswa: [], nilai: [], pengulangan: [], notif: [], sert: [], mutasi: [], meta: {} };
  }
  SP.S = baru();
  SP.X = {};

  SP.terapkanData = function (d) {
    const S = SP.S;
    S.me = d.me; S.pengaturan = d.pengaturan || {}; S.pengguna = d.pengguna || []; S.kelas = d.kelas || [];
    S.penugasan = d.penugasan || []; S.pengganti = d.pengganti || []; S.km = d.kelasMahasiswa || [];
    S.mahasiswa = d.mahasiswa || []; S.nilai = (d.nilai || []).map(function (r) { return Object.assign({}, r, { siklus: Number(r.siklus) }); });
    S.pengulangan = d.pengulangan || []; S.notif = d.notifikasi || []; S.sert = d.sertifikat || []; S.mutasi = d.mutasi || [];
    S.meta = d.meta || {};
    if (S.meta.waktu) { const t = Date.parse(String(S.meta.waktu).replace(' ', 'T') + '+07:00'); if (!isNaN(t)) SP.selisihWaktu = t - Date.now(); }
    SP.indeks();
  };
  SP.dataMentah = function () {
    const S = SP.S;
    return { me: S.me, pengaturan: S.pengaturan, pengguna: S.pengguna, kelas: S.kelas, penugasan: S.penugasan, pengganti: S.pengganti,
      kelasMahasiswa: S.km, mahasiswa: S.mahasiswa, nilai: S.nilai, pengulangan: S.pengulangan, notifikasi: S.notif, sertifikat: S.sert, mutasi: S.mutasi, meta: S.meta };
  };

  function olah(arr, kunci) { const o = {}; arr.forEach(function (r) { o[r[kunci]] = r; }); return o; }
  function grup(arr, kunci) { const o = {}; arr.forEach(function (r) { (o[r[kunci]] = o[r[kunci]] || []).push(r); }); return o; }

  SP.indeks = function () {
    const S = SP.S, X = (SP.X = {});
    X.kelas = olah(S.kelas, 'id'); X.pg = olah(S.penugasan, 'id'); X.mhs = olah(S.mahasiswa, 'nim'); X.user = olah(S.pengguna, 'email');
    X.nilai = grup(S.nilai, 'nim'); X.peng = grup(S.pengulangan, 'nim'); X.km = grup(S.km, 'nim'); X.sert = olah(S.sert, 'nim');
    X.pgn = grup(S.pengganti, 'penugasan_id'); X.pgKelas = grup(S.penugasan, 'kelas_id');
    X.kel = {}; X.roster = {}; X.baris = null;
  };

  SP.isAdmin = function () { return !!(SP.S.me && SP.S.me.peran === 'SUPERADMIN'); };
  SP.set = function () { return SP.S.pengaturan; };
  SP.hari = function () { return (SP.S.meta && SP.S.meta.hari) || SP.hariIni(); };
  SP.namaUser = function (email) { const u = SP.X.user[email]; return u ? u.nama : email; };
  SP.kelasNama = function (id) { const k = SP.X.kelas[id]; return k ? k.nama : '—'; };

  // ---------- Kelulusan ----------
  SP.statusProgram = function (nim, prog) {
    let best = null;
    (SP.X.nilai[nim] || []).forEach(function (r) {
      if (r.program !== prog || r.status === 'BELUM' || !r.status) return;
      if (!best || r.siklus > best.siklus) best = r;
    });
    return best ? best.status : 'BELUM';
  };
  SP.kelulusan = function (nim) {
    const c = SP.X.kel[nim]; if (c) return c;
    const per = {};
    SP.PROGRAM.forEach(function (p) { per[p] = SP.statusProgram(nim, p); });
    const v = SP.PROGRAM.map(function (p) { return per[p]; });
    let akhir = 'BELUM_LENGKAP';
    if (v.every(function (x) { return x === 'LULUS'; })) akhir = 'LULUS';
    else if (v.some(function (x) { return x === 'TIDAK_LULUS'; })) akhir = 'WAJIB_MENGULANG';
    return (SP.X.kel[nim] = { program: per, akhir: akhir });
  };

  // ---------- Kelas, roster, siklus ----------
  function urutSem(r) { return r.tahun_ajaran + (r.semester === 'GENAP' ? '2' : '1'); }
  SP.kelasTerkini = function (nim) {
    const rows = (SP.X.km[nim] || []).filter(function (r) { return r.jenis !== 'PENGULANGAN'; }).sort(function (a, b) { return urutSem(b) < urutSem(a) ? -1 : 1; });
    return rows.length ? SP.X.kelas[rows[0].kelas_id] || null : null;
  };
  SP.roster = function (pg) {
    if (SP.X.roster[pg.id]) return SP.X.roster[pg.id];
    const prog = SP.kodeProgram(pg.bahasa, pg.semester);
    const rows = SP.S.km.filter(function (r) {
      return r.kelas_id === pg.kelas_id && r.tahun_ajaran === pg.tahun_ajaran && r.semester === pg.semester && (r.jenis !== 'PENGULANGAN' || r.program === prog);
    });
    return (SP.X.roster[pg.id] = { program: prog, rows: rows });
  };
  SP.siklusUntuk = function (nim, prog, pg, jenis) {
    const rec = (SP.X.peng[nim] || []).filter(function (r) {
      return r.program === prog && r.ta_target === pg.tahun_ajaran && r.semester_target === pg.semester && r.status !== 'DIBATALKAN';
    });
    if (rec.length) return Math.max.apply(null, rec.map(function (r) { return Number(r.siklus_asal); })) + 1;
    return jenis === 'PENGULANGAN' ? 2 : 1;
  };
  SP.barisNilai = function (nim, prog, siklus) {
    return (SP.X.nilai[nim] || []).filter(function (r) { return r.program === prog && r.siklus === siklus; })[0] || null;
  };
  // Daftar mahasiswa pada penugasan beserta status tersimpan & efektif (dengan draft)
  SP.barisRoster = function (pg, draft) {
    const ro = SP.roster(pg);
    return ro.rows.map(function (km) {
      const siklus = SP.siklusUntuk(km.nim, ro.program, pg, km.jenis);
      const row = SP.barisNilai(km.nim, ro.program, siklus);
      const tersimpan = row ? row.status : 'BELUM';
      const efektif = draft && draft[km.nim] !== undefined ? draft[km.nim] : tersimpan;
      return { nim: km.nim, mhs: SP.X.mhs[km.nim], jenis: km.jenis, siklus: siklus, row: row, tersimpan: tersimpan, status: efektif, ubah: efektif !== tersimpan };
    }).sort(function (a, b) { return a.nim < b.nim ? -1 : 1; });
  };
  SP.kemajuan = function (pg, draft) {
    const b = SP.barisRoster(pg, draft);
    const c = { total: b.length, lulus: 0, tl: 0, belum: 0, mengulang: 0 };
    b.forEach(function (r) { if (r.status === 'LULUS') c.lulus++; else if (r.status === 'TIDAK_LULUS') c.tl++; else c.belum++; if (r.jenis === 'PENGULANGAN') c.mengulang++; });
    c.terisi = c.lulus + c.tl; c.pct = SP.pct(c.terisi, c.total);
    return c;
  };

  // ---------- Peran & izin ----------
  SP.pgAktif = function (pg) { const s = SP.set(); return pg.status === 'AKTIF' && pg.tahun_ajaran === s.tahun_ajaran_aktif && pg.semester === s.semester_aktif; };
  SP.penggantiAktif = function (pg) {
    const me = SP.S.me.email, h = SP.hari();
    return (SP.X.pgn[pg.id] || []).filter(function (r) { return r.pengganti_email === me && r.status === 'AKTIF' && r.mulai <= h && h <= r.selesai; })[0] || null;
  };
  SP.peran = function (pg) {
    if (pg.tutor_email === SP.S.me.email && pg.status === 'AKTIF') return 'UTAMA';
    return SP.penggantiAktif(pg) ? 'PENGGANTI' : null;
  };
  SP.milikSaya = function (pg) {
    const me = SP.S.me.email;
    return pg.tutor_email === me || (SP.X.pgn[pg.id] || []).some(function (r) { return r.pengganti_email === me; });
  };
  SP.bolehTulis = function (pg) {
    if (SP.isAdmin()) return true;
    if (!SP.peran(pg) || !SP.pgAktif(pg)) return false;
    return SP.set().mode_penilaian !== 'TERKUNCI';
  };
  SP.daftarPenugasanSaya = function () {
    return SP.isAdmin() ? SP.S.penugasan.slice() : SP.S.penugasan.filter(SP.milikSaya);
  };
  SP.penugasanAktifSaya = function () { return SP.daftarPenugasanSaya().filter(SP.pgAktif); };
  SP.bolehCetakUI = function () {
    if (SP.isAdmin()) return true;
    const m = SP.S.me;
    return !!(m && (m.izin_cetak === '1' || m.izin_cetak === 'YA' || m.izin_cetak === true));
  };
  SP.kelasCetak = function () {
    if (SP.isAdmin() || SP.bolehCetakUI()) return SP.S.kelas;
    return [];
  };

  // ---------- Pengulangan ----------
  SP.pengulanganAktif = function () {
    return SP.S.pengulangan.filter(function (r) { return r.status === 'WAJIB_MENGULANG' || r.status === 'SEDANG_MENGULANG'; });
  };
  SP.jumlahMahasiswaMengulang = function () {
    const s = {}; SP.pengulanganAktif().forEach(function (r) { s[r.nim] = true; }); return Object.keys(s).length;
  };
  SP.targetLabel = function (r) { return SP.semLabel(r.semester_target) + ' ' + r.ta_target; };

  // ---------- Notifikasi ----------
  SP.notifBelum = function () { return SP.S.notif.filter(function (n) { return !n.dibaca; }); };

  // ---------- Baris gabungan untuk Status Kelulusan & Laporan ----------
  SP.barisKelulusan = function () {
    if (SP.X.baris) return SP.X.baris;
    return (SP.X.baris = SP.S.mahasiswa.map(function (m) {
      const k = SP.kelasTerkini(m.nim);
      return { m: m, kelas: k, kel: SP.kelulusan(m.nim), akhir: SP.kelulusan(m.nim).akhir };
    }).sort(function (a, b) { return a.m.nim < b.m.nim ? -1 : 1; }));
  };

  // ---------- Penggabungan hasil dari server ----------
  function gabung(arr, rows, kunci) {
    rows.forEach(function (r) {
      const i = arr.findIndex(function (x) { return kunci(x) === kunci(r); });
      if (i >= 0) arr[i] = Object.assign({}, arr[i], r); else arr.push(r);
    });
  }
  SP.terapkanHasil = function (res) {
    if (!res) return;
    const S = SP.S;
    if (res.nilai) gabung(S.nilai, res.nilai.map(function (r) { return Object.assign({}, r, { siklus: Number(r.siklus) }); }), function (x) { return x.id; });
    if (res.pengulangan) gabung(S.pengulangan, [].concat(res.pengulangan), function (x) { return x.id; });
    if (res.notifikasi) res.notifikasi.forEach(function (n) { if (!S.notif.some(function (x) { return x.id === n.id; })) S.notif.push(n); });
    if (res.kelasMahasiswa) gabung(S.km, [].concat(res.kelasMahasiswa), function (x) { return x.id; });
    if (res.mahasiswa) gabung(S.mahasiswa, [].concat(res.mahasiswa), function (x) { return x.nim; });
    if (res.mutasi) S.mutasi.push(res.mutasi);
    if (res.sertifikat) gabung(S.sert, [].concat(res.sertifikat), function (x) { return x.nim; });
    if (res.pengganti) gabung(S.pengganti, [].concat(res.pengganti), function (x) { return x.id; });
    if (res.pengaturan) S.pengaturan = res.pengaturan;
    if (res.kuotaEmail) S.meta.kuotaEmail = res.kuotaEmail;
    SP.indeks();
  };
  SP.setNilaiLokal = function (rows) {
    gabung(SP.S.nilai, rows, function (x) { return x.id; });
    SP.indeks();
  };

  // ---------- Draft nilai (tersimpan otomatis di perangkat) ----------
  SP.draft = {
    k: function (id) { return 'sipena_draft_' + id; },
    baca: function (id) { try { const v = JSON.parse(localStorage.getItem(SP.draft.k(id)) || 'null'); return v ? v.data : {}; } catch (e) { return {}; } },
    waktu: function (id) { try { const v = JSON.parse(localStorage.getItem(SP.draft.k(id)) || 'null'); return v ? v.waktu : ''; } catch (e) { return ''; } },
    tulis: function (id, data) {
      try {
        if (!Object.keys(data).length) localStorage.removeItem(SP.draft.k(id));
        else localStorage.setItem(SP.draft.k(id), JSON.stringify({ data: data, waktu: SP.jamWIB() }));
      } catch (e) { /* penyimpanan penuh: abaikan */ }
    },
    hapus: function (id) { try { localStorage.removeItem(SP.draft.k(id)); } catch (e) { /* abaikan */ } }
  };

  // ---------- Helper tampilan data ----------
  SP.daftarTahunAjaran = function () {
    const s = {};
    const cfg = SP.set();
    const taAktif = (cfg && cfg.tahun_ajaran_aktif) || '';
    if (taAktif) s[taAktif] = true;
    (SP.S.penugasan || []).forEach(function (p) { if (p.tahun_ajaran) s[p.tahun_ajaran] = true; });
    (SP.S.km || []).forEach(function (r) { if (r.tahun_ajaran) s[r.tahun_ajaran] = true; });
    (SP.S.nilai || []).forEach(function (r) { if (r.tahun_ajaran) s[r.tahun_ajaran] = true; });
    (SP.S.mutasi || []).forEach(function (r) { if (r.tahun_ajaran) s[r.tahun_ajaran] = true; });
    (SP.S.sert || []).forEach(function (r) { if (r.tahun_ajaran) s[r.tahun_ajaran] = true; });
    (SP.S.pengulangan || []).forEach(function (r) { if (r.ta_asal) s[r.ta_asal] = true; if (r.ta_target) s[r.ta_target] = true; });

    let base = new Date().getFullYear();
    if (/^(\d{4})\/\d{4}$/.test(taAktif)) {
      base = Math.max(base, parseInt(RegExp.$1, 10));
    }
    // Sediakan hingga 10 tahun ke belakang dan 1 tahun ke depan
    for (let y = base + 1; y >= base - 10; y--) {
      s[y + '/' + (y + 1)] = true;
    }
    return Object.keys(s).sort().reverse();
  };
  SP.opsiSemester = function () {
    const s = {};
    const taList = SP.daftarTahunAjaran();
    taList.forEach(function (ta) {
      s[ta + '|GENAP'] = true;
      s[ta + '|GANJIL'] = true;
    });
    (SP.S.penugasan || []).forEach(function (p) { if (p.tahun_ajaran && p.semester) s[p.tahun_ajaran + '|' + p.semester] = true; });
    const a = SP.set();
    if (a.tahun_ajaran_aktif && a.semester_aktif) s[a.tahun_ajaran_aktif + '|' + a.semester_aktif] = true;

    return Object.keys(s).sort(function (a, b) {
      const pa = a.split('|'), pb = b.split('|');
      if (pa[0] !== pb[0]) return pa[0] < pb[0] ? 1 : -1;
      return pa[1] === 'GENAP' ? -1 : 1;
    }).map(function (k) {
      const t = k.split('|');
      return { v: k, label: SP.semLabel(t[1]) + ' ' + t[0] };
    });
  };
  SP.angkatanList = function () {
    const s = {};
    SP.S.mahasiswa.forEach(function (m) { if (m.angkatan) s[m.angkatan] = true; });
    SP.S.kelas.forEach(function (k) { if (k.angkatan) s[k.angkatan] = true; });
    let base = new Date().getFullYear();
    const cfg = SP.set();
    if (cfg && cfg.tahun_ajaran_aktif && /^(\d{4})/.test(cfg.tahun_ajaran_aktif)) {
      base = Math.max(base, parseInt(RegExp.$1, 10));
    }
    for (let y = base; y >= base - 10; y--) s[String(y)] = true;
    return Object.keys(s).sort().reverse();
  };
  SP.prodiList = function () {
    const s = {}; SP.S.kelas.forEach(function (k) { if (k.prodi) s[k.prodi] = true; });
    return Object.keys(s).sort();
  };
  SP.tutorKelas = function (kelasId, ta, sem) {
    const o = { ARAB: null, INGGRIS: null };
    (SP.X.pgKelas[kelasId] || []).forEach(function (p) { if (p.tahun_ajaran === ta && p.semester === sem && p.status === 'AKTIF') o[p.bahasa] = p; });
    return o;
  };
})();
