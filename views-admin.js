// ============================================================
// SIPENA — views-admin.js
// Tutor Pengganti, Kelola Pengguna & Kelas, Pindah Kelas,
// Pengaturan & Log Aktivitas.
// ============================================================
(function () {
  const SP = window.SP;
  SP.ui = SP.ui || {};
  const esc = SP.esc;
  const opt = function (arr, sel) { return arr.map(function (x) { return '<option value="' + esc(x[0]) + '" ' + (String(x[0]) === String(sel) ? 'selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); };
  function tambahHari(iso, n) { const d = new Date(iso + 'T00:00:00+07:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); }

  // ============================================================
  // TUTOR PENGGANTI
  // ============================================================
  SP.ui.pgn = SP.ui.pgn || { tab: 'semua' };

  function statusPengganti(r) {
    const h = SP.hari();
    if (r.status === 'DICABUT') return 'DICABUT';
    if (r.selesai < h) return 'BERAKHIR';
    if (r.mulai > h) return 'TERJADWAL';
    return 'BERJALAN';
  }
  function badgePgn(s) { return s === 'TERJADWAL' ? SP.badge('ANTRE', 'Terjadwal') : SP.badge(s === 'DICABUT' ? 'DIBATALKAN' : s); }
  function daftarPengganti() {
    return SP.S.pengganti.filter(function (r) {
      const pg = SP.X.pg[r.penugasan_id]; if (!pg) return false;
      return SP.isAdmin() || pg.tutor_email === SP.S.me.email || r.pengganti_email === SP.S.me.email;
    }).sort(function (a, b) { return a.mulai < b.mulai ? 1 : -1; });
  }
  function penugasanBolehTunjuk() {
    return SP.S.penugasan.filter(function (p) { return p.status === 'AKTIF' && SP.pgAktif(p) && (SP.isAdmin() || p.tutor_email === SP.S.me.email); });
  }
  SP.parts.pgnTabel = function () {
    const u = SP.ui.pgn, all = daftarPengganti();
    const rows = all.filter(function (r) { const s = statusPengganti(r); return u.tab === 'semua' || (u.tab === 'jalan' && (s === 'BERJALAN' || s === 'TERJADWAL')) || (u.tab === 'akhir' && s === 'BERAKHIR') || (u.tab === 'batal' && s === 'DICABUT'); });
    const n = function (f) { return all.filter(function (r) { return f(statusPengganti(r)); }).length; };
    const tab = function (v, l, c) { return '<button class="fchip ' + (u.tab === v ? 'on' : '') + '" data-act="pgnTab" data-v="' + v + '">' + l + ' <span class="n">' + c + '</span></button>'; };
    return '<div class="filters">' + tab('semua', 'Semua', all.length) + tab('jalan', 'Sedang Berjalan', n(function (s) { return s === 'BERJALAN' || s === 'TERJADWAL'; })) + tab('akhir', 'Berakhir', n(function (s) { return s === 'BERAKHIR'; })) + tab('batal', 'Dibatalkan', n(function (s) { return s === 'DICABUT'; })) + '</div>' +
      (rows.length ? '<div class="tbl-wrap"><table class="tbl cards compact"><thead><tr><th>Kelas &amp; program</th><th>Tutor utama</th><th>Tutor pengganti</th><th>Periode berlaku</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        rows.map(function (r) {
          const pg = SP.X.pg[r.penugasan_id], st = statusPengganti(r), sisa = SP.selisihHari(r.selesai);
          const dapatCabut = r.status === 'AKTIF' && st !== 'BERAKHIR' && (SP.isAdmin() || pg.tutor_email === SP.S.me.email);
          return '<tr><td data-l="Kelas" class="nm"><b>' + esc(SP.kelasNama(pg.kelas_id)) + '</b><small>' + esc(SP.bahasaLabel(pg.bahasa) + ' · ' + SP.semLabel(pg.semester) + ' ' + pg.tahun_ajaran) + '</small></td>' +
            '<td data-l="Tutor utama"><span class="row gap8"><span class="avatar sm lt">' + esc(SP.inisial(SP.namaUser(pg.tutor_email))) + '</span>' + esc(SP.namaUser(pg.tutor_email)) + '</span></td>' +
            '<td data-l="Pengganti"><span class="row gap8"><span class="avatar sm">' + esc(SP.inisial(SP.namaUser(r.pengganti_email))) + '</span><b>' + esc(SP.namaUser(r.pengganti_email)) + '</b></span>' + (r.pengganti_email === SP.S.me.email ? '<small class="muted"> (Anda)</small>' : '') + '</td>' +
            '<td data-l="Periode">' + SP.tgl(r.mulai) + ' – ' + SP.tgl(r.selesai) + (st === 'BERJALAN' || st === 'TERJADWAL' ? '<br><b style="color:var(--danger);font-size:12px">Sisa ' + Math.max(0, sisa) + ' Hari</b>' : '') + '</td><td data-l="Status">' + badgePgn(st) + '</td>' +
            '<td>' + (dapatCabut ? '<button class="btn btn-ghost btn-sm" style="color:var(--danger)" data-act="pgnCabut" data-id="' + esc(r.id) + '">' + SP.icon('x', 'sm') + ' Cabut</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card">' + SP.kosong('swap', 'Belum ada penunjukan', 'Penunjukan tutor pengganti akan tampil di sini.') + '</div>');
  };
  SP.parts.pgnForm = function () {
    const f = SP.ui.pgn.f || (SP.ui.pgn.f = { pg: '', tutor: '', mulai: SP.hariIni(), selesai: tambahHari(SP.hariIni(), 30), alasan: '', ok: false });
    const pgs = penugasanBolehTunjuk();
    if (!f.pg || !pgs.some(function (p) { return p.id === f.pg; })) f.pg = pgs[0] ? pgs[0].id : '';
    const pg = SP.X.pg[f.pg];
    const kandidat = pg ? SP.S.pengguna.filter(function (u) { return u.status === 'AKTIF' && u.bahasa === pg.bahasa && u.email !== pg.tutor_email; }) : [];
    if (!kandidat.some(function (u) { return u.email === f.tutor; })) f.tutor = kandidat[0] ? kandidat[0].email : '';
    const beban = f.tutor ? SP.S.penugasan.filter(function (p) { return p.tutor_email === f.tutor && SP.pgAktif(p); }).length : 0;
    if (!pgs.length) return SP.kosong('lock', 'Tidak ada penugasan aktif', 'Penunjukan pengganti hanya untuk penugasan aktif milik Anda' + (SP.isAdmin() ? '' : ' (sebagai tutor utama)') + '.');
    return '<div class="stack"><div class="field"><label for="pf-pg">Pilih kelas &amp; program penugasan <span class="req">*</span></label><select id="pf-pg" class="select" data-ch="pgnF" data-k="pg">' + opt(pgs.map(function (p) { return [p.id, SP.kelasNama(p.kelas_id) + ' · ' + SP.bahasaLabel(p.bahasa) + ' (' + SP.semLabel(p.semester) + ' ' + p.tahun_ajaran + ')']; }), f.pg) + '</select><div class="help">Menampilkan penugasan aktif ' + (SP.isAdmin() ? 'semua tutor' : 'yang Anda ampu') + '.</div></div>' +
      '<div class="field"><label for="pf-tt">Pilih tutor pengganti (serumpun) <span class="req">*</span></label>' + (kandidat.length ? '<select id="pf-tt" class="select" data-ch="pgnF" data-k="tutor">' + opt(kandidat.map(function (u) { return [u.email, u.nama]; }), f.tutor) + '</select><div class="row gap8 mt8"><span class="badge b-ok">' + SP.icon('check') + ' Tersedia</span><span class="muted" style="font-size:12.5px">Beban ajar saat ini: ' + beban + ' kelas</span></div>' : '<div class="callout warn"><div class="ic">' + SP.icon('alert') + '</div><div class="tx">Belum ada tutor ' + (pg.bahasa === 'ARAB' ? 'Arab' : 'Inggris') + ' lain yang aktif.</div></div>') + '</div>' +
      (kandidat.length ? '<div class="callout ok" style="padding:12px 14px"><div class="ic" style="width:32px;height:32px">' + SP.icon('shieldCheck') + '</div><div class="tx"><b>Kualifikasi serumpun:</b> Bahasa ' + (pg.bahasa === 'ARAB' ? 'Arab' : 'Inggris') + ' memenuhi syarat kebijakan lembaga.</div></div>' : '') +
      '<div class="grid2"><div class="field"><label for="pf-m">Tanggal mulai <span class="req">*</span></label><input id="pf-m" type="date" class="input" data-ch="pgnF" data-k="mulai" value="' + esc(f.mulai) + '"></div><div class="field"><label for="pf-s">Tanggal berakhir <span class="req">*</span></label><input id="pf-s" type="date" class="input" data-ch="pgnF" data-k="selesai" value="' + esc(f.selesai) + '"></div></div>' +
      '<div class="field"><label for="pf-a">Alasan penunjukan / catatan dinas <span class="req">*</span></label><textarea id="pf-a" class="textarea" data-in="pgnA" placeholder="Mis. Cuti sakit / tugas institusi di luar kota…">' + esc(f.alasan) + '</textarea></div>' +
      '<label class="chk"><input type="checkbox" data-ch="pgnF" data-k="ok" ' + (f.ok ? 'checked' : '') + '><span style="font-size:13px">Saya mengonfirmasi bahwa tutor pengganti bertanggung jawab penuh atas input nilai selama periode ini.</span></label>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn btn-outline" data-act="pgnReset">Batal</button><button class="btn btn-primary" data-act="pgnSimpan" ' + (kandidat.length ? '' : 'disabled') + '>' + SP.icon('shieldCheck') + ' Simpan &amp; Beri Akses</button></div></div>';
  };
  SP.parts.pgnAudit = function () {
    const ev = [];
    daftarPengganti().forEach(function (r) {
      const pg = SP.X.pg[r.penugasan_id];
      ev.push({ w: r.dibuat_pada, t: 'Penerbitan penunjukan tutor pengganti', d: SP.namaUser(r.pengganti_email) + ' ditunjuk menggantikan ' + SP.namaUser(pg.tutor_email) + ' pada ' + SP.kelasNama(pg.kelas_id) + ' (' + SP.bahasaLabel(pg.bahasa) + ') · ' + SP.tgl(r.mulai) + ' – ' + SP.tgl(r.selesai) + '. Alasan: ' + r.alasan, o: false });
      if (r.dicabut_pada) ev.push({ w: r.dicabut_pada, t: 'Pencabutan akses pengganti', d: 'Akses ' + SP.namaUser(r.pengganti_email) + ' pada ' + SP.kelasNama(pg.kelas_id) + ' dicabut.', o: true });
    });
    ev.sort(function (a, b) { return a.w < b.w ? 1 : -1; });
    if (!ev.length) return '<p class="muted">Belum ada aktivitas penugasan.</p>';
    return '<div class="timeline">' + ev.slice(0, 8).map(function (e) { return '<div class="tl ' + (e.o ? 'o' : '') + '"><span class="when">' + SP.waktu(e.w) + '</span><b>' + esc(e.t) + '</b><div class="muted" style="font-size:13px;margin-top:2px">' + esc(e.d) + '</div></div>'; }).join('') + '</div>';
  };
  SP.views.pengganti = {
    judul: 'Tutor Pengganti',
    render: function () {
      const arab = SP.S.pengguna.filter(function (u) { return u.status === 'AKTIF' && u.bahasa === 'ARAB'; }).length, ing = SP.S.pengguna.filter(function (u) { return u.status === 'AKTIF' && u.bahasa === 'INGGRIS'; }).length;
      return SP.header({ crumbs: [['Dasbor', '#/dasbor'], ['Tutor Pengganti']], judul: 'Pengelolaan Tutor Pengganti', desc: 'Pelimpahan akses sementara bimbingan kelas antartutor serumpun bahasa bila tutor utama berhalangan.' }) +
        SP.callout({ tipe: 'warn', edge: true, ikon: 'shield', judul: 'Aturan Kebijakan Lembaga', teks: 'Penunjukan tutor pengganti <b>hanya dapat dilakukan antartutor pada rumpun bahasa yang sama</b> (Arab ↔ Arab, Inggris ↔ Inggris). Hak akses input nilai berlaku otomatis pada rentang tanggal penunjukan dan dapat dicabut sewaktu-waktu oleh tutor utama bersangkutan atau Superadmin.' }) +
        '<div class="grid-main mt16" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)"><div><div class="card card-p mb16"><div class="row between mb16"><h2 class="h2">' + SP.icon('swap') + ' Daftar Penugasan Pengganti Aktif &amp; Riwayat</h2></div><div data-part="pgnTabel">' + SP.parts.pgnTabel() + '</div></div>' +
        '<div class="card card-p"><h2 class="h2 mb16">' + SP.icon('history') + ' Jejak Audit Aktivitas Penugasan</h2><div data-part="pgnAudit">' + SP.parts.pgnAudit() + '</div></div></div>' +
        '<div><div class="card card-p"><h2 class="h2 mb16"><span class="dotp" style="color:var(--accent)"></span> Formulir Penunjukan Baru</h2><div data-part="pgnForm">' + SP.parts.pgnForm() + '</div></div>' +
        '<div class="card card-p20 row between mt16"><span class="row gap8">' + SP.icon('users', 'lg') + '<span><b>Pool tutor siap ditugaskan</b><br><span class="muted" style="font-size:13px">' + arab + ' Tutor Bahasa Arab · ' + ing + ' Tutor Bahasa Inggris</span></span></span></div></div></div>';
    }
  };
  SP.actions.pgnTab = function (el) { SP.ui.pgn.tab = el.dataset.v; SP.refresh('pgnTabel'); };
  SP.changes.pgnF = function (el) {
    const f = SP.ui.pgn.f, k = el.dataset.k; f[k] = el.type === 'checkbox' ? el.checked : el.value;
    if (k === 'pg' || k === 'tutor') SP.refresh('pgnForm');
  };
  SP.inputs.pgnA = function (el) { SP.ui.pgn.f.alasan = el.value; };
  SP.actions.pgnReset = function () { SP.ui.pgn.f = null; SP.refresh('pgnForm'); };
  SP.actions.pgnSimpan = async function (el) {
    const f = SP.ui.pgn.f;
    if (!f.alasan.trim()) return SP.toast('Alasan penunjukan wajib diisi.', 'warn');
    if (!f.ok) return SP.toast('Centang konfirmasi tanggung jawab terlebih dahulu.', 'warn');
    el.disabled = true;
    try {
      const r = await SP.api('penggantiTunjuk', { penugasan_id: f.pg, pengganti_email: f.tutor, mulai: f.mulai, selesai: f.selesai, alasan: f.alasan });
      SP.terapkanHasil(r); SP.simpanCache(); SP.ui.pgn.f = null; SP.toast('Akses tutor pengganti berhasil diberikan.'); SP.renderUlang();
    } catch (e) { el.disabled = false; SP.toast(esc(e.message), 'err', 8000); }
  };
  SP.actions.pgnCabut = async function (el) {
    if (!(await SP.konfirmasi({ judul: 'Cabut akses pengganti?', pesan: 'Tutor pengganti tidak lagi dapat menginput nilai pada penugasan ini. Riwayat tetap tersimpan.', ya: 'Ya, Cabut', bahaya: true }))) return;
    try { const r = await SP.api('penggantiCabut', { id: el.dataset.id }); SP.terapkanHasil(r); SP.simpanCache(); SP.toast('Akses pengganti dicabut.'); SP.renderUlang(); }
    catch (e) { SP.toast(esc(e.message), 'err'); }
  };

  // ============================================================
  // KELOLA PENGGUNA, KELAS & PENUGASAN
  // ============================================================
  SP.ui.pgu = SP.ui.pgu || { tab: 'tutor', q: '', bahasa: '', status: '', urut: 'login', page: 1, sem: '' };

  function semTerpilih() { const s = SP.set(); return (SP.ui.pgu.sem || (s.tahun_ajaran_aktif + '|' + s.semester_aktif)).split('|'); }
  function matriks() {
    const t = semTerpilih(), klasAktif = SP.S.kelas.filter(function (k) { return k.status !== 'ARSIP'; });
    return klasAktif.map(function (k) {
      const tk = SP.tutorKelas(k.id, t[0], t[1]);
      return { k: k, arab: tk.ARAB, ing: tk.INGGRIS, valid: !!(tk.ARAB && tk.INGGRIS) };
    });
  }
  function kelasDiampu(email) {
    const t = semTerpilih();
    return SP.S.penugasan.filter(function (p) { return p.tutor_email === email && p.tahun_ajaran === t[0] && p.semester === t[1] && p.status === 'AKTIF'; }).map(function (p) { return SP.kelasNama(p.kelas_id); });
  }
  SP.parts.pguTabel = function () {
    const u = SP.ui.pgu, q = u.q.toLowerCase();
    let list = SP.S.pengguna.filter(function (x) { return (!u.bahasa || x.bahasa === u.bahasa) && (!u.status || x.status === u.status) && (!q || (x.nama + ' ' + x.email + ' ' + (x.nip || '')).toLowerCase().indexOf(q) >= 0); });
    list.sort(function (a, b) { return u.urut === 'nama' ? (a.nama < b.nama ? -1 : 1) : ((b.terakhir_login || '') < (a.terakhir_login || '') ? -1 : 1); });
    const pg = SP.paginate(list, u.page, 8); u.page = pg.page;
    return '<div class="tbl-wrap has-foot"><table class="tbl cards compact"><thead><tr><th>Nama tutor</th><th>Surel Google</th><th>Rumpun bahasa</th><th>Kelas diampu (semester ini)</th><th>Status</th><th>Terakhir login</th><th>Aksi</th></tr></thead><tbody>' +
      (pg.items.length ? pg.items.map(function (x) {
        const kd = kelasDiampu(x.email), mati = x.status !== 'AKTIF';
        return '<tr style="' + (mati ? 'opacity:.65' : '') + '"><td data-l="Nama"><span class="row gap8"><span class="avatar ' + (x.bahasa === 'INGGRIS' ? 'lt' : '') + '">' + esc(SP.inisial(x.nama)) + '</span><span class="nm"><b>' + esc(x.nama) + '</b><br><small class="muted">' + (x.peran === 'SUPERADMIN' ? 'Superadmin' : 'Tutor') + (x.nip ? ' · NIP. ' + esc(x.nip) : '') + '</small></span></span></td>' +
          '<td data-l="Surel" class="mono" style="font-size:12px">' + esc(x.email) + '</td><td data-l="Rumpun">' + (x.bahasa ? '<span class="chip ' + (x.bahasa === 'ARAB' ? 'ok' : '') + '">' + SP.icon(x.bahasa === 'ARAB' ? 'edit' : 'globe', 'sm') + ' ' + esc(SP.bahasaLabel(x.bahasa)) + '</span>' : '<span class="muted3">—</span>') + '</td>' +
          '<td data-l="Kelas">' + (kd.length ? kd.map(function (n) { return '<span class="chip" style="margin:1px">' + esc(n) + '</span>'; }).join('') : '<i class="muted3">Tidak ada kelas</i>') + '</td>' +
          '<td data-l="Status"><label class="row gap8"><span class="switch"><input type="checkbox" data-ch="pguToggle" data-email="' + esc(x.email) + '" ' + (x.status === 'AKTIF' ? 'checked' : '') + ' ' + (x.email === SP.S.me.email ? 'disabled' : '') + ' aria-label="Aktif"><span></span></span><b style="font-size:11px;letter-spacing:.06em">' + (x.status === 'AKTIF' ? 'AKTIF' : 'NONAKTIF') + '</b></label></td>' +
          '<td data-l="Login" class="muted" style="font-size:12.5px">' + (x.terakhir_login ? SP.waktu(x.terakhir_login) : 'Belum pernah') + '</td><td><button class="btn btn-outline btn-sm" data-act="pguEditTutor" data-email="' + esc(x.email) + '">' + SP.icon('pencil', 'sm') + ' Edit</button></td></tr>';
      }).join('') : '<tr><td colspan="7">' + SP.kosong('users', 'Belum ada tutor', 'Klik “Daftarkan Tutor Baru” untuk menambahkan.') + '</td></tr>') + '</tbody></table></div><div class="tbl-foot"><span>Menampilkan ' + pg.dari + '–' + pg.sampai + ' dari <b>' + pg.total + '</b> pengguna terdaftar</span>' + SP.pagerHtml('pguHal', pg) + '</div>';
  };
  SP.parts.pguKelas = function () {
    const t = semTerpilih();
    const rows = SP.S.kelas.slice().sort(function (a, b) { return a.nama < b.nama ? -1 : 1; });
    const jml = function (id) { const s = {}; SP.S.km.forEach(function (r) { if (r.kelas_id === id && r.tahun_ajaran === t[0] && r.semester === t[1] && r.jenis !== 'PENGULANGAN') s[r.nim] = true; }); return Object.keys(s).length; };
    return '<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Nama kelas</th><th>Program studi</th><th>Angkatan</th><th class="right">Mahasiswa (' + esc(SP.semLabel(t[1]) + ' ' + t[0]) + ')</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (k) { return '<tr><td data-l="Kelas"><b>' + esc(k.nama) + '</b></td><td data-l="Prodi">' + esc(k.prodi || '—') + '</td><td data-l="Angkatan" class="num">' + esc(k.angkatan) + '</td><td data-l="Mahasiswa" class="right num">' + jml(k.id) + '</td><td data-l="Status">' + SP.badge(k.status === 'ARSIP' ? 'ARSIP' : 'AKTIF') + '</td><td><button class="btn btn-outline btn-sm" data-act="pguEditKelas" data-id="' + esc(k.id) + '">' + SP.icon('pencil', 'sm') + ' Edit</button></td></tr>'; }).join('') : '<tr><td colspan="6">' + SP.kosong('book', 'Belum ada kelas', 'Klik “Tambah Kelas Baru”.') + '</td></tr>') + '</tbody></table></div>';
  };
  SP.parts.pguMatriks = function () {
    const m = matriks(), t = semTerpilih();
    return '<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Kelas</th><th>Tutor Bahasa Arab</th><th>Tutor Bahasa Inggris</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
      (m.length ? m.map(function (x) {
        return '<tr><td data-l="Kelas"><b>' + esc(x.k.nama) + '</b><br><small class="muted">' + esc(x.k.prodi || '') + '</small></td><td data-l="Tutor Arab">' + (x.arab ? '<span class="chip ok">AR</span> ' + esc(SP.namaUser(x.arab.tutor_email)) : '<span class="badge b-bad">' + SP.icon('alert') + 'Belum ada</span>') + '</td>' +
          '<td data-l="Tutor Inggris">' + (x.ing ? '<span class="chip">EN</span> ' + esc(SP.namaUser(x.ing.tutor_email)) : '<span class="badge b-bad">' + SP.icon('alert') + 'Belum ada</span>') + '</td><td data-l="Status">' + (x.valid ? SP.badge('VALID') : SP.badge('TIMPANG')) + '</td>' +
          '<td><button class="btn btn-outline btn-sm" data-act="pguPenugasan" data-id="' + esc(x.k.id) + '">' + SP.icon('pencil', 'sm') + ' ' + (x.valid ? 'Ubah' : 'Atur') + '</button></td></tr>';
      }).join('') : '<tr><td colspan="5">' + SP.kosong('book', 'Belum ada kelas', 'Buat kelas terlebih dahulu.') + '</td></tr>') + '</tbody></table></div>' + (m.length ? '<p class="muted mt8" style="font-size:12.5px">Semester: <b>' + esc(SP.semLabel(t[1]) + ' ' + t[0]) + '</b></p>' : '');
  };
  SP.views.pengguna = {
    judul: 'Kelola Pengguna & Kelas',
    render: function () {
      const u = SP.ui.pgu, m = matriks(), valid = m.filter(function (x) { return x.valid; }).length, slotTerisi = m.reduce(function (a, x) { return a + (x.arab ? 1 : 0) + (x.ing ? 1 : 0); }, 0);
      const aktifN = SP.S.pengguna.filter(function (x) { return x.status === 'AKTIF'; }).length, semOps = SP.opsiSemester(), s = SP.set(), t = semTerpilih();
      const tabs = [['tutor', 'users', 'Daftar Akun Tutor (' + aktifN + ' Aktif)'], ['kelas', 'building', 'Master Kelas (' + SP.S.kelas.length + ' Kelas)'], ['penugasan', 'checkCircle', 'Matriks Penugasan Tutor']];
      const pct = m.length ? Math.round(valid / m.length * 100) : 0;
      return SP.header({
        crumbs: [['Dasbor', '#/dasbor'], ['Kelola Pengguna & Kelas']], judul: 'Kelola Pengguna, Kelas & Penugasan', desc: 'Manajemen akun Google tutor, konfigurasi master kelas, dan penugasan 1 tutor Arab &amp; 1 tutor Inggris per kelas per semester.',
        aksi: '<button class="btn btn-outline" data-act="pguTambahKelas">' + SP.icon('plus') + ' Tambah Kelas Baru</button><button class="btn btn-primary" data-act="pguTambahTutor">' + SP.icon('userPlus') + ' Daftarkan Tutor Baru</button>'
      }) +
        '<div class="tabbox">' + tabs.map(function (x) { return '<button class="tab ' + (u.tab === x[0] ? 'on' : '') + '" data-act="pguTab" data-v="' + x[0] + '">' + SP.icon(x[1]) + ' ' + x[2] + (x[0] === 'penugasan' ? ' <span class="badge ' + (pct === 100 ? 'b-ok' : 'b-warn') + '">' + (pct === 100 ? 'Lengkap 100%' : pct + '%') + '</span>' : '') + '</button>'; }).join('') + '</div>' +
        '<div class="grid3 mb16">' + SP.stat({ label: 'Total tutor terdaftar', nilai: SP.S.pengguna.length, satuan: 'Pengguna', ikon: 'users', foot: '<span><span class="dotp" style="color:var(--primary)"></span> ' + aktifN + ' Aktif · ' + (SP.S.pengguna.length - aktifN) + ' Nonaktif</span>' }) +
        SP.stat({ label: 'Kelas aktif semester ini', nilai: m.length, satuan: 'Kelas rombel', ikon: 'cap', warna: 'g', foot: '<span>' + SP.esc(SP.semLabel(t[1]) + ' ' + t[0]) + '</span>' }) +
        SP.stat({ label: 'Validasi penugasan tutor', nilai: slotTerisi + ' / ' + m.length * 2, satuan: 'Slot terisi', ikon: 'checkCircle', warna: pct === 100 ? 'g' : 'o', foot: '<span>' + valid + ' dari ' + m.length + ' kelas valid (1 Arab + 1 Inggris)</span>' }) + '</div>' +
        SP.callout({ ikon: 'shieldCheck', judul: 'Validasi Mandatori Konsorsium Bahasa', teks: 'Setiap kelas wajib memiliki tepat <b>1 Tutor Bahasa Arab dan 1 Tutor Bahasa Inggris</b> per semester. Sistem memvalidasi saat penugasan dibuat dan menandai kelas yang berstatus timpang.' }) +
        '<div class="mt16">' + (u.tab === 'tutor' ? '<div class="toolbar"><div class="sch">' + SP.icon('search') + '<input class="input" placeholder="Cari nama tutor, surel Google, NIP…" data-in="pguQ" value="' + esc(u.q) + '"></div><div class="field"><select class="select" data-ch="pguBahasa" aria-label="Rumpun"><option value="">Rumpun: Semua</option>' + opt([['ARAB', 'Bahasa Arab'], ['INGGRIS', 'Bahasa Inggris']], u.bahasa) + '</select></div><div class="field"><select class="select" data-ch="pguStatus" aria-label="Status"><option value="">Status: Semua</option>' + opt([['AKTIF', 'Aktif'], ['NONAKTIF', 'Nonaktif']], u.status) + '</select></div><div class="field"><select class="select" data-ch="pguUrut" aria-label="Urutkan">' + opt([['login', 'Urutkan: Login terakhir'], ['nama', 'Urutkan: Nama']], u.urut) + '</select></div><button class="btn btn-outline" data-act="pguUnduh">' + SP.icon('download') + ' Unduh Data</button></div><div data-part="pguTabel">' + SP.parts.pguTabel() + '</div>' :
        '<div class="field mb16" style="max-width:300px"><label for="pg-sem">Semester</label><select id="pg-sem" class="select" data-ch="pguSem">' + semOps.map(function (o) { return '<option value="' + o.v + '" ' + (o.v === (t[0] + '|' + t[1]) ? 'selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select></div>' + (u.tab === 'kelas' ? '<div data-part="pguKelas">' + SP.parts.pguKelas() + '</div>' : '<div data-part="pguMatriks">' + SP.parts.pguMatriks() + '</div>')) + '</div>';
    }
  };
  SP.actions.pguTab = function (el) { SP.ui.pgu.tab = el.dataset.v; SP.renderUlang(); };
  SP.inputs.pguQ = SP.debounce(function (el) { SP.ui.pgu.q = el.value; SP.ui.pgu.page = 1; SP.refresh('pguTabel'); }, 150);
  SP.changes.pguBahasa = function (el) { SP.ui.pgu.bahasa = el.value; SP.ui.pgu.page = 1; SP.refresh('pguTabel'); };
  SP.changes.pguStatus = function (el) { SP.ui.pgu.status = el.value; SP.ui.pgu.page = 1; SP.refresh('pguTabel'); };
  SP.changes.pguUrut = function (el) { SP.ui.pgu.urut = el.value; SP.refresh('pguTabel'); };
  SP.changes.pguSem = function (el) { SP.ui.pgu.sem = el.value; SP.renderUlang(); };
  SP.actions.pguHal = function (el) { SP.ui.pgu.page = Number(el.dataset.p); SP.refresh('pguTabel'); };
  SP.actions.pguUnduh = function () { SP.unduhCsv('daftar-tutor.csv', ['Nama', 'Email', 'NIP', 'Peran', 'Bahasa', 'Status'], SP.S.pengguna.map(function (x) { return [x.nama, x.email, x.nip, x.peran, x.bahasa, x.status]; })); };

  async function simpanTutor(x) {
    try { await SP.api('tutorSimpan', x); await SP.muat(); SP.toast('Data tutor disimpan.'); return true; }
    catch (e) { SP.toast(esc(e.message), 'err', 8000); return false; }
  }
  SP.changes.pguToggle = async function (el) {
    const x = SP.X.user[el.dataset.email]; const status = el.checked ? 'AKTIF' : 'NONAKTIF';
    if (!(await simpanTutor({ email: x.email, nama: x.nama, nip: x.nip, peran: x.peran, bahasa: x.bahasa, status: status }))) { el.checked = !el.checked; }
  };
  function formTutor(x) {
    const baru = !x; x = x || { peran: 'TUTOR', bahasa: 'ARAB', status: 'AKTIF' };
    const h = SP.modal({
      judul: baru ? 'Daftarkan Tutor Baru' : 'Ubah Data Tutor', lebar: 520,
      isi: '<div class="stack"><div class="field"><label for="ft-n">Nama lengkap &amp; gelar <span class="req">*</span></label><input id="ft-n" class="input" value="' + esc(x.nama || '') + '"></div>' +
        '<div class="field"><label for="ft-e">Email Google <span class="req">*</span></label><input id="ft-e" type="email" class="input" value="' + esc(x.email || '') + '" ' + (baru ? '' : 'readonly') + ' placeholder="nama@lembaga.ac.id"><div class="help">Hanya email terdaftar yang dapat masuk ke aplikasi.</div></div>' +
        '<div class="grid2"><div class="field"><label for="ft-i">NIP / NIDN</label><input id="ft-i" class="input" value="' + esc(x.nip || '') + '"></div><div class="field"><label for="ft-b">Rumpun bahasa</label><select id="ft-b" class="select">' + opt([['ARAB', 'Bahasa Arab'], ['INGGRIS', 'Bahasa Inggris'], ['', '— (tanpa rumpun)']], x.bahasa) + '</select></div></div>' +
        '<div class="grid2"><div class="field"><label for="ft-p">Peran</label><select id="ft-p" class="select">' + opt([['TUTOR', 'Tutor'], ['SUPERADMIN', 'Superadmin']], x.peran) + '</select></div><div class="field"><label for="ft-s">Status</label><select id="ft-s" class="select">' + opt([['AKTIF', 'Aktif'], ['NONAKTIF', 'Nonaktif']], x.status) + '</select></div></div></div>',
      footer: '<button class="btn btn-outline" data-act="tutupModal">Batal</button><button class="btn btn-primary" id="ft-simpan">Simpan</button>'
    });
    h.el.querySelector('#ft-simpan').addEventListener('click', async function (e) {
      const b = e.currentTarget; b.disabled = true;
      const ok = await simpanTutor({ email: SP.$('#ft-e', h.el).value, nama: SP.$('#ft-n', h.el).value, nip: SP.$('#ft-i', h.el).value, peran: SP.$('#ft-p', h.el).value, bahasa: SP.$('#ft-b', h.el).value, status: SP.$('#ft-s', h.el).value });
      if (ok) h.tutup(); else b.disabled = false;
    });
  }
  SP.actions.pguTambahTutor = function () { formTutor(null); };
  SP.actions.pguEditTutor = function (el) { formTutor(SP.X.user[el.dataset.email]); };
  function formKelas(k) {
    const baru = !k; k = k || { status: 'AKTIF', angkatan: (SP.set().tahun_ajaran_aktif || '').slice(0, 4) };
    const h = SP.modal({
      judul: baru ? 'Tambah Kelas Baru' : 'Ubah Kelas', lebar: 480,
      isi: '<div class="stack"><div class="field"><label for="fk-n">Nama kelas <span class="req">*</span></label><input id="fk-n" class="input" value="' + esc(k.nama || '') + '" placeholder="mis. PAI A"></div><div class="field"><label for="fk-p">Program studi</label><input id="fk-p" class="input" value="' + esc(k.prodi || '') + '" placeholder="mis. Pendidikan Agama Islam"></div>' +
        '<div class="grid2"><div class="field"><label for="fk-a">Angkatan <span class="req">*</span></label><input id="fk-a" class="input" value="' + esc(k.angkatan || '') + '" maxlength="4"></div><div class="field"><label for="fk-s">Status</label><select id="fk-s" class="select">' + opt([['AKTIF', 'Aktif'], ['ARSIP', 'Arsip']], k.status) + '</select></div></div></div>',
      footer: '<button class="btn btn-outline" data-act="tutupModal">Batal</button><button class="btn btn-primary" id="fk-simpan">Simpan</button>'
    });
    h.el.querySelector('#fk-simpan').addEventListener('click', async function (e) {
      const b = e.currentTarget; b.disabled = true;
      try { await SP.api('kelasSimpan', { id: k.id || '', nama: SP.$('#fk-n', h.el).value, prodi: SP.$('#fk-p', h.el).value, angkatan: SP.$('#fk-a', h.el).value, status: SP.$('#fk-s', h.el).value }); await SP.muat(); h.tutup(); SP.toast('Kelas disimpan.'); }
      catch (err) { b.disabled = false; SP.toast(esc(err.message), 'err', 8000); }
    });
  }
  SP.actions.pguTambahKelas = function () { formKelas(null); };
  SP.actions.pguEditKelas = function (el) { formKelas(SP.X.kelas[el.dataset.id]); };
  SP.actions.pguPenugasan = function (el) {
    const k = SP.X.kelas[el.dataset.id], t = semTerpilih(), tk = SP.tutorKelas(k.id, t[0], t[1]);
    const tutor = function (b) { return SP.S.pengguna.filter(function (u) { return u.status === 'AKTIF' && u.bahasa === b; }).map(function (u) { return [u.email, u.nama]; }); };
    const h = SP.modal({
      judul: 'Penugasan Tutor — ' + k.nama, lebar: 520,
      isi: '<p class="muted mb16">' + esc(SP.semLabel(t[1]) + ' ' + t[0]) + '</p><div class="stack"><div class="field"><label for="pn-a">Tutor Bahasa Arab</label><select id="pn-a" class="select"><option value="">— pilih —</option>' + opt(tutor('ARAB'), tk.ARAB ? tk.ARAB.tutor_email : '') + '</select></div>' +
        '<div class="field"><label for="pn-i">Tutor Bahasa Inggris</label><select id="pn-i" class="select"><option value="">— pilih —</option>' + opt(tutor('INGGRIS'), tk.INGGRIS ? tk.INGGRIS.tutor_email : '') + '</select></div>' +
        (t[1] === 'GENAP' ? SP.callout({ ikon: 'info', judul: 'Teruskan daftar kelas', teks: 'Mahasiswa semester ganjil di kelas ini otomatis diteruskan ke semester genap.' }) : '') + '</div>',
      footer: '<button class="btn btn-outline" data-act="tutupModal">Batal</button><button class="btn btn-primary" id="pn-simpan">Simpan Penugasan</button>'
    });
    h.el.querySelector('#pn-simpan').addEventListener('click', async function (e) {
      const b = e.currentTarget; b.disabled = true;
      try {
        const r = await SP.api('penugasanSimpan', { kelas_id: k.id, tahun_ajaran: t[0], semester: t[1], tutor_arab: SP.$('#pn-a', h.el).value, tutor_inggris: SP.$('#pn-i', h.el).value });
        await SP.muat(); h.tutup(); SP.toast('Penugasan disimpan.' + (r.diteruskan ? ' ' + r.diteruskan + ' mahasiswa diteruskan ke semester genap.' : ''));
      } catch (err) { b.disabled = false; SP.toast(esc(err.message), 'err', 8000); }
    });
  };

  // ============================================================
  // PINDAH KELAS
  // ============================================================
  SP.ui.pind = SP.ui.pind || { nim: '', q: '', sem: '', tujuan: '', tgl: '', alasan: '', ok: false, sug: false };

  function semPindah() { const s = SP.set(); return (SP.ui.pind.sem || (s.tahun_ajaran_aktif + '|' + s.semester_aktif)).split('|'); }
  function kelasSaatIni(nim) {
    const t = semPindah();
    let r = (SP.X.km[nim] || []).filter(function (x) { return x.tahun_ajaran === t[0] && x.semester === t[1] && x.jenis !== 'PENGULANGAN'; })[0];
    if (!r && t[1] === 'GENAP') r = (SP.X.km[nim] || []).filter(function (x) { return x.tahun_ajaran === t[0] && x.semester === 'GANJIL' && x.jenis !== 'PENGULANGAN'; })[0];
    return r ? SP.X.kelas[r.kelas_id] : null;
  }
  SP.parts.pindForm = function () {
    const u = SP.ui.pind, m = u.nim ? SP.X.mhs[u.nim] : null, t = semPindah(), s = SP.set();
    const cur = m ? kelasSaatIni(m.nim) : null;
    const kels = SP.S.kelas.filter(function (k) { return k.status !== 'ARSIP' && (!cur || k.id !== cur.id); });
    if (!u.tujuan || !kels.some(function (k) { return k.id === u.tujuan; })) u.tujuan = kels[0] ? kels[0].id : '';
    const tk = u.tujuan ? SP.tutorKelas(u.tujuan, t[0], t[1]) : {};
    const jumlah = function (id) { const q = {}; SP.S.km.forEach(function (r) { if (r.kelas_id === id && r.tahun_ajaran === t[0] && r.semester === t[1] && r.jenis !== 'PENGULANGAN') q[r.nim] = true; }); return Object.keys(q).length; };
    const kel = m ? SP.kelulusan(m.nim) : null;
    const sem = [[s.tahun_ajaran_aktif + '|' + s.semester_aktif, SP.semLabel(s.semester_aktif) + ' ' + s.tahun_ajaran_aktif]];
    const lain = s.semester_aktif === 'GANJIL' ? 'GENAP' : 'GANJIL'; sem.push([s.tahun_ajaran_aktif + '|' + lain, SP.semLabel(lain) + ' ' + s.tahun_ajaran_aktif]);
    return '<div class="grid-main" style="grid-template-columns:1fr 1.3fr"><div class="card card-p"><div class="row between mb16"><div class="row gap8"><span class="stepno">1</span><h2 class="h3">Pilih Mahasiswa</h2></div><span class="cap">Identitas target</span></div>' +
      '<div class="field" style="position:relative"><label for="pd-q">Pencarian mahasiswa aktif</label><input id="pd-q" class="input" placeholder="Ketik NIM atau nama…" data-in="pindQ" autocomplete="off" value="' + esc(m ? m.nim + ' - ' + m.nama : u.q) + '"><div id="pd-sug"></div></div>' +
      (m ? '<div class="card card-p20 mt16" style="background:var(--callout);border-color:var(--callout-bd)"><div class="row top"><span class="avatar" style="width:52px;height:52px">' + esc(SP.inisial(m.nama)) + '</span><div><span class="badge b-solid">Mahasiswa terpilih</span><h3 class="h2 mt8">' + esc(m.nama) + '</h3><div class="muted" style="font-size:13px"><span class="mono">NIM ' + esc(m.nim) + '</span> · Angkatan ' + esc(m.angkatan || '—') + '</div></div></div>' +
        '<div class="mt16"><div class="cap">Status rombongan belajar</div><div class="row between mt8" style="background:#fff;border-radius:8px;padding:10px 12px"><span class="muted">Kelas saat ini</span><span class="chip">' + esc(cur ? cur.nama + ' (' + SP.semLabel(t[1]) + ' ' + t[0] + ')' : 'Belum terdaftar') + '</span></div></div>' +
        '<div class="mt16"><div class="row between"><span class="cap">Riwayat nilai bawaan (terkunci)</span><span class="chip ok">' + SP.icon('lock', 'sm') + ' Siap transfer</span></div>' + SP.PROGRAM.map(function (p) { return '<div class="row between mt8" style="background:#fff;border-radius:8px;padding:8px 12px"><span>' + esc(SP.PROG_LABEL[p]) + '</span>' + SP.badge(kel.program[p], null, true) + '</div>'; }).join('') + '<p class="muted mt8" style="font-size:12.5px;font-style:italic">* Nilai terikat pada NIM dan program, sehingga otomatis ikut ke kelas baru.</p></div></div>' : '<div class="empty" style="padding:28px">' + SP.icon('search', 'xl') + '<p class="mt8">Cari dan pilih mahasiswa untuk dipindahkan.</p></div>') + '</div>' +
      '<div class="card card-p"><div class="row between mb16"><div class="row gap8"><span class="stepno" style="background:var(--accent)">2</span><h2 class="h3">Konfigurasi Kelas Tujuan &amp; Alasan Mutasi</h2></div></div><div class="stack">' +
      '<div class="field"><label for="pd-s">Semester efektif</label><select id="pd-s" class="select" data-ch="pindSem">' + opt(sem, t[0] + '|' + t[1]) + '</select></div>' +
      '<div class="field"><div class="row between"><label class="lbl" for="pd-k">Kelas tujuan mahasiswa</label><span class="muted" style="font-size:12px">' + (u.tujuan ? jumlah(u.tujuan) + ' mahasiswa terdaftar' : '') + '</span></div><select id="pd-k" class="select" data-ch="pindKelas">' + opt(kels.map(function (k) { return [k.id, k.nama + (k.prodi ? ' — ' + k.prodi : '')]; }), u.tujuan) + '</select>' +
      (u.tujuan ? '<div class="help">Tutor Arab: <b>' + esc(tk.ARAB ? SP.namaUser(tk.ARAB.tutor_email) : 'belum ada') + '</b> | Tutor Inggris: <b>' + esc(tk.INGGRIS ? SP.namaUser(tk.INGGRIS.tutor_email) : 'belum ada') + '</b></div>' : '') + '</div>' +
      '<div class="field"><label for="pd-t">Tanggal efektif mutasi</label><input id="pd-t" type="date" class="input" data-ch="pindTgl" value="' + esc(u.tgl || SP.hariIni()) + '"></div>' +
      '<div class="field"><label for="pd-a">Alasan mutasi / catatan SK <span class="req">*</span></label><textarea id="pd-a" class="textarea" data-in="pindAlasan" placeholder="Wajib diisi untuk jejak audit">' + esc(u.alasan) + '</textarea></div>' +
      '<label class="callout" style="padding:12px 14px;cursor:pointer"><span class="chk"><input type="checkbox" data-ch="pindOk" ' + (u.ok ? 'checked' : '') + '><span style="font-size:13px">Saya mengonfirmasi pemindahan ini dan memastikan tutor kelas tujuan mengetahui adanya transfer nilai bawaan.</span></span></label>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn btn-outline" data-act="pindReset">Batalkan</button><button class="btn btn-primary btn-lg" data-act="pindSimpan" ' + (m ? '' : 'disabled') + '>Proses Pemindahan Mahasiswa ' + SP.icon('arrowRight') + '</button></div></div></div></div>';
  };
  SP.parts.pindRiwayat = function () {
    const rows = SP.S.mutasi.slice().sort(function (a, b) { return a.waktu < b.waktu ? 1 : -1; });
    return '<div class="card mt24"><div class="card-h"><div><h2 class="h2">' + SP.icon('history') + ' Tabel Riwayat Mutasi Kelas Terkini</h2><p class="muted" style="font-size:13px">Log resmi mutasi mahasiswa lintas rombongan belajar.</p></div><button class="btn btn-outline btn-sm" data-act="pindCsv">' + SP.icon('download') + ' Riwayat Mutasi (.csv)</button></div>' +
      (rows.length ? '<div class="tbl-wrap" style="border:0;border-radius:0"><table class="tbl cards"><thead><tr><th>Waktu &amp; tanggal</th><th>Mahasiswa</th><th>Kelas asal</th><th></th><th>Kelas tujuan</th><th>Alasan mutasi</th><th>Dipindahkan oleh</th><th>Status</th></tr></thead><tbody>' + rows.slice(0, 20).map(function (r) {
        const m = SP.X.mhs[r.nim];
        return '<tr><td data-l="Waktu"><b>' + SP.tgl(r.waktu.slice(0, 10)) + '</b><br><small class="muted">' + esc(r.waktu.slice(11, 16)) + ' WIB</small></td><td data-l="Mahasiswa"><span class="row gap8"><span class="avatar sm">' + esc(SP.inisial(m ? m.nama : r.nim)) + '</span><span class="nm"><b>' + esc(m ? m.nama : r.nim) + '</b><br><small class="mono muted">' + esc(r.nim) + '</small></span></span></td><td data-l="Asal"><span class="chip">' + esc(SP.kelasNama(r.kelas_asal)) + '</span></td><td>' + SP.icon('arrowRight') + '</td><td data-l="Tujuan"><span class="chip ok">' + esc(SP.kelasNama(r.kelas_tujuan)) + '</span></td><td data-l="Alasan">' + esc(r.alasan) + '</td><td data-l="Oleh" style="font-size:12.5px">' + esc(SP.namaUser(r.oleh)) + '<br><b style="font-size:10px;letter-spacing:.06em;color:var(--text2)">SUPERADMIN</b></td><td data-l="Status">' + SP.badge('AKTIF', 'Berhasil') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card-b">' + SP.kosong('swap', 'Belum ada mutasi', 'Riwayat pemindahan kelas akan tampil di sini.') + '</div>') + '</div>';
  };
  SP.views.pindah = {
    judul: 'Pindah Kelas',
    render: function () {
      return SP.header({ crumbs: [['Dasbor', '#/dasbor'], ['Pindah Kelas']], judul: 'Mutasi / Pindah Kelas Mahasiswa', desc: 'Pemindahan rombongan belajar mahasiswa antar kelas, terutama pada semester genap. Seluruh riwayat nilai ikut berpindah tanpa kehilangan data.' }) +
        SP.callout({ ikon: 'shieldCheck', judul: 'Prinsip Integritas Nilai', tag: 'MUTASI AMAN', edge: true, teks: 'Nilai diikat pada <b>NIM dan Program</b>, bukan pada ID kelas. Pemindahan hanya memperbarui keanggotaan kelas, sehingga tutor kelas baru dapat langsung melanjutkan penilaian semester genap dari data yang sudah ada.' }) +
        '<div class="mt16" data-part="pindForm">' + SP.parts.pindForm() + '</div><div data-part="pindRiwayat">' + SP.parts.pindRiwayat() + '</div>';
    }
  };
  SP.inputs.pindQ = function (el) {
    const q = el.value.toLowerCase().trim(), box = SP.$('#pd-sug'); SP.ui.pind.q = el.value; SP.ui.pind.nim = '';
    if (q.length < 2) { box.innerHTML = ''; return; }
    const hasil = SP.S.mahasiswa.filter(function (m) { return (m.nim + ' ' + m.nama).toLowerCase().indexOf(q) >= 0; }).slice(0, 8);
    box.innerHTML = '<div class="autosug">' + (hasil.length ? hasil.map(function (m) { return '<button class="sr-item" data-act="pindPilih" data-nim="' + esc(m.nim) + '"><span class="avatar sm">' + esc(SP.inisial(m.nama)) + '</span><span><b>' + esc(m.nama) + '</b><br><small class="mono muted">' + esc(m.nim) + '</small></span></button>'; }).join('') : '<div class="muted" style="padding:10px">Tidak ditemukan.</div>') + '</div>';
  };
  SP.actions.pindPilih = function (el) { SP.ui.pind.nim = el.dataset.nim; SP.refresh('pindForm'); };
  SP.changes.pindSem = function (el) { SP.ui.pind.sem = el.value; SP.refresh('pindForm'); };
  SP.changes.pindKelas = function (el) { SP.ui.pind.tujuan = el.value; SP.refresh('pindForm'); };
  SP.changes.pindTgl = function (el) { SP.ui.pind.tgl = el.value; };
  SP.inputs.pindAlasan = function (el) { SP.ui.pind.alasan = el.value; };
  SP.changes.pindOk = function (el) { SP.ui.pind.ok = el.checked; };
  SP.actions.pindReset = function () { SP.ui.pind = { nim: '', q: '', sem: '', tujuan: '', tgl: '', alasan: '', ok: false }; SP.refresh('pindForm'); };
  SP.actions.pindCsv = function () { SP.unduhCsv('riwayat-mutasi.csv', ['Waktu', 'NIM', 'Kelas Asal', 'Kelas Tujuan', 'Semester', 'Tanggal Efektif', 'Alasan', 'Oleh'], SP.S.mutasi.map(function (r) { return [r.waktu, r.nim, SP.kelasNama(r.kelas_asal), SP.kelasNama(r.kelas_tujuan), r.semester + ' ' + r.tahun_ajaran, r.tanggal_efektif, r.alasan, r.oleh]; })); };
  SP.actions.pindSimpan = async function (el) {
    const u = SP.ui.pind, t = semPindah();
    if (!u.nim) return SP.toast('Pilih mahasiswa terlebih dahulu.', 'warn');
    if (!u.alasan.trim()) return SP.toast('Alasan mutasi wajib diisi.', 'warn');
    if (!u.ok) return SP.toast('Centang konfirmasi pemindahan terlebih dahulu.', 'warn');
    el.disabled = true;
    try {
      const r = await SP.api('pindahKelas', { nim: u.nim, kelas_tujuan: u.tujuan, tahun_ajaran: t[0], semester: t[1], tanggal_efektif: u.tgl || SP.hariIni(), alasan: u.alasan });
      SP.terapkanHasil(r); SP.simpanCache(); SP.toast('<b>' + esc(SP.X.mhs[u.nim].nama) + '</b> berhasil dipindahkan ke ' + esc(SP.kelasNama(u.tujuan)) + '.');
      SP.ui.pind = { nim: '', q: '', sem: '', tujuan: '', tgl: '', alasan: '', ok: false }; SP.renderUlang();
    } catch (e) { el.disabled = false; SP.toast(esc(e.message), 'err', 8000); }
  };

  // ============================================================
  // PENGATURAN & LOG
  // ============================================================
  SP.ui.set = SP.ui.set || { tab: 'set', f: null, aset: {}, log: null, logQ: '', logAksi: '', logPage: 1 };
  const KUNCI_FORM = ['nama_lembaga', 'tahun_ajaran_aktif', 'semester_aktif', 'mode_penilaian', 'batas_penilaian', 'target_kelulusan', 'kontak_bantuan', 'frontend_url', 'kuota_email_harian', 'template_slides_id',
    'ttd1_nama', 'ttd1_jabatan', 'ttd1_nip', 'ttd2_nama', 'ttd2_jabatan', 'ttd2_nip', 'format_nomor', 'email_otomatis', 'email_lampirkan_pdf', 'email_bcc', 'email_subjek', 'email_body'];
  function formAwal() { const o = {}; KUNCI_FORM.forEach(function (k) { o[k] = SP.set()[k] === undefined ? '' : String(SP.set()[k]); }); return o; }
  function berubah() { const f = SP.ui.set.f, a = formAwal(); return KUNCI_FORM.filter(function (k) { return f[k] !== a[k]; }); }

  SP.parts.setBar = function () {
    const n = berubah().length;
    return '<div class="st"><span class="dotg ' + (n ? 'o' : '') + '"></span><span>' + (n ? '<b>' + n + ' pengaturan</b> belum disimpan' : 'Semua pengaturan tersimpan · Pengguna: <b>' + esc(SP.S.me.nama) + '</b>') + '</span></div><div class="row"><button class="btn btn-outline" data-act="setBatal" ' + (n ? '' : 'disabled') + '>Batalkan Perubahan</button><button class="btn btn-primary btn-lg" data-act="setSimpan" ' + (n ? '' : 'disabled') + '>' + SP.icon('save') + ' Simpan Pengaturan Sistem</button></div>';
  };
  function inp(k, label, o) {
    o = o || {}; const v = SP.ui.set.f[k];
    return '<div class="field"' + '><label for="s-' + k + '">' + label + '</label>' + (o.area ? '<textarea id="s-' + k + '" class="textarea" style="min-height:' + (o.tinggi || 120) + 'px" data-in="setF" data-k="' + k + '">' + esc(v) + '</textarea>' : '<input id="s-' + k + '" class="input ' + (o.mono ? 'mono' : '') + '" type="' + (o.type || 'text') + '" data-in="setF" data-k="' + k + '" value="' + esc(v) + '" placeholder="' + esc(o.ph || '') + '">') + (o.help ? '<div class="help">' + o.help + '</div>' : '') + '</div>';
  }
  function kartuTtd(no) {
    const k = 'ttd' + no; const f = SP.ui.set.f, prev = SP.ui.set.aset[k];
    return '<div class="sigbox"><div class="cap">Pejabat ' + no + '</div><div class="stack" style="gap:10px;margin-top:8px">' + inp(k + '_nama', 'Nama pejabat') + inp(k + '_jabatan', 'Jabatan') + inp(k + '_nip', 'NIP (opsional)') + '</div><div class="sigprev">' + (prev ? '<img src="' + prev + '" alt="Tanda tangan ' + no + '">' : '<span class="muted3">Belum ada tanda tangan</span>') + '</div>' +
      '<label class="btn btn-outline btn-sm" style="cursor:pointer">' + SP.icon('upload', 'sm') + ' Ubah TTD (PNG transparan)<input type="file" accept="image/png,image/jpeg" class="hide" data-ch="setAset" data-k="' + k + '"></label></div>';
  }
  SP.parts.setIsi = function () {
    const f = SP.ui.set.f, q = SP.S.meta.kuotaEmail || { sisa: 0, total: 1500, terpakai: 0 }, pct = Math.round(q.terpakai / (q.total || 1) * 100);
    const token = ['{NAMA_MAHASISWA}', '{NIM}', '{NOMOR_SERTIFIKAT}', '{TANGGAL_TERBIT}', '{NAMA_LEMBAGA}', '{KELAS}', '{ANGKATAN}'];
    const nSert = SP.S.sert.filter(function (s) { return s.file_id; }).length;
    const log = SP.S.pengguna.length ? '' : '';
    return '<div class="grid-main" style="grid-template-columns:1.7fr 1fr"><div class="stack">' +
      '<div class="card card-p"><div class="row between mb16"><div class="row gap8"><span style="color:var(--primary)">' + SP.icon('building', 'lg') + '</span><h2 class="h2">1. Informasi Lembaga &amp; Status Penilaian</h2></div><span class="tagx">MODUL INTI</span></div><div class="stack">' +
      inp('nama_lembaga', 'Nama lembaga akademik', { help: 'Dicantumkan pada sertifikat dan email.' }) +
      '<div class="grid2"><div class="field"><label for="s-ta">Tahun akademik aktif</label><input id="s-ta" class="input" data-in="setF" data-k="tahun_ajaran_aktif" value="' + esc(f.tahun_ajaran_aktif) + '" placeholder="2026/2027"></div><div class="field"><label for="s-sm">Semester aktif</label><select id="s-sm" class="select" data-ch="setF" data-k="semester_aktif">' + opt([['GANJIL', 'Ganjil'], ['GENAP', 'Genap']], f.semester_aktif) + '</select></div></div>' +
      '<div class="grid2">' + inp('batas_penilaian', 'Batas akhir finalisasi nilai', { type: 'date' }) + '<div class="field"><label>Status penguncian nilai</label><div class="seg lg"><button class="' + (f.mode_penilaian === 'AKTIF' ? 'on' : '') + '" data-act="setMode" data-v="AKTIF">' + SP.icon('lock', 'sm') + ' Penilaian aktif / terbuka</button><button class="' + (f.mode_penilaian === 'TERKUNCI' ? 'on' : '') + '" data-act="setMode" data-v="TERKUNCI">Terkunci</button></div></div></div>' +
      '<div class="grid2">' + inp('target_kelulusan', 'Target kelulusan institusi (%)', { type: 'number' }) + inp('kontak_bantuan', 'Kontak bantuan (ditampilkan di halaman login)', { ph: 'email / WhatsApp admin' }) + '</div></div></div>' +
      '<div class="card card-p"><div class="row between mb16"><div class="row gap8"><span style="color:var(--accent)">' + SP.icon('award', 'lg') + '</span><h2 class="h2">2. Template Sertifikat &amp; Tanda Tangan Digital</h2></div><span class="tagx">DRIVE SYNC</span></div><div class="stack">' +
      '<div class="filerow"><div class="fi">' + SP.icon('file') + '</div><div class="grow"><b>' + (f.template_slides_id ? 'Template Google Slides aktif' : 'Belum ada template') + '</b> ' + (f.template_slides_id ? '<span class="badge b-solid">AKTIF</span>' : '') + '<div class="muted mono" style="font-size:11.5px">ID: ' + esc(f.template_slides_id || '—') + '</div></div>' + (f.template_slides_id ? '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://docs.google.com/presentation/d/' + esc(f.template_slides_id) + '/edit">' + SP.icon('eye', 'sm') + ' Buka &amp; sunting</a>' : '') + '<button class="btn btn-primary btn-sm" data-act="setBuatTemplate">' + SP.icon('refresh', 'sm') + ' Buat template bawaan</button></div>' +
      inp('template_slides_id', 'Atau tempel URL / ID Google Slides template sendiri', { mono: true, help: 'Template harus berupa Google Slides yang dimiliki akun deployer. Gunakan token di bawah sebagai penanda teks.' }) +
      '<div><div class="cap mb16">Token placeholder dinamis (klik untuk menyalin)</div><div class="tokens">' + token.concat(['{TTD1_NAMA}', '{TTD1_JABATAN}', '{TTD2_NAMA}', '{TTD2_JABATAN}']).map(function (t) { return '<span class="token" data-act="salinToken" data-v="' + t + '">' + t + ' ' + SP.icon('copy', 'sm') + '</span>'; }).join('') + '</div></div>' +
      '<div class="grid2">' + kartuTtd(1) + kartuTtd(2) + '</div>' +
      '<div class="sigbox row"><div class="sigprev" style="width:90px;height:60px;margin:0">' + (SP.ui.set.aset.logo ? '<img src="' + SP.ui.set.aset.logo + '" alt="Logo">' : SP.icon('image')) + '</div><div class="grow"><b>Logo lembaga (opsional)</b><div class="muted" style="font-size:12.5px">Ditampilkan di bagian atas sertifikat.</div></div><label class="btn btn-outline btn-sm" style="cursor:pointer">' + SP.icon('upload', 'sm') + ' Unggah<input type="file" accept="image/png,image/jpeg" class="hide" data-ch="setAset" data-k="logo"></label></div>' +
      '<div class="grid2">' + inp('format_nomor', 'Format nomor sertifikat', { mono: true, help: 'Gunakan {TAHUN}, {BULAN}, {URUT}.', ph: 'CERT/ARB-ENG/{TAHUN}/{URUT}' }) + inp('frontend_url', 'URL aplikasi (untuk QR verifikasi)', { ph: 'https://username.github.io/sipena', help: 'Kosongkan jika tidak ingin QR pada sertifikat.' }) + '</div></div></div>' +
      '<div class="card card-p"><div class="row between mb16"><div class="row gap8"><span style="color:var(--primary)">' + SP.icon('mail', 'lg') + '</span><h2 class="h2">3. Template Notifikasi Email Otomatis</h2></div><span class="tagx">MAILAPP</span></div><div class="stack">' +
      inp('email_subjek', 'Subjek email penerbitan sertifikat') + inp('email_body', 'Isi pesan email (teks biasa, mendukung token)', { area: true, tinggi: 170 }) +
      '<div class="row wrap" style="gap:20px"><label class="chk"><input type="checkbox" data-ch="setChk" data-k="email_otomatis" ' + (f.email_otomatis === '1' ? 'checked' : '') + '><span>Antrekan email otomatis saat sertifikat terbit</span></label><label class="chk"><input type="checkbox" data-ch="setChk" data-k="email_lampirkan_pdf" ' + (f.email_lampirkan_pdf === '1' ? 'checked' : '') + '><span>Lampirkan berkas PDF sertifikat</span></label></div>' +
      '<div class="grid2">' + inp('email_bcc', 'BCC salinan ke arsip Superadmin (opsional)', { type: 'email' }) + inp('kuota_email_harian', 'Kuota email harian akun (Workspace 1500 / gratis 100)', { type: 'number' }) + '</div>' +
      '<div class="row between wrap callout" style="padding:10px 14px"><span class="muted">Kirim salinan rendering ke email Anda saat ini: <b class="mono">' + esc(SP.S.me.email) + '</b></span><button class="btn btn-outline btn-sm" data-act="setEmailUji">' + SP.icon('send', 'sm') + ' Kirim Email Uji Coba ke Saya</button></div></div></div></div>' +
      '<div class="stack"><div class="card card-p"><div class="row gap8 mb16"><span style="color:var(--primary)">' + SP.icon('zap', 'lg') + '</span><h2 class="h3">Kuota Google Apps Script</h2></div>' +
      '<div class="callout" style="padding:12px"><div class="grow"><div class="row between"><span>' + SP.icon('mail', 'sm') + ' Gmail / MailApp</span><b class="num">' + SP.n(q.terpakai) + ' / ' + SP.n(q.total) + '</b></div><div class="mt8">' + SP.prog(pct, pct > 85 ? 'r' : 'o') + '</div><div class="muted mt8" style="font-size:12px">Terpakai ' + pct + '% · reset otomatis pukul 00.00 WIB</div></div></div>' +
      '<div class="callout mt8" style="padding:12px"><div class="grow"><div class="row between"><span>' + SP.icon('folder', 'sm') + ' Google Drive PDF</span><b class="num">' + SP.n(nSert) + '</b></div><div class="muted" style="font-size:12px">berkas sertifikat terbit</div></div></div>' +
      '<div class="callout ok mt8" style="padding:12px"><div class="ic" style="width:32px;height:32px">' + SP.icon('shieldCheck') + '</div><div class="tx"><b>Pengaman waktu eksekusi aktif.</b> Pencetakan dipecah per kloter (3 sertifikat) agar tidak melewati batas 6 menit Apps Script. Data di-cache untuk respons cepat.</div></div></div>' +
      '<div class="card card-p"><div class="row between mb16"><h2 class="h3">' + SP.icon('history') + ' Snapshot jejak audit</h2><a href="#" data-act="setTabLog"><b style="font-size:12px;letter-spacing:.06em">SEMUA LOG →</b></a></div><div id="set-snap"><div class="sk" style="height:90px"></div></div></div></div></div>' + log;
  };
  SP.views.pengaturan = {
    judul: 'Pengaturan & Log',
    render: function () {
      const u = SP.ui.set; if (!u.f) u.f = formAwal();
      return SP.header({ crumbs: [['Dasbor', '#/dasbor'], ['Pengaturan & Log']], eyebrow: 'Hak akses: Superadmin', judul: 'Pengaturan Sistem & Log Aktivitas', desc: 'Konfigurasi tahun ajaran, template sertifikat Drive, token dinamis email, dan jejak audit aktivitas superadmin/tutor.' }) +
        '<div class="tabs"><button class="tab ' + (u.tab === 'set' ? 'on' : '') + '" data-act="setTab" data-v="set">' + SP.icon('sliders') + ' Pengaturan Sistem (Aktif)</button><button class="tab ' + (u.tab === 'log' ? 'on' : '') + '" data-act="setTab" data-v="log">' + SP.icon('history') + ' Log Aktivitas Audit</button></div>' +
        (u.tab === 'set' ? '<div data-part="setIsi">' + SP.parts.setIsi() + '</div><div class="savebar" data-part="setBar">' + SP.parts.setBar() + '</div>' : '<div data-part="logIsi">' + SP.parts.logIsi() + '</div>');
    },
    after: function () {
      const u = SP.ui.set;
      if (u.tab === 'set') {
        ['ttd1', 'ttd2', 'logo'].forEach(function (k) {
          if (u.aset[k] !== undefined) return; u.aset[k] = '';
          SP.api('ambilAset', { kunci: k }).then(function (r) { u.aset[k] = r.dataUrl || ''; if (SP.ui.set.tab === 'set' && SP.parts.setIsi && SP.$('[data-part="setIsi"]')) SP.refresh('setIsi'); }).catch(function () { /* opsional */ });
        });
        SP.api('logList', { limit: 4 }).then(function (r) {
          const el = SP.$('#set-snap'); if (el) el.innerHTML = r.log.length ? r.log.map(function (x) { return '<div class="row top mb16"><span class="dotp" style="color:var(--primary);margin-top:7px"></span><div><b style="font-size:13px">' + esc(x.aksi.replace(/_/g, ' ')) + '</b><div class="muted" style="font-size:12px">' + esc(SP.namaUser(x.email)) + ' · ' + SP.waktu(x.waktu) + '</div></div></div>'; }).join('') : '<p class="muted">Belum ada log.</p>';
        }).catch(function () { const el = SP.$('#set-snap'); if (el) el.innerHTML = '<p class="muted">Tidak dapat memuat log.</p>'; });
      } else if (!u.log) muatLog();
    }
  };
  SP.actions.setTab = function (el) { SP.ui.set.tab = el.dataset.v; SP.renderUlang(); };
  SP.actions.setTabLog = function () { SP.ui.set.tab = 'log'; SP.renderUlang(); };
  SP.inputs.setF = function (el) { SP.ui.set.f[el.dataset.k] = el.value; SP.refresh('setBar'); };
  SP.changes.setF = function (el) { SP.ui.set.f[el.dataset.k] = el.value; SP.refresh('setBar'); };
  SP.changes.setChk = function (el) { SP.ui.set.f[el.dataset.k] = el.checked ? '1' : '0'; SP.refresh('setBar'); };
  SP.actions.setMode = function (el) { SP.ui.set.f.mode_penilaian = el.dataset.v; SP.refresh('setIsi'); SP.refresh('setBar'); };
  SP.actions.salinToken = function (el) { SP.salin(el.dataset.v); };
  SP.actions.setBatal = function () { SP.ui.set.f = formAwal(); SP.refresh('setIsi'); SP.refresh('setBar'); };
  SP.actions.setSimpan = async function (el) {
    const k = berubah(), f = SP.ui.set.f; if (!k.length) return;
    if (k.indexOf('semester_aktif') >= 0 && f.semester_aktif === 'GENAP' && !(await SP.konfirmasi({ judul: 'Beralih ke Semester Genap?', pesan: 'Daftar mahasiswa semester ganjil akan <b>diteruskan otomatis</b> ke semester genap pada kelas yang sama. Nilai ganjil akan terkunci bagi tutor.', ya: 'Ya, Beralih' }))) return;
    el.disabled = true; const data = {}; k.forEach(function (x) { data[x] = f[x]; });
    try {
      const r = await SP.api('pengaturanSimpan', data); SP.terapkanHasil({ pengaturan: Object.assign({}, SP.S.pengaturan, r.pengaturan) });
      if (r.refresh) await SP.muat();
      SP.ui.set.f = formAwal(); SP.simpanCache(); SP.toast('Pengaturan sistem disimpan.' + (r.diteruskan ? ' ' + r.diteruskan + ' mahasiswa diteruskan ke semester genap.' : '')); SP.renderUlang(); SP.updateChrome();
    } catch (e) { el.disabled = false; SP.toast(esc(e.message), 'err', 8000); }
  };
  SP.actions.setBuatTemplate = async function (el) {
    if (SP.ui.set.f.template_slides_id && !(await SP.konfirmasi({ judul: 'Buat template baru?', pesan: 'Template bawaan baru akan dibuat dan menggantikan template aktif saat ini.', ya: 'Buat Template' }))) return;
    el.disabled = true;
    try { const r = await SP.api('buatTemplate', {}, { timeout: 90000 }); SP.terapkanHasil({ pengaturan: Object.assign({}, SP.S.pengaturan, { template_slides_id: r.template_slides_id }) }); SP.ui.set.f.template_slides_id = r.template_slides_id; SP.toast('Template bawaan berhasil dibuat di Google Drive.'); SP.refresh('setIsi'); SP.refresh('setBar'); }
    catch (e) { el.disabled = false; SP.toast(esc(e.message), 'err', 8000); }
  };
  SP.actions.setEmailUji = async function (el) {
    el.disabled = true;
    try { const r = await SP.api('kirimEmailUji', {}); SP.toast('Email uji coba dikirim ke <b>' + esc(r.terkirimKe) + '</b>.'); } catch (e) { SP.toast(esc(e.message), 'err'); }
    el.disabled = false;
  };
  SP.changes.setAset = async function (el) {
    const f = el.files[0]; if (!f) return;
    try {
      const url = await SP.kecilkanGambar(f, el.dataset.k === 'logo' ? 400 : 700, 'image/png');
      await SP.api('unggahAset', { kunci: el.dataset.k, mime: 'image/png', base64: url.split(',')[1] }, { timeout: 90000 });
      SP.ui.set.aset[el.dataset.k] = url; SP.toast('Berkas berhasil diunggah.'); SP.refresh('setIsi');
    } catch (e) { SP.toast(esc(e.message), 'err'); }
  };

  async function muatLog() {
    try { const r = await SP.api('logList', { limit: 1000 }); SP.ui.set.log = r; } catch (e) { SP.ui.set.log = { log: [], total: 0, galat: e.message }; }
    SP.refresh('logIsi');
  }
  SP.parts.logIsi = function () {
    const u = SP.ui.set; if (!u.log) return '<div class="sk" style="height:300px"></div>';
    const q = u.logQ.toLowerCase();
    const list = u.log.log.filter(function (x) { return (!u.logAksi || x.aksi === u.logAksi) && (!q || (x.email + ' ' + x.aksi + ' ' + x.detail).toLowerCase().indexOf(q) >= 0); });
    const pg = SP.paginate(list, u.logPage, 15); u.logPage = pg.page;
    const aksi = Object.keys(u.log.log.reduce(function (o, x) { o[x.aksi] = 1; return o; }, {})).sort();
    return '<div class="toolbar"><div class="sch">' + SP.icon('search') + '<input class="input" placeholder="Cari pengguna, aksi, atau detail…" data-in="logQ" value="' + esc(u.logQ) + '"></div><div class="field"><select class="select" data-ch="logAksi" aria-label="Aksi"><option value="">Semua aksi</option>' + opt(aksi.map(function (a) { return [a, a.replace(/_/g, ' ')]; }), u.logAksi) + '</select></div><button class="btn btn-outline" data-act="logMuat">' + SP.icon('refresh') + ' Muat ulang</button></div>' +
      '<div class="tbl-wrap has-foot"><table class="tbl cards"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Data yang diubah</th></tr></thead><tbody>' +
      (pg.items.length ? pg.items.map(function (x) { return '<tr class="logrow"><td data-l="Waktu" class="d">' + esc(x.waktu) + '</td><td data-l="Pengguna">' + esc(SP.namaUser(x.email)) + '</td><td data-l="Aksi"><span class="chip">' + esc(x.aksi.replace(/_/g, ' ')) + '</span></td><td data-l="Detail" class="mono" style="font-size:11.5px;word-break:break-all">' + esc(x.detail) + '</td></tr>'; }).join('') : '<tr><td colspan="4">' + SP.kosong('history', 'Belum ada log', 'Aktivitas akan tercatat otomatis.') + '</td></tr>') + '</tbody></table></div><div class="tbl-foot"><span>Menampilkan ' + pg.dari + '–' + pg.sampai + ' dari ' + pg.total + ' (total tercatat ' + SP.n(u.log.total) + ')</span>' + SP.pagerHtml('logHal', pg) + '</div>';
  };
  SP.inputs.logQ = SP.debounce(function (el) { SP.ui.set.logQ = el.value; SP.ui.set.logPage = 1; SP.refresh('logIsi'); }, 200);
  SP.changes.logAksi = function (el) { SP.ui.set.logAksi = el.value; SP.ui.set.logPage = 1; SP.refresh('logIsi'); };
  SP.actions.logHal = function (el) { SP.ui.set.logPage = Number(el.dataset.p); SP.refresh('logIsi'); };
  SP.actions.logMuat = function () { SP.ui.set.log = null; SP.refresh('logIsi'); muatLog(); };
})();
