// ============================================================
// SIPENA — views-laporan.js
// Wajib Mengulang & Notifikasi, Laporan & Analitik Kelulusan.
// ============================================================
(function () {
  const SP = window.SP;
  SP.ui = SP.ui || {};
  const esc = SP.esc;

  // ============================================================
  // WAJIB MENGULANG & NOTIFIKASI
  // ============================================================
  SP.ui.meng = SP.ui.meng || { tab: 'daftar', q: '', program: '', semAsal: '', status: '', page: 1 };

  function barisMeng() {
    const u = SP.ui.meng, q = u.q.toLowerCase();
    return SP.S.pengulangan.filter(function (r) { return ['WAJIB_MENGULANG', 'SEDANG_MENGULANG', 'SELESAI'].indexOf(r.status) >= 0; }).map(function (r) {
      const nilai = SP.barisNilai(r.nim, r.program, Number(r.siklus_asal));
      return { r: r, m: SP.X.mhs[r.nim], kelasAsal: SP.X.kelas[nilai ? nilai.kelas_id : ''] };
    }).filter(function (x) {
      if (!x.m) return false;
      if (u.program && SP.bahasaProgram(x.r.program) !== u.program) return false;
      if (u.semAsal && x.r.semester_asal !== u.semAsal) return false;
      if (u.status && x.r.status !== u.status) return false;
      if (q && (x.m.nim + ' ' + x.m.nama + ' ' + (x.kelasAsal ? x.kelasAsal.nama : '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return (a.r.status === 'WAJIB_MENGULANG' ? 0 : 1) - (b.r.status === 'WAJIB_MENGULANG' ? 0 : 1) || (a.r.nim < b.r.nim ? -1 : 1); });
  }

  SP.parts.mengTabel = function () {
    const u = SP.ui.meng, semua = barisMeng(), pg = SP.paginate(semua, u.page, 10); u.page = pg.page;
    if (!pg.total) return '<div class="card">' + SP.kosong('checkCircle', 'Tidak ada mahasiswa yang wajib mengulang', 'Semua mahasiswa yang dinilai telah memenuhi ketuntasan program, atau tidak ada yang cocok dengan filter.') + '</div>';
    const admin = SP.isAdmin();
    return '<div class="tbl-wrap has-foot"><table class="tbl cards compact"><thead><tr><th>Mahasiswa</th><th>Kelas asal</th><th>Program gagal</th><th>Semester asal</th><th>Jadwal pengulangan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
      pg.items.map(function (x) {
        const r = x.r;
        let aksi;
        if (r.status === 'WAJIB_MENGULANG' && admin) aksi = '<button class="btn btn-soft btn-sm" data-act="mengAtur" data-id="' + esc(r.id) + '">' + SP.icon('calendar') + ' Atur Kelas Ulang</button>';
        else if (r.status === 'SEDANG_MENGULANG') aksi = '<button class="btn btn-outline btn-sm" data-act="detailMhs" data-nim="' + esc(r.nim) + '">' + SP.icon('eye') + ' Lihat Progres</button>';
        else aksi = '<button class="btn btn-outline btn-sm" data-act="detailMhs" data-nim="' + esc(r.nim) + '">' + SP.icon('history') + ' Lihat Riwayat</button>';
        return '<tr><td data-l="Mahasiswa" class="nm"><b>' + esc(x.m.nama) + '</b><small><span class="mono">' + esc(r.nim) + '</span></small></td><td data-l="Kelas asal"><span class="chip">' + esc(x.kelasAsal ? x.kelasAsal.nama : '—') + '</span></td>' +
          '<td data-l="Program gagal"><span class="badge b-bad">' + esc(SP.PROG_SHORT[r.program]) + '</span></td><td data-l="Semester asal" style="white-space:nowrap">' + esc(SP.semLabel(r.semester_asal) + ' ' + r.ta_asal) + '</td>' +
          '<td data-l="Jadwal"><b>' + esc(SP.targetLabel(r)) + '</b>' + (r.kelas_ulang_id ? '<br><small class="muted">Kelas ' + esc(SP.kelasNama(r.kelas_ulang_id)) + '</small>' : '') + '</td><td data-l="Status">' + SP.badge(r.status) + '</td><td>' + aksi + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="tbl-foot"><span>Menampilkan ' + pg.dari + '–' + pg.sampai + ' dari ' + pg.total + ' catatan pengulangan</span>' + SP.pagerHtml('mengHal', pg) + '</div>';
  };

  SP.parts.mengNotif = function () {
    const list = SP.S.notif.slice().sort(function (a, b) { return a.waktu < b.waktu ? 1 : -1; }).slice(0, 60);
    if (!list.length) return '<div class="card">' + SP.kosong('bell', 'Belum ada notifikasi', 'Notifikasi muncul otomatis saat mahasiswa ditetapkan tidak lulus pada suatu program.') + '</div>';
    return '<div class="card card-p20">' + list.map(function (n) {
      return '<div class="row top" style="padding:12px 0;border-bottom:1px solid var(--border);' + (n.dibaca ? '' : 'background:#FFFAF5;margin:0 -20px;padding:12px 20px;') + '"><span class="avatar sm or">' + SP.icon('alert', 'sm') + '</span><div class="grow"><div>' + esc(n.pesan) + '</div><div class="muted3" style="font-size:12px;margin-top:2px">' + SP.waktu(n.waktu) + ' · ' + (n.dibaca ? 'Sudah dibaca' : '<b style="color:var(--accent)">Baru</b>') + '</div></div>' +
        (n.dibaca ? '' : '<button class="btn btn-ghost btn-sm" data-act="notifSatu" data-id="' + esc(n.id) + '">Tandai dibaca</button>') + '</div>';
    }).join('') + '</div>';
  };

  SP.views.mengulang = {
    judul: 'Wajib Mengulang & Notifikasi',
    render: function () {
      const u = SP.ui.meng, aktif = SP.pengulanganAktif();
      const total = SP.jumlahMahasiswaMengulang(), baris = SP.barisKelulusan().length;
      const arab = aktif.filter(function (r) { return SP.bahasaProgram(r.program) === 'ARAB'; }).length, ing = aktif.length - arab;
      const tunggu = aktif.filter(function (r) { return r.status === 'WAJIB_MENGULANG'; });
      const nBaru = SP.notifBelum().length;
      const opt = function (arr, sel) { return arr.map(function (x) { return '<option value="' + x[0] + '" ' + (x[0] === sel ? 'selected' : '') + '>' + x[1] + '</option>'; }).join(''); };
      return SP.header({
        crumbs: [['Dasbor', '#/dasbor'], ['Wajib Mengulang & Notifikasi']], judul: 'Wajib Mengulang & Notifikasi', desc: 'Daftar mahasiswa yang belum memenuhi kelulusan dan dijadwalkan mengulang program pada semester berikutnya.',
        aksi: '<button class="btn btn-outline" data-act="muatUlang">' + SP.icon('refresh') + ' Sinkronkan Data</button><button class="btn btn-accent" data-act="mengEkspor">' + SP.icon('download') + ' Ekspor Daftar Mengulang (.xlsx)</button>'
      }) +
        SP.callout({ tipe: 'bad', ikon: 'info', judul: 'Aturan Kebijakan Pengulangan Program', teks: 'Mahasiswa yang berstatus <b style="color:var(--danger)">Tidak Lulus</b> hanya wajib mengulang <b>program yang gagal</b> (bukan seluruh program di semester tersebut) pada semester yang bersesuaian di tahun ajaran berikutnya (contoh: Arab Ganjil diulang pada Semester 3 Ganjil). Hasil lama tetap tersimpan sebagai riwayat permanen dan kelulusan pengulangan akan memperbarui status komprehensif.' }) +
        '<div class="grid4 mt16 mb16">' +
        SP.stat({ label: 'Total wajib mengulang', nilai: total, satuan: 'Mahasiswa', ikon: 'rotate', warna: 'o', foot: '<span>' + SP.pctStr(SP.pct(total, baris)) + ' dari total mahasiswa</span>' }) +
        SP.stat({ label: 'Bahasa Arab', nilai: arab, satuan: 'Catatan', ikon: 'book', warna: 'g', foot: '<span>Program Arab (Ganjil/Genap)</span>' }) +
        SP.stat({ label: 'Bahasa Inggris', nilai: ing, satuan: 'Catatan', ikon: 'globe', warna: 'b', foot: '<span>Program Inggris (Ganjil/Genap)</span>' }) +
        SP.stat({ label: 'Menunggu penjadwalan', nilai: tunggu.length, satuan: 'Catatan', ikon: 'calendar', warna: 'n', foot: '<span>' + (SP.isAdmin() ? 'Atur kelas ulang di tabel' : 'Dijadwalkan oleh Superadmin') + '</span>' }) + '</div>' +
        '<div class="tabs"><button class="tab ' + (u.tab === 'daftar' ? 'on' : '') + '" data-act="mengTab" data-v="daftar">' + SP.icon('users') + ' Mahasiswa Wajib Mengulang <span class="n">' + total + '</span></button><button class="tab ' + (u.tab === 'notif' ? 'on' : '') + '" data-act="mengTab" data-v="notif">' + SP.icon('bell') + ' Notifikasi Otomatis Sistem ' + (nBaru ? '<span class="n new">' + nBaru + ' Baru</span>' : '') + '</button></div>' +
        (u.tab === 'daftar'
          ? '<div class="toolbar"><div class="sch">' + SP.icon('search') + '<input class="input" placeholder="Cari NIM, nama mahasiswa, kelas asal…" data-in="mengQ" value="' + esc(u.q) + '"></div>' +
            '<div class="field"><select class="select" data-ch="mengProg" aria-label="Program"><option value="">Semua Program</option>' + opt([['ARAB', 'Bahasa Arab'], ['INGGRIS', 'Bahasa Inggris']], u.program) + '</select></div>' +
            '<div class="field"><select class="select" data-ch="mengSem" aria-label="Semester asal"><option value="">Semester Asal: Semua</option>' + opt([['GANJIL', 'Ganjil'], ['GENAP', 'Genap']], u.semAsal) + '</select></div>' +
            '<div class="field"><select class="select" data-ch="mengStatus" aria-label="Status"><option value="">Status: Semua</option>' + opt([['WAJIB_MENGULANG', 'Wajib Mengulang'], ['SEDANG_MENGULANG', 'Sedang Mengulang'], ['SELESAI', 'Selesai Lulus']], u.status) + '</select></div></div><div data-part="mengTabel">' + SP.parts.mengTabel() + '</div>'
          : '<div class="grid-main"><div><div class="row between mb16"><h2 class="h2">Feed Notifikasi Otomatis Sistem</h2><button class="btn btn-outline btn-sm" data-act="notifSemua" ' + (nBaru ? '' : 'disabled') + '>' + SP.icon('check') + ' Tandai semua dibaca</button></div><div data-part="mengNotif">' + SP.parts.mengNotif() + '</div></div>' +
            '<div class="card card-p"><h2 class="h3 mb16">' + SP.icon('file') + ' Prosedur Remedial</h2>' + ['Nilai akhir diinput tutor; status <b>Tidak Lulus</b> otomatis membuat catatan wajib mengulang untuk program tersebut.', 'Superadmin menjadwalkan mahasiswa ke kelas yang memiliki tutor program serumpun pada semester target.', 'Tutor kelas tujuan menilai pengulangan; bila <b>Lulus</b>, program dihitung lulus dan riwayat lama tetap tersimpan.'].map(function (t, i) { return '<div class="row top mb16"><span class="stepno">' + (i + 1) + '</span><span class="muted" style="font-size:13.5px">' + t + '</span></div>'; }).join('') + '</div></div>');
    }
  };
  SP.actions.mengTab = function (el) { SP.ui.meng.tab = el.dataset.v; SP.renderUlang(); };
  SP.inputs.mengQ = SP.debounce(function (el) { SP.ui.meng.q = el.value; SP.ui.meng.page = 1; SP.refresh('mengTabel'); }, 150);
  SP.changes.mengProg = function (el) { SP.ui.meng.program = el.value; SP.ui.meng.page = 1; SP.refresh('mengTabel'); };
  SP.changes.mengSem = function (el) { SP.ui.meng.semAsal = el.value; SP.ui.meng.page = 1; SP.refresh('mengTabel'); };
  SP.changes.mengStatus = function (el) { SP.ui.meng.status = el.value; SP.ui.meng.page = 1; SP.refresh('mengTabel'); };
  SP.actions.mengHal = function (el) { SP.ui.meng.page = Number(el.dataset.p); SP.refresh('mengTabel'); };
  SP.actions.muatUlang = async function (el) {
    el.disabled = true;
    try { const ok = await SP.muat(); SP.toast(ok ? 'Data berhasil disinkronkan.' : 'Masih ada perubahan yang belum tersinkron.', ok ? 'ok' : 'warn'); }
    catch (e) { SP.toast(esc(e.message), 'err'); }
    el.disabled = false;
  };
  SP.actions.mengEkspor = function () {
    const b = barisMeng(); if (!b.length) return SP.toast('Tidak ada data untuk diekspor.', 'warn');
    SP.eksporXlsx('Daftar Wajib Mengulang', ['NIM', 'Nama', 'Kelas Asal', 'Program Gagal', 'Semester Asal', 'Jadwal Pengulangan', 'Status'],
      b.map(function (x) { return [x.r.nim, x.m.nama, x.kelasAsal ? x.kelasAsal.nama : '', SP.PROG_LABEL[x.r.program], SP.semLabel(x.r.semester_asal) + ' ' + x.r.ta_asal, SP.targetLabel(x.r), x.r.status]; }));
  };
  SP.actions.mengAtur = function (el) {
    const r = SP.S.pengulangan.filter(function (x) { return x.id === el.dataset.id; })[0], m = SP.X.mhs[r.nim], bahasa = SP.bahasaProgram(r.program);
    const opsi = SP.S.penugasan.filter(function (p) { return p.tahun_ajaran === r.ta_target && p.semester === r.semester_target && p.bahasa === bahasa && p.status === 'AKTIF'; });
    const h = SP.modal({
      judul: 'Atur Kelas Ulang', lebar: 520,
      isi: '<p class="mb16"><b>' + esc(m.nama) + '</b> <span class="mono muted">(' + esc(m.nim) + ')</span><br><span class="muted">Mengulang <b>' + esc(SP.PROG_LABEL[r.program]) + '</b> pada ' + esc(SP.targetLabel(r)) + '</span></p>' +
        (opsi.length ? '<div class="field"><label for="ak-k">Kelas tujuan (tutor ' + (bahasa === 'ARAB' ? 'Arab' : 'Inggris') + ' tersedia)</label><select id="ak-k" class="select">' + opsi.map(function (p) { return '<option value="' + esc(p.kelas_id) + '">' + esc(SP.kelasNama(p.kelas_id) + ' — tutor ' + SP.namaUser(p.tutor_email)) + '</option>'; }).join('') + '</select></div>'
          : SP.callout({ tipe: 'warn', ikon: 'alert', judul: 'Belum ada kelas tujuan', teks: 'Belum ada penugasan tutor ' + (bahasa === 'ARAB' ? 'Arab' : 'Inggris') + ' untuk ' + esc(SP.targetLabel(r)) + '. Buat penugasan terlebih dahulu di <a href="#/pengguna"><b>Kelola Pengguna &amp; Kelas</b></a>.' })),
      footer: '<button class="btn btn-outline" data-act="tutupModal">Batal</button>' + (opsi.length ? '<button class="btn btn-primary" data-act="mengSimpan" data-id="' + esc(r.id) + '">Jadwalkan</button>' : '')
    });
    h.el.dataset.rid = r.id;
  };
  SP.actions.mengSimpan = async function (el) {
    el.disabled = true;
    try {
      const res = await SP.api('aturKelasUlang', { pengulangan_id: el.dataset.id, kelas_id: SP.$('#ak-k').value });
      SP.terapkanHasil(res); SP.simpanCache(); SP.tutupModal(); SP.toast('Mahasiswa dijadwalkan ke kelas pengulangan.'); SP.renderUlang();
    } catch (e) { el.disabled = false; SP.toast(esc(e.message), 'err', 8000); }
  };
  SP.actions.notifSatu = function (el) {
    const id = el.dataset.id; const n = SP.S.notif.filter(function (x) { return x.id === id; })[0]; if (n) n.dibaca = true;
    SP.api('notifBaca', { ids: [id] }).catch(function () { /* tidak kritis */ }); SP.simpanCache(); SP.renderUlang(); SP.updateChrome();
  };
  SP.actions.notifSemua = function () {
    SP.S.notif.forEach(function (n) { n.dibaca = true; });
    SP.api('notifBaca', { semua: true }).catch(function () { /* tidak kritis */ }); SP.simpanCache(); SP.renderUlang(); SP.updateChrome();
  };

  // ============================================================
  // LAPORAN & ANALITIK
  // ============================================================
  SP.ui.lap = SP.ui.lap || { angkatan: '', prodi: '', kelas: '', bahasa: '', status: '', q: '', page: 1 };

  function lapBaris() {
    const u = SP.ui.lap;
    return SP.barisKelulusan().filter(function (b) {
      if (u.angkatan && b.m.angkatan !== u.angkatan) return false;
      if (u.prodi && !(b.kelas && b.kelas.prodi === u.prodi)) return false;
      if (u.kelas && !(b.kelas && b.kelas.id === u.kelas)) return false;
      if (u.status && b.akhir !== u.status) return false;
      return true;
    });
  }
  function progBahasa() { const b = SP.ui.lap.bahasa; return SP.PROGRAM.filter(function (p) { return !b || SP.bahasaProgram(p) === b; }); }
  function tutorKelas(kelasId) {
    const pg = (SP.X.pgKelas[kelasId] || []).slice().sort(function (a, b) { return (b.tahun_ajaran + b.semester) < (a.tahun_ajaran + a.semester) ? -1 : 1; });
    const o = {}; pg.forEach(function (p) { if (!o[p.bahasa]) o[p.bahasa] = SP.namaUser(p.tutor_email); });
    return o;
  }
  function perKelas(baris) {
    const g = {};
    baris.forEach(function (b) { const id = b.kelas ? b.kelas.id : '-'; (g[id] = g[id] || []).push(b); });
    return Object.keys(g).map(function (id) {
      const arr = g[id], k = SP.X.kelas[id] || { nama: 'Tanpa kelas', prodi: '' };
      const pp = {}; SP.PROGRAM.forEach(function (p) {
        let l = 0, t = 0; arr.forEach(function (b) { const s = b.kel.program[p]; if (s === 'LULUS') l++; else if (s === 'TIDAK_LULUS') t++; });
        pp[p] = { pct: SP.pct(l, l + t), l: l, t: t };
      });
      const penuh = arr.filter(function (b) { return b.akhir === 'LULUS'; }).length;
      return { id: id, k: k, n: arr.length, pp: pp, penuh: penuh, pctPenuh: SP.pct(penuh, arr.length), wajib: arr.filter(function (b) { return b.akhir === 'WAJIB_MENGULANG'; }).length, tutor: tutorKelas(id) };
    }).sort(function (a, b) { return a.k.nama < b.k.nama ? -1 : 1; });
  }

  SP.parts.lapIsi = function () {
    const u = SP.ui.lap, baris = lapBaris(), pk = perKelas(baris), target = Number(SP.set().target_kelulusan) || 80;
    const penuh = baris.filter(function (b) { return b.akhir === 'LULUS'; }).length, wajib = baris.filter(function (b) { return b.akhir === 'WAJIB_MENGULANG'; }).length, belum = baris.length - penuh - wajib;
    const wajibA = SP.pengulanganAktif().filter(function (r) { return SP.bahasaProgram(r.program) === 'ARAB'; }).length, wajibI = SP.pengulanganAktif().length - wajibA;
    const nSert = baris.filter(function (b) { const s = SP.X.sert[b.m.nim]; return s && s.file_id; }).length;
    const q = u.q.toLowerCase(), tabelData = pk.filter(function (x) { return !q || x.k.nama.toLowerCase().indexOf(q) >= 0; }), pg = SP.paginate(tabelData, u.page, 8); u.page = pg.page;
    const rataAgregat = SP.pct(penuh, baris.length), memenuhi = pk.filter(function (x) { return x.pctPenuh !== null && x.pctPenuh >= target; }).length;
    const kpi = '<div class="grid4 mb16">' +
      '<div class="card stat"><span class="cap">Persentase kelulusan penuh</span><div class="ico g">' + SP.icon('shieldCheck', 'lg') + '</div><div class="val num" style="color:var(--primary)">' + SP.pctStr(rataAgregat) + '</div><div class="muted" style="font-size:12.5px;margin-top:6px">' + SP.n(penuh) + ' dari ' + SP.n(baris.length) + ' mahasiswa</div><div class="foot"><span>Target: ' + target + '%</span><b>' + (rataAgregat !== null && rataAgregat >= target ? 'Tercapai' : 'Belum tercapai') + '</b></div></div>' +
      SP.stat({ label: 'Total wajib mengulang', nilai: SP.n(wajib), satuan: 'Mahasiswa (' + SP.pctStr(SP.pct(wajib, baris.length)) + ')', ikon: 'rotate', warna: 'o', kelas: 'bad', foot: '<span>' + wajibA + ' Arab · ' + wajibI + ' Inggris</span><span class="badge b-warn">REMEDIAL</span>' }) +
      SP.stat({ label: 'Nilai belum lengkap', nilai: SP.n(belum), satuan: 'Mahasiswa (' + SP.pctStr(SP.pct(belum, baris.length)) + ')', ikon: 'clock', warna: 'n', foot: '<span>Menunggu input tutor</span>' }) +
      SP.stat({ label: 'Sertifikat diterbitkan', nilai: SP.n(nSert), satuan: 'Berkas', ikon: 'award', warna: 'g', progress: SP.pct(nSert, penuh) || 0, foot: '<span>' + SP.pctStr(SP.pct(nSert, penuh)) + ' dari yang berhak</span>' }) + '</div>';

    const chart1 = pk.length ? pk.slice(0, 10).map(function (x) {
      const v = x.pctPenuh, ok = v !== null && v >= target;
      return '<div class="hbar ' + (ok ? '' : 'low') + '"><div class="t"><span><b>' + esc(x.k.nama) + '</b>' + (ok || v === null ? '' : '<span class="tagx" style="background:var(--warn-bg);color:var(--warn-tx)">Perhatian</span>') + '</span><span class="v">' + SP.pctStr(v) + ' (' + x.penuh + ' / ' + x.n + ' Mhs)</span></div><div class="tgtline" style="--t:' + target + '%">' + SP.prog(v || 0, ok ? '' : 'o') + '</div></div>';
    }).join('') : '<p class="muted">Belum ada data.</p>';
    const chart2 = progBahasa().map(function (p) {
      let l = 0, t = 0; baris.forEach(function (b) { const s = b.kel.program[p]; if (s === 'LULUS') l++; else if (s === 'TIDAK_LULUS') t++; });
      const tot = l + t, pl = tot ? l / tot * 100 : 0;
      return '<div class="hbar"><div class="t"><b>' + esc(SP.PROG_LABEL[p]) + '</b><span class="v"><b style="color:var(--primary)">' + Math.round(pl) + '% Lulus</b> · <b style="color:var(--accent-d)">' + (tot ? Math.round(100 - pl) : 0) + '% Mengulang</b></span></div><div class="prog" style="height:12px"><i style="width:' + pl + '%"></i><i class="o" style="width:' + (tot ? 100 - pl : 0) + '%;background:#EA580C"></i></div></div>';
    }).join('');

    const tabel = '<div class="card mt16"><div class="card-h"><div><h2 class="h2">Tabel Rekapitulasi Rinci per Kelas</h2><p class="muted" style="font-size:13px">Data agregasi capaian setiap kelas lintas gerbang program bahasa</p></div><div class="sch" style="position:relative;min-width:240px"><span style="position:absolute;left:12px;top:11px;color:var(--text3)">' + SP.icon('search') + '</span><input class="input" style="padding-left:38px" placeholder="Filter baris…" data-in="lapQ" value="' + esc(u.q) + '"></div></div>' +
      (pg.total ? '<div class="tbl-wrap" style="border:0;border-radius:0"><table class="tbl cards compact"><thead><tr><th>Kelas</th><th>Tutor pengampu (Arab / Ing)</th><th class="right">Jml Mhs</th>' + SP.PROGRAM.map(function (p) { return '<th class="right">' + esc(SP.PROG_SHORT[p]) + '</th>'; }).join('') + '<th class="right">Lulus penuh</th><th class="right">Wajib ulang</th><th>Aksi</th></tr></thead><tbody>' +
        pg.items.map(function (x) {
          const rendah = x.pctPenuh !== null && x.pctPenuh < target;
          return '<tr><td data-l="Kelas" class="nm" style="white-space:nowrap"><b><span class="dotp" style="color:' + (rendah ? 'var(--accent)' : 'var(--primary)') + '"></span> ' + esc(x.k.nama) + '</b><small>' + esc(x.k.prodi || '—') + '</small></td><td data-l="Tutor" style="font-size:12.5px">' + esc(x.tutor.ARAB || '—') + '<br><span class="muted">' + esc(x.tutor.INGGRIS || '—') + '</span></td><td data-l="Jml" class="right num">' + x.n + '</td>' +
            SP.PROGRAM.map(function (p) { const v = x.pp[p].pct; return '<td data-l="' + esc(SP.PROG_SHORT[p]) + '" class="right num" style="' + (v !== null && v < target ? 'color:var(--accent-d);font-weight:700' : '') + '">' + SP.pctStr(v) + '</td>'; }).join('') +
            '<td data-l="Lulus penuh" class="right num"><b style="' + (rendah ? 'color:var(--accent-d)' : 'color:var(--primary)') + '">' + SP.pctStr(x.pctPenuh) + '</b><br><small class="muted">' + x.penuh + ' mahasiswa</small></td><td data-l="Wajib ulang" class="right"><span class="badge ' + (x.wajib ? 'b-warn' : 'b-neutral') + '">' + x.wajib + ' org</span></td>' +
            '<td><button class="btn btn-outline btn-sm" data-act="lapRincian" data-id="' + esc(x.id) + '">Rincian ' + SP.icon('arrowRight', 'sm') + '</button></td></tr>';
        }).join('') + '</tbody></table></div><div class="tbl-foot" style="border-top:1px solid var(--border)"><span>Menampilkan ' + pg.dari + '–' + pg.sampai + ' dari ' + pg.total + ' kelas</span>' + SP.pagerHtml('lapHal', pg) + '</div>' : SP.kosong('chart', 'Tidak ada data', 'Tidak ada kelas yang cocok dengan filter.')) + '</div>';

    return kpi + '<div class="grid2"><div class="card card-p"><div class="row between mb16"><h2 class="h2">Tingkat Kelulusan per Kelas</h2><span class="muted" style="font-size:12px"><span class="dotp" style="color:var(--primary)"></span> Memenuhi target <span class="dotp" style="color:#F97316;margin-left:8px"></span> Di bawah target</span></div><p class="muted mb16" style="font-size:13px">Target kelulusan penuh institusi minimal ' + target + '%.</p>' + chart1 +
      '<p class="muted" style="font-size:12.5px;border-top:1px solid var(--border);padding-top:12px">' + SP.icon('info', 'sm') + ' ' + memenuhi + ' dari ' + pk.length + ' kelas melampaui standar minimal. Agregat: ' + SP.pctStr(rataAgregat) + '</p></div>' +
      '<div class="card card-p"><h2 class="h2 mb16">Komposisi Hasil per Program Bahasa</h2><p class="muted mb16" style="font-size:13px">Statistik gerbang kelulusan mandatori</p>' + chart2 + '<div style="margin-top:20px">' + SP.callout({ tipe: 'warn', ikon: 'alert', judul: 'Aturan Kelulusan Sertifikat', teks: 'Sertifikat mewajibkan kelulusan ke-4 program tanpa pengecualian. Mahasiswa dengan status wajib mengulang pada salah satu program tidak berhak memperoleh nomor registrasi sertifikat.' }) + '</div></div></div>' + tabel;
  };

  SP.views.laporan = {
    judul: 'Laporan',
    render: function () {
      const u = SP.ui.lap;
      const op = function (arr, sel, all) { return '<option value="">' + all + '</option>' + arr.map(function (x) { return '<option value="' + esc(x[0]) + '" ' + (x[0] === sel ? 'selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); };
      return SP.header({
        crumbs: [['Dasbor', '#/dasbor'], ['Laporan']], judul: 'Laporan & Analitik Kelulusan Program', desc: 'Rekapitulasi capaian kelulusan 4 program bahasa, statistik pengulangan, dan ekspor data akademik.',
        aksi: '<button class="btn btn-outline" data-act="lapXlsx">' + SP.icon('file') + ' Unduh Excel (.xlsx)</button><button class="btn btn-primary" data-act="lapPdf">' + SP.icon('printer') + ' Unduh PDF Resmi</button>'
      }) +
        '<div class="toolbar"><div class="field"><label>Angkatan</label><select class="select" data-ch="lapAngkatan">' + op(SP.angkatanList().map(function (a) { return [a, a]; }), u.angkatan, 'Semua Angkatan') + '</select></div>' +
        '<div class="field"><label>Prodi</label><select class="select" data-ch="lapProdi">' + op(SP.prodiList().map(function (x) { return [x, x]; }), u.prodi, 'Semua Prodi') + '</select></div>' +
        '<div class="field"><label>Kelas</label><select class="select" data-ch="lapKelas">' + op(SP.S.kelas.map(function (k) { return [k.id, k.nama]; }), u.kelas, 'Semua Kelas') + '</select></div>' +
        '<div class="field"><label>Program bahasa</label><select class="select" data-ch="lapBahasa">' + op([['ARAB', 'Bahasa Arab'], ['INGGRIS', 'Bahasa Inggris']], u.bahasa, 'Semua 4 Program') + '</select></div>' +
        '<div class="field"><label>Status kelulusan</label><select class="select" data-ch="lapStatus">' + op([['LULUS', 'Lulus'], ['WAJIB_MENGULANG', 'Wajib Mengulang'], ['BELUM_LENGKAP', 'Belum Lengkap']], u.status, 'Semua Status') + '</select></div>' +
        '<button class="btn btn-soft" style="align-self:flex-end" data-act="lapTerapkan">' + SP.icon('filter') + ' Terapkan Filter</button></div><div data-part="lapIsi">' + SP.parts.lapIsi() + '</div>';
    }
  };
  ['Angkatan', 'Prodi', 'Kelas', 'Bahasa', 'Status'].forEach(function (k) { SP.changes['lap' + k] = function (el) { SP.ui.lap[k.toLowerCase()] = el.value; SP.ui.lap.page = 1; SP.refresh('lapIsi'); }; });
  SP.actions.lapTerapkan = function () { SP.ui.lap.page = 1; SP.refresh('lapIsi'); };
  SP.inputs.lapQ = SP.debounce(function (el) { SP.ui.lap.q = el.value; SP.ui.lap.page = 1; SP.refresh('lapIsi'); }, 200);
  SP.actions.lapHal = function (el) { SP.ui.lap.page = Number(el.dataset.p); SP.refresh('lapIsi'); };
  SP.actions.lapRincian = function (el) { SP.ui.kel.kelas = el.dataset.id === '-' ? '' : el.dataset.id; SP.ui.kel.page = 1; location.hash = '#/kelulusan'; };
  function dataLap() {
    const pk = perKelas(lapBaris());
    return { h: ['Kelas', 'Prodi', 'Tutor Arab', 'Tutor Inggris', 'Jumlah Mhs'].concat(SP.PROGRAM.map(function (p) { return SP.PROG_SHORT[p] + ' (% lulus)'; })).concat(['Lulus Penuh (%)', 'Wajib Mengulang']),
      r: pk.map(function (x) { return [x.k.nama, x.k.prodi || '', x.tutor.ARAB || '', x.tutor.INGGRIS || '', x.n].concat(SP.PROGRAM.map(function (p) { return SP.pctStr(x.pp[p].pct); })).concat([SP.pctStr(x.pctPenuh), x.wajib]); }) };
  }
  SP.actions.lapXlsx = function () { const d = dataLap(); if (!d.r.length) return SP.toast('Tidak ada data.', 'warn'); SP.eksporXlsx('Laporan Kelulusan', d.h, d.r); };
  SP.actions.lapPdf = function () { const d = dataLap(); if (!d.r.length) return SP.toast('Tidak ada data.', 'warn'); SP.cetakTabel('Laporan & Analitik Kelulusan Program', d.h, d.r, SP.set().nama_lembaga + ' · ' + SP.tgl(SP.hariIni(), true)); };
})();
