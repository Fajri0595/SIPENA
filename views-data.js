// ============================================================
// SIPENA — views-data.js
// Impor Mahasiswa (CSV), Status Kelulusan, Detail Mahasiswa,
// Cetak Sertifikat.
// ============================================================
(function () {
  const SP = window.SP;
  SP.ui = SP.ui || {};
  const esc = SP.esc;
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // ============================================================
  // IMPOR MAHASISWA
  // ============================================================
  SP.ui.impor = SP.ui.impor || { namaFile: '', ukuran: 0, baris: null, hanyaError: false, page: 1, sibuk: false, hasil: null, templateDiunduh: false };

  const ALIAS = { nim: ['nim'], nama: ['namalengkap', 'nama', 'namamahasiswa'], email: ['emailmahasiswa', 'email', 'emailgoogle', 'surel'], kelas: ['kelas', 'rombel'], angkatan: ['angkatan', 'tahunmasuk'] };
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function kelasImporIzin() {
    const out = {};
    if (SP.isAdmin()) SP.S.kelas.filter(function (k) { return k.status !== 'ARSIP'; }).forEach(function (k) { out[k.nama.toLowerCase()] = k; });
    else SP.penugasanAktifSaya().forEach(function (p) { const k = SP.X.kelas[p.kelas_id]; if (k && SP.peran(p)) out[k.nama.toLowerCase()] = k; });
    return out;
  }
  function validasi(rowsMentah) {
    if (!rowsMentah.length) return { err: 'Berkas kosong.' };
    const head = rowsMentah[0].map(norm), idx = {};
    Object.keys(ALIAS).forEach(function (k) { idx[k] = head.findIndex(function (h) { return ALIAS[k].indexOf(h) >= 0; }); });
    const hilang = Object.keys(idx).filter(function (k) { return idx[k] < 0; });
    if (hilang.length) return { err: 'Kolom wajib tidak ditemukan: ' + hilang.map(function (k) { return k.toUpperCase(); }).join(', ') + '. Gunakan template CSV resmi.' };
    const izin = kelasImporIzin(), s = SP.set(), ada = {}, vis = {};
    SP.S.km.forEach(function (r) { if (r.tahun_ajaran === s.tahun_ajaran_aktif && r.semester === s.semester_aktif && r.jenis !== 'PENGULANGAN') ada[r.nim] = r; });
    const baris = [];
    rowsMentah.slice(1).forEach(function (r, i) {
      const o = { baris: i + 2, nim: String(r[idx.nim] || '').trim(), nama: String(r[idx.nama] || '').trim(), email: String(r[idx.email] || '').trim().toLowerCase(), kelas: String(r[idx.kelas] || '').trim(), angkatan: String(r[idx.angkatan] || '').trim() };
      let catatan = '', status = 'VALID';
      if (!/^\d{5,20}$/.test(o.nim)) { status = 'ERROR'; catatan = 'Format NIM tidak valid (hanya angka, 5–20 digit)'; }
      else if (!o.nama || o.nama.length > 120) { status = 'ERROR'; catatan = 'Nama kosong / terlalu panjang'; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) { status = 'ERROR'; catatan = o.email ? 'Format email salah' : 'Email kosong'; }
      else if (!/^\d{4}$/.test(o.angkatan)) { status = 'ERROR'; catatan = 'Angkatan harus 4 digit tahun'; }
      else if (!izin[o.kelas.toLowerCase()]) { status = 'ERROR'; catatan = 'Kelas "' + o.kelas + '" tidak ditemukan / bukan penugasan aktif Anda'; }
      else if (vis[o.nim]) { status = 'ERROR'; catatan = 'NIM ganda di berkas (baris ' + vis[o.nim] + ')'; }
      else if (ada[o.nim]) {
        const k = SP.X.kelas[ada[o.nim].kelas_id];
        if (k && k.nama.toLowerCase() === o.kelas.toLowerCase()) { status = 'SKIP'; catatan = 'Sudah terdaftar di kelas ini'; }
        else { status = 'ERROR'; catatan = 'NIM sudah terdaftar di kelas ' + (k ? k.nama : '?') + ' (gunakan Pindah Kelas)'; }
      } else catatan = 'Format sesuai';
      vis[o.nim] = vis[o.nim] || o.baris;
      o.status = status; o.catatan = catatan; baris.push(o);
    });
    return { baris: baris };
  }
  function hitungImpor() {
    const b = SP.ui.impor.baris || [];
    return { total: b.length, valid: b.filter(function (x) { return x.status === 'VALID'; }).length, err: b.filter(function (x) { return x.status === 'ERROR'; }).length, skip: b.filter(function (x) { return x.status === 'SKIP'; }).length };
  }

  SP.parts.imporPratinjau = function () {
    const u = SP.ui.impor; if (!u.baris) return '';
    const c = hitungImpor(), semua = u.hanyaError ? u.baris.filter(function (x) { return x.status === 'ERROR'; }) : u.baris, pg = SP.paginate(semua, u.page, 10);
    u.page = pg.page;
    const errs = u.baris.filter(function (x) { return x.status === 'ERROR'; });
    return '<div class="card mt16"><div class="card-h"><div class="row gap8"><span class="stat-ic" style="color:var(--primary)">' + SP.icon('checkCircle', 'lg') + '</span><div><h2 class="h2">Hasil Validasi &amp; Pratinjau Data</h2><p class="muted" style="font-size:13px">Tinjau hasil pemindaian struktur dan integritas data sebelum dimasukkan ke dalam daftar kelas.</p></div></div>' +
      '<div class="row wrap gap8"><span class="chip">Total terbaca: ' + c.total + ' baris</span><span class="chip ok">' + SP.icon('check', 'sm') + ' Data valid: ' + c.valid + ' mahasiswa</span>' + (c.skip ? '<span class="chip nul">Sudah terdaftar: ' + c.skip + '</span>' : '') + (c.err ? '<span class="chip bad">' + SP.icon('alert', 'sm') + ' Bermasalah: ' + c.err + ' baris</span>' : '') + '</div></div><div class="card-b">' +
      (errs.length ? '<div class="callout bad" style="margin-bottom:16px"><div class="ic">' + SP.icon('alert') + '</div><div><div class="ct">Ditemukan ' + errs.length + ' kesalahan yang perlu diperbaiki:</div><div class="tx">' + errs.slice(0, 5).map(function (e) { return 'Baris ' + e.baris + ' — ' + esc(e.catatan); }).join('<br>') + (errs.length > 5 ? '<br>… dan ' + (errs.length - 5) + ' lainnya' : '') + '<br><b>Baris bermasalah akan diabaikan jika Anda melanjutkan impor.</b></div></div></div>' : '') +
      '<div class="tbl-wrap has-foot"><table class="tbl cards"><thead><tr><th>Baris</th><th>Status</th><th>NIM</th><th>Nama lengkap</th><th>Email mahasiswa</th><th>Kelas</th><th>Angkatan</th><th>Catatan validasi</th></tr></thead><tbody>' +
      pg.items.map(function (x) {
        return '<tr class="' + (x.status === 'ERROR' ? 'rowbad' : '') + '"><td data-l="Baris" class="num">' + x.baris + '</td><td data-l="Status">' + SP.badge(x.status === 'SKIP' ? 'BELUM' : x.status, x.status === 'SKIP' ? 'Terdaftar' : x.status === 'VALID' ? 'Valid' : 'Error') + '</td><td data-l="NIM" class="mono">' + esc(x.nim) + '</td><td data-l="Nama">' + esc(x.nama) + '</td><td data-l="Email" class="muted">' + esc(x.email) + '</td><td data-l="Kelas">' + esc(x.kelas) + '</td><td data-l="Angkatan" class="num">' + esc(x.angkatan) + '</td><td data-l="Catatan" style="' + (x.status === 'ERROR' ? 'color:var(--danger)' : 'color:var(--primary)') + '">' + esc(x.catatan) + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="tbl-foot"><span>Menampilkan ' + pg.dari + '–' + pg.sampai + ' dari ' + pg.total + ' baris</span><div class="row"><button class="btn btn-outline btn-sm ' + (u.hanyaError ? 'on' : '') + '" data-act="imporFilterError">' + (u.hanyaError ? 'Tampilkan Semua (' + c.total + ')' : 'Filter: Hanya Error') + '</button>' + SP.pagerHtml('imporHal', pg) + '</div></div></div>' +
      '<div class="row between wrap mt16"><button class="btn btn-outline" data-act="imporLaporanError" ' + (errs.length ? '' : 'disabled') + '>' + SP.icon('download') + ' Unduh Laporan Kesalahan (.txt)</button>' +
      '<div class="row"><button class="btn btn-outline" data-act="imporReset">Batal</button><button class="btn btn-primary btn-lg" data-act="imporKirim" ' + (c.valid && !u.sibuk ? '' : 'disabled') + '>' + (u.sibuk ? '<span class="spin"></span> Mengimpor…' : 'Impor ' + c.valid + ' Mahasiswa Valid ' + SP.icon('arrowRight')) + '</button></div></div></div>';
  };

  SP.views.impor = {
    judul: 'Impor Mahasiswa',
    render: function () {
      const u = SP.ui.impor, c = hitungImpor(), ada = !!u.baris;
      const langkah = function (no, cap, tt, sb, st) {
        return '<div class="step ' + st + '"><div class="no">' + (st === 'done' ? SP.icon('check') : no) + '</div><div><div class="cp">LANGKAH 0' + no + (st === 'on' ? ' • AKTIF' : '') + '</div><div class="tt">' + tt + '</div><div class="sb2">' + sb + '</div></div></div>';
      };
      const kol = [['NIM', 'Nomor induk mahasiswa, angka 5–20 digit.', '2310601001'], ['NAMA_LENGKAP', 'Nama lengkap sesuai data resmi (maks. 120 karakter).', 'MUHAMMAD RIDWAN MALIK'], ['EMAIL_MAHASISWA', 'Email aktif mahasiswa — dipakai untuk mengirim sertifikat.', 'ridwan@mhs.ac.id'], ['KELAS', 'Nama kelas yang sudah terdaftar di sistem.', 'PAI A'], ['ANGKATAN', 'Tahun masuk, 4 digit.', '2026']];
      return SP.header({ crumbs: [['Dasbor', '#/dasbor'], ['Impor Mahasiswa']], judul: 'Impor Data Mahasiswa Baru', desc: 'Unggah berkas CSV untuk mendaftarkan mahasiswa semester ganjil ke dalam sistem penugasan kelas.' }) +
        SP.callout({ ikon: 'info', judul: 'Pemberitahuan Kelanjutan Semester', tag: 'OTOMATISASI SISTEM', teks: 'Untuk <b>semester genap</b>, daftar mahasiswa per kelas otomatis diteruskan dari semester ganjil sehingga tutor tidak perlu mengimpor ulang. Impor CSV hanya diperlukan untuk angkatan baru atau penambahan mahasiswa susulan.' }) +
        '<div class="steps mt16">' + langkah(1, '', 'Unduh Format Template', 'Skema CSV baku SIPENA', u.templateDiunduh || ada ? 'done' : 'on') + langkah(2, '', 'Unggah Berkas CSV', ada ? 'Berkas terunggah: ' + (u.ukuran / 1024).toFixed(1) + ' KB' : 'Pilih atau seret berkas', ada ? 'done' : (u.templateDiunduh ? 'on' : '')) + langkah(3, '', 'Pratinjau &amp; Validasi', ada ? 'Verifikasi ' + c.total + ' baris data' : 'Menunggu berkas', ada ? 'on' : '') + '</div>' +
        '<div class="grid-main"><div class="card"><div class="card-h"><h2 class="h3">' + SP.icon('file') + ' Struktur Kolom CSV yang Diwajibkan</h2><span class="chip">5 Parameter</span></div><div class="card-b"><p class="muted mb16" style="font-size:13px">Pastikan nama header kolom di baris pertama berkas CSV Anda persis seperti format berikut:</p>' +
        kol.map(function (k) { return '<div class="colrow"><div class="top"><code>' + k[0] + '</code><span class="tagx req">WAJIB</span></div><small>' + k[1] + '</small><small>Contoh: <span class="mono">' + k[2] + '</span></small></div>'; }).join('') +
        '<button class="btn btn-soft mt8" style="width:100%" data-act="imporTemplate">' + SP.icon('download') + ' Unduh Template CSV (.csv)</button></div></div>' +
        '<div class="card"><div class="card-h"><h2 class="h3">' + SP.icon('upload') + ' Area Unggah Berkas</h2></div><div class="card-b"><div class="dz" id="dz"><div class="ic">' + SP.icon('upload', 'xl') + '</div><h3 class="h3">Tarik &amp; lepas file CSV di sini, atau klik tombol di bawah</h3><p class="muted mt8" style="font-size:13px">Format CSV (pemisah koma atau titik koma), maksimal 500 baris per unggahan.</p>' +
        '<label class="btn btn-primary mt16" style="cursor:pointer">' + SP.icon('folder') + ' Pilih Berkas CSV<input type="file" accept=".csv,.txt,text/csv" data-ch="imporFile" class="hide"></label></div>' +
        (ada ? '<div class="filerow mt16"><div class="fi">' + SP.icon('file') + '</div><div class="grow"><b class="trunc">' + esc(u.namaFile) + '</b><div class="muted" style="font-size:12px">' + (u.ukuran / 1024).toFixed(1) + ' KB • Berhasil diunggah &amp; divalidasi</div></div><button class="btn btn-ghost btn-sm" data-act="imporReset" style="color:var(--danger)">' + SP.icon('trash') + ' Hapus berkas</button></div>' : '') + '</div></div></div>' +
        '<div data-part="imporPratinjau">' + SP.parts.imporPratinjau() + '</div>' + (u.hasil ? hasilImporHtml(u.hasil) : '');
    },
    after: function () {
      const dz = SP.$('#dz'); if (!dz) return;
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
      dz.addEventListener('drop', function (e) { const f = e.dataTransfer.files[0]; if (f) bacaCsv(f); });
    }
  };

  function hasilImporHtml(h) {
    return '<div class="card card-p mt16"><div class="row gap8 mb16"><span style="color:var(--primary)">' + SP.icon('checkCircle', 'lg') + '</span><h2 class="h2">Hasil Impor Terakhir</h2></div><div class="row wrap gap8"><span class="chip ok">' + h.mahasiswaBaru + ' mahasiswa baru</span><span class="chip">' + h.didaftarkan + ' didaftarkan ke kelas</span><span class="chip nul">' + h.dilewati + ' dilewati (sudah ada)</span>' + (h.error.length ? '<span class="chip bad">' + h.error.length + ' ditolak server</span>' : '') + '</div>' +
      (h.error.length ? '<div class="callout bad mt16"><div class="ic">' + SP.icon('alert') + '</div><div class="tx">' + h.error.map(function (e) { return 'Baris ' + e.baris + ' (' + esc(e.nim) + '): ' + esc(e.pesan); }).join('<br>') + '</div></div>' : '') + '</div>';
  }

  async function bacaCsv(file) {
    if (file.size > 2 * 1024 * 1024) return SP.toast('Ukuran berkas terlalu besar (maksimal 2 MB).', 'err');
    const teks = await file.text();
    const r = validasi(SP.csvParse(teks));
    if (r.err) return SP.toast(esc(r.err), 'err', 8000);
    if (r.baris.length > 500) return SP.toast('Berkas berisi ' + r.baris.length + ' baris. Maksimal 500 baris per unggahan — pecah berkas Anda.', 'err', 8000);
    Object.assign(SP.ui.impor, { namaFile: file.name, ukuran: file.size, baris: r.baris, page: 1, hanyaError: false, hasil: null });
    SP.renderUlang();
  }
  SP.changes.imporFile = function (el) { if (el.files[0]) bacaCsv(el.files[0]); };
  SP.actions.imporTemplate = function () {
    const k = Object.keys(kelasImporIzin()).map(function (n) { return kelasImporIzin()[n].nama; })[0] || 'PAI A';
    const th = (SP.set().tahun_ajaran_aktif || '2026/2027').slice(0, 4);
    SP.unduhCsv('template-impor-mahasiswa-sipena.csv', ['NIM', 'NAMA_LENGKAP', 'EMAIL_MAHASISWA', 'KELAS', 'ANGKATAN'], [['2310601001', 'MUHAMMAD RIDWAN MALIK', 'ridwan@mhs.ac.id', k, th], ['2310601002', 'SITI AISYAH NURFADILAH', 'aisyah@mhs.ac.id', k, th]]);
    SP.ui.impor.templateDiunduh = true; SP.renderUlang();
  };
  SP.actions.imporReset = function () { Object.assign(SP.ui.impor, { namaFile: '', ukuran: 0, baris: null, hanyaError: false, page: 1, sibuk: false }); SP.renderUlang(); };
  SP.actions.imporFilterError = function () { SP.ui.impor.hanyaError = !SP.ui.impor.hanyaError; SP.ui.impor.page = 1; SP.refresh('imporPratinjau'); };
  SP.actions.imporHal = function (el) { SP.ui.impor.page = Number(el.dataset.p); SP.refresh('imporPratinjau'); };
  SP.actions.imporLaporanError = function () {
    const e = SP.ui.impor.baris.filter(function (x) { return x.status === 'ERROR'; });
    SP.unduh('laporan-kesalahan-impor.txt', 'LAPORAN KESALAHAN IMPOR — ' + SP.ui.impor.namaFile + '\r\n\r\n' + e.map(function (x) { return 'Baris ' + x.baris + ' | NIM ' + x.nim + ' | ' + x.catatan; }).join('\r\n'));
  };
  SP.actions.imporKirim = async function () {
    const u = SP.ui.impor, valid = u.baris.filter(function (x) { return x.status === 'VALID'; });
    if (!valid.length || u.sibuk) return;
    u.sibuk = true; SP.refresh('imporPratinjau');
    try {
      const r = await SP.api('impor', { rows: valid.map(function (x) { return { baris: x.baris, nim: x.nim, nama: x.nama, email: x.email, kelas: x.kelas, angkatan: x.angkatan }; }) }, { timeout: 120000 });
      SP.terapkanHasil(r); SP.simpanCache();
      u.hasil = r; u.baris = null; u.namaFile = ''; u.sibuk = false;
      SP.toast('<b>' + r.mahasiswaBaru + ' mahasiswa</b> berhasil diimpor.', 'ok');
    } catch (e) { u.sibuk = false; SP.toast(esc(e.message), 'err', 8000); }
    SP.renderUlang();
  };

  // ============================================================
  // DETAIL MAHASISWA (modal bersama)
  // ============================================================
  SP.actions.detailMhs = function (el) { SP.bukaDetailMhs(el.dataset.nim); };
  SP.bukaDetailMhs = function (nim) {
    const m = SP.X.mhs[nim]; if (!m) return SP.toast('Data mahasiswa tidak ditemukan.', 'warn');
    const kel = SP.kelulusan(nim), kelas = SP.kelasTerkini(nim), sert = SP.X.sert[nim];
    const hist = (SP.X.nilai[nim] || []).slice().sort(function (a, b) { return (a.tahun_ajaran + a.semester + a.siklus) < (b.tahun_ajaran + b.semester + b.siklus) ? -1 : 1; });
    const peng = (SP.X.peng[nim] || []).filter(function (r) { return r.status !== 'DIBATALKAN' && r.status !== 'DIGANTI'; });
    const h = SP.modal({
      judul: 'Detail Mahasiswa', lebar: 760, tanpaFokus: true,
      isi: '<div class="row top wrap mb16"><div id="dm-foto" class="avatar" style="width:84px;height:84px;border-radius:12px;font-size:26px;overflow:hidden">' + esc(SP.inisial(m.nama)) + '</div><div class="grow"><h3 class="h2">' + esc(m.nama) + '</h3><div class="row wrap gap8 mt8"><span class="chip mono">' + esc(m.nim) + '</span><span class="chip">Angkatan ' + esc(m.angkatan || '—') + '</span><span class="chip">' + esc(kelas ? kelas.nama : '—') + '</span>' + SP.badge(kel.akhir) + '</div><p class="muted mt8">' + SP.icon('mail', 'sm') + ' ' + esc(m.email || '—') + '</p></div></div>' +
        '<div class="grid2 mb16">' + SP.PROGRAM.map(function (p) { return '<div class="card card-p20 row between"><span><b>' + esc(SP.PROG_LABEL[p]) + '</b></span>' + SP.badge(kel.program[p]) + '</div>'; }).join('') + '</div>' +
        '<h3 class="h3 mb16">Riwayat penilaian</h3>' + (hist.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:560px"><thead><tr><th>Program</th><th>Siklus</th><th>Semester</th><th>Kelas</th><th>Status</th><th>Diperbarui</th></tr></thead><tbody>' +
          hist.map(function (r) { return '<tr><td>' + esc(SP.PROG_SHORT[r.program]) + '</td><td class="num">' + (r.siklus > 1 ? 'Pengulangan ke-' + (r.siklus - 1) : 'Reguler') + '</td><td>' + esc(SP.semLabel(r.semester) + ' ' + r.tahun_ajaran) + '</td><td>' + esc(SP.kelasNama(r.kelas_id)) + '</td><td>' + SP.badge(r.status) + '</td><td class="muted" style="font-size:12.5px">' + SP.waktu(r.waktu_ubah) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">Belum ada nilai tercatat.</p>') +
        (peng.length ? '<h3 class="h3 mt24 mb16">Pengulangan</h3>' + peng.map(function (r) { return '<div class="callout warn" style="margin-bottom:8px"><div class="ic">' + SP.icon('rotate') + '</div><div class="grow"><div class="ct">' + esc(SP.PROG_LABEL[r.program]) + ' ' + SP.badge(r.status) + '</div><div class="tx">Jadwal: ' + esc(SP.targetLabel(r)) + (r.kelas_ulang_id ? ' · Kelas ' + esc(SP.kelasNama(r.kelas_ulang_id)) : '') + '</div></div></div>'; }).join('') : '') +
        (sert && sert.file_id ? '<div class="callout ok mt16"><div class="ic">' + SP.icon('award', 'lg') + '</div><div class="grow"><div class="ct">Sertifikat diterbitkan</div><div class="tx"><span class="mono">' + esc(sert.nomor) + '</span> · ' + SP.tgl(sert.tanggal_cetak) + '</div></div><button class="btn btn-outline btn-sm" data-act="unduhSert" data-nim="' + esc(nim) + '">' + SP.icon('download') + ' Unduh PDF</button></div>' : ''),
      footer: '<button class="btn btn-outline" data-act="editMhs" data-nim="' + esc(nim) + '">' + SP.icon('pencil') + ' Ubah data</button><label class="btn btn-outline" style="cursor:pointer">' + SP.icon('image') + ' Unggah foto<input type="file" accept="image/png,image/jpeg" class="hide" data-ch="fotoMhs" data-nim="' + esc(nim) + '"></label><button class="btn btn-primary" data-act="tutupModal">Tutup</button>'
    });
    SP.api('ambilFoto', { nim: nim }).then(function (r) {
      const f = h.el.querySelector('#dm-foto'); if (f && r.dataUrl) f.innerHTML = '<img src="' + r.dataUrl + '" alt="" style="width:100%;height:100%;object-fit:cover">';
    }).catch(function () { /* foto opsional */ });
  };
  SP.actions.editMhs = function (el) {
    const m = SP.X.mhs[el.dataset.nim]; SP.tutupModal();
    SP.modal({
      judul: 'Ubah Data Mahasiswa', lebar: 480,
      isi: '<div class="stack"><div class="field"><label>NIM</label><input class="input mono" value="' + esc(m.nim) + '" readonly></div><div class="field"><label for="em-n">Nama lengkap</label><input id="em-n" class="input" value="' + esc(m.nama) + '"></div><div class="field"><label for="em-e">Email mahasiswa</label><input id="em-e" type="email" class="input" value="' + esc(m.email) + '"></div></div>',
      footer: '<button class="btn btn-outline" data-act="tutupModal">Batal</button><button class="btn btn-primary" data-act="simpanMhs" data-nim="' + esc(m.nim) + '">Simpan</button>'
    });
  };
  SP.actions.simpanMhs = async function (el) {
    const nama = SP.$('#em-n').value.trim(), email = SP.$('#em-e').value.trim();
    el.disabled = true;
    try { await SP.api('mahasiswaUbah', { nim: el.dataset.nim, nama: nama, email: email }); SP.terapkanHasil({ mahasiswa: [{ nim: el.dataset.nim, nama: nama, email: email.toLowerCase() }] }); SP.simpanCache(); SP.tutupModal(); SP.toast('Data mahasiswa diperbarui.'); SP.renderUlang(); }
    catch (e) { el.disabled = false; SP.toast(esc(e.message), 'err'); }
  };
  SP.changes.fotoMhs = async function (el) {
    const f = el.files[0]; if (!f) return;
    try {
      const url = await SP.kecilkanGambar(f, 480, 'image/jpeg');
      await SP.api('unggahFoto', { nim: el.dataset.nim, mime: 'image/jpeg', base64: url.split(',')[1] });
      SP.toast('Foto berhasil diunggah.'); const fo = SP.$('#dm-foto'); if (fo) fo.innerHTML = '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:cover">';
    } catch (e) { SP.toast(esc(e.message), 'err'); }
  };
  SP.actions.unduhSert = async function (el) {
    el.disabled = true;
    try { const r = await SP.api('unduhSertifikat', { nim: el.dataset.nim }, { timeout: 90000 }); SP.unduhBase64(r.nama, r.base64, 'application/pdf'); }
    catch (e) { SP.toast(esc(e.message), 'err'); }
    el.disabled = false;
  };

  // ============================================================
  // STATUS KELULUSAN
  // ============================================================
  SP.ui.kel = SP.ui.kel || { q: '', angkatan: '', kelas: '', prodi: '', status: '', page: 1, per: 10, aturan: true };

  function kelBaris() {
    const u = SP.ui.kel, q = u.q.toLowerCase();
    return SP.barisKelulusan().filter(function (b) {
      if (u.angkatan && b.m.angkatan !== u.angkatan) return false;
      if (u.kelas && !(b.kelas && b.kelas.id === u.kelas)) return false;
      if (u.prodi && !(b.kelas && b.kelas.prodi === u.prodi)) return false;
      if (u.status && b.akhir !== u.status) return false;
      if (q && (b.m.nim + ' ' + b.m.nama).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  SP.parts.kelStat = function () {
    const semua = SP.barisKelulusan(), f = kelBaris();
    const c = { l: 0, w: 0, b: 0 }; f.forEach(function (b) { if (b.akhir === 'LULUS') c.l++; else if (b.akhir === 'WAJIB_MENGULANG') c.w++; else c.b++; });
    return SP.stat({ label: 'Total mahasiswa terdaftar', nilai: SP.n(f.length), satuan: f.length === semua.length ? 'Semua angkatan' : 'Hasil filter', ikon: 'users', progress: 100 }) +
      SP.stat({ label: 'Lulus penuh (yudisium)', nilai: SP.n(c.l), ikon: 'checkCircle', warna: 'g', foot: '<span>Persentase</span><b>' + SP.pctStr(SP.pct(c.l, f.length)) + '</b>', progress: SP.pct(c.l, f.length) || 0 }) +
      SP.stat({ label: 'Wajib mengulang', nilai: SP.n(c.w), ikon: 'rotate', warna: 'o', kelas: 'warn', foot: '<span>Persentase</span><b>' + SP.pctStr(SP.pct(c.w, f.length)) + '</b>', progress: SP.pct(c.w, f.length) || 0, progWarna: 'o' }) +
      SP.stat({ label: 'Nilai belum lengkap', nilai: SP.n(c.b), ikon: 'clock', warna: 'n', foot: '<span>Persentase</span><b>' + SP.pctStr(SP.pct(c.b, f.length)) + '</b>', progress: SP.pct(c.b, f.length) || 0, progWarna: 'g' });
  };
  SP.parts.kelTabel = function () {
    const u = SP.ui.kel, f = kelBaris(), pg = SP.paginate(f, u.page, u.per); u.page = pg.page;
    const sel = function (p, b) { const st = b.kel.program[p]; return SP.badge(st, st === 'LULUS' ? 'Lulus' : st === 'TIDAK_LULUS' ? 'Tdk Lulus' : 'Belum'); };
    if (!pg.total) return '<div class="card">' + SP.kosong('search', 'Tidak ada data', 'Tidak ada mahasiswa yang cocok dengan filter saat ini.') + '</div>';
    return '<div class="card"><div class="card-h" style="padding:14px 20px"><div class="row gap8">' + SP.icon('shieldCheck') + '<b>Data Rekap Kelulusan 4 Mata Uji</b></div><div class="row wrap gap8 muted" style="font-size:12.5px"><span><span class="dotp" style="color:var(--primary)"></span> Lulus (4 modul)</span><span><span class="dotp" style="color:#F97316"></span> Wajib mengulang (≥1 gagal)</span><span><span class="dotp" style="color:#6B7280"></span> Belum lengkap</span></div></div>' +
      '<div class="tbl-wrap" style="border:0;border-radius:0"><table class="tbl cards compact"><thead><tr><th>No</th><th>NIM</th><th>Nama mahasiswa</th><th>Kelas</th><th>Arab Ganjil</th><th>Inggris Ganjil</th><th>Arab Genap</th><th>Inggris Genap</th><th>Status akhir</th><th>Aksi</th></tr></thead><tbody>' +
      pg.items.map(function (b, i) {
        return '<tr class="' + (b.akhir === 'WAJIB_MENGULANG' ? 'rowbad' : '') + '"><td data-l="No" class="num muted">' + (pg.dari + i) + '</td><td data-l="NIM" class="mono"><b style="' + (b.akhir === 'WAJIB_MENGULANG' ? 'color:var(--danger)' : '') + '">' + esc(b.m.nim) + '</b></td>' +
          '<td data-l="Nama" class="nm"><b>' + esc(b.m.nama) + '</b><small>' + esc(b.kelas ? b.kelas.prodi || '' : '') + '</small></td><td data-l="Kelas">' + esc(b.kelas ? b.kelas.nama : '—') + '</td>' +
          SP.PROGRAM.map(function (p) { return '<td data-l="' + esc(SP.PROG_SHORT[p]) + '">' + sel(p, b) + '</td>'; }).join('') + '<td data-l="Status akhir">' + SP.badge(b.akhir) + '</td>' +
          '<td><button class="btn btn-outline btn-sm" data-act="detailMhs" data-nim="' + esc(b.m.nim) + '">' + SP.icon('eye') + ' Detail</button></td></tr>';
      }).join('') + '</tbody></table></div><div class="tbl-foot" style="border-top:1px solid var(--border)"><span>Menampilkan ' + pg.dari + ' – ' + pg.sampai + ' dari <b class="num">' + SP.n(pg.total) + '</b> data mahasiswa <select class="select" style="width:auto;height:30px;margin-left:8px" data-ch="kelPer" aria-label="Baris per halaman">' + [10, 25, 50, 100].map(function (n) { return '<option ' + (n === u.per ? 'selected' : '') + '>' + n + '</option>'; }).join('') + '</select></span>' + SP.pagerHtml('kelHal', pg) + '</div></div>';
  };
  SP.parts.kelFilterAktif = function () {
    const u = SP.ui.kel, ch = [];
    const tambah = function (k, label) { ch.push('<span class="chip">' + esc(label) + ' <button class="btn btn-ghost btn-sm" style="height:20px;padding:0 2px" data-act="kelHapusFilter" data-k="' + k + '" aria-label="Hapus filter">' + SP.icon('x', 'sm') + '</button></span>'); };
    if (u.angkatan) tambah('angkatan', 'Angkatan: ' + u.angkatan); if (u.kelas) tambah('kelas', 'Kelas: ' + SP.kelasNama(u.kelas)); if (u.prodi) tambah('prodi', 'Prodi: ' + u.prodi);
    if (u.status) tambah('status', 'Status: ' + ({ LULUS: 'Lulus', WAJIB_MENGULANG: 'Wajib Mengulang', BELUM_LENGKAP: 'Belum Lengkap' }[u.status]));
    if (!ch.length) return '';
    return '<div class="filters"><span class="cap">Filter aktif:</span>' + ch.join('') + '<button class="btn btn-ghost btn-sm" style="color:var(--danger)" data-act="kelReset">' + SP.icon('x', 'sm') + ' RESET FILTER</button></div>';
  };
  SP.views.kelulusan = {
    judul: 'Status Kelulusan',
    render: function () {
      const u = SP.ui.kel;
      const op = function (arr, sel, all) { return '<option value="">' + all + '</option>' + arr.map(function (x) { return '<option value="' + esc(x[0]) + '" ' + (x[0] === sel ? 'selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); };
      return SP.header({
        crumbs: [['Dasbor', '#/dasbor'], ['Status Kelulusan']], judul: 'Status Kelulusan 4 Program', desc: 'Rekapitulasi penetapan kelulusan mahasiswa Bahasa Arab &amp; Bahasa Inggris (Semester Ganjil &amp; Genap).',
        aksi: '<div style="position:relative"><button class="btn btn-primary" data-act="menuUnduh">' + SP.icon('download') + ' Unduh Rekapitulasi ' + SP.icon('chevronDown', 'sm') + '</button><div class="dd hide" id="menu-unduh" style="min-width:230px"><button class="dd-i" data-act="kelXlsx">' + SP.icon('file') + ' Excel (.xlsx)</button><button class="dd-i" data-act="kelCsv">' + SP.icon('download') + ' CSV</button><button class="dd-i" data-act="kelPdf">' + SP.icon('printer') + ' Cetak / Simpan PDF</button></div></div>'
      }) +
        '<div class="callout mb16"><div class="ic">' + SP.icon('shieldCheck', 'lg') + '</div><div class="grow"><div class="row between"><div><div class="cap" style="color:var(--primary)">MATRIKS VALIDASI AKADEMIK</div><div class="h3">Aturan Kelulusan Komprehensif 4 Gerbang Program</div></div><button class="btn btn-ghost btn-sm" data-act="kelAturan" aria-label="Lipat">' + SP.icon(u.aturan ? 'chevronUp' : 'chevronDown') + '</button></div>' +
        (u.aturan ? '<div class="row wrap gap8 mt16" style="background:#fff;border-radius:10px;padding:12px">' + SP.PROGRAM.map(function (p, i) { return (i ? '<span class="muted3">+</span>' : '') + '<span class="chip ok">' + SP.icon('checkCircle', 'sm') + ' ' + esc(SP.PROG_SHORT[p]) + ': Lulus</span>'; }).join('') + SP.icon('arrowRight') + '<span class="badge b-solid" style="height:30px;padding:0 12px">' + SP.icon('award') + ' STATUS AKHIR: LULUS (BERHAK SERTIFIKAT)</span></div><p class="tx mt8" style="color:var(--text2);font-size:13px">Mahasiswa <b>hanya dinyatakan LULUS</b> apabila memenuhi ketuntasan di seluruh 4 program tanpa terkecuali. <b style="color:var(--danger)">1 program saja yang tidak lulus</b> menyebabkan penetapan status <b style="color:var(--accent-d)">Wajib Mengulang</b> pada program tersebut di semester berikutnya.</p>' : '') + '</div></div>' +
        '<div class="grid4 mb16" data-part="kelStat">' + SP.parts.kelStat() + '</div>' +
        '<div class="toolbar"><div class="sch">' + SP.icon('search') + '<input class="input" placeholder="Cari NIM, nama mahasiswa…" data-in="kelQ" value="' + esc(u.q) + '" aria-label="Cari"></div>' +
        '<div class="field"><select class="select" data-ch="kelAngkatan" aria-label="Angkatan">' + op(SP.angkatanList().map(function (a) { return [a, 'Angkatan ' + a]; }), u.angkatan, 'Semua Angkatan') + '</select></div>' +
        '<div class="field"><select class="select" data-ch="kelKelas" aria-label="Kelas">' + op(SP.S.kelas.map(function (k) { return [k.id, k.nama]; }), u.kelas, 'Semua Kelas') + '</select></div>' +
        '<div class="field"><select class="select" data-ch="kelProdi" aria-label="Prodi">' + op(SP.prodiList().map(function (x) { return [x, x]; }), u.prodi, 'Semua Prodi') + '</select></div>' +
        '<div class="field"><select class="select" data-ch="kelStatus" aria-label="Status">' + op([['LULUS', 'Lulus'], ['WAJIB_MENGULANG', 'Wajib Mengulang'], ['BELUM_LENGKAP', 'Belum Lengkap']], u.status, 'Semua Status') + '</select></div></div>' +
        '<div data-part="kelFilterAktif">' + SP.parts.kelFilterAktif() + '</div><div data-part="kelTabel">' + SP.parts.kelTabel() + '</div>';
    }
  };
  function kelUlang() { SP.ui.kel.page = 1; SP.refresh('kelStat'); SP.refresh('kelTabel'); SP.refresh('kelFilterAktif'); }
  SP.inputs.kelQ = SP.debounce(function (el) { SP.ui.kel.q = el.value; kelUlang(); }, 150);
  ['Angkatan', 'Kelas', 'Prodi', 'Status'].forEach(function (k) { SP.changes['kel' + k] = function (el) { SP.ui.kel[k.toLowerCase()] = el.value; kelUlang(); }; });
  SP.changes.kelPer = function (el) { SP.ui.kel.per = Number(el.value); SP.ui.kel.page = 1; SP.refresh('kelTabel'); };
  SP.actions.kelHal = function (el) { SP.ui.kel.page = Number(el.dataset.p); SP.refresh('kelTabel'); };
  SP.actions.kelAturan = function () { SP.ui.kel.aturan = !SP.ui.kel.aturan; SP.renderUlang(); };
  SP.actions.kelHapusFilter = function (el) { SP.ui.kel[el.dataset.k] = ''; SP.renderUlang(); };
  SP.actions.kelReset = function () { Object.assign(SP.ui.kel, { angkatan: '', kelas: '', prodi: '', status: '', q: '' }); SP.renderUlang(); };
  SP.actions.menuUnduh = function () { const m = SP.$('#menu-unduh'); if (m) m.classList.toggle('hide'); };
  function dataEkspor() {
    return { h: ['NIM', 'Nama', 'Kelas', 'Angkatan', 'Arab Ganjil', 'Inggris Ganjil', 'Arab Genap', 'Inggris Genap', 'Status Akhir'], r: kelBaris().map(function (b) {
      const t = function (s) { return s === 'LULUS' ? 'Lulus' : s === 'TIDAK_LULUS' ? 'Tidak Lulus' : 'Belum Diisi'; };
      return [b.m.nim, b.m.nama, b.kelas ? b.kelas.nama : '', b.m.angkatan].concat(SP.PROGRAM.map(function (p) { return t(b.kel.program[p]); })).concat([{ LULUS: 'Lulus', WAJIB_MENGULANG: 'Wajib Mengulang', BELUM_LENGKAP: 'Belum Lengkap' }[b.akhir]]);
    }) };
  }
  SP.actions.kelXlsx = function () { const d = dataEkspor(); if (!d.r.length) return SP.toast('Tidak ada data.', 'warn'); SP.eksporXlsx('Status Kelulusan', d.h, d.r); };
  SP.actions.kelCsv = function () { const d = dataEkspor(); if (!d.r.length) return SP.toast('Tidak ada data.', 'warn'); SP.unduhCsv('status-kelulusan.csv', d.h, d.r); };
  SP.actions.kelPdf = function () { const d = dataEkspor(); if (!d.r.length) return SP.toast('Tidak ada data.', 'warn'); SP.cetakTabel('Status Kelulusan 4 Program', d.h, d.r, SP.set().nama_lembaga + ' · dicetak ' + SP.tgl(SP.hariIni(), true)); };
  document.addEventListener('click', function (e) { const m = SP.$('#menu-unduh'); if (m && !m.classList.contains('hide') && !e.target.closest('#menu-unduh') && !e.target.closest('[data-act="menuUnduh"]')) m.classList.add('hide'); });

  // ============================================================
  // CETAK SERTIFIKAT
  // ============================================================
  SP.ui.cert = SP.ui.cert || { kelas: '', tab: 'siap', sel: {}, q: '', page: 1, job: null };

  function certData() {
    const izin = {}; SP.kelasCetak().forEach(function (k) { izin[k.id] = true; });
    const adm = SP.isAdmin();
    return SP.barisKelulusan().filter(function (b) {
      if (b.akhir !== 'LULUS') return false;
      const rows = (SP.X.km[b.m.nim] || []).filter(function (r) { return r.jenis !== 'PENGULANGAN'; });
      if (!adm && !rows.some(function (r) { return izin[r.kelas_id]; })) return false;
      if (SP.ui.cert.kelas && !rows.some(function (r) { return r.kelas_id === SP.ui.cert.kelas; })) return false;
      return true;
    });
  }
  function certStatus(b) {
    const s = SP.X.sert[b.m.nim];
    return { sert: s && s.file_id ? s : null, terbit: !!(s && s.file_id) };
  }
  function certTab(daftar, tab) {
    return daftar.filter(function (b) {
      const c = certStatus(b);
      if (tab === 'siap') return !c.terbit;
      if (tab === 'terbit') return c.terbit;
      if (tab === 'antre') return c.terbit && c.sert.status_email === 'ANTRE';
      if (tab === 'gagal') return c.terbit && c.sert.status_email === 'GAGAL';
      return true;
    });
  }
  function badgeEmail(s) {
    if (!s) return '<span class="muted3">—</span>';
    const k = { TERKIRIM: 'TERKIRIM', ANTRE: 'ANTRE', GAGAL: 'GAGAL', BELUM: 'BELUM_KIRIM' }[s.status_email] || 'BELUM_KIRIM';
    return SP.badge(k) + (s.status_email === 'GAGAL' ? ' <button class="btn btn-ghost btn-sm" style="color:var(--danger)" data-act="certKirim" data-nim="' + esc(s.nim) + '">Kirim Ulang</button>' : '');
  }

  SP.parts.certKuota = function () {
    const q = SP.S.meta.kuotaEmail || { sisa: 0, total: 1500, terpakai: 0 };
    const pct = Math.round(q.terpakai / (q.total || 1) * 100);
    return '<div class="ic">' + SP.icon('mail', 'lg') + '</div><div class="grow"><div class="h3">Kuota Pengiriman Email Hari Ini <span class="badge ' + (pct > 85 ? 'b-bad' : 'b-warn') + '" style="vertical-align:middle">' + pct + '% TERPAKAI</span></div>' +
      '<p class="muted" style="font-size:13px">Terpakai <b class="num">' + SP.n(q.terpakai) + ' / ' + SP.n(q.total) + '</b> kuota Google Workspace. Sertifikat PDF dibuat otomatis di Google Drive dan dikirim bertahap lewat sistem antrean.</p></div>' +
      '<div style="min-width:220px"><div class="row between" style="font-size:13px"><span>Sisa kuota: <b>' + SP.n(q.sisa) + ' email</b></span><b style="color:var(--danger)">' + pct + '%</b></div>' + SP.prog(pct, pct > 85 ? 'r' : 'o') + '<div class="muted3 mt8" style="font-size:12px">Reset harian pukul 00:00 WIB</div></div>';
  };
  SP.parts.certJob = function () {
    const j = SP.ui.cert.job; if (!j) return '';
    const pct = j.total ? Math.round(j.selesai / j.total * 100) : 0, selesai = j.selesai >= j.total || j.henti;
    const sisa = j.selesai ? Math.round((Date.now() - j.mulai) / j.selesai * (j.total - j.selesai) / 1000) : null;
    return '<div class="card card-p mt16"><div class="row between wrap mb16"><div class="row gap8"><span style="color:var(--primary)">' + (selesai ? SP.icon('checkCircle', 'lg') : '<span class="spin"></span>') + '</span><div><h2 class="h3">' + (selesai ? 'Pencetakan batch selesai' : 'Memproses pembuatan PDF') + ': ' + j.selesai + ' dari ' + j.total + ' mahasiswa ' + (selesai ? '' : 'selesai…') + '</h2><div class="muted" style="font-size:12.5px">Target batch: ' + esc(j.label) + '</div></div></div>' +
      (selesai ? '<button class="btn btn-outline btn-sm" data-act="certJobTutup">Tutup</button>' : '<div class="row"><button class="btn btn-outline btn-sm" data-act="certJeda">' + SP.icon(j.jeda ? 'refresh' : 'pause') + (j.jeda ? ' Lanjutkan' : ' Jeda') + '</button><button class="btn btn-danger btn-sm" data-act="certHenti">' + SP.icon('stop') + ' Hentikan</button></div>') + '</div>' +
      '<div class="prog lg"><i class="' + (selesai ? '' : 'stripe') + '" style="width:' + pct + '%"></i></div><div class="row between mt8 muted" style="font-size:12.5px"><span>' + (j.gagal.length ? '<b style="color:var(--danger)">' + j.gagal.length + ' gagal</b> · ' : '') + pct + '% selesai</span><span>' + (selesai ? '' : sisa !== null ? 'Estimasi sisa waktu: ~' + sisa + ' detik' : 'Menghitung estimasi…') + '</span></div>' +
      (j.gagal.length ? '<div class="callout bad mt16"><div class="ic">' + SP.icon('alert') + '</div><div class="tx">' + j.gagal.slice(0, 5).map(function (g) { return '<span class="mono">' + esc(g.nim) + '</span>: ' + esc(g.pesan); }).join('<br>') + '</div></div>' : '') + '</div>';
  };
  SP.parts.certPreview = function () {
    const s = SP.set(), d = certData();
    const pilih = Object.keys(SP.ui.cert.sel).filter(function (n) { return SP.ui.cert.sel[n]; })[0];
    const b = d.filter(function (x) { return x.m.nim === pilih; })[0] || d[0];
    const m = b ? b.m : { nama: 'NAMA MAHASISWA', nim: '0000000000', angkatan: '----' };
    const sert = b ? SP.X.sert[m.nim] : null;
    return '<div class="cert-wrap"><div class="cert"><div class="cert-in"><div class="lb">' + esc(s.nama_lembaga || 'NAMA LEMBAGA') + '</div><div class="tt">SERTIFIKAT KEMAHIRAN BAHASA</div><div class="ar">ARAB &amp; INGGRIS</div><div class="ln"></div>' +
      '<div class="no">Nomor: ' + esc(sert && sert.nomor ? sert.nomor : 'CERT/ARB-ENG/____/___') + '</div><div class="gv">Diberikan dengan penuh kehormatan kepada:</div><div class="nm">' + esc(m.nama.toUpperCase()) + '</div>' +
      '<div class="ni">NIM ' + esc(m.nim) + ' · Kelas ' + esc(b && b.kelas ? b.kelas.nama : '—') + ' · Angkatan ' + esc(m.angkatan || '—') + '</div><div class="st">Telah dinyatakan <b>LULUS</b> pada seluruh 4 program Kemahiran Bahasa Arab dan Bahasa Inggris (Semester Ganjil dan Genap).</div>' +
      '<div class="tg">Diterbitkan pada ' + esc(SP.tgl(sert && sert.tanggal_cetak ? sert.tanggal_cetak : SP.hariIni(), true)) + '</div>' +
      '<div class="sg l">' + esc(s.ttd1_jabatan || '') + '<div class="ln2"></div><b>' + esc(s.ttd1_nama || '(nama pejabat 1)') + '</b></div><div class="sg r">' + esc(s.ttd2_jabatan || '') + '<div class="ln2"></div><b>' + esc(s.ttd2_nama || '(nama pejabat 2)') + '</b></div><div class="qr"></div></div></div></div>';
  };

  SP.parts.certTabel = function () {
    const u = SP.ui.cert, all = certData(), q = u.q.toLowerCase();
    let daftar = certTab(all, u.tab).filter(function (b) { return !q || (b.m.nim + ' ' + b.m.nama).toLowerCase().indexOf(q) >= 0; });
    const pg = SP.paginate(daftar, u.page, 10); u.page = pg.page;
    const nSel = Object.keys(u.sel).filter(function (n) { return u.sel[n]; }).length;
    const semuaTerpilih = pg.items.length && pg.items.every(function (b) { return u.sel[b.m.nim]; });
    const tabBtn = function (v, label, n, kls) { return '<button class="fchip ' + (u.tab === v ? 'on' : '') + '" data-act="certTab" data-v="' + v + '">' + label + ' <span class="n ' + (kls || '') + '">' + n + '</span></button>'; };
    return '<div class="filters">' + tabBtn('siap', 'Siap Cetak', certTab(all, 'siap').length) + tabBtn('terbit', 'Sudah Diterbitkan', certTab(all, 'terbit').length) + tabBtn('antre', 'Antrean Email', certTab(all, 'antre').length) + tabBtn('gagal', 'Gagal Kirim', certTab(all, 'gagal').length, certTab(all, 'gagal').length ? 'bad' : '') + '</div>' +
      '<div class="callout" style="padding:12px 16px;margin-bottom:16px"><label class="chk"><input type="checkbox" data-ch="certSemua" ' + (semuaTerpilih ? 'checked' : '') + '> <b>Pilih Semua</b></label><span class="muted">•</span><b style="color:var(--primary)">' + nSel + ' Terpilih</b><span class="grow"></span>' +
      '<button class="btn btn-accent btn-sm" data-act="certCetak" ' + (nSel ? '' : 'disabled') + '>' + SP.icon('printer') + ' Cetak Terpilih (' + nSel + ')</button><button class="btn btn-primary btn-sm" data-act="certKirim" ' + (nSel ? '' : 'disabled') + '>' + SP.icon('send') + ' Kirim Email</button></div>' +
      (pg.total ? '<div class="tbl-wrap has-foot"><table class="tbl cards compact"><thead><tr><th></th><th>Mahasiswa</th><th>No. sertifikat</th><th>Status terbit</th><th>Status email</th><th>Aksi</th></tr></thead><tbody>' +
        pg.items.map(function (b) {
          const c = certStatus(b);
          return '<tr><td><label class="chk"><input type="checkbox" data-ch="certPilih" data-nim="' + esc(b.m.nim) + '" ' + (u.sel[b.m.nim] ? 'checked' : '') + ' aria-label="Pilih ' + esc(b.m.nama) + '"></label></td><td data-l="Mahasiswa" class="nm"><b>' + esc(b.m.nama) + '</b><small><span class="mono">' + esc(b.m.nim) + '</span> · ' + esc(b.kelas ? b.kelas.nama : '') + '</small></td>' +
            '<td data-l="No. sertifikat" class="mono" style="font-size:12px">' + esc(c.sert ? c.sert.nomor : '—') + '</td><td data-l="Status terbit">' + SP.badge(c.terbit ? 'DITERBITKAN' : 'SIAP_CETAK') + '</td><td data-l="Status email">' + badgeEmail(c.sert) + '</td>' +
            '<td>' + (c.terbit ? '<button class="btn btn-outline btn-sm" data-act="unduhSert" data-nim="' + esc(b.m.nim) + '">' + SP.icon('download') + ' PDF</button> <button class="btn btn-ghost btn-sm" data-act="certUlang" data-nim="' + esc(b.m.nim) + '" title="Cetak ulang">' + SP.icon('refresh') + '</button>' : '<button class="btn btn-accent btn-sm" data-act="certSatu" data-nim="' + esc(b.m.nim) + '">' + SP.icon('printer') + ' Cetak</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div><div class="tbl-foot"><span>Menampilkan ' + pg.dari + '–' + pg.sampai + ' dari ' + pg.total + ' mahasiswa berhak sertifikat</span>' + SP.pagerHtml('certHal', pg) + '</div>'
        : '<div class="card">' + SP.kosong('award', u.tab === 'siap' ? 'Tidak ada sertifikat yang siap dicetak' : 'Belum ada data', u.tab === 'siap' ? 'Mahasiswa yang lulus pada keempat program akan muncul di sini.' : 'Tidak ada baris pada tab ini.') + '</div>');
  };

  SP.views.sertifikat = {
    judul: 'Cetak Sertifikat',
    render: function () {
      if (!SP.bolehCetakUI()) {
        return SP.header({ crumbs: [['Dasbor', '#/dasbor'], ['Cetak Sertifikat']], judul: 'Penerbitan & Pencetakan Sertifikat' }) + '<div class="card">' + SP.kosong('lock', 'Akses terbatas', 'Modul ini khusus <b>tutor semester genap</b> dan Superadmin, karena kelulusan ditetapkan setelah melihat hasil keseluruhan dua semester.') + '</div>';
      }
      const u = SP.ui.cert, s = SP.set();
      return SP.header({
        crumbs: [['Dasbor', '#/dasbor'], ['Cetak Sertifikat']], eyebrow: 'Modul Registrar & Kelulusan', judul: 'Penerbitan & Pencetakan Sertifikat', desc: 'Khusus tutor semester genap &amp; Superadmin untuk mahasiswa berstatus Lulus 4 Program.',
        aksi: '<button class="btn btn-outline" data-act="certContoh">' + SP.icon('eye') + ' Contoh PDF</button>' + (SP.isAdmin() ? '<a class="btn btn-outline" href="#/pengaturan">' + SP.icon('sliders') + ' Ubah Template</a>' : '')
      }) +
        (s.template_slides_id || !SP.isAdmin() ? '' : SP.callout({ tipe: 'warn', ikon: 'alert', judul: 'Template sertifikat belum diatur', teks: 'Buka <a href="#/pengaturan"><b>Pengaturan</b></a> lalu buat template bawaan sebelum mencetak.' })) +
        '<div class="card kuota" data-part="certKuota" style="background:var(--callout)">' + SP.parts.certKuota() + '</div>' +
        '<div class="grid-main" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)"><div><div class="toolbar"><div class="field" style="min-width:240px"><label for="cs-k">Kelas</label><select id="cs-k" class="select" data-ch="certKelas"><option value="">Semua kelas (' + SP.kelasCetak().length + ')</option>' + SP.kelasCetak().map(function (k) { return '<option value="' + esc(k.id) + '" ' + (u.kelas === k.id ? 'selected' : '') + '>' + esc(k.nama) + '</option>'; }).join('') + '</select></div>' +
        '<div class="sch" style="align-self:flex-end"><span style="position:absolute;left:12px;top:11px;color:var(--text3)">' + SP.icon('search') + '</span><input class="input" style="padding-left:38px" placeholder="Cari NIM atau nama…" data-in="certQ" value="' + esc(u.q) + '"></div></div>' +
        '<div data-part="certTabel">' + SP.parts.certTabel() + '</div></div>' +
        '<div class="card card-p" style="position:sticky;top:84px"><div class="row between mb16"><h2 class="h3">' + SP.icon('file') + ' Pratinjau Lembar Sertifikat PDF</h2><span class="chip">A4 Landscape</span></div><div data-part="certPreview">' + SP.parts.certPreview() + '</div>' +
        '<p class="muted mt16" style="font-size:12.5px">Pratinjau mengikuti template bawaan. Berkas PDF akhir dibuat dari Google Slides template Anda dan disimpan di Google Drive.</p></div></div>' +
        '<div data-part="certJob">' + SP.parts.certJob() + '</div>';
    }
  };
  SP.actions.certTab = function (el) { SP.ui.cert.tab = el.dataset.v; SP.ui.cert.page = 1; SP.refresh('certTabel'); };
  SP.actions.certHal = function (el) { SP.ui.cert.page = Number(el.dataset.p); SP.refresh('certTabel'); };
  SP.changes.certKelas = function (el) { SP.ui.cert.kelas = el.value; SP.ui.cert.page = 1; SP.ui.cert.sel = {}; SP.refresh('certTabel'); SP.refresh('certPreview'); };
  SP.inputs.certQ = SP.debounce(function (el) { SP.ui.cert.q = el.value; SP.ui.cert.page = 1; SP.refresh('certTabel'); }, 150);
  SP.changes.certPilih = function (el) { SP.ui.cert.sel[el.dataset.nim] = el.checked; SP.refresh('certTabel'); SP.refresh('certPreview'); };
  SP.changes.certSemua = function (el) {
    const u = SP.ui.cert, q = u.q.toLowerCase();
    const daftar = certTab(certData(), u.tab).filter(function (b) { return !q || (b.m.nim + ' ' + b.m.nama).toLowerCase().indexOf(q) >= 0; });
    SP.paginate(daftar, u.page, 10).items.forEach(function (b) { u.sel[b.m.nim] = el.checked; });
    SP.refresh('certTabel'); SP.refresh('certPreview');
  };
  SP.actions.certJeda = function () { const j = SP.ui.cert.job; if (j) { j.jeda = !j.jeda; SP.refresh('certJob'); } };
  SP.actions.certHenti = function () { const j = SP.ui.cert.job; if (j) { j.henti = true; SP.refresh('certJob'); } };
  SP.actions.certJobTutup = function () { SP.ui.cert.job = null; SP.refresh('certJob'); };
  SP.actions.certContoh = async function (el) {
    el.disabled = true;
    try {
      const pilih = Object.keys(SP.ui.cert.sel).filter(function (n) { return SP.ui.cert.sel[n]; })[0];
      const r = await SP.api('contohSertifikat', { nim: pilih || '' }, { timeout: 90000 }); SP.unduhBase64(r.nama, r.base64, 'application/pdf');
    } catch (e) { SP.toast(esc(e.message), 'err'); }
    el.disabled = false;
  };
  async function jalankanCetak(nims, ulang) {
    const u = SP.ui.cert; if (u.job && u.job.selesai < u.job.total && !u.job.henti) return SP.toast('Masih ada proses pencetakan yang berjalan.', 'warn');
    const j = (u.job = { total: nims.length, selesai: 0, gagal: [], jeda: false, henti: false, mulai: Date.now(), label: (u.kelas ? SP.kelasNama(u.kelas) : 'Semua kelas') + ' — ' + SP.set().semester_aktif.toLowerCase() + ' ' + SP.set().tahun_ajaran_aktif });
    SP.refresh('certJob');
    for (let i = 0; i < nims.length; i += 3) {
      while (j.jeda && !j.henti) await sleep(300);
      if (j.henti) break;
      const chunk = nims.slice(i, i + 3);
      try {
        const r = await SP.api('cetakSertifikat', { nims: chunk, ulang: !!ulang }, { timeout: 200000 });
        SP.terapkanHasil({ sertifikat: r.sertifikat, kuotaEmail: r.kuotaEmail });
        j.selesai += chunk.length; r.galat.forEach(function (g) { j.gagal.push(g); });
      } catch (e) {
        chunk.forEach(function (n) { j.gagal.push({ nim: n, pesan: e.message }); }); j.selesai += chunk.length;
        if (e.code === 'NETWORK' || e.code === 'FORBIDDEN') { j.henti = true; }
      }
      SP.refresh('certJob'); SP.refresh('certTabel'); SP.refresh('certKuota');
    }
    j.selesai = Math.min(j.total, j.selesai); SP.simpanCache();
    SP.refresh('certJob'); SP.refresh('certTabel');
    SP.toast(j.gagal.length ? 'Pencetakan selesai dengan <b>' + j.gagal.length + ' kegagalan</b>.' : 'Semua sertifikat berhasil dicetak.', j.gagal.length ? 'warn' : 'ok');
  }
  SP.actions.certCetak = async function () {
    const u = SP.ui.cert, nims = Object.keys(u.sel).filter(function (n) { return u.sel[n]; });
    const belum = nims.filter(function (n) { return !(SP.X.sert[n] && SP.X.sert[n].file_id); }), sudah = nims.length - belum.length;
    if (!belum.length) return SP.toast('Semua mahasiswa terpilih sudah memiliki sertifikat. Gunakan tombol cetak ulang bila perlu.', 'info');
    if (!(await SP.konfirmasi({ judul: 'Cetak ' + belum.length + ' sertifikat?', pesan: 'Sistem akan membuat PDF di Google Drive' + (SP.set().email_otomatis === '1' ? ' dan memasukkan email pemberitahuan ke antrean pengiriman.' : '.') + (sudah ? '<br><small>' + sudah + ' mahasiswa yang sudah bersertifikat dilewati.</small>' : ''), ya: 'Ya, Cetak' }))) return;
    u.sel = {}; await jalankanCetak(belum, false);
  };
  SP.actions.certSatu = async function (el) { await jalankanCetak([el.dataset.nim], false); };
  SP.actions.certUlang = async function (el) {
    if (await SP.konfirmasi({ judul: 'Cetak ulang sertifikat?', pesan: 'PDF lama akan diganti dengan versi baru. Nomor sertifikat tetap sama.', ya: 'Cetak Ulang' })) await jalankanCetak([el.dataset.nim], true);
  };
  SP.actions.certKirim = async function (el) {
    const u = SP.ui.cert;
    const nims = el.dataset.nim ? [el.dataset.nim] : Object.keys(u.sel).filter(function (n) { return u.sel[n]; });
    const target = nims.filter(function (n) { const s = SP.X.sert[n]; return s && s.file_id && s.status_email !== 'TERKIRIM'; });
    if (!target.length) return SP.toast('Tidak ada email yang perlu dikirim (belum terbit atau sudah terkirim).', 'info');
    el.disabled = true; const t = SP.toast('Mengirim email…', 'info', 60000);
    try {
      for (let i = 0; i < 20; i++) {
        const r = await SP.api('kirimEmail', { nims: target }, { timeout: 120000 });
        SP.terapkanHasil({ sertifikat: r.sertifikat, kuotaEmail: r.kuotaEmail });
        const sisa = target.filter(function (n) { const s = SP.X.sert[n]; return s && s.status_email === 'ANTRE'; });
        SP.refresh('certTabel'); SP.refresh('certKuota');
        if (!sisa.length || (r.kuotaEmail && r.kuotaEmail.sisa <= 0)) break;
      }
      const gagal = target.filter(function (n) { return SP.X.sert[n].status_email === 'GAGAL'; }).length;
      SP.toast(gagal ? 'Email selesai diproses; <b>' + gagal + ' gagal</b>.' : 'Email berhasil dikirim.', gagal ? 'warn' : 'ok');
    } catch (e) { SP.toast(esc(e.message), 'err'); }
    t.remove(); el.disabled = false; SP.simpanCache(); SP.refresh('certTabel');
  };
})();
