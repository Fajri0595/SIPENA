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
  SP.tahunAwal = function (ta) {
    const m = String(ta || '').match(/\d{4}/);
    return m ? parseInt(m[0], 10) : 0;
  };
  SP.kodeUrutSem = function (ta, sem) {
    const th = SP.tahunAwal(ta);
    return th * 2 + (String(sem || '').toUpperCase() === 'GENAP' ? 1 : 0);
  };
  SP.urutSemAsal = function (r) {
    if (r && r.ta_asal && r.semester_asal) {
      return SP.kodeUrutSem(r.ta_asal, r.semester_asal);
    }
    if (r && r.nim && r.program) {
      const n = SP.barisNilai ? SP.barisNilai(r.nim, r.program, Number(r.siklus_asal || 1)) : null;
      if (n && n.tahun_ajaran && n.semester) {
        return SP.kodeUrutSem(n.tahun_ajaran, n.semester);
      }
    }
    return 0;
  };
  SP.semesterProgram = function (p) { return String(p || '').slice(-3) === 'GJL' ? 'GANJIL' : 'GENAP'; };
  SP.semesterWajibUlang = function (r) {
    if (!r) return 'GANJIL';
    if (r.program) return SP.semesterProgram(r.program);
    return r.semester_asal === 'GENAP' ? 'GENAP' : 'GANJIL';
  };
  SP.targetSemDefinitif = function (r) {
    if (!r) return { ta: '', sem: '' };
    const semWajib = SP.semesterWajibUlang(r);
    const thAsal = SP.tahunAwal(r.ta_asal);
    if ((r.status === 'SEDANG_MENGULANG' || r.status === 'SELESAI') && r.ta_target && r.semester_target) {
      return { ta: r.ta_target, sem: r.semester_target };
    }
    let ta = r.ta_target;
    let sem = r.semester_target;
    if (!ta || (thAsal > 0 && SP.tahunAwal(ta) <= thAsal)) {
      ta = r.ta_asal ? SP.taBerikut(r.ta_asal) : (SP.set() ? SP.set().tahun_ajaran_aktif : '');
    }
    if (!sem || sem !== semWajib) {
      sem = semWajib;
    }
    return { ta: ta, sem: sem };
  };

  function baru() {
    return { me: null, pengaturan: {}, pengguna: [], kelas: [], penugasan: [], pengganti: [], km: [], mahasiswa: [], nilai: [], pengulangan: [], notif: [], sert: [], mutasi: [], meta: {} };
  }
  SP.S = baru();
  SP.X = {};

  SP.terapkanData = function (d) {
    const S = SP.S;
    S.me = d.me; S.pengaturan = d.pengaturan || {}; S.pengguna = d.pengguna || []; S.kelas = d.kelas || [];
    S.penugasan = d.penugasan || []; S.pengganti = d.pengganti || []; S.km = d.kelasMahasiswa || [];
    S.mahasiswa = d.mahasiswa || []; S.nilai = (d.nilai || []).map(function (r) { return Object.assign({}, r, { siklus: Number(r.siklus), angka: r.angka !== undefined && r.angka !== null ? String(r.angka) : '' }); });
    if (S.pengaturan && !S.pengaturan.kkm) S.pengaturan.kkm = '75';
    S.pengulangan = d.pengulangan || []; S.notif = d.notifikasi || []; S.sert = d.sertifikat || []; S.mutasi = d.mutasi || [];
    S.meta = d.meta || {};
    if (S.meta.waktu) { const t = Date.parse(String(S.meta.waktu).replace(' ', 'T') + '+07:00'); if (!isNaN(t)) SP.selisihWaktu = t - Date.now(); }
    try {
      const patches = JSON.parse(localStorage.getItem('sipena_meng_patch') || '{}');
      Object.keys(patches).forEach(function (pid) {
        const pt = patches[pid];
        const rec = S.pengulangan.filter(function (x) { return x.id === pid; })[0];
        if (!rec || (rec.status !== 'WAJIB_MENGULANG' && rec.status !== 'SEDANG_MENGULANG')) return;
        if (rec.ta_target === pt.ta_target && rec.semester_target === pt.semester_target && (rec.kelas_ulang_id || '') === (pt.kelas_ulang_id || '')) {
          delete patches[pid];
          return;
        }
        rec.ta_target = pt.ta_target;
        rec.semester_target = pt.semester_target;
        rec.kelas_ulang_id = pt.kelas_ulang_id || '';
        rec.status = pt.kelas_ulang_id ? 'SEDANG_MENGULANG' : 'WAJIB_MENGULANG';
        S.km = S.km.filter(function (km) {
          return !(km.jenis === 'PENGULANGAN' && km.nim === rec.nim && km.program === rec.program);
        });
        if (pt.kelas_ulang_id) {
          S.km.push({
            id: 'E-' + rec.nim + '-' + pt.ta_target + '-' + pt.semester_target + '-' + rec.program,
            nim: rec.nim,
            kelas_id: pt.kelas_ulang_id,
            tahun_ajaran: pt.ta_target,
            semester: pt.semester_target,
            jenis: 'PENGULANGAN',
            program: rec.program,
            kelas_asal: ''
          });
        }
        if (pt.penugasan && !S.penugasan.some(function (p) { return p.id === pt.penugasan.id; })) {
          S.penugasan.push(pt.penugasan);
        }
      });
      localStorage.setItem('sipena_meng_patch', JSON.stringify(patches));
    } catch (e) { /* abaikan */ }
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
  SP.barisProgramTerbaik = function (nim, prog) {
    let best = null;
    (SP.X.nilai[nim] || []).forEach(function (r) {
      if (r.program !== prog || r.status === 'BELUM' || !r.status) return;
      if (!best || r.siklus > best.siklus) best = r;
    });
    return best;
  };
  SP.statusProgram = function (nim, prog) {
    const best = SP.barisProgramTerbaik(nim, prog);
    return best ? best.status : 'BELUM';
  };
  SP.nilaiAngkaProgram = function (nim, prog) {
    const row = SP.barisProgramTerbaik(nim, prog);
    if (!row) return '';
    if (row.angka !== undefined && row.angka !== null && row.angka !== '') return String(row.angka);
    if (row.status === 'LULUS') return String((SP.set() && SP.set().kkm) || 75);
    return '';
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

  SP.infoPredikatNilai = function (angka, kkm) {
    const n = Number(angka);
    const batas = Number(kkm) || 75;
    if (angka === '' || angka === null || angka === undefined || isNaN(n)) {
      return { angka: '—', huruf: '—', predikat: '—' };
    }
    const fmt = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
    if (n >= 85) return { angka: fmt, huruf: 'A', predikat: 'Sangat Memuaskan' };
    if (n >= batas) return { angka: fmt, huruf: 'B', predikat: 'Memuaskan' };
    if (n >= 60) return { angka: fmt, huruf: 'C', predikat: 'Cukup' };
    return { angka: fmt, huruf: 'D', predikat: 'Kurang' };
  };

  SP.rincianSertifikatMhs = function (nim, cfgOverride) {
    const s = Object.assign({}, SP.set() || {}, cfgOverride || {});
    const kkm = Number(s.kkm) || 75;
    const mAsli = nim && SP.X && SP.X.mhs ? SP.X.mhs[nim] : null;
    const isContoh = !mAsli;
    const m = mAsli || {
      nim: '2310601001',
      nama: 'MUHAMMAD RIDWAN MALIK',
      angkatan: (s.tahun_ajaran_aktif || '2026/2027').slice(0, 4) || '2026',
      email: 'ridwan@mhs.ac.id'
    };
    const klsObj = mAsli ? SP.kelasTerkini(m.nim) : null;
    const namaKelas = klsObj ? klsObj.nama : (isContoh ? 'PAI A' : '—');
    const namaProdi = (klsObj && klsObj.prodi) ? klsObj.prodi : (isContoh ? 'Pendidikan Agama Islam' : 'Program Sarjana');
    const sert = (mAsli && SP.X && SP.X.sert) ? SP.X.sert[m.nim] : null;
    const thNow = String(new Date().getFullYear());
    const blnNow = String(new Date().getMonth() + 1).padStart(2, '0');
    const fmtNo = String(s.format_nomor || 'CERT/ARB-ENG/{TAHUN}/{URUT}')
      .replace('{TAHUN}', thNow)
      .replace('{BULAN}', blnNow)
      .replace('{URUT}', isContoh ? '001' : '___');
    const nomor = (sert && sert.nomor) ? sert.nomor : fmtNo;
    const tanggal = (sert && sert.tanggal_cetak) ? sert.tanggal_cetak : SP.hariIni();

    const sampleScores = { ARB_GJL: 88, ING_GJL: 84, ARB_GNP: 90, ING_GNP: 86 };
    const metaProg = [
      { kode: 'ARB_GJL', kodeLabel: 'ARB-GJL', nama: 'Bahasa Arab Semester Ganjil', sub: 'Kemahiran Bahasa Arab I (Al-\'Arabiyyah I)', bahasa: 'Bahasa Arab', semester: 'Ganjil' },
      { kode: 'ING_GJL', kodeLabel: 'ING-GJL', nama: 'Bahasa Inggris Semester Ganjil', sub: 'Kemahiran Bahasa Inggris I (English I)', bahasa: 'Bahasa Inggris', semester: 'Ganjil' },
      { kode: 'ARB_GNP', kodeLabel: 'ARB-GNP', nama: 'Bahasa Arab Semester Genap', sub: 'Kemahiran Bahasa Arab II (Al-\'Arabiyyah II)', bahasa: 'Bahasa Arab', semester: 'Genap' },
      { kode: 'ING_GNP', kodeLabel: 'ING-GNP', nama: 'Bahasa Inggris Semester Genap', sub: 'Kemahiran Bahasa Inggris II (English II)', bahasa: 'Bahasa Inggris', semester: 'Genap' }
    ];

    let sum = 0, count = 0;
    const programRows = metaProg.map(function (mp, idx) {
      const st = mAsli ? SP.statusProgram(m.nim, mp.kode) : 'LULUS';
      const rawAngka = mAsli ? SP.nilaiAngkaProgram(m.nim, mp.kode) : String(sampleScores[mp.kode]);
      const valNum = rawAngka !== '' ? Number(rawAngka) : (st === 'LULUS' ? kkm : NaN);
      if (!isNaN(valNum)) { sum += valNum; count++; }
      const info = SP.infoPredikatNilai(isNaN(valNum) ? '' : valNum, kkm);
      return {
        no: idx + 1,
        kode: mp.kode,
        kodeLabel: mp.kodeLabel,
        nama: mp.nama,
        sub: mp.sub,
        bahasa: mp.bahasa,
        semester: mp.semester,
        kkm: kkm,
        angka: info.angka,
        huruf: info.huruf,
        predikat: info.predikat,
        status: st === 'LULUS' ? 'LULUS' : (st === 'TIDAK_LULUS' ? 'TIDAK LULUS' : 'BELUM')
      };
    });

    const rataNum = count ? Math.round((sum / count) * 100) / 100 : kkm;
    const infoAkhir = SP.infoPredikatNilai(rataNum, kkm);
    const rataFmt = Number.isInteger(rataNum) ? String(rataNum) : rataNum.toFixed(2).replace(/\.?0+$/, '');
    const frontendBase = (s.frontend_url || (typeof location !== 'undefined' ? location.origin + location.pathname : '')).replace(/\/+$/, '');
    const sigHmac = (sert && sert.sig_hmac) ? sert.sig_hmac : (isContoh ? 'a1b2c3d4e5f60718' : '');
    const qSig = sigHmac ? ('?sig=' + encodeURIComponent(sigHmac)) : '';
    const urlVerif = frontendBase ? (frontendBase + '/#/verifikasi/' + encodeURIComponent(nomor) + qSig) : (nomor + qSig);

    return {
      isContoh: isContoh,
      m: m,
      kelas: namaKelas,
      prodi: namaProdi,
      angkatan: m.angkatan || '—',
      nomor: nomor,
      tanggal: tanggal,
      tanggalLabel: SP.tgl(tanggal, true),
      lembaga: s.nama_lembaga || 'PUSAT PENGEMBANGAN BAHASA',
      kkm: kkm,
      programRows: programRows,
      totalAngka: count ? String(Math.round(sum * 100) / 100) : '—',
      rataAngka: count ? rataFmt : '—',
      hurufAkhir: infoAkhir.huruf,
      predikatAkhir: infoAkhir.predikat,
      ttd1: {
        nama: s.ttd1_nama || '(Nama Pejabat 1)',
        jabatan: s.ttd1_jabatan || 'Pejabat Penandatangan 1',
        nip: s.ttd1_nip ? ('NIP. ' + s.ttd1_nip) : ''
      },
      ttd2: {
        nama: s.ttd2_nama || '(Nama Pejabat 2)',
        jabatan: s.ttd2_jabatan || 'Kepala Pusat Pengembangan Bahasa',
        nip: s.ttd2_nip ? ('NIP. ' + s.ttd2_nip) : ''
      },
      urlVerifikasi: urlVerif,
      sigHmac: sigHmac,
      hashPdf: (sert && sert.hash_pdf) || ''
    };
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
      return r.kelas_id === pg.kelas_id && r.tahun_ajaran === pg.tahun_ajaran && r.semester === pg.semester &&
        (r.jenis !== 'PENGULANGAN' || r.program === prog);
    });
    return (SP.X.roster[pg.id] = { program: prog, rows: rows });
  };
  SP.siklusUntuk = function (nim, prog, pg, jenis) {
    const rec = (SP.X.peng[nim] || []).filter(function (r) {
      return r.program === prog && r.status !== 'DIBATALKAN';
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
      const progMhs = (km.jenis === 'PENGULANGAN' && km.program) ? km.program : ro.program;
      const siklus = SP.siklusUntuk(km.nim, progMhs, pg, km.jenis);
      const row = SP.barisNilai(km.nim, progMhs, siklus);
      const tersimpan = row ? row.status : 'BELUM';
      const angkaTersimpan = row && row.angka !== undefined && row.angka !== null ? String(row.angka) : '';
      const dItem = draft ? draft[km.nim] : undefined;
      let efektif = tersimpan;
      let angkaEfektif = angkaTersimpan;
      if (dItem !== undefined) {
        if (typeof dItem === 'object' && dItem !== null) {
          efektif = dItem.status !== undefined ? dItem.status : tersimpan;
          angkaEfektif = dItem.angka !== undefined && dItem.angka !== null ? String(dItem.angka) : angkaTersimpan;
        } else {
          efektif = dItem;
        }
      }
      const ubah = efektif !== tersimpan || String(angkaEfektif) !== String(angkaTersimpan);
      return { nim: km.nim, mhs: SP.X.mhs[km.nim], jenis: km.jenis, progMhs: progMhs, siklus: siklus, row: row, tersimpan: tersimpan, status: efektif, angka: angkaEfektif, ubah: ubah };
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
  SP.targetLabel = function (r) {
    const t = SP.targetSemDefinitif(r);
    return SP.semLabel(t.sem) + ' ' + t.ta;
  };

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
    if (res.nilai) gabung(S.nilai, res.nilai.map(function (r) { return Object.assign({}, r, { siklus: Number(r.siklus), angka: r.angka !== undefined && r.angka !== null ? String(r.angka) : '' }); }), function (x) { return x.id; });
    if (res.pengulangan) gabung(S.pengulangan, [].concat(res.pengulangan), function (x) { return x.id; });
    if (res.notifikasi) res.notifikasi.forEach(function (n) { if (!S.notif.some(function (x) { return x.id === n.id; })) S.notif.push(n); });
    if (res.kelas) gabung(S.kelas, [].concat(res.kelas), function (x) { return x.id; });
    if (res.penugasan) gabung(S.penugasan, [].concat(res.penugasan), function (x) { return x.id; });
    if (res.hapusKelasMahasiswaIds) {
      const rm = {};
      [].concat(res.hapusKelasMahasiswaIds).forEach(function (id) { rm[id] = true; });
      S.km = S.km.filter(function (x) { return !rm[x.id]; });
    }
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

  // ---------- Normalisasi & pencocokan kelas ----------
  SP.bersihkanNamaKelas = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/^(kelas|rombel)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  SP.kunciKelas = function (s) {
    return SP.bersihkanNamaKelas(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  };
  SP.cariKelasByNama = function (nama, daftar, angkatan) {
    const bersih = SP.bersihkanNamaKelas(nama);
    if (!bersih) return null;
    const list = daftar || SP.S.kelas || [];
    const low = bersih.toLowerCase();
    if (angkatan) {
      for (let i = 0; i < list.length; i++) {
        if (SP.bersihkanNamaKelas(list[i].nama).toLowerCase() === low && String(list[i].angkatan) === String(angkatan)) return list[i];
      }
    }
    for (let i = 0; i < list.length; i++) {
      if (SP.bersihkanNamaKelas(list[i].nama).toLowerCase() === low) return list[i];
    }
    const kunci = SP.kunciKelas(bersih);
    if (!kunci) return null;
    if (angkatan) {
      for (let j = 0; j < list.length; j++) {
        if (SP.kunciKelas(list[j].nama) === kunci && String(list[j].angkatan) === String(angkatan)) return list[j];
      }
    }
    for (let j = 0; j < list.length; j++) {
      if (SP.kunciKelas(list[j].nama) === kunci) return list[j];
    }
    return null;
  };
  const KAMUS_PRODI = {
    ES: 'Ekonomi Syariah', EKSYAR: 'Ekonomi Syariah',
    PS: 'Perbankan Syariah', PBS: 'Perbankan Syariah',
    AKS: 'Akuntansi Syariah', AS: 'Akuntansi Syariah',
    MBS: 'Manajemen Bisnis Syariah',
    MZW: 'Manajemen Zakat dan Wakaf', ZAWA: 'Manajemen Zakat dan Wakaf',
    PAI: 'Pendidikan Agama Islam',
    PBA: 'Pendidikan Bahasa Arab',
    TBI: 'Tadris Bahasa Inggris', PBI: 'Pendidikan Bahasa Inggris',
    TBIN: 'Tadris Bahasa Indonesia', PBIN: 'Pendidikan Bahasa Indonesia',
    TM: 'Tadris Matematika', TMTK: 'Tadris Matematika', PMA: 'Pendidikan Matematika',
    TIPA: 'Tadris IPA', TBIO: 'Tadris Biologi', TFIS: 'Tadris Fisika', TKIM: 'Tadris Kimia',
    TIPS: 'Tadris IPS',
    MPI: 'Manajemen Pendidikan Islam',
    PGMI: 'Pendidikan Guru Madrasah Ibtidaiyah',
    PIAUD: 'Pendidikan Islam Anak Usia Dini', PGRA: 'Pendidikan Guru Raudhatul Athfal',
    BKPI: 'Bimbingan dan Konseling Pendidikan Islam', BKI: 'Bimbingan dan Konseling Islam',
    HKI: 'Hukum Keluarga Islam',
    HES: 'Hukum Ekonomi Syariah',
    HTN: 'Hukum Tata Negara',
    HPI: 'Hukum Pidana Islam',
    KPI: 'Komunikasi dan Penyiaran Islam',
    MD: 'Manajemen Dakwah',
    PMI: 'Pengembangan Masyarakat Islam',
    IAT: 'Ilmu Al-Qur\'an dan Tafsir',
    ILHA: 'Ilmu Hadis', IH: 'Ilmu Hadis',
    AFI: 'Aqidah dan Filsafat Islam',
    SPI: 'Sejarah Peradaban Islam',
    TP: 'Tasawuf dan Psikoterapi',
    SAA: 'Studi Agama-Agama',
    IPII: 'Ilmu Perpustakaan dan Informasi Islam',
    PSI: 'Psikologi Islam',
    BSA: 'Bahasa dan Sastra Arab',
    SI: 'Sistem Informasi', TI: 'Teknologi Informasi'
  };
  SP.tebakProdi = function (namaKelas) {
    const bersih = SP.bersihkanNamaKelas(namaKelas);
    if (!bersih) return '';
    const m = bersih.match(/^([A-Za-z]+)/);
    if (!m) return '';
    const pref = m[1].toUpperCase();
    const ada = (SP.S.kelas || []).filter(function (k) {
      const km = SP.bersihkanNamaKelas(k.nama).match(/^([A-Za-z]+)/);
      return km && km[1].toUpperCase() === pref && k.prodi;
    })[0];
    if (ada) return ada.prodi;
    return KAMUS_PRODI[pref] || '';
  };
  SP.saranProdiList = function () {
    const s = {};
    (SP.prodiList() || []).forEach(function (p) { s[p] = true; });
    Object.keys(KAMUS_PRODI).forEach(function (k) { s[KAMUS_PRODI[k]] = true; });
    return Object.keys(s).sort();
  };
})();
