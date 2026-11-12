// ============================================================
// SIPENA: views-admin.js
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
    const t = semTerpilih();
    const taAngkatan = t[0].slice(0, 4);
    // Tampilkan kelas aktif yang sesuai angkatan tahun ajaran terpilih,
    // ATAU kelas yang sudah memiliki penugasan di semester terpilih.
    const klasAktif = SP.S.kelas.filter(function (k) {
      if (k.status === 'ARSIP') return false;
      const matchAngkatan = !taAngkatan || String(k.angkatan) === String(taAngkatan);
      const adaPenugasan = (SP.S.penugasan || []).some(function (p) {
        return p.kelas_id === k.id && p.tahun_ajaran === t[0] && p.semester === t[1];
      });
      return matchAngkatan || adaPenugasan;
    });
    return klasAktif.sort(function (a, b) { return a.nama < b.nama ? -1 : 1; }).map(function (k) {
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
    return '<div class="tbl-wrap has-foot"><table class="tbl cards compact"><thead><tr><th>Nama tutor</th><th>Surel Google</th><th>Rumpun bahasa</th><th>Kelas diampu (semester ini)</th><th>Izin Cetak</th><th>Status</th><th>Terakhir login</th><th>Aksi</th></tr></thead><tbody>' +
      (pg.items.length ? pg.items.map(function (x) {
        const kd = kelasDiampu(x.email), mati = x.status !== 'AKTIF';
        const izinCetakHtml = x.peran === 'SUPERADMIN'
          ? '<span class="chip ok" title="Superadmin otomatis berhak mencetak">' + SP.icon('shieldCheck', 'sm') + ' Superadmin</span>'
          : '<label class="row gap8" title="Beri atau cabut izin cetak sertifikat"><span class="switch"><input type="checkbox" data-ch="pguToggleCetak" data-email="' + esc(x.email) + '" ' + (x.izin_cetak === '1' ? 'checked' : '') + ' aria-label="Izin Cetak"><span></span></span><b style="font-size:11px;' + (x.izin_cetak === '1' ? 'color:var(--primary)' : 'color:var(--text3)') + '">' + (x.izin_cetak === '1' ? 'DIIZINKAN' : 'TIDAK') + '</b></label>';
        return '<tr style="' + (mati ? 'opacity:.65' : '') + '"><td data-l="Nama"><span class="row gap8"><span class="avatar ' + (x.bahasa === 'INGGRIS' ? 'lt' : '') + '">' + esc(SP.inisial(x.nama)) + '</span><span class="nm"><b>' + esc(x.nama) + '</b><br><small class="muted">' + (x.peran === 'SUPERADMIN' ? 'Superadmin' : 'Tutor') + (x.nip ? ' · NIP. ' + esc(x.nip) : '') + '</small></span></span></td>' +
          '<td data-l="Surel" class="mono" style="font-size:12px">' + esc(x.email) + (x.no_hp ? '<br><a href="https://wa.me/' + esc(x.no_hp) + '" target="_blank" rel="noopener" style="color:var(--primary);font-size:11.5px;text-decoration:none" title="Hubungi via WhatsApp">📱 +' + esc(x.no_hp) + '</a>' : '') + '</td><td data-l="Rumpun">' + (x.bahasa ? '<span class="chip ' + (x.bahasa === 'ARAB' ? 'ok' : '') + '">' + SP.icon(x.bahasa === 'ARAB' ? 'edit' : 'globe', 'sm') + ' ' + esc(SP.bahasaLabel(x.bahasa)) + '</span>' : '<span class="muted3">-</span>') + '</td>' +
          '<td data-l="Kelas">' + (kd.length ? kd.map(function (n) { return '<span class="chip" style="margin:1px">' + esc(n) + '</span>'; }).join('') : '<i class="muted3">Tidak ada kelas</i>') + '</td>' +
          '<td data-l="Izin Cetak">' + izinCetakHtml + '</td>' +
          '<td data-l="Status"><label class="row gap8"><span class="switch"><input type="checkbox" data-ch="pguToggle" data-email="' + esc(x.email) + '" ' + (x.status === 'AKTIF' ? 'checked' : '') + ' ' + (x.email === SP.S.me.email ? 'disabled' : '') + ' aria-label="Aktif"><span></span></span><b style="font-size:11px;letter-spacing:.06em">' + (x.status === 'AKTIF' ? 'AKTIF' : 'NONAKTIF') + '</b></label></td>' +
          '<td data-l="Login" class="muted" style="font-size:12.5px">' + (x.terakhir_login ? SP.waktu(x.terakhir_login) : 'Belum pernah') + '</td><td><button class="btn btn-outline btn-sm" data-act="pguEditTutor" data-email="' + esc(x.email) + '">' + SP.icon('pencil', 'sm') + ' Edit</button></td></tr>';
      }).join('') : '<tr><td colspan="8">' + SP.kosong('users', 'Belum ada tutor', 'Klik “Daftarkan Tutor Baru” untuk menambahkan.') + '</td></tr>') + '</tbody></table></div><div class="tbl-foot"><span>Menampilkan ' + pg.dari + '–' + pg.sampai + ' dari <b>' + pg.total + '</b> pengguna terdaftar</span>' + SP.pagerHtml('pguHal', pg) + '</div>';
  };
  SP.parts.pguKelas = function () {
    const t = semTerpilih();
    const taAngkatan = t[0].slice(0, 4);
    const u = SP.ui.pgu;
    if (u.angkatan === undefined) u.angkatan = taAngkatan;
    const semOps = SP.opsiSemester();

    const semuaAngkatan = {};
    SP.S.kelas.forEach(function (k) { if (k.angkatan) semuaAngkatan[k.angkatan] = true; });
    if (taAngkatan) semuaAngkatan[taAngkatan] = true;
    const listAngkatan = Object.keys(semuaAngkatan).sort().reverse();

    let rows = SP.S.kelas.slice();
    if (u.angkatan) {
      rows = rows.filter(function (k) { return String(k.angkatan) === String(u.angkatan); });
    }
    rows.sort(function (a, b) { return a.nama < b.nama ? -1 : 1; });
    const jmlSem = function (id) {
      const s = {};
      (SP.S.km || []).forEach(function (r) {
        if (r.kelas_id === id && r.tahun_ajaran === t[0] && r.semester === t[1]) s[r.nim] = true;
      });
      return Object.keys(s).length;
    };
    const jmlTotal = function (id) {
      const s = {};
      (SP.S.km || []).forEach(function (r) {
        if (r.kelas_id === id) s[r.nim] = true;
      });
      return Object.keys(s).length;
    };
    const hitungMahasiswa = function (id) {
      const semN = jmlSem(id);
      const totN = jmlTotal(id);
      if (totN > semN && semN > 0) {
        return semN + ' <span class="muted" style="font-size:12px;font-weight:normal">(' + totN + ' total)</span>';
      }
      if (totN > 0 && semN === 0) {
        return '0 <span class="muted" style="font-size:12px;font-weight:normal">(' + totN + ' total riwayat)</span>';
      }
      return semN;
    };

    const toolbarKelas = '<div class="toolbar mb16">' +
      '<div class="field" style="min-width:240px;max-width:320px"><label for="pg-sem">Semester Roster</label><select id="pg-sem" class="select" data-ch="pguSem">' +
      semOps.map(function (o) { return '<option value="' + o.v + '" ' + (o.v === (t[0] + '|' + t[1]) ? 'selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="field" style="min-width:220px;max-width:300px"><label for="pg-angkatan">Filter Angkatan</label><select id="pg-angkatan" class="select" data-ch="pguAngkatan">' +
      '<option value="" ' + (!u.angkatan ? 'selected' : '') + '>Semua Angkatan</option>' +
      listAngkatan.map(function (a) { return '<option value="' + a + '" ' + (String(u.angkatan) === String(a) ? 'selected' : '') + '>Angkatan ' + a + (a === taAngkatan ? ' (Tahun Ini)' : '') + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="grow"></div>' +
      '<div class="muted" style="font-size:13px;align-self:flex-end;padding-bottom:10px">Menampilkan <b>' + rows.length + '</b> kelas' + (u.angkatan ? ' (Angkatan ' + esc(u.angkatan) + ')' : '') + '</div>' +
      '</div>';

    return toolbarKelas + '<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Nama kelas</th><th>Program studi</th><th>Angkatan</th><th>Mahasiswa (' + esc(SP.semLabel(t[1]) + ' ' + t[0]) + ')</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (k) { return '<tr><td data-l="Kelas"><b>' + esc(k.nama) + '</b></td><td data-l="Prodi">' + esc(k.prodi || '-') + '</td><td data-l="Angkatan" class="num">' + esc(k.angkatan) + '</td><td data-l="Mahasiswa" class="num">' + hitungMahasiswa(k.id) + '</td><td data-l="Status">' + SP.badge(k.status === 'ARSIP' ? 'ARSIP' : 'AKTIF') + '</td><td><div class="row gap4"><button class="btn btn-outline btn-sm" data-act="pguEditKelas" data-id="' + esc(k.id) + '">' + SP.icon('pencil', 'sm') + ' Edit</button><button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:rgba(220,38,38,0.35)" data-act="pguHapusKelas" data-id="' + esc(k.id) + '" title="Hapus Kelas ' + esc(k.nama) + '">' + SP.icon('trash', 'sm') + ' Hapus</button></div></td></tr>'; }).join('') : '<tr><td colspan="6">' + SP.kosong('book', 'Belum ada kelas untuk angkatan ini', 'Klik “Tambah Kelas Baru” untuk membuat kelas pada angkatan ini.') + '</td></tr>') + '</tbody></table></div>';
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
        (u.tab === 'kelas' ? '<div data-part="pguKelas">' + SP.parts.pguKelas() + '</div>' :
        '<div class="toolbar mb16"><div class="field" style="min-width:240px;max-width:320px"><label for="pg-sem">Semester Penugasan</label><select id="pg-sem" class="select" data-ch="pguSem">' + semOps.map(function (o) { return '<option value="' + o.v + '" ' + (o.v === (t[0] + '|' + t[1]) ? 'selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select></div><div class="grow"></div><div class="muted" style="font-size:13px;align-self:flex-end;padding-bottom:10px">Semester: <b>' + esc(SP.semLabel(t[1]) + ' ' + t[0]) + '</b></div></div><div data-part="pguMatriks">' + SP.parts.pguMatriks() + '</div>')) + '</div>';
    }
  };
  SP.actions.pguTab = function (el) { SP.ui.pgu.tab = el.dataset.v; SP.renderUlang(); };
  SP.inputs.pguQ = SP.debounce(function (el) { SP.ui.pgu.q = el.value; SP.ui.pgu.page = 1; SP.refresh('pguTabel'); }, 150);
  SP.changes.pguBahasa = function (el) { SP.ui.pgu.bahasa = el.value; SP.ui.pgu.page = 1; SP.refresh('pguTabel'); };
  SP.changes.pguStatus = function (el) { SP.ui.pgu.status = el.value; SP.ui.pgu.page = 1; SP.refresh('pguTabel'); };
  SP.changes.pguUrut = function (el) { SP.ui.pgu.urut = el.value; SP.refresh('pguTabel'); };
  SP.changes.pguSem = function (el) {
    SP.ui.pgu.sem = el.value;
    const semTa = el.value.split('|')[0];
    if (semTa) SP.ui.pgu.angkatan = semTa.slice(0, 4);
    SP.renderUlang();
  };
  SP.changes.pguAngkatan = function (el) { SP.ui.pgu.angkatan = el.value; SP.refresh('pguKelas'); };
  SP.actions.pguHal = function (el) { SP.ui.pgu.page = Number(el.dataset.p); SP.refresh('pguTabel'); };
  SP.actions.pguUnduh = function () { SP.unduhCsv('daftar-tutor.csv', ['Nama', 'Email', 'No WhatsApp', 'NIP', 'Peran', 'Bahasa', 'Izin Cetak', 'Status'], SP.S.pengguna.map(function (x) { return [x.nama, x.email, x.no_hp || '', x.nip, x.peran, x.bahasa, x.peran === 'SUPERADMIN' || x.izin_cetak === '1' ? 'Ya' : 'Tidak', x.status]; })); };

  async function simpanTutor(x) {
    try { await SP.api('tutorSimpan', x); await SP.muat(); SP.toast('Data tutor disimpan.'); return true; }
    catch (e) { SP.toast(esc(e.message), 'err', 8000); return false; }
  }
  SP.changes.pguToggle = async function (el) {
    const x = SP.X.user[el.dataset.email]; const status = el.checked ? 'AKTIF' : 'NONAKTIF';
    if (!(await simpanTutor({ email: x.email, nama: x.nama, nip: x.nip, peran: x.peran, bahasa: x.bahasa, status: status, izin_cetak: x.izin_cetak, no_hp: x.no_hp || '' }))) { el.checked = !el.checked; }
  };
  SP.changes.pguToggleCetak = async function (el) {
    const x = SP.X.user[el.dataset.email]; const izin = el.checked ? '1' : '0';
    if (!(await simpanTutor({ email: x.email, nama: x.nama, nip: x.nip, peran: x.peran, bahasa: x.bahasa, status: x.status, izin_cetak: izin, no_hp: x.no_hp || '' }))) { el.checked = !el.checked; }
  };
  function formTutor(x) {
    const baru = !x; x = x || { peran: 'TUTOR', bahasa: 'ARAB', status: 'AKTIF', izin_cetak: '0', no_hp: '' };
    const h = SP.modal({
      judul: baru ? 'Daftarkan Tutor Baru' : 'Ubah Data Tutor', lebar: 520,
      isi: '<div class="stack"><div class="field"><label for="ft-n">Nama lengkap &amp; gelar <span class="req">*</span></label><input id="ft-n" class="input" value="' + esc(x.nama || '') + '"></div>' +
        '<div class="grid2"><div class="field"><label for="ft-e">Email Google <span class="req">*</span></label><input id="ft-e" type="email" class="input" value="' + esc(x.email || '') + '" ' + (baru ? '' : 'readonly') + ' placeholder="nama@lembaga.ac.id"><div class="help">Email akun Google untuk login.</div></div>' +
        '<div class="field"><label for="ft-hp">Nomor WhatsApp (Notifikasi)</label><input id="ft-hp" class="input mono" value="' + esc(x.no_hp || '') + '" placeholder="081234567890"><div class="help">Untuk notifikasi penugasan &amp; pengganti.</div></div></div>' +
        '<div class="grid2"><div class="field"><label for="ft-i">NIP / NIDN</label><input id="ft-i" class="input" value="' + esc(x.nip || '') + '"></div><div class="field"><label for="ft-b">Rumpun bahasa</label><select id="ft-b" class="select">' + opt([['ARAB', 'Bahasa Arab'], ['INGGRIS', 'Bahasa Inggris'], ['', '(Tanpa Rumpun)']], x.bahasa) + '</select></div></div>' +
        '<div class="grid2"><div class="field"><label for="ft-p">Peran</label><select id="ft-p" class="select">' + opt([['TUTOR', 'Tutor'], ['SUPERADMIN', 'Superadmin']], x.peran) + '</select></div><div class="field"><label for="ft-s">Status</label><select id="ft-s" class="select">' + opt([['AKTIF', 'Aktif'], ['NONAKTIF', 'Nonaktif']], x.status) + '</select></div></div>' +
        '<div class="callout ok" style="padding:12px 14px"><label class="chk"><input type="checkbox" id="ft-ic" ' + (x.izin_cetak === '1' ? 'checked' : '') + '> <b>Beri hak akses Cetak Sertifikat</b></label><div class="help" style="margin-left:24px;margin-top:4px">Izinkan tutor ini mengakses modul Cetak Sertifikat dan menerbitkan/mengunduh PDF sertifikat.</div></div></div>',
      footer: '<button class="btn btn-outline" data-act="tutupModal">Batal</button><button class="btn btn-primary" id="ft-simpan">Simpan</button>'
    });
    h.el.querySelector('#ft-simpan').addEventListener('click', async function (e) {
      const b = e.currentTarget; b.disabled = true;
      const ic = SP.$('#ft-ic', h.el);
      const hpEl = SP.$('#ft-hp', h.el);
      const ok = await simpanTutor({
        email: SP.$('#ft-e', h.el).value,
        nama: SP.$('#ft-n', h.el).value,
        nip: SP.$('#ft-i', h.el).value,
        no_hp: hpEl ? hpEl.value : '',
        peran: SP.$('#ft-p', h.el).value,
        bahasa: SP.$('#ft-b', h.el).value,
        status: SP.$('#ft-s', h.el).value,
        izin_cetak: ic && ic.checked ? '1' : '0'
      });
      if (ok) h.tutup(); else b.disabled = false;
    });
  }
  SP.actions.pguTambahTutor = function () { formTutor(null); };
  SP.actions.pguEditTutor = function (el) { formTutor(SP.X.user[el.dataset.email]); };
  function formKelas(k) {
    const t = semTerpilih();
    const taAngkatan = t[0].slice(0, 4);
    const baru = !k;
    k = k || { status: 'AKTIF', angkatan: (SP.ui.pgu && SP.ui.pgu.angkatan) || taAngkatan || (SP.set().tahun_ajaran_aktif || '').slice(0, 4) };
    const h = SP.modal({
      judul: baru ? 'Tambah Kelas Baru' : 'Ubah Kelas', lebar: 480,
      isi: '<div class="stack"><div class="field"><label for="fk-n">Nama kelas <span class="req">*</span></label><input id="fk-n" class="input" value="' + esc(k.nama || '') + '" placeholder="mis. PAI A"></div><div class="field"><label for="fk-p">Program studi</label><input id="fk-p" class="input" value="' + esc(k.prodi || '') + '" placeholder="mis. Pendidikan Agama Islam"></div>' +
        '<div class="grid2"><div class="field"><label for="fk-a">Angkatan <span class="req">*</span></label><input id="fk-a" class="input" value="' + esc(k.angkatan || '') + '" maxlength="4"></div><div class="field"><label for="fk-s">Status</label><select id="fk-s" class="select">' + opt([['AKTIF', 'Aktif'], ['ARSIP', 'Arsip']], k.status) + '</select></div></div></div>',
      footer: (baru ? '' : '<button class="btn btn-outline" style="color:var(--danger);border-color:rgba(220,38,38,0.4);margin-right:auto" data-act="pguHapusKelas" data-id="' + esc(k.id) + '">' + SP.icon('trash') + ' Hapus Kelas</button>') +
        '<button class="btn btn-outline" data-act="tutupModal">Batal</button><button class="btn btn-primary" id="fk-simpan">Simpan</button>'
    });
    h.el.querySelector('#fk-simpan').addEventListener('click', async function (e) {
      const b = e.currentTarget; b.disabled = true;
      try { await SP.api('kelasSimpan', { id: k.id || '', nama: SP.$('#fk-n', h.el).value, prodi: SP.$('#fk-p', h.el).value, angkatan: SP.$('#fk-a', h.el).value, status: SP.$('#fk-s', h.el).value }); await SP.muat(); h.tutup(); SP.toast('Kelas disimpan.'); }
      catch (err) { b.disabled = false; SP.toast(esc(err.message), 'err', 8000); }
    });
  }
  SP.actions.pguTambahKelas = function () { formKelas(null); };
  SP.actions.pguEditKelas = function (el) { formKelas(SP.X.kelas[el.dataset.id]); };
  SP.actions.pguHapusKelas = async function (el) {
    const id = el.dataset.id;
    const k = SP.X.kelas[id];
    if (!k) return;

    let nMahasiswa = 0;
    (SP.S.km || []).forEach(function (r) { if (r.kelas_id === id) nMahasiswa++; });
    let nPenugasan = 0;
    (SP.S.penugasan || []).forEach(function (p) { if (p.kelas_id === id) nPenugasan++; });

    let pesan = 'Apakah Anda yakin ingin menghapus Master Kelas <b>' + esc(k.nama) + '</b>?';
    if (nMahasiswa > 0 || nPenugasan > 0) {
      pesan += '<br><br><span style="color:var(--danger);font-size:13px">Perhatian: Terdata <b>' + nMahasiswa + ' pendaftaran mahasiswa</b> dan <b>' + nPenugasan + ' penugasan tutor</b> pada kelas ini. Menghapus kelas akan menghapus relasi penugasan kelas ini.</span>';
    } else {
      pesan += '<br><br><span class="muted" style="font-size:13px">Kelas ini belum memiliki pendaftaran mahasiswa dan aman untuk dihapus.</span>';
    }

    const ya = await SP.konfirmasi({
      judul: 'Hapus Master Kelas',
      pesan: pesan,
      bahaya: true,
      ya: 'Ya, Hapus Kelas',
      batal: 'Batal'
    });
    if (!ya) return;

    SP.tutupModal();
    try {
      await SP.api('kelasHapus', { id: id, paksa: true });
      SP.S.kelas = SP.S.kelas.filter(function (x) { return x.id !== id; });
      SP.S.penugasan = SP.S.penugasan.filter(function (p) { return p.kelas_id !== id; });
      SP.S.km = SP.S.km.filter(function (r) { return r.kelas_id !== id; });
      SP.indeks();
      SP.simpanCache();
      SP.toast('Kelas <b>' + esc(k.nama) + '</b> berhasil dihapus.', 'ok');
      SP.renderUlang();
    } catch (e) {
      SP.toast(esc(e.message), 'err', 8000);
    }
  };
  SP.actions.pguPenugasan = function (el) {
    const k = SP.X.kelas[el.dataset.id], t = semTerpilih(), tk = SP.tutorKelas(k.id, t[0], t[1]);
    const tutor = function (b) { return SP.S.pengguna.filter(function (u) { return u.status === 'AKTIF' && u.bahasa === b; }).map(function (u) { return [u.email, u.nama]; }); };
    const h = SP.modal({
      judul: 'Penugasan Tutor: ' + k.nama, lebar: 520,
      isi: '<p class="muted mb16">' + esc(SP.semLabel(t[1]) + ' ' + t[0]) + '</p><div class="stack"><div class="field"><label for="pn-a">Tutor Bahasa Arab</label><select id="pn-a" class="select"><option value="">(Pilih)</option>' + opt(tutor('ARAB'), tk.ARAB ? tk.ARAB.tutor_email : '') + '</select></div>' +
        '<div class="field"><label for="pn-i">Tutor Bahasa Inggris</label><select id="pn-i" class="select"><option value="">(Pilih)</option>' + opt(tutor('INGGRIS'), tk.INGGRIS ? tk.INGGRIS.tutor_email : '') + '</select></div>' +
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
    const jumlah = function (id) { const q = {}; (SP.S.km || []).forEach(function (r) { if (r.kelas_id === id && r.tahun_ajaran === t[0] && r.semester === t[1]) q[r.nim] = true; }); return Object.keys(q).length; };
    const kel = m ? SP.kelulusan(m.nim) : null;
    const sem = SP.opsiSemester().map(function (o) { return [o.v, o.label]; });
    return '<div class="grid-main" style="grid-template-columns:1fr 1.3fr"><div class="card card-p"><div class="row between mb16"><div class="row gap8"><span class="stepno">1</span><h2 class="h3">Pilih Mahasiswa</h2></div><span class="cap">Identitas target</span></div>' +
      '<div class="field" style="position:relative"><label for="pd-q">Pencarian mahasiswa aktif</label><input id="pd-q" class="input" placeholder="Ketik NIM atau nama…" data-in="pindQ" autocomplete="off" value="' + esc(m ? m.nim + ' - ' + m.nama : u.q) + '"><div id="pd-sug"></div></div>' +
      (m ? '<div class="card card-p20 mt16" style="background:var(--callout);border-color:var(--callout-bd)"><div class="row top"><span class="avatar" style="width:52px;height:52px">' + esc(SP.inisial(m.nama)) + '</span><div><span class="badge b-solid">Mahasiswa terpilih</span><h3 class="h2 mt8">' + esc(m.nama) + '</h3><div class="muted" style="font-size:13px"><span class="mono">NIM ' + esc(m.nim) + '</span> · Angkatan ' + esc(m.angkatan || '-') + '</div></div></div>' +
        '<div class="mt16"><div class="cap">Status rombongan belajar</div><div class="row between mt8" style="background:#fff;border-radius:8px;padding:10px 12px"><span class="muted">Kelas saat ini</span><span class="chip">' + esc(cur ? cur.nama + ' (' + SP.semLabel(t[1]) + ' ' + t[0] + ')' : 'Belum terdaftar') + '</span></div></div>' +
        '<div class="mt16"><div class="row between"><span class="cap">Riwayat nilai bawaan (terkunci)</span><span class="chip ok">' + SP.icon('lock', 'sm') + ' Siap transfer</span></div>' + SP.PROGRAM.map(function (p) { return '<div class="row between mt8" style="background:#fff;border-radius:8px;padding:8px 12px"><span>' + esc(SP.PROG_LABEL[p]) + '</span>' + SP.badge(kel.program[p], null, true) + '</div>'; }).join('') + '<p class="muted mt8" style="font-size:12.5px;font-style:italic">* Nilai terikat pada NIM dan program, sehingga otomatis ikut ke kelas baru.</p></div></div>' : '<div class="empty" style="padding:28px">' + SP.icon('search', 'xl') + '<p class="mt8">Cari dan pilih mahasiswa untuk dipindahkan.</p></div>') + '</div>' +
      '<div class="card card-p"><div class="row between mb16"><div class="row gap8"><span class="stepno" style="background:var(--accent)">2</span><h2 class="h3">Konfigurasi Kelas Tujuan &amp; Alasan Mutasi</h2></div></div><div class="stack">' +
      '<div class="field"><label for="pd-s">Semester efektif</label><select id="pd-s" class="select" data-ch="pindSem">' + opt(sem, t[0] + '|' + t[1]) + '</select></div>' +
      '<div class="field"><div class="row between"><label class="lbl" for="pd-k">Kelas tujuan mahasiswa</label><span class="muted" style="font-size:12px">' + (u.tujuan ? jumlah(u.tujuan) + ' mahasiswa terdaftar' : '') + '</span></div><select id="pd-k" class="select" data-ch="pindKelas">' + opt(kels.map(function (k) { return [k.id, k.nama + (k.prodi ? ': ' + k.prodi : '')]; }), u.tujuan) + '</select>' +
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
  // PENGATURAN & LOG + MODUL WHATSAPP FONNTE, BLAST & CRM
  // ============================================================
  SP.ui.set = SP.ui.set || {
    tab: 'set', f: null, aset: {}, certSisi: 'DUA', log: null, logQ: '', logAksi: '', logPage: 1,
    waSub: 'konfig', waTplKey: 'sertifikat', waUjiHp: '',
    blastTarget: 'MAHASISWA_SEMUA', blastAngkatan: '', blastKelas: '', blastBatchSize: 20, blastPesan: '',
    blastState: null,
    crmTipe: 'MAHASISWA', crmStatus: '', crmQ: '', crmPage: 1
  };
  const KUNCI_FORM = ['nama_lembaga', 'tahun_ajaran_aktif', 'semester_aktif', 'mode_penilaian', 'batas_penilaian', 'target_kelulusan', 'kkm', 'kontak_bantuan', 'frontend_url', 'kuota_email_harian', 'template_slides_id',
    'ttd1_nama', 'ttd1_jabatan', 'ttd1_nip', 'ttd2_nama', 'ttd2_jabatan', 'ttd2_nip', 'format_nomor', 'email_otomatis', 'email_lampirkan_pdf', 'email_bcc', 'email_subjek', 'email_body',
    'wa_aktif', 'wa_delay', 'wa_evt_sertifikat', 'wa_evt_mengulang', 'wa_evt_jadwal_ulang', 'wa_evt_penugasan', 'wa_evt_pengganti',
    'wa_tpl_sertifikat', 'wa_tpl_mengulang', 'wa_tpl_jadwal_ulang', 'wa_tpl_penugasan', 'wa_tpl_pengganti', 'wa_tpl_blast'];
  function formAwal() { const o = {}; KUNCI_FORM.forEach(function (k) { o[k] = SP.set()[k] === undefined ? '' : String(SP.set()[k]); }); return o; }
  function berubah() { const f = SP.ui.set.f, a = formAwal(); return KUNCI_FORM.filter(function (k) { return f[k] !== a[k]; }); }

  SP.parts.setCertPreview = function () {
    const u = SP.ui.set;
    const sisi = u.certSisi || 'DUA';
    const sampleMhs = (SP.S.mahasiswa || []).filter(function (m) { return SP.kelulusan(m.nim).akhir === 'LULUS'; })[0];
    const info = SP.rincianSertifikatMhs(sampleMhs ? sampleMhs.nim : '', u.f || SP.set());
    const aset = u.aset || {};
    const htmlDepan = SP.renderSertifikatDepanHtml ? SP.renderSertifikatDepanHtml(info, aset) : '';
    const htmlBelakang = SP.renderSertifikatBelakangHtml ? SP.renderSertifikatBelakangHtml(info, aset) : '';
    let konten = '';
    if (sisi === 'DEPAN') {
      konten = '<div class="cert-side-block"><div class="cert-side-label"><span>' + SP.icon('award', 'sm') + ' Sisi Depan: Keterangan Kelulusan &amp; Identitas</span><span class="badge b-solid">HALAMAN 1</span></div>' + htmlDepan + '</div>';
    } else if (sisi === 'BELAKANG') {
      konten = '<div class="cert-side-block"><div class="cert-side-label"><span>' + SP.icon('list', 'sm') + ' Sisi Belakang: Transkrip Skor Kelulusan 4 Program</span><span class="badge b-info">HALAMAN 2</span></div>' + htmlBelakang + '</div>';
    } else {
      konten = '<div class="cert-wrap two-sides">' +
        '<div class="cert-side-block"><div class="cert-side-label"><span>' + SP.icon('award', 'sm') + ' Sisi Depan: Keterangan Kelulusan</span><span class="badge b-solid">HALAMAN 1</span></div>' + htmlDepan + '</div>' +
        '<div class="cert-side-block"><div class="cert-side-label"><span>' + SP.icon('list', 'sm') + ' Sisi Belakang: Skor 4 Program</span><span class="badge b-info">HALAMAN 2</span></div>' + htmlBelakang + '</div>' +
      '</div>';
    }
    return '<div class="sigbox" style="background:#F8FAFC;border:1px solid var(--border);padding:14px">' +
      '<div class="row between wrap gap8 mb16"><div><b style="font-size:13.5px">Pratinjau Langsung Template Sertifikat 2 Sisi</b><div class="muted" style="font-size:12px">Perubahan nama lembaga, KKM, format nomor, tanda tangan, dan logo langsung tercermin di bawah.</div></div>' +
      '<div class="row wrap gap8"><div class="seg"><button class="' + (sisi === 'DUA' ? 'on' : '') + '" data-act="setCertSisi" data-v="DUA">2 Sisi</button><button class="' + (sisi === 'DEPAN' ? 'on' : '') + '" data-act="setCertSisi" data-v="DEPAN">Sisi Depan</button><button class="' + (sisi === 'BELAKANG' ? 'on' : '') + '" data-act="setCertSisi" data-v="BELAKANG">Sisi Belakang</button></div>' +
      '<button class="btn btn-outline btn-sm" data-act="setCetakContoh2Sisi">' + SP.icon('printer', 'sm') + ' Cetak Contoh 2 Sisi</button></div></div>' +
      konten + '</div>';
  };

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
    const f = SP.ui.set.f, q = SP.S.meta.kuotaEmail || { sisa: 0, total: 1500, terpakai: 0 };
    const sisaKuota = typeof q.sisa === 'number' ? q.sisa : 0;
    const nSert = SP.S.sert.filter(function (s) { return s.file_id; }).length;
    const terkirimHariIni = (SP.S.sert || []).filter(function (s) {
      return s.status_email === 'TERKIRIM' && String(s.waktu_email || '').indexOf(SP.hariIni()) === 0;
    }).length;
    const totalKapasitas = Math.max(Number(f.kuota_email_harian) || q.total || 1500, sisaKuota + terkirimHariIni);
    const pctTersedia = Math.min(100, Math.round((sisaKuota / (totalKapasitas || 1)) * 100));
    const tokenDepan = ['{NAMA_MAHASISWA}', '{NIM}', '{PRODI}', '{KELAS}', '{ANGKATAN}', '{NOMOR_SERTIFIKAT}', '{TANGGAL_TERBIT}', '{NAMA_LEMBAGA}', '{TTD1_NAMA}', '{TTD1_JABATAN}', '{TTD1_NIP}', '{TTD2_NAMA}', '{TTD2_JABATAN}', '{TTD2_NIP}'];
    const tokenBelakang = ['{KKM}', '{NILAI_ARB_GJL}', '{NILAI_ING_GJL}', '{NILAI_ARB_GNP}', '{NILAI_ING_GNP}', '{HURUF_ARB_GJL}', '{HURUF_ING_GJL}', '{HURUF_ARB_GNP}', '{HURUF_ING_GNP}', '{PREDIKAT_ARB_GJL}', '{PREDIKAT_ING_GJL}', '{PREDIKAT_ARB_GNP}', '{PREDIKAT_ING_GNP}', '{NILAI_RATA_RATA}', '{HURUF_AKHIR}', '{PREDIKAT_AKHIR}'];
    const log = SP.S.pengguna.length ? '' : '';
    return '<div class="grid-main" style="grid-template-columns:1.7fr 1fr"><div class="stack">' +
      '<div class="card card-p"><div class="row between mb16"><div class="row gap8"><span style="color:var(--primary)">' + SP.icon('building', 'lg') + '</span><h2 class="h2">1. Informasi Lembaga &amp; Status Penilaian</h2></div><span class="tagx">MODUL INTI</span></div><div class="stack">' +
      inp('nama_lembaga', 'Nama lembaga akademik', { help: 'Dicantumkan pada sertifikat dan email resmi.' }) +
      '<div class="grid2"><div class="field"><label for="s-ta">Tahun akademik aktif</label><select id="s-ta" class="select" data-ch="setF" data-k="tahun_ajaran_aktif">' + opt(SP.daftarTahunAjaran().map(function (ta) { return [ta, ta + (ta === f.tahun_ajaran_aktif ? ' (Aktif)' : '')]; }), f.tahun_ajaran_aktif) + '</select><div class="help">Pilih tahun ajaran yang sedang aktif berjalan.</div></div><div class="field"><label for="s-sm">Semester aktif</label><select id="s-sm" class="select" data-ch="setF" data-k="semester_aktif">' + opt([['GANJIL', 'Ganjil'], ['GENAP', 'Genap']], f.semester_aktif) + '</select><div class="help">Pilih semester perkuliahan (Ganjil / Genap).</div></div></div>' +
      '<div class="grid2">' + inp('batas_penilaian', 'Batas akhir finalisasi nilai', { type: 'date', help: 'Batas akhir waktu pengisian nilai bagi tutor.' }) + '<div class="field"><label>Status penguncian nilai</label><div class="seg lg"><button class="' + (f.mode_penilaian === 'AKTIF' ? 'on' : '') + '" data-act="setMode" data-v="AKTIF">' + SP.icon('lock', 'sm') + ' Penilaian aktif / terbuka</button><button class="' + (f.mode_penilaian === 'TERKUNCI' ? 'on' : '') + '" data-act="setMode" data-v="TERKUNCI">Terkunci</button></div><div class="help">Bila terkunci, tutor hanya dapat melihat nilai.</div></div></div>' +
      '<div class="grid3">' + inp('target_kelulusan', 'Target kelulusan (%)', { type: 'number', help: 'Target capaian kelulusan institusi.' }) + inp('kkm', 'Standar KKM Program (0–100)', { type: 'number', help: 'Batas minimal nilai kelulusan program.' }) + inp('kontak_bantuan', 'Kontak bantuan login', { ph: 'email / WhatsApp admin', help: 'Ditampilkan pada panduan login.' }) + '</div></div></div>' +
      '<div class="card card-p"><div class="row between mb16"><div class="row gap8"><span style="color:var(--accent)">' + SP.icon('award', 'lg') + '</span><h2 class="h2">2. Template Sertifikat 2 Sisi (Depan &amp; Belakang) &amp; Tanda Tangan Digital</h2></div><span class="tagx">2 SISI · DRIVE SYNC</span></div><div class="stack">' +
      '<div class="filerow"><div class="fi">' + SP.icon('file') + '</div><div class="grow"><b>' + (f.template_slides_id ? 'Template Google Slides 2 Sisi aktif' : 'Belum ada template') + '</b> ' + (f.template_slides_id ? '<span class="badge b-solid">AKTIF</span>' : '') + '<div class="muted mono" style="font-size:11.5px">ID: ' + esc(f.template_slides_id || '-') + ' · Slide 1: Sisi Depan (Keterangan Lulus) · Slide 2: Sisi Belakang (Transkrip Skor 4 Program)</div></div>' + (f.template_slides_id ? '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://docs.google.com/presentation/d/' + esc(f.template_slides_id) + '/edit">' + SP.icon('eye', 'sm') + ' Buka &amp; sunting</a>' : '') + '<button class="btn btn-primary btn-sm" data-act="setBuatTemplate">' + SP.icon('refresh', 'sm') + ' Buat template 2 sisi bawaan</button></div>' +
      inp('template_slides_id', 'Atau tempel URL / ID Google Slides template sendiri (2 Slide: Depan & Belakang)', { mono: true, help: 'Slide 1 digunakan untuk Sisi Depan (Keterangan Lulus) dan Slide 2 untuk Sisi Belakang (Skor 4 Program). Jika template hanya memiliki 1 slide, sistem otomatis menambahkan Slide 2 saat mencetak PDF.' }) +
      '<div class="stack" style="gap:10px"><div><div class="cap" style="margin-bottom:6px">Token Sisi Depan: Keterangan Kelulusan &amp; Identitas (klik untuk menyalin)</div><div class="tokens">' + tokenDepan.map(function (t) { return '<span class="token" data-act="salinToken" data-v="' + t + '">' + t + ' ' + SP.icon('copy', 'sm') + '</span>'; }).join('') + '</div></div>' +
      '<div><div class="cap" style="margin-bottom:6px">Token Sisi Belakang: Transkrip Skor 4 Program (klik untuk menyalin)</div><div class="tokens">' + tokenBelakang.map(function (t) { return '<span class="token" data-act="salinToken" data-v="' + t + '">' + t + ' ' + SP.icon('copy', 'sm') + '</span>'; }).join('') + '</div></div></div>' +
      '<div class="grid2">' + kartuTtd(1) + kartuTtd(2) + '</div>' +
      '<div class="sigbox row"><div class="sigprev" style="width:90px;height:60px;margin:0">' + (SP.ui.set.aset.logo ? '<img src="' + SP.ui.set.aset.logo + '" alt="Logo">' : SP.icon('image')) + '</div><div class="grow"><b>Logo lembaga (opsional)</b><div class="muted" style="font-size:12.5px">Ditampilkan di bagian atas sertifikat (Sisi Depan &amp; Sisi Belakang).</div></div><label class="btn btn-outline btn-sm" style="cursor:pointer">' + SP.icon('upload', 'sm') + ' Unggah<input type="file" accept="image/png,image/jpeg" class="hide" data-ch="setAset" data-k="logo"></label></div>' +
      '<div class="grid2">' + inp('format_nomor', 'Format nomor sertifikat', { mono: true, help: 'Gunakan {TAHUN}, {BULAN}, {URUT}.', ph: 'CERT/ARB-ENG/{TAHUN}/{URUT}' }) + inp('frontend_url', 'URL aplikasi (untuk QR verifikasi)', { ph: 'https://username.github.io/sipena', help: 'Kosongkan jika tidak ingin QR pada sertifikat.' }) + '</div>' +
      '<div data-part="setCertPreview">' + SP.parts.setCertPreview() + '</div></div></div>' +
      '<div class="card card-p"><div class="row between mb16"><div class="row gap8"><span style="color:var(--primary)">' + SP.icon('mail', 'lg') + '</span><h2 class="h2">3. Template Notifikasi Email Otomatis</h2></div><span class="tagx">MAILAPP</span></div><div class="stack">' +
      inp('email_subjek', 'Subjek email penerbitan sertifikat') + inp('email_body', 'Isi pesan email (teks biasa, mendukung token)', { area: true, tinggi: 170 }) +
      '<div class="row wrap" style="gap:20px"><label class="chk"><input type="checkbox" data-ch="setChk" data-k="email_otomatis" ' + (f.email_otomatis === '1' ? 'checked' : '') + '><span>Antrekan email otomatis saat sertifikat terbit</span></label><label class="chk"><input type="checkbox" data-ch="setChk" data-k="email_lampirkan_pdf" ' + (f.email_lampirkan_pdf === '1' ? 'checked' : '') + '><span>Lampirkan berkas PDF sertifikat</span></label></div>' +
      '<div class="grid2">' + inp('email_bcc', 'BCC salinan ke arsip Superadmin (opsional)', { type: 'email' }) + inp('kuota_email_harian', 'Kuota email harian akun (Workspace 1500 / gratis 100)', { type: 'number' }) + '</div>' +
      '<div class="row between wrap callout" style="padding:10px 14px"><span class="muted">Kirim salinan rendering ke email Anda saat ini: <b class="mono">' + esc(SP.S.me.email) + '</b></span><button class="btn btn-outline btn-sm" data-act="setEmailUji">' + SP.icon('send', 'sm') + ' Kirim Email Uji Coba ke Saya</button></div></div></div>' +
      '<div class="card card-p" style="border:1.5px solid rgba(220,38,38,0.35);background:rgba(254,242,242,0.45)"><div class="row between mb16"><div class="row gap8"><span style="color:var(--danger)">' + SP.icon('trash', 'lg') + '</span><div><h2 class="h2" style="color:var(--danger)">4. Pembersihan &amp; Reset Data Sistem (Zona Bahaya)</h2><p class="muted" style="font-size:13px">Pengosongan data mahasiswa, kelas, atau seluruh catatan akademik untuk memulai siklus / kebijakan baru.</p></div></div><span class="chip bad">ZONA BAHAYA</span></div>' +
      '<div class="stack gap12"><p style="font-size:13px;line-height:1.6;color:var(--text2)">Fitur ini digunakan saat institusi ingin memulai tahun akademik atau kebijakan kurikulum baru dari kondisi bersih tanpa ada data pengujian (dummy). Untuk kepatuhan audit data kampus, <b>sistem mewajibkan pengunduhan Master Backup</b> sebelum proses pengosongan dapat dijalankan.</p>' +
      '<div class="row wrap gap12"><button class="btn btn-outline" data-act="bukaModalResetSistem" style="color:var(--danger);border-color:rgba(220,38,38,0.4)">' + SP.icon('trash') + ' Buka Opsi Reset &amp; Kosongkan Data…</button></div></div></div></div>' +
      '<div class="stack"><div class="card card-p"><div class="row gap8 mb16"><span style="color:var(--primary)">' + SP.icon('zap', 'lg') + '</span><h2 class="h3">Kuota Layanan Cloud &amp; Email</h2></div>' +
      '<div class="callout" style="padding:14px;border-radius:10px;background:#F0FDF4;border:1px solid #BBF7D0"><div class="grow">' +
      '<div class="row between"><span style="font-weight:600;display:flex;align-items:center;gap:6px">' + SP.icon('mail', 'sm') + ' Sisa Kuota Gmail / MailApp</span><b class="num" style="color:var(--primary);font-size:14px">' + SP.n(sisaKuota) + ' <small style="font-weight:500;color:var(--text2)">/ ' + SP.n(totalKapasitas) + '</small></b></div>' +
      '<div class="mt8"><div class="prog" style="height:8px;background:#DCFCE7"><i style="width:' + pctTersedia + '%;background:' + (pctTersedia <= 15 ? 'var(--danger)' : (pctTersedia <= 30 ? '#F97316' : 'var(--primary)')) + '"></i></div></div>' +
      '<div class="row between mt8 muted" style="font-size:12px"><span><b>' + pctTersedia + '%</b> kuota siap kirim (' + SP.n(terkirimHariIni) + ' terkirim hari ini)</span><span>Reset otomatis 00.00 WIB</span></div></div></div>' +
      '<div class="callout mt8" style="padding:12px"><div class="grow"><div class="row between"><span>' + SP.icon('folder', 'sm') + ' Google Drive PDF</span><b class="num">' + SP.n(nSert) + '</b></div><div class="muted" style="font-size:12px">berkas sertifikat terbit</div></div></div>' +
      '<div class="callout ok mt8" style="padding:12px"><div class="ic" style="width:32px;height:32px">' + SP.icon('shieldCheck') + '</div><div class="tx"><b>Pengaman waktu eksekusi aktif.</b> Pencetakan dipecah per kloter (3 sertifikat) untuk menjaga stabilitas sistem dan efisiensi waktu eksekusi. Data di-cache untuk respons cepat.</div></div></div>' +
      '<div class="card card-p"><div class="row between mb16"><h2 class="h3">' + SP.icon('history') + ' Snapshot jejak audit</h2><button type="button" class="btn btn-ghost btn-sm" data-act="setTabLog" style="font-size:12px;letter-spacing:.06em">SEMUA LOG →</button></div><div id="set-snap"><div class="sk" style="height:90px"></div></div></div></div></div>' + log;
  };
  // ============================================================
  // MODUL WHATSAPP FONNTE, MATRIKS EVENT, BLAST PER BATCH & CRM
  // ============================================================
  function daftarTargetBlast() {
    const u = SP.ui.set;
    const tipe = u.blastTarget || 'MAHASISWA_SEMUA';
    if (tipe === 'TUTOR_SEMUA') {
      return (SP.S.pengguna || []).filter(function (x) { return x.status === 'AKTIF' && x.no_hp; }).map(function (x) {
        return {
          id: x.email,
          nama: x.nama,
          email: x.email,
          no_hp: x.no_hp,
          nim: '-',
          kelas: '-',
          prodi: x.bahasa || '-',
          angkatan: '-',
          peran: x.peran === 'SUPERADMIN' ? 'Superadmin' : 'Tutor'
        };
      });
    }
    const baris = SP.barisKelulusan().filter(function (b) {
      if (b.m.status === 'NONAKTIF') return false;
      if (!b.m.no_hp) return false;
      if (u.blastAngkatan && String(b.m.angkatan) !== String(u.blastAngkatan)) return false;
      if (u.blastKelas && (!b.kelas || b.kelas.id !== u.blastKelas)) return false;
      if (tipe === 'MAHASISWA_LULUS') return b.akhir === 'LULUS';
      if (tipe === 'MAHASISWA_ULANG') return b.akhir === 'WAJIB_MENGULANG';
      return true;
    });
    return baris.map(function (b) {
      return {
        id: b.m.nim,
        nama: b.m.nama,
        email: b.m.email || '',
        no_hp: b.m.no_hp,
        nim: b.m.nim,
        kelas: b.kelas ? b.kelas.nama : '-',
        prodi: b.kelas ? (b.kelas.prodi || '-') : '-',
        angkatan: b.m.angkatan || '-',
        peran: 'Mahasiswa'
      };
    });
  }

  function badgeStatusWa(st, noHp) {
    if (!noHp) return '<span class="badge b-muted">Kosong</span>';
    if (st === 'AKTIF') return '<span class="badge b-ok">' + SP.icon('check', 'sm') + ' WA Aktif</span>';
    if (st === 'TIDAK_ADA') return '<span class="badge b-bad">' + SP.icon('x', 'sm') + ' Tidak Terdaftar</span>';
    return '<span class="badge b-warn">Belum Dicek</span>';
  }

  SP.parts.waIsi = function () {
    const u = SP.ui.set;
    if (!u.f) u.f = formAwal();
    const f = u.f;
    const sub = u.waSub || 'konfig';
    const meta = SP.S.meta || {};
    const tokenOk = !!meta.fonnteTerpasang;
    const tokenMask = meta.fonnteMask || '';

    const allMhs = SP.S.mahasiswa || [];
    const allUsr = SP.S.pengguna || [];
    const mhsAdaHp = allMhs.filter(function (m) { return !!m.no_hp; }).length;
    const usrAdaHp = allUsr.filter(function (x) { return !!x.no_hp; }).length;
    const waAktifCount = allMhs.filter(function (m) { return m.status_wa === 'AKTIF'; }).length + allUsr.filter(function (x) { return x.status_wa === 'AKTIF'; }).length;

    const subNav = '<div class="filters mb16">' +
      '<button class="fchip ' + (sub === 'konfig' ? 'on' : '') + '" data-act="waSubTab" data-v="konfig">' + SP.icon('sliders', 'sm') + ' 1. Gateway Fonnte &amp; Matriks Event Otomatis</button>' +
      '<button class="fchip ' + (sub === 'blast' ? 'on' : '') + '" data-act="waSubTab" data-v="blast">' + SP.icon('send', 'sm') + ' 2. WA Blast Pengumuman Per Batch</button>' +
      '<button class="fchip ' + (sub === 'crm' ? 'on' : '') + '" data-act="waSubTab" data-v="crm">' + SP.icon('users', 'sm') + ' 3. CRM Kontak &amp; Deteksi Nomor WA <span class="n">' + (mhsAdaHp + usrAdaHp) + '</span></button>' +
    '</div>';

    if (sub === 'konfig') {
      const evtList = [
        ['wa_evt_sertifikat', 'sertifikat', 'Sertifikat Lulus 4 Program Terbit', 'Kirim WA otomatis ke mahasiswa saat PDF sertifikat diterbitkan.'],
        ['wa_evt_mengulang', 'mengulang', 'Status Nilai Wajib Mengulang', 'Kirim WA otomatis ke mahasiswa yang tercatat Tidak Lulus saat tutor menyimpan nilai.'],
        ['wa_evt_jadwal_ulang', 'jadwal_ulang', 'Jadwal Kelas Pengulangan Ditetapkan', 'Kirim WA otomatis ke mahasiswa saat Superadmin menetapkan kelas pengulangan.'],
        ['wa_evt_penugasan', 'penugasan', 'Penugasan Tutor Kelas Baru', 'Kirim WA otomatis ke tutor saat ditugaskan mengampu kelas.'],
        ['wa_evt_pengganti', 'pengganti', 'Penunjukan Tutor Pengganti', 'Kirim WA otomatis ke tutor pengganti saat pelimpahan kelas disimpan.']
      ];
      const tplKey = u.waTplKey || 'sertifikat';
      const tokenWa = ['{NAMA_MAHASISWA}', '{NIM}', '{KELAS}', '{PRODI}', '{ANGKATAN}', '{PROGRAM}', '{NOMOR_SERTIFIKAT}', '{NILAI_RATA_RATA}', '{PREDIKAT_AKHIR}', '{URL_VERIFIKASI}', '{NAMA_TUTOR}', '{BAHASA}', '{SEMESTER}', '{TAHUN_AJARAN}', '{MULAI}', '{SELESAI}', '{ALASAN}', '{NAMA_LEMBAGA}'];

      return subNav +
        '<div class="grid-main" style="grid-template-columns:1.35fr 1fr"><div class="stack">' +
          '<div class="card card-p">' +
            '<div class="row between mb16"><div class="row gap8"><span style="color:var(--primary)">' + SP.icon('shieldCheck', 'lg') + '</span><div><h2 class="h2">Kredensial Fonnte Gateway (ScriptProperties)</h2><p class="muted" style="font-size:12.5px">Token API disimpan terenkripsi di sisi server (ScriptProperties), tidak pernah terekspos ke publik.</p></div></div>' +
            (tokenOk ? '<span class="badge b-ok">' + SP.icon('check', 'sm') + ' Token Terpasang (' + esc(tokenMask) + ')</span>' : '<span class="badge b-bad">Token Belum Diatur</span>') + '</div>' +
            '<div class="grid2" style="align-items:flex-end">' +
              '<div class="field"><label for="wa-tok-inp">' + (tokenOk ? 'Ganti Token API Fonnte (Device Token)' : 'Masukkan Token API Fonnte (Device Token)') + '</label><input id="wa-tok-inp" type="password" class="input mono" placeholder="Tempel token dari md.fonnte.com…"></div>' +
              '<div class="row gap8"><button class="btn btn-primary" data-act="waSimpanToken">' + SP.icon('lock', 'sm') + ' Simpan Token di Server</button>' + (tokenOk ? '<button class="btn btn-outline" style="color:var(--danger)" data-act="waHapusToken">Hapus Token</button>' : '') + '</div>' +
            '</div>' +
            '<div class="callout mt16" style="padding:12px 14px"><div class="grow"><div class="row between wrap gap8">' +
              '<span style="font-size:13px"><b>Uji Pengiriman WhatsApp:</b> Kirim pesan contoh ke nomor WA Anda</span>' +
              '<div class="row gap8"><input id="wa-uji-hp" class="input mono" style="width:180px;height:36px" placeholder="081234567890" value="' + esc(u.waUjiHp || SP.S.me.no_hp || '') + '"><button class="btn btn-outline btn-sm" data-act="waKirimUji" ' + (tokenOk ? '' : 'disabled') + '>' + SP.icon('send', 'sm') + ' Kirim WA Uji Coba</button></div>' +
            '</div></div></div>' +
          '</div>' +

          '<div class="card card-p">' +
            '<div class="row between mb16"><div class="row gap8"><span style="color:var(--accent)">' + SP.icon('zap', 'lg') + '</span><div><h2 class="h2">Saklar Utama &amp; Matriks Event Otomatis</h2><p class="muted" style="font-size:12.5px">Atur kapan SIPENA mengirim notifikasi WhatsApp otomatis ke mahasiswa atau tutor.</p></div></div><span class="tagx">EVENT MATRIX</span></div>' +
            '<div class="callout ' + (f.wa_aktif === '1' ? 'ok' : 'warn') + ' mb16" style="padding:14px"><div class="grow row between wrap gap12">' +
              '<div><b style="font-size:14px">Saklar Utama Notifikasi WhatsApp (' + (f.wa_aktif === '1' ? 'AKTIF' : 'NONAKTIF') + ')</b><div class="muted" style="font-size:12.5px">Jika dimatikan, tidak ada WA otomatis yang dikirim meskipun event di bawah dicentang.</div></div>' +
              '<div class="row gap12"><label class="row gap8"><span class="switch"><input type="checkbox" data-ch="setChk" data-k="wa_aktif" ' + (f.wa_aktif === '1' ? 'checked' : '') + '><span></span></span><b>' + (f.wa_aktif === '1' ? 'ON' : 'OFF') + '</b></label>' +
              '<select class="select" style="width:155px;height:36px" data-ch="setF" data-k="wa_delay" title="Jeda antar pesan Fonnte">' + opt([['1-3', 'Jeda 1–3 dtk'], ['2-4', 'Jeda 2–4 dtk'], ['3-6', 'Jeda 3–6 dtk'], ['5-10', 'Jeda 5–10 dtk']], f.wa_delay || '2-4') + '</select></div>' +
            '</div></div>' +
            '<div class="stack gap8">' +
              evtList.map(function (ev) {
                const on = f[ev[0]] === '1';
                return '<div class="row between wrap gap8" style="padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:#fff">' +
                  '<div class="grow"><b style="font-size:13.5px">' + esc(ev[2]) + '</b><div class="muted" style="font-size:12px">' + esc(ev[3]) + '</div></div>' +
                  '<div class="row gap8"><button class="btn btn-ghost btn-sm" data-act="waPilihTpl" data-v="' + ev[1] + '">' + SP.icon('pencil', 'sm') + ' Template</button>' +
                  '<label class="row gap6"><span class="switch"><input type="checkbox" data-ch="setChk" data-k="' + ev[0] + '" ' + (on ? 'checked' : '') + '><span></span></span></label></div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="stack">' +
          '<div class="card card-p">' +
            '<div class="row between mb12"><h2 class="h3">' + SP.icon('file', 'sm') + ' Template Pesan WA Event</h2></div>' +
            '<div class="field mb12"><label for="wa-tpl-sel">Pilih jenis event yang disunting</label><select id="wa-tpl-sel" class="select" data-ch="waGantiTpl">' +
              opt([
                ['sertifikat', '1. Sertifikat Terbit (Mahasiswa)'],
                ['mengulang', '2. Wajib Mengulang (Mahasiswa)'],
                ['jadwal_ulang', '3. Jadwal Kelas Ulang (Mahasiswa)'],
                ['penugasan', '4. Penugasan Kelas Baru (Tutor)'],
                ['pengganti', '5. Penunjukan Pengganti (Tutor)']
              ], tplKey) +
            '</select></div>' +
            inp('wa_tpl_' + tplKey, 'Isi pesan WhatsApp (mendukung *tebal*, _miring_, dan token dinamis)', { area: true, tinggi: 210 }) +
            '<div class="mt12"><div class="cap" style="margin-bottom:6px">Token Dinamis (klik untuk menyalin)</div><div class="tokens">' +
              tokenWa.map(function (t) { return '<span class="token" data-act="salinToken" data-v="' + t + '">' + t + ' ' + SP.icon('copy', 'sm') + '</span>'; }).join('') +
            '</div></div>' +
          '</div>' +
          '<div class="card card-p20"><div class="row between"><div><div class="cap">Ringkasan Kontak Siap WA</div><div class="h3 mt4">' + SP.n(mhsAdaHp) + ' Mahasiswa · ' + SP.n(usrAdaHp) + ' Tutor</div><div class="muted" style="font-size:12px">' + SP.n(waAktifCount) + ' nomor telah terverifikasi WA Aktif via Fonnte</div></div><button class="btn btn-outline btn-sm" data-act="waSubTab" data-v="crm">Buka CRM →</button></div></div>' +
        '</div></div>';
    }

    if (sub === 'blast') {
      const targetList = daftarTargetBlast();
      const angkatanOps = [['', 'Semua Angkatan']].concat(SP.daftarAngkatan().map(function (a) { return [a, 'Angkatan ' + a]; }));
      const kelasOps = [['', 'Semua Kelas']].concat((SP.S.kelas || []).filter(function (k) { return k.status !== 'ARSIP' && (!u.blastAngkatan || String(k.angkatan) === String(u.blastAngkatan)); }).map(function (k) { return [k.id, k.nama]; }));
      const pesanVal = u.blastPesan || f.wa_tpl_blast || '';
      const bs = u.blastState;
      const tokenBlast = ['{NAMA}', '{NIM}', '{KELAS}', '{PRODI}', '{ANGKATAN}', '{NAMA_LEMBAGA}', '{TAHUN_AJARAN}', '{SEMESTER}'];
      const pct = bs && bs.total ? Math.round(((bs.sukses + bs.gagal) / bs.total) * 100) : 0;

      return subNav +
        '<div class="grid-main" style="grid-template-columns:1.3fr 1fr"><div class="stack">' +
          '<div class="card card-p">' +
            '<div class="row between mb16"><div class="row gap8"><span style="color:var(--primary)">' + SP.icon('send', 'lg') + '</span><div><h2 class="h2">WA Blast Pengumuman Terpersonalisasi Per Batch</h2><p class="muted" style="font-size:12.5px">Pengiriman dipecah per kloter (10 / 20 / 50 kontak) dengan jeda aman agar anti-timeout &amp; anti-banned.</p></div></div><span class="tagx">BATCH QUEUE</span></div>' +
            '<div class="grid3 mb12">' +
              '<div class="field"><label for="bl-kat">Kategori Penerima</label><select id="bl-kat" class="select" data-ch="blastFilter" data-k="blastTarget">' +
                opt([
                  ['MAHASISWA_SEMUA', 'Semua Mahasiswa Aktif'],
                  ['MAHASISWA_LULUS', 'Mahasiswa Lulus 4 Program'],
                  ['MAHASISWA_ULANG', 'Mahasiswa Wajib Mengulang'],
                  ['TUTOR_SEMUA', 'Semua Tutor & Pengurus Aktif']
                ], u.blastTarget) +
              '</select></div>' +
              '<div class="field"><label for="bl-ang">Filter Angkatan</label><select id="bl-ang" class="select" data-ch="blastFilter" data-k="blastAngkatan" ' + (u.blastTarget === 'TUTOR_SEMUA' ? 'disabled' : '') + '>' + opt(angkatanOps, u.blastAngkatan) + '</select></div>' +
              '<div class="field"><label for="bl-kls">Filter Kelas</label><select id="bl-kls" class="select" data-ch="blastFilter" data-k="blastKelas" ' + (u.blastTarget === 'TUTOR_SEMUA' ? 'disabled' : '') + '>' + opt(kelasOps, u.blastKelas) + '</select></div>' +
            '</div>' +
            '<div class="grid2 mb12">' +
              '<div class="field"><label for="bl-sz">Ukuran Kloter / Batch Pengiriman</label><select id="bl-sz" class="select" data-ch="blastFilter" data-k="blastBatchSize">' +
                opt([['10', '10 Kontak / Batch (Sangat Aman)'], ['20', '20 Kontak / Batch (Rekomendasi)'], ['50', '50 Kontak / Batch (Cepat)']], String(u.blastBatchSize || 20)) +
              '</select></div>' +
              '<div class="callout ok" style="padding:10px 14px;align-self:flex-end"><div class="grow row between"><span>Siap dikirim (memiliki No WA):</span><b class="num" style="font-size:16px;color:var(--primary)">' + SP.n(targetList.length) + ' Kontak</b></div></div>' +
            '</div>' +
            '<div class="field mb12"><label for="bl-msg">Isi Pesan Pengumuman WhatsApp</label><textarea id="bl-msg" class="textarea" style="min-height:170px" data-in="blastPesanInp" placeholder="Tulis pesan pengumuman…">' + esc(pesanVal) + '</textarea></div>' +
            '<div class="mb16"><div class="cap" style="margin-bottom:6px">Token Personalisasi (klik untuk menyalin)</div><div class="tokens">' +
              tokenBlast.map(function (t) { return '<span class="token" data-act="salinToken" data-v="' + t + '">' + t + ' ' + SP.icon('copy', 'sm') + '</span>'; }).join('') +
            '</div></div>' +
            '<div class="row between wrap gap12">' +
              '<button class="btn btn-outline btn-sm" data-act="blastSimpanDefault">' + SP.icon('save', 'sm') + ' Jadikan Template Default</button>' +
              '<div class="row gap8">' +
                (!bs || bs.selesai ? '<button class="btn btn-primary btn-lg" data-act="blastMulai" ' + (targetList.length && tokenOk ? '' : 'disabled') + '>' + SP.icon('send') + ' Mulai Blast WA (' + SP.n(targetList.length) + ' Kontak)</button>' : '') +
                (bs && !bs.selesai && !bs.paused ? '<button class="btn btn-outline" data-act="blastJeda">⏸ Jeda</button>' : '') +
                (bs && !bs.selesai && bs.paused ? '<button class="btn btn-primary" data-act="blastLanjut">▶ Lanjutkan Batch</button>' : '') +
                (bs && !bs.selesai ? '<button class="btn btn-danger" data-act="blastBatal">⏹ Hentikan</button>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="stack">' +
          '<div class="card card-p">' +
            '<h2 class="h3 mb12">' + SP.icon('activity', 'sm') + ' Status &amp; Progres Antrean Batch</h2>' +
            (bs ? (
              '<div class="callout ' + (bs.selesai ? 'ok' : 'info') + ' mb12" style="padding:14px"><div class="grow">' +
                '<div class="row between"><b>' + (bs.selesai ? 'Selesai Diproses' : (bs.paused ? 'Dijeda Sementara' : 'Sedang Mengirim Batch ' + bs.batchKe + ' dari ' + bs.totalBatch + '…')) + '</b><b class="num">' + pct + '%</b></div>' +
                '<div class="prog mt8" style="height:10px"><i style="width:' + pct + '%"></i></div>' +
                '<div class="row between mt8 muted" style="font-size:12px"><span>✅ Terkirim: <b>' + bs.sukses + '</b></span><span>❌ Gagal: <b>' + bs.gagal + '</b></span><span>⏳ Sisa: <b>' + Math.max(0, bs.total - bs.sukses - bs.gagal) + '</b></span></div>' +
              '</div></div>' +
              '<div class="tbl-wrap" style="max-height:280px;overflow:auto"><table class="tbl compact"><thead><tr><th>Penerima</th><th>No WA</th><th>Status</th></tr></thead><tbody>' +
                (bs.log.length ? bs.log.slice(-30).reverse().map(function (l) {
                  return '<tr><td><b>' + esc(l.nama) + '</b></td><td class="mono" style="font-size:11.5px">+' + esc(l.no_hp) + '</td><td>' + (l.sukses ? '<span class="badge b-ok">Terkirim</span>' : '<span class="badge b-bad" title="' + esc(l.alasan || '') + '">Gagal</span>') + '</td></tr>';
                }).join('') : '<tr><td colspan="3" class="muted">Menunggu kloter pertama…</td></tr>') +
              '</tbody></table></div>'
            ) : '<div class="empty" style="padding:28px">' + SP.icon('send', 'xl') + '<p class="mt8 muted">Pilih filter penerima dan klik <b>Mulai Blast WA</b> untuk mengirim pengumuman secara bertahap.</p></div>') +
          '</div>' +
          '<div class="card card-p"><h3 class="h3 mb8">Daftar Penerima Terfilter (' + SP.n(targetList.length) + ')</h3>' +
            (targetList.length ? '<div class="tbl-wrap" style="max-height:220px;overflow:auto"><table class="tbl compact"><thead><tr><th>Nama</th><th>Kelas/Peran</th><th>No WA</th></tr></thead><tbody>' +
              targetList.slice(0, 25).map(function (t) { return '<tr><td><b>' + esc(t.nama) + '</b><br><small class="mono muted">' + esc(t.nim !== '-' ? t.nim : t.email) + '</small></td><td>' + esc(t.kelas !== '-' ? t.kelas : t.peran) + '</td><td class="mono" style="font-size:12px">+' + esc(t.no_hp) + '</td></tr>'; }).join('') +
              (targetList.length > 25 ? '<tr><td colspan="3" class="muted" style="text-align:center">+ ' + (targetList.length - 25) + ' kontak lainnya</td></tr>' : '') +
            '</tbody></table></div>' : '<p class="muted" style="font-size:13px">Belum ada kontak ber-nomor WA pada filter ini. Tambahkan nomor WA melalui menu CRM Kontak.</p>') +
          '</div>' +
        '</div></div>';
    }

    // Sub-tab 3: CRM Kontak & Deteksi Nomor WA
    const isMhs = u.crmTipe !== 'PENGGUNA';
    const q = (u.crmQ || '').toLowerCase().trim();
    const stFilter = u.crmStatus || '';
    const rawList = isMhs ? (SP.S.mahasiswa || []).map(function (m) {
      return { tipe: 'MAHASISWA', id: m.nim, nama: m.nama, sub: 'NIM ' + m.nim + ' · Angkatan ' + (m.angkatan || '-'), email: m.email || '', no_hp: m.no_hp || '', status_wa: m.status_wa || '' };
    }) : (SP.S.pengguna || []).map(function (x) {
      return { tipe: 'PENGGUNA', id: x.email, nama: x.nama, sub: (x.peran === 'SUPERADMIN' ? 'Superadmin' : 'Tutor ' + (x.bahasa || '')) + (x.nip ? ' · NIP ' + x.nip : ''), email: x.email, no_hp: x.no_hp || '', status_wa: x.status_wa || '' };
    });

    const filtered = rawList.filter(function (c) {
      if (stFilter === 'TANPA_HP' && c.no_hp) return false;
      if (stFilter === 'ADA_HP' && !c.no_hp) return false;
      if (stFilter === 'AKTIF' && c.status_wa !== 'AKTIF') return false;
      if (stFilter === 'TIDAK_ADA' && c.status_wa !== 'TIDAK_ADA') return false;
      if (stFilter === 'BELUM_DICEK' && (!c.no_hp || (c.status_wa && c.status_wa !== 'BELUM_DICEK'))) return false;
      if (q && (c.nama + ' ' + c.id + ' ' + c.email + ' ' + c.no_hp).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    const pg = SP.paginate(filtered, u.crmPage || 1, 12);
    u.crmPage = pg.page;

    return subNav +
      '<div class="card card-p">' +
        '<div class="row between wrap gap12 mb16">' +
          '<div><h2 class="h2">' + SP.icon('users') + ' Direktori CRM Kontak (Nama, Email, WhatsApp)</h2><p class="muted" style="font-size:13px">Kelola nomor WhatsApp Mahasiswa &amp; Tutor, deteksi keaktifan nomor via Fonnte, atau hubungi langsung via 1 klik.</p></div>' +
          '<div class="row wrap gap8">' +
            '<button class="btn btn-outline btn-sm" data-act="crmUnduhCsv">' + SP.icon('download', 'sm') + ' Unduh CRM (.csv)</button>' +
            '<button class="btn btn-primary btn-sm" data-act="crmCekMassal" ' + (tokenOk ? '' : 'disabled') + '>' + SP.icon('shieldCheck', 'sm') + ' Deteksi WA Aktif (Halaman Ini)</button>' +
          '</div>' +
        '</div>' +
        '<div class="toolbar mb16">' +
          '<div class="seg"><button class="' + (isMhs ? 'on' : '') + '" data-act="crmSetTipe" data-v="MAHASISWA">Mahasiswa (' + SP.n(allMhs.length) + ')</button><button class="' + (!isMhs ? 'on' : '') + '" data-act="crmSetTipe" data-v="PENGGUNA">Tutor &amp; Admin (' + SP.n(allUsr.length) + ')</button></div>' +
          '<div class="sch">' + SP.icon('search') + '<input class="input" placeholder="Cari nama, NIM, email, atau nomor WA…" data-in="crmQInp" value="' + esc(u.crmQ || '') + '"></div>' +
          '<div class="field"><select class="select" data-ch="crmStatusCh"><option value="">Semua Status WA</option>' +
            opt([['ADA_HP', 'Sudah Ada Nomor WA'], ['TANPA_HP', 'Belum Ada Nomor WA'], ['AKTIF', 'Terverifikasi WA Aktif'], ['BELUM_DICEK', 'Belum Dicek Fonnte'], ['TIDAK_ADA', 'Tidak Terdaftar WA']], stFilter) +
          '</select></div>' +
        '</div>' +
        '<div class="tbl-wrap has-foot"><table class="tbl cards compact"><thead><tr><th>Nama &amp; Identitas</th><th>Email</th><th>Nomor WhatsApp (628xx / 08xx)</th><th>Status Nomor WA</th><th>Aksi Cepat</th></tr></thead><tbody>' +
          (pg.items.length ? pg.items.map(function (c) {
            return '<tr>' +
              '<td data-l="Identitas"><b>' + esc(c.nama) + '</b><br><small class="muted mono">' + esc(c.sub) + '</small></td>' +
              '<td data-l="Email" class="mono" style="font-size:12px">' + esc(c.email || '-') + '</td>' +
              '<td data-l="No WA"><div class="row gap6"><input class="input mono" style="height:34px;max-width:165px;font-size:12.5px" placeholder="08123456…" value="' + esc(c.no_hp) + '" data-crm-hp="' + esc(c.tipe + '|' + c.id) + '"><button class="btn btn-outline btn-sm" data-act="crmSimpanHp" data-tipe="' + esc(c.tipe) + '" data-id="' + esc(c.id) + '" title="Simpan Nomor WA">' + SP.icon('save', 'sm') + '</button></div></td>' +
              '<td data-l="Status WA">' + badgeStatusWa(c.status_wa, c.no_hp) + '</td>' +
              '<td data-l="Aksi"><div class="row gap6">' +
                (c.no_hp ? '<button class="btn btn-outline btn-sm" data-act="crmCekSatu" data-tipe="' + esc(c.tipe) + '" data-id="' + esc(c.id) + '" data-hp="' + esc(c.no_hp) + '" ' + (tokenOk ? '' : 'disabled') + '>Cek WA</button><a class="btn btn-ghost btn-sm" style="color:var(--primary)" target="_blank" rel="noopener" href="https://wa.me/' + esc(c.no_hp) + '">Chat ↗</a>' : '<span class="muted3" style="font-size:12px">Isi No WA dulu</span>') +
              '</div></td>' +
            '</tr>';
          }).join('') : '<tr><td colspan="5">' + SP.kosong('users', 'Tidak ada kontak yang cocok', 'Ubah kata kunci pencarian atau filter status WA.') + '</td></tr>') +
        '</tbody></table></div>' +
        '<div class="tbl-foot"><span>Menampilkan ' + pg.dari + '–' + pg.sampai + ' dari <b>' + pg.total + '</b> kontak</span>' + SP.pagerHtml('crmHal', pg) + '</div>' +
      '</div>';
  };

  SP.views.pengaturan = {
    judul: 'Pengaturan & Log',
    render: function () {
      const u = SP.ui.set; if (!u.f) u.f = formAwal();
      return SP.header({ crumbs: [['Dasbor', '#/dasbor'], ['Pengaturan & Log']], eyebrow: 'Hak akses: Superadmin', judul: 'Pengaturan Sistem, Notifikasi WA & Log Audit', desc: 'Konfigurasi tahun ajaran, template sertifikat Drive, WhatsApp Gateway Fonnte + CRM, dan jejak audit aktivitas.' }) +
        '<div class="tabs">' +
          '<button class="tab ' + (u.tab === 'set' ? 'on' : '') + '" data-act="setTab" data-v="set">' + SP.icon('sliders') + ' Pengaturan Sistem (Aktif)</button>' +
          '<button class="tab ' + (u.tab === 'wa' ? 'on' : '') + '" data-act="setTab" data-v="wa">' + SP.icon('send') + ' Notifikasi WA, Blast &amp; CRM <span class="badge ' + (u.f.wa_aktif === '1' ? 'b-ok' : 'b-muted') + '" style="margin-left:4px">' + (u.f.wa_aktif === '1' ? 'ON' : 'OFF') + '</span></button>' +
          '<button class="tab ' + (u.tab === 'log' ? 'on' : '') + '" data-act="setTab" data-v="log">' + SP.icon('history') + ' Log Aktivitas Audit</button>' +
        '</div>' +
        (u.tab === 'set' ? '<div data-part="setIsi">' + SP.parts.setIsi() + '</div><div class="savebar" data-part="setBar">' + SP.parts.setBar() + '</div>' :
        (u.tab === 'wa' ? '<div data-part="waIsi">' + SP.parts.waIsi() + '</div><div class="savebar" data-part="setBar">' + SP.parts.setBar() + '</div>' :
        '<div data-part="logIsi">' + SP.parts.logIsi() + '</div>'));
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
      } else if (u.tab === 'log' && !u.log) muatLog();
    }
  };
  SP.actions.setTab = function (el) { SP.ui.set.tab = el.dataset.v; SP.renderUlang(); };
  SP.actions.setTabLog = function () { SP.ui.set.tab = 'log'; SP.renderUlang(); };
  SP.actions.waSubTab = function (el) { SP.ui.set.waSub = el.dataset.v; SP.refresh('waIsi'); };
  SP.actions.waPilihTpl = function (el) { SP.ui.set.waTplKey = el.dataset.v; SP.refresh('waIsi'); };
  SP.changes.waGantiTpl = function (el) { SP.ui.set.waTplKey = el.value; SP.refresh('waIsi'); };
  SP.actions.waSimpanToken = async function (el) {
    const inpEl = SP.$('#wa-tok-inp');
    const tok = inpEl ? inpEl.value.trim() : '';
    if (!tok) return SP.toast('Tempel Token API Fonnte terlebih dahulu.', 'warn');
    el.disabled = true;
    try {
      const r = await SP.api('simpanTokenFonnte', { token: tok });
      SP.S.meta = SP.S.meta || {};
      SP.S.meta.fonnteTerpasang = r.fonnteTerpasang;
      SP.S.meta.fonnteMask = r.fonnteMask;
      SP.simpanCache();
      SP.toast('Token Fonnte berhasil disimpan di ScriptProperties.', 'ok');
      SP.refresh('waIsi');
    } catch (e) { el.disabled = false; SP.toast(esc(e.message), 'err', 8000); }
  };
  SP.actions.waHapusToken = async function (el) {
    if (!(await SP.konfirmasi({ judul: 'Hapus Token Fonnte?', pesan: 'Token Fonnte akan dihapus dari ScriptProperties dan pengiriman WhatsApp akan berhenti.', ya: 'Ya, Hapus', bahaya: true }))) return;
    el.disabled = true;
    try {
      const r = await SP.api('simpanTokenFonnte', { hapus: true });
      SP.S.meta.fonnteTerpasang = r.fonnteTerpasang;
      SP.S.meta.fonnteMask = r.fonnteMask;
      SP.simpanCache();
      SP.toast('Token Fonnte dihapus.');
      SP.refresh('waIsi');
    } catch (e) { el.disabled = false; SP.toast(esc(e.message), 'err'); }
  };
  SP.actions.waKirimUji = async function (el) {
    const hpEl = SP.$('#wa-uji-hp');
    const hp = hpEl ? hpEl.value.trim() : '';
    SP.ui.set.waUjiHp = hp;
    if (!hp) return SP.toast('Masukkan nomor WhatsApp tujuan uji coba.', 'warn');
    el.disabled = true;
    try {
      const tplKey = SP.ui.set.waTplKey || 'sertifikat';
      const r = await SP.api('kirimWAUji', { no_hp: hp, jenis: tplKey, pesan: SP.ui.set.f['wa_tpl_' + tplKey] || '' });
      SP.toast('Pesan WA uji coba berhasil dikirim ke <b>+' + esc(r.terkirimKe) + '</b>.', 'ok');
    } catch (e) { SP.toast(esc(e.message), 'err', 8000); }
    el.disabled = false;
  };

  // Handler WA Blast Per Batch
  SP.changes.blastFilter = function (el) {
    const k = el.dataset.k;
    SP.ui.set[k] = k === 'blastBatchSize' ? Number(el.value) : el.value;
    if (k === 'blastAngkatan') SP.ui.set.blastKelas = '';
    SP.refresh('waIsi');
  };
  SP.inputs.blastPesanInp = function (el) { SP.ui.set.blastPesan = el.value; };
  SP.actions.blastSimpanDefault = function () {
    const v = SP.ui.set.blastPesan || (SP.$('#bl-msg') ? SP.$('#bl-msg').value : '');
    if (!v.trim()) return SP.toast('Isi pesan pengumuman terlebih dahulu.', 'warn');
    SP.ui.set.f.wa_tpl_blast = v;
    SP.refresh('setBar');
    SP.toast('Pesan disalin ke template default. Klik "Simpan Pengaturan Sistem" di bawah untuk menyimpan permanen.');
  };

  async function jalankanLoopBlast() {
    const u = SP.ui.set;
    const bs = u.blastState;
    if (!bs || bs.running) return;
    bs.running = true;
    while (bs.idx < bs.antrean.length && !bs.paused && !bs.selesai) {
      bs.batchKe = Math.floor(bs.idx / bs.batchSize) + 1;
      const potong = bs.antrean.slice(bs.idx, bs.idx + bs.batchSize);
      SP.refresh('waIsi');
      try {
        const r = await SP.api('blastWABatch', {
          targets: potong,
          pesan: bs.pesan,
          delay: (u.f && u.f.wa_delay) || '2-4'
        }, { timeout: 90000 });
        (r.hasil || []).forEach(function (h) {
          if (h.sukses) bs.sukses++; else bs.gagal++;
          bs.log.push(h);
        });
      } catch (e) {
        potong.forEach(function (t) {
          bs.gagal++;
          bs.log.push({ id: t.id, nama: t.nama, no_hp: t.no_hp, sukses: false, alasan: e.message });
        });
      }
      bs.idx += potong.length;
      if (bs.idx >= bs.antrean.length) {
        bs.selesai = true;
        SP.toast('WA Blast selesai! Terkirim: <b>' + bs.sukses + '</b>, Gagal: <b>' + bs.gagal + '</b>.', bs.gagal ? 'warn' : 'ok', 7000);
      } else if (!bs.paused) {
        SP.refresh('waIsi');
        await new Promise(function (res) { setTimeout(res, 2500); });
      }
    }
    bs.running = false;
    SP.refresh('waIsi');
  }

  SP.actions.blastMulai = async function () {
    const u = SP.ui.set;
    const msgEl = SP.$('#bl-msg');
    const pesan = (msgEl ? msgEl.value : (u.blastPesan || u.f.wa_tpl_blast || '')).trim();
    u.blastPesan = pesan;
    if (!pesan) return SP.toast('Isi pesan pengumuman terlebih dahulu.', 'warn');
    const targets = daftarTargetBlast();
    if (!targets.length) return SP.toast('Tidak ada penerima ber-nomor WA pada filter ini.', 'warn');
    const batchSize = Number(u.blastBatchSize) || 20;
    const totalBatch = Math.ceil(targets.length / batchSize);
    if (!(await SP.konfirmasi({
      judul: 'Mulai WA Blast ke ' + targets.length + ' Kontak?',
      pesan: 'Pesan akan dikirim secara bertahap dalam <b>' + totalBatch + ' batch</b> (@' + batchSize + ' kontak per kloter) melalui Fonnte Gateway.',
      ya: 'Ya, Mulai Kirim'
    }))) return;

    u.blastState = {
      antrean: targets,
      pesan: pesan,
      batchSize: batchSize,
      total: targets.length,
      totalBatch: totalBatch,
      batchKe: 1,
      idx: 0,
      sukses: 0,
      gagal: 0,
      paused: false,
      selesai: false,
      running: false,
      log: []
    };
    jalankanLoopBlast();
  };
  SP.actions.blastJeda = function () {
    if (SP.ui.set.blastState) { SP.ui.set.blastState.paused = true; SP.refresh('waIsi'); SP.toast('Pengiriman batch dijeda sementara.'); }
  };
  SP.actions.blastLanjut = function () {
    if (SP.ui.set.blastState) { SP.ui.set.blastState.paused = false; jalankanLoopBlast(); }
  };
  SP.actions.blastBatal = function () {
    if (SP.ui.set.blastState) { SP.ui.set.blastState.paused = true; SP.ui.set.blastState.selesai = true; SP.refresh('waIsi'); SP.toast('WA Blast dihentikan.', 'warn'); }
  };

  // Handler CRM Kontak & Deteksi WA
  SP.actions.crmSetTipe = function (el) { SP.ui.set.crmTipe = el.dataset.v; SP.ui.set.crmPage = 1; SP.refresh('waIsi'); };
  SP.inputs.crmQInp = SP.debounce(function (el) { SP.ui.set.crmQ = el.value; SP.ui.set.crmPage = 1; SP.refresh('waIsi'); }, 180);
  SP.changes.crmStatusCh = function (el) { SP.ui.set.crmStatus = el.value; SP.ui.set.crmPage = 1; SP.refresh('waIsi'); };
  SP.actions.crmHal = function (el) { SP.ui.set.crmPage = Number(el.dataset.p); SP.refresh('waIsi'); };
  SP.actions.crmSimpanHp = async function (el) {
    const tipe = el.dataset.tipe, id = el.dataset.id;
    const inpEl = SP.$('[data-crm-hp="' + tipe + '|' + id + '"]');
    const hp = inpEl ? inpEl.value.trim() : '';
    el.disabled = true;
    try {
      const r = await SP.api('kontakSimpanHp', { tipe: tipe, id: id, no_hp: hp });
      if (tipe === 'PENGGUNA') {
        const u = SP.X.user[id]; if (u) { u.no_hp = r.no_hp; u.status_wa = r.status_wa; }
        if (SP.S.me && SP.S.me.email === id) { SP.S.me.no_hp = r.no_hp; SP.S.me.status_wa = r.status_wa; }
      } else {
        const m = SP.X.mhs[id]; if (m) { m.no_hp = r.no_hp; m.status_wa = r.status_wa; }
      }
      SP.simpanCache();
      SP.toast('Nomor WhatsApp disimpan.', 'ok');
      SP.refresh('waIsi');
    } catch (e) { el.disabled = false; SP.toast(esc(e.message), 'err'); }
  };

  async function jalankanCekWA(items, elBtn) {
    if (!items.length) return SP.toast('Tidak ada nomor WA untuk diperiksa.', 'warn');
    if (elBtn) elBtn.disabled = true;
    try {
      const r = await SP.api('cekNomorWA', { items: items });
      let aktif = 0, tidak = 0;
      (r.hasil || []).forEach(function (h) {
        if (h.status_wa === 'AKTIF') aktif++; else tidak++;
        if (h.tipe === 'PENGGUNA') {
          const u = SP.X.user[h.id]; if (u) { u.no_hp = h.no_hp; u.status_wa = h.status_wa; }
        } else {
          const m = SP.X.mhs[h.id]; if (m) { m.no_hp = h.no_hp; m.status_wa = h.status_wa; }
        }
      });
      SP.simpanCache();
      SP.toast('Deteksi Fonnte selesai: <b>' + aktif + ' WA Aktif</b>, <b>' + tidak + ' Tidak Terdaftar</b>.', 'ok');
      SP.refresh('waIsi');
    } catch (e) {
      if (elBtn) elBtn.disabled = false;
      SP.toast(esc(e.message), 'err', 8000);
    }
  }
  SP.actions.crmCekSatu = function (el) {
    jalankanCekWA([{ tipe: el.dataset.tipe, id: el.dataset.id, no_hp: el.dataset.hp }], el);
  };
  SP.actions.crmCekMassal = function (el) {
    const inps = SP.$$('[data-crm-hp]');
    const items = [];
    inps.forEach(function (inp) {
      const val = inp.value.trim();
      if (!val) return;
      const p = inp.getAttribute('data-crm-hp').split('|');
      items.push({ tipe: p[0], id: p[1], no_hp: val });
    });
    jalankanCekWA(items, el);
  };
  SP.actions.crmUnduhCsv = function () {
    const rows = [];
    (SP.S.mahasiswa || []).forEach(function (m) {
      rows.push(['MAHASISWA', m.nim, m.nama, m.email || '', m.no_hp || '', m.status_wa || '']);
    });
    (SP.S.pengguna || []).forEach(function (u) {
      rows.push([u.peran || 'TUTOR', u.nip || '-', u.nama, u.email || '', u.no_hp || '', u.status_wa || '']);
    });
    SP.unduhCsv('crm-kontak-sipena-' + SP.hariIni() + '.csv', ['Kategori', 'NIM_NIP', 'Nama', 'Email', 'No_WhatsApp', 'Status_WA'], rows);
  };
  SP.inputs.setF = function (el) { SP.ui.set.f[el.dataset.k] = el.value; SP.refresh('setBar'); if (SP.$('[data-part="setCertPreview"]')) SP.refresh('setCertPreview'); };
  SP.changes.setF = function (el) { SP.ui.set.f[el.dataset.k] = el.value; SP.refresh('setBar'); if (SP.$('[data-part="setCertPreview"]')) SP.refresh('setCertPreview'); };
  SP.changes.setChk = function (el) { SP.ui.set.f[el.dataset.k] = el.checked ? '1' : '0'; SP.refresh('setBar'); if (SP.ui.set.tab === 'wa') SP.refresh('waIsi'); };
  SP.actions.setMode = function (el) { SP.ui.set.f.mode_penilaian = el.dataset.v; SP.refresh('setIsi'); SP.refresh('setBar'); };
  SP.actions.setCertSisi = function (el) { SP.ui.set.certSisi = el.dataset.v || 'DUA'; SP.refresh('setCertPreview'); };
  SP.actions.setCetakContoh2Sisi = function () {
    const sampleMhs = (SP.S.mahasiswa || []).filter(function (m) { return SP.kelulusan(m.nim).akhir === 'LULUS'; })[0];
    if (SP.cetakSertifikat2Sisi) SP.cetakSertifikat2Sisi(sampleMhs ? sampleMhs.nim : '', SP.ui.set.f || SP.set());
  };
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

  // ============================================================
  // RESET SISTEM & PENGOSONGAN DATA (SUPERADMIN)
  // ============================================================
  SP.ui.resetSistem = {
    mode: 'AKADEMIK', // 'AKADEMIK' | 'TOTAL'
    backupDiunduh: false,
    konfirmasiKetik: '',
    sedang: false
  };

  function masterDataEkspor() {
    const kkm = Number((SP.set() && SP.set().kkm) || 75);
    const headers = [
      'NIM', 'NAMA_MAHASISWA', 'EMAIL', 'ANGKATAN', 'STATUS_DATA',
      'KELAS_TERAKHIR', 'PRODI', 'ARAB_GANJIL', 'INGGRIS_GANJIL',
      'ARAB_GENAP', 'INGGRIS_GENAP', 'STATUS_KELULUSAN',
      'NOMOR_SERTIFIKAT', 'TANGGAL_SERTIFIKAT'
    ];
    const rows = SP.barisKelulusan().map(function (b) {
      const getVal = function (p) {
        const st = b.kel.program[p];
        const angka = SP.nilaiAngkaProgram ? SP.nilaiAngkaProgram(b.m.nim, p) : '';
        if (st === 'LULUS') return angka || String(kkm);
        if (st === 'TIDAK_LULUS') return angka ? String(angka) : 'Tidak Lulus';
        return 'Belum Diisi';
      };
      const sert = SP.X.sert[b.m.nim];
      return [
        b.m.nim,
        b.m.nama,
        b.m.email || '',
        b.m.angkatan || '',
        b.m.status || 'AKTIF',
        b.kelas ? b.kelas.nama : '',
        b.kelas ? b.kelas.prodi || '' : '',
        getVal('ARB_GJL'),
        getVal('ING_GJL'),
        getVal('ARB_GNP'),
        getVal('ING_GNP'),
        { LULUS: 'Lulus', WAJIB_MENGULANG: 'Wajib Mengulang', BELUM_LENGKAP: 'Belum Lengkap' }[b.akhir] || b.akhir,
        sert ? sert.nomor : '',
        sert ? sert.tanggal_cetak : ''
      ];
    });
    return { h: headers, r: rows };
  }

  function isiModalReset() {
    const u = SP.ui.resetSistem;
    const nMahasiswa = SP.S.mahasiswa.length;
    const nKelas = SP.S.kelas.length;
    const nNilai = SP.S.nilai.length;
    const nSert = SP.S.sert.filter(function (s) { return s.file_id; }).length;

    const cocok = u.konfirmasiKetik.trim() === 'KOSONGKAN DATA';
    const bolehEksekusi = u.backupDiunduh && cocok && !u.sedang;

    return '<div class="stack gap16">' +
      '<div class="callout bad edge" style="padding:12px 16px"><div class="ic">' + SP.icon('alert', 'lg') + '</div><div class="grow">' +
        '<div class="ct" style="color:var(--danger)">PERINGATAN PENGOSONGAN DATA SISTEM</div>' +
        '<div class="tx" style="font-size:13px">Tindakan ini akan mengosongkan rekaman data dari Google Spreadsheet. Sangat disarankan untuk keperluan peralihan kebijakan, tahun ajaran baru, atau pembersihan data simulasi (dummy). <b>Wajib mengunduh Master Backup</b> sebelum eksekusi.</div>' +
      '</div></div>' +

      '<div class="card card-p20 row between wrap gap12" style="background:#FFF5F5;border-color:rgba(220,38,38,0.25)">' +
        '<div><div class="cap" style="color:var(--danger)">Volume Data Sistem Saat Ini</div><div class="h3 mt4">Data yang akan terpengaruh pengosongan:</div></div>' +
        '<div class="row wrap gap8">' +
          '<span class="chip"><b>' + SP.n(nMahasiswa) + '</b> Mahasiswa</span>' +
          '<span class="chip"><b>' + SP.n(nKelas) + '</b> Rombel Kelas</span>' +
          '<span class="chip"><b>' + SP.n(nNilai) + '</b> Rekap Nilai</span>' +
          '<span class="chip"><b>' + SP.n(nSert) + '</b> Sertifikat Terbit</span>' +
        '</div>' +
      '</div>' +

      '<div class="card card-p20" style="border:1.5px solid var(--border)">' +
        '<div class="row between mb8"><div><span class="stepno" style="width:24px;height:24px;font-size:12px;background:' + (u.backupDiunduh ? 'var(--primary)' : 'var(--text3)') + '">1</span> <b style="font-size:14px">Langkah 1: Unduh Master Cadangan Data (Wajib)</b></div>' +
        (u.backupDiunduh ? '<span class="chip ok">' + SP.icon('check', 'sm') + ' Master Backup Terunduh</span>' : '<span class="chip bad">Wajib Diunduh</span>') + '</div>' +
        '<p class="muted" style="font-size:12.5px;margin-bottom:12px">Simpan salinan cadangan lengkap database ke komputer lembaga Anda sebelum data dikosongkan.</p>' +
        '<div class="row wrap gap8">' +
          '<button class="btn btn-outline" data-act="resetUnduhXlsx">' + SP.icon('file') + ' Unduh Master Backup (.xlsx)</button>' +
          '<button class="btn btn-outline" data-act="resetUnduhCsv">' + SP.icon('download') + ' Unduh Master Backup (.csv)</button>' +
        '</div>' +
      '</div>' +

      '<div class="card card-p20" style="border:1.5px solid var(--border)">' +
        '<div class="mb8"><span class="stepno" style="width:24px;height:24px;font-size:12px;background:var(--text3)">2</span> <b style="font-size:14px">Langkah 2: Pilih Tingkat Pengosongan Data</b></div>' +
        '<div class="stack gap8">' +
          '<label class="callout" style="padding:10px 14px;cursor:pointer;border-color:' + (u.mode === 'AKADEMIK' ? 'var(--primary)' : 'var(--border)') + ';background:' + (u.mode === 'AKADEMIK' ? 'var(--callout)' : '#fff') + '">' +
            '<span class="row top gap8"><input type="radio" name="reset-mode" value="AKADEMIK" ' + (u.mode === 'AKADEMIK' ? 'checked' : '') + ' data-ch="resetPilihMode" style="margin-top:3px">' +
            '<span><b style="color:var(--text)">Opsi A: Kosongkan Data Akademik Saja (Direkomendasikan)</b><br>' +
            '<small class="muted" style="font-size:12px">Menghapus seluruh Mahasiswa, Pendaftaran Kelas, Nilai, Pengulangan, Mutasi, dan Sertifikat. <b>Tetap mempertahankan:</b> Akun Pengguna/Tutor, Penugasan Kelas, dan Pengaturan Lembaga.</small></span></span>' +
          '</label>' +
          '<label class="callout" style="padding:10px 14px;cursor:pointer;border-color:' + (u.mode === 'TOTAL' ? 'var(--danger)' : 'var(--border)') + ';background:' + (u.mode === 'TOTAL' ? '#FFF5F5' : '#fff') + '">' +
            '<span class="row top gap8"><input type="radio" name="reset-mode" value="TOTAL" ' + (u.mode === 'TOTAL' ? 'checked' : '') + ' data-ch="resetPilihMode" style="margin-top:3px">' +
            '<span><b style="color:var(--danger)">Opsi B: Reset Total / Pabrik (Factory Reset)</b><br>' +
            '<small class="muted" style="font-size:12px">Mengosongkan SELURUH tabel database (termasuk Kelas, Penugasan, Pengganti). Hanya menyisakan akun Superadmin yang sedang login saat ini agar Anda tidak terkunci keluar.</small></span></span>' +
          '</label>' +
        '</div>' +
      '</div>' +

      '<div class="card card-p20" style="border:1.5px solid rgba(220,38,38,0.4);background:#FEF2F2">' +
        '<div class="mb8"><span class="stepno" style="width:24px;height:24px;font-size:12px;background:var(--danger)">3</span> <b style="font-size:14px;color:var(--danger)">Langkah 3: Konfirmasi Keamanan Frasa</b></div>' +
        '<p class="muted" style="font-size:12px;margin-bottom:8px">Untuk mencegah ketidaksengajaan, ketik kata kunci <b>KOSONGKAN DATA</b> pada kotak di bawah ini:</p>' +
        '<input id="inp-konfirmasi-reset" class="input mono" placeholder="Ketik persis: KOSONGKAN DATA" data-in="resetKetikKonfirmasi" value="' + esc(u.konfirmasiKetik) + '" style="background:#fff;border-color:rgba(220,38,38,0.4);font-weight:700">' +
        '<div class="row between wrap gap12 mt16">' +
          '<span class="muted" style="font-size:12px">' + (u.backupDiunduh ? (cocok ? '<span style="color:var(--primary)">' + SP.icon('check', 'sm') + ' Siap dieksekusi</span>' : '<span style="color:var(--danger)">Ketik "KOSONGKAN DATA"</span>') : '<span style="color:var(--danger)">Wajib unduh backup dulu (Langkah 1)</span>') + '</span>' +
          '<button class="btn btn-danger" data-act="eksekusiResetSistem" ' + (bolehEksekusi ? '' : 'disabled') + '>' + (u.sedang ? '<span class="spin"></span> Mengosongkan Database…' : SP.icon('trash') + ' Eksekusi Pengosongan Data') + '</button>' +
        '</div>' +
      '</div>' +
      '</div>';
  }

  let modalResetRef = null;
  SP.actions.bukaModalResetSistem = function () {
    if (!SP.isAdmin()) return;
    SP.ui.resetSistem = {
      mode: 'AKADEMIK',
      backupDiunduh: false,
      konfirmasiKetik: '',
      sedang: false
    };
    modalResetRef = SP.modal({
      judul: 'Reset & Pengosongan Data Sistem',
      lebar: 660,
      isi: isiModalReset(),
      footer: '<button class="btn btn-outline" data-act="tutupModal">Tutup</button>'
    });
  };

  function segarkanModalReset() {
    if (modalResetRef && modalResetRef.body) {
      modalResetRef.body.innerHTML = isiModalReset();
    }
  }

  SP.actions.resetUnduhXlsx = function () {
    const d = masterDataEkspor();
    SP.eksporXlsx('Master_Backup_SIPENA_' + SP.hariIni(), d.h, d.r);
    SP.ui.resetSistem.backupDiunduh = true;
    SP.toast('Master Backup (.xlsx) berhasil dibuat dan diunduh.', 'ok');
    segarkanModalReset();
  };

  SP.actions.resetUnduhCsv = function () {
    const d = masterDataEkspor();
    SP.unduhCsv('master-backup-sipena-' + SP.hariIni() + '.csv', d.h, d.r);
    SP.ui.resetSistem.backupDiunduh = true;
    SP.toast('Master Backup (.csv) berhasil diunduh.', 'ok');
    segarkanModalReset();
  };

  SP.changes.resetPilihMode = function (el) {
    SP.ui.resetSistem.mode = el.value;
    segarkanModalReset();
  };

  SP.inputs.resetKetikKonfirmasi = function (el) {
    SP.ui.resetSistem.konfirmasiKetik = el.value;
    const cocok = el.value.trim() === 'KOSONGKAN DATA';
    const btn = modalResetRef ? modalResetRef.el.querySelector('[data-act="eksekusiResetSistem"]') : null;
    if (btn) btn.disabled = !(SP.ui.resetSistem.backupDiunduh && cocok && !SP.ui.resetSistem.sedang);
  };

  SP.actions.eksekusiResetSistem = async function (el) {
    const u = SP.ui.resetSistem;
    if (!u.backupDiunduh) return SP.toast('Harap unduh Master Backup terlebih dahulu.', 'warn');
    const inp = SP.$('#inp-konfirmasi-reset');
    const val = (inp ? inp.value : u.konfirmasiKetik).trim();
    if (val !== 'KOSONGKAN DATA') return SP.toast('Frasa konfirmasi tidak cocok. Ketik persis "KOSONGKAN DATA".', 'err');

    const ya = await SP.konfirmasi({
      judul: 'Konfirmasi Terakhir: Kosongkan Database?',
      pesan: '<b style="color:var(--danger)">PERINGATAN AKHIR:</b> Seluruh data yang dipilih akan dihapus permanen dari Google Spreadsheet sekarang.<br><br>Apakah Anda benar-benar yakin ingin melanjutkan?',
      bahaya: true,
      ya: 'Ya, Kosongkan Data Sekarang',
      batal: 'Batal'
    });
    if (!ya) return;

    u.sedang = true;
    segarkanModalReset();
    try {
      await SP.api('sistemReset', {
        mode: u.mode,
        konfirmasi: val
      });
      SP.Cache.hapus();
      SP.tutupModal();
      SP.toast('Database sistem berhasil dikosongkan.', 'ok');
      await SP.muat();
      location.hash = '#/dasbor';
      SP.renderUlang();
    } catch (e) {
      u.sedang = false;
      segarkanModalReset();
      SP.toast(esc(e.message), 'err', 8000);
    }
  };
})();
