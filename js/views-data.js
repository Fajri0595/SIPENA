// ============================================================
// SIPENA: views-data.js
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
  const ALIAS_OPSIONAL = { no_hp: ['nowhatsapp', 'nohp', 'whatsapp', 'wa', 'hp', 'telepon', 'notelp'] };
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function kelasImporIzin() {
    const out = {};
    const catat = function (k) {
      if (!k) return;
      const low = k.nama.toLowerCase();
      out[low + '|' + k.angkatan] = k;
      if (!out[low]) out[low] = k;
    };
    if (SP.isAdmin()) SP.S.kelas.filter(function (k) { return k.status !== 'ARSIP'; }).forEach(catat);
    else SP.penugasanAktifSaya().forEach(function (p) { const k = SP.X.kelas[p.kelas_id]; if (k && SP.peran(p)) catat(k); });
    return out;
  }
  function validasi(rowsMentah) {
    if (!rowsMentah.length) return { err: 'Berkas kosong.' };
    const head = rowsMentah[0].map(norm), idx = {};
    Object.keys(ALIAS).forEach(function (k) { idx[k] = head.findIndex(function (h) { return ALIAS[k].indexOf(h) >= 0; }); });
    const hilang = Object.keys(idx).filter(function (k) { return idx[k] < 0; });
    if (hilang.length) return { err: 'Kolom wajib tidak ditemukan: ' + hilang.map(function (k) { return k.toUpperCase(); }).join(', ') + '. Gunakan template CSV resmi.' };
    const idxHp = head.findIndex(function (h) { return ALIAS_OPSIONAL.no_hp.indexOf(h) >= 0; });
    const izin = kelasImporIzin(), s = SP.set(), ada = {}, vis = {};
    SP.S.km.forEach(function (r) { if (r.tahun_ajaran === s.tahun_ajaran_aktif && r.semester === s.semester_aktif && r.jenis !== 'PENGULANGAN') ada[r.nim] = r; });
    const baris = [];
    rowsMentah.slice(1).forEach(function (r, i) {
      const o = { baris: i + 2, nim: String(r[idx.nim] || '').trim(), nama: String(r[idx.nama] || '').trim(), email: String(r[idx.email] || '').trim().toLowerCase(), kelas: String(r[idx.kelas] || '').trim(), angkatan: String(r[idx.angkatan] || '').trim(), no_hp: idxHp >= 0 ? String(r[idxHp] || '').trim() : '' };
      let catatan = '', status = 'VALID';
      const kls = izin[o.kelas.toLowerCase() + '|' + o.angkatan] || izin[o.kelas.toLowerCase()];
      if (!/^\d{5,20}$/.test(o.nim)) { status = 'ERROR'; catatan = 'Format NIM tidak valid (hanya angka, 5–20 digit)'; }
      else if (!o.nama || o.nama.length > 120) { status = 'ERROR'; catatan = 'Nama kosong / terlalu panjang'; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) { status = 'ERROR'; catatan = o.email ? 'Format email salah' : 'Email kosong'; }
      else if (!/^\d{4}$/.test(o.angkatan)) { status = 'ERROR'; catatan = 'Angkatan harus 4 digit tahun'; }
      else if (!kls) { status = 'ERROR'; catatan = 'Kelas "' + o.kelas + '"' + (o.angkatan ? ' Angkatan ' + o.angkatan : '') + ' tidak ditemukan / bukan penugasan aktif Anda'; }
      else if (vis[o.nim]) { status = 'ERROR'; catatan = 'NIM ganda di berkas (baris ' + vis[o.nim] + ')'; }
      else if (ada[o.nim]) {
        const k = SP.X.kelas[ada[o.nim].kelas_id];
        if (k && k.id === kls.id) { status = 'SKIP'; catatan = 'Sudah terdaftar di kelas ini'; }
        else { status = 'ERROR'; catatan = 'NIM sudah terdaftar di kelas ' + (k ? k.nama + (k.angkatan ? ' (' + k.angkatan + ')' : '') : '?') + ' (gunakan Pindah Kelas)'; }
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
      (errs.length ? '<div class="callout bad" style="margin-bottom:16px"><div class="ic">' + SP.icon('alert') + '</div><div><div class="ct">Ditemukan ' + errs.length + ' kesalahan yang perlu diperbaiki:</div><div class="tx">' + errs.slice(0, 5).map(function (e) { return 'Baris ' + e.baris + ': ' + esc(e.catatan); }).join('<br>') + (errs.length > 5 ? '<br>… dan ' + (errs.length - 5) + ' lainnya' : '') + '<br><b>Baris bermasalah akan diabaikan jika Anda melanjutkan impor.</b></div></div></div>' : '') +
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
      const kol = [['NIM', 'Nomor induk mahasiswa, angka 5–20 digit.', '2310601001'], ['NAMA_LENGKAP', 'Nama lengkap sesuai data resmi (maks. 120 karakter).', 'MUHAMMAD RIDWAN MALIK'], ['EMAIL_MAHASISWA', 'Email aktif mahasiswa, dipakai untuk mengirim sertifikat.', 'ridwan@mhs.ac.id'], ['KELAS', 'Nama kelas yang sudah terdaftar di sistem.', 'PAI A'], ['ANGKATAN', 'Tahun masuk, 4 digit.', '2026']];
      return SP.header({ crumbs: [['Dasbor', '#/dasbor'], ['Impor Mahasiswa']], judul: 'Impor Data Mahasiswa Baru', desc: 'Unggah berkas CSV untuk mendaftarkan mahasiswa semester ganjil ke dalam sistem penugasan kelas.', aksi: '<button class="btn btn-outline" data-act="bukaTambahMhsManual">' + SP.icon('plus') + ' Tambah Mahasiswa Manual</button>' }) +
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
    if (r.baris.length > 500) return SP.toast('Berkas berisi ' + r.baris.length + ' baris. Maksimal 500 baris per unggahan; pecah berkas Anda.', 'err', 8000);
    Object.assign(SP.ui.impor, { namaFile: file.name, ukuran: file.size, baris: r.baris, page: 1, hanyaError: false, hasil: null });
    SP.renderUlang();
  }
  SP.changes.imporFile = function (el) { if (el.files[0]) bacaCsv(el.files[0]); };
  SP.actions.imporTemplate = function () {
    const k = Object.keys(kelasImporIzin()).map(function (n) { return kelasImporIzin()[n].nama; })[0] || 'PAI A';
    const th = (SP.set().tahun_ajaran_aktif || '2026/2027').slice(0, 4);
    SP.unduhCsv('template-impor-mahasiswa-sipena.csv', ['NIM', 'NAMA_LENGKAP', 'EMAIL_MAHASISWA', 'NO_WHATSAPP', 'KELAS', 'ANGKATAN'], [['2310601001', 'MUHAMMAD RIDWAN MALIK', 'ridwan@mhs.ac.id', '081234567890', k, th], ['2310601002', 'SITI AISYAH NURFADILAH', 'aisyah@mhs.ac.id', '081298765432', k, th]]);
    SP.ui.impor.templateDiunduh = true; SP.renderUlang();
  };
  SP.actions.imporReset = function () { Object.assign(SP.ui.impor, { namaFile: '', ukuran: 0, baris: null, hanyaError: false, page: 1, sibuk: false }); SP.renderUlang(); };
  SP.actions.imporFilterError = function () { SP.ui.impor.hanyaError = !SP.ui.impor.hanyaError; SP.ui.impor.page = 1; SP.refresh('imporPratinjau'); };
  SP.actions.imporHal = function (el) { SP.ui.impor.page = Number(el.dataset.p); SP.refresh('imporPratinjau'); };
  SP.actions.imporLaporanError = function () {
    const e = SP.ui.impor.baris.filter(function (x) { return x.status === 'ERROR'; });
    SP.unduh('laporan-kesalahan-impor.txt', 'LAPORAN KESALAHAN IMPOR: ' + SP.ui.impor.namaFile + '\r\n\r\n' + e.map(function (x) { return 'Baris ' + x.baris + ' | NIM ' + x.nim + ' | ' + x.catatan; }).join('\r\n'));
  };
  SP.actions.imporKirim = async function () {
    const u = SP.ui.impor, valid = u.baris.filter(function (x) { return x.status === 'VALID'; });
    if (!valid.length || u.sibuk) return;
    u.sibuk = true; SP.refresh('imporPratinjau');
    try {
      const r = await SP.api('impor', { rows: valid.map(function (x) { return { baris: x.baris, nim: x.nim, nama: x.nama, email: x.email, no_hp: x.no_hp || '', kelas: x.kelas, angkatan: x.angkatan }; }) }, { timeout: 120000 });
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
      isi: '<div class="row top wrap mb16"><div id="dm-foto" class="avatar" style="width:84px;height:84px;border-radius:12px;font-size:26px;overflow:hidden">' + esc(SP.inisial(m.nama)) + '</div><div class="grow"><h3 class="h2">' + esc(m.nama) + '</h3><div class="row wrap gap8 mt8"><span class="chip mono">' + esc(m.nim) + '</span><span class="chip">Angkatan ' + esc(m.angkatan || '-') + '</span><span class="chip">' + esc(kelas ? kelas.nama : '-') + '</span>' + SP.badge(kel.akhir) + '</div><p class="muted mt8">' + SP.icon('mail', 'sm') + ' ' + esc(m.email || '-') + (m.no_hp ? ' &nbsp;·&nbsp; <a href="https://wa.me/' + esc(m.no_hp) + '" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:none;font-weight:600">WhatsApp: +' + esc(m.no_hp) + '</a>' : '') + '</p></div></div>' +
        '<div class="grid2 mb16">' + SP.PROGRAM.map(function (p) {
          const st = kel.program[p];
          const angka = SP.nilaiAngkaProgram ? SP.nilaiAngkaProgram(nim, p) : '';
          const val = angka || (st === 'LULUS' ? String((SP.set() && SP.set().kkm) || 75) : '');
          const badgeHtml = st === 'LULUS'
            ? '<span class="badge b-ok num" style="font-weight:700;padding:0 10px">' + SP.icon('checkCircle', 'sm') + ' Nilai: ' + esc(val) + '</span>'
            : SP.badge(st);
          return '<div class="card card-p20 row between"><span><b>' + esc(SP.PROG_LABEL[p]) + '</b></span>' + badgeHtml + '</div>';
        }).join('') + '</div>' +
        '<h3 class="h3 mb16">Riwayat penilaian</h3>' + (hist.length ? '<div class="tbl-wrap"><table class="tbl" style="min-width:560px"><thead><tr><th>Program</th><th>Siklus</th><th>Semester</th><th>Kelas</th><th>Status</th><th>Diperbarui</th></tr></thead><tbody>' +
          hist.map(function (r) { return '<tr><td>' + esc(SP.PROG_SHORT[r.program]) + '</td><td class="num">' + (r.siklus > 1 ? 'Pengulangan ke-' + (r.siklus - 1) : 'Reguler') + '</td><td>' + esc(SP.semLabel(r.semester) + ' ' + r.tahun_ajaran) + '</td><td>' + esc(SP.kelasNama(r.kelas_id)) + '</td><td>' + SP.badge(r.status) + '</td><td class="muted" style="font-size:12.5px">' + SP.waktu(r.waktu_ubah) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">Belum ada nilai tercatat.</p>') +
        (kel.akhir === 'LULUS' ? '<div class="callout ok mt16"><div class="ic">' + SP.icon('award', 'lg') + '</div><div class="grow"><div class="ct">' + (sert && sert.file_id ? 'Sertifikat diterbitkan' : 'Lulus 4 Program (Berhak Sertifikat 2 Sisi)') + '</div><div class="tx">' + (sert && sert.file_id ? '<span class="mono">' + esc(sert.nomor) + '</span> · ' + SP.tgl(sert.tanggal_cetak) : 'Sisi Depan (Keterangan Lulus) &amp; Sisi Belakang (Transkrip Skor 4 Program)') + '</div></div><div class="row gap8">' + (SP.bolehCetakUI() ? '<button class="btn btn-outline btn-sm" data-act="certCetak2Sisi" data-nim="' + esc(nim) + '">' + SP.icon('printer') + ' Cetak 2 Sisi</button>' : '') + (sert && sert.file_id && SP.bolehCetakUI() ? '<button class="btn btn-outline btn-sm" data-act="unduhSert" data-nim="' + esc(nim) + '">' + SP.icon('download') + ' Unduh PDF</button>' : '') + '</div></div>' : ''),
      footer: '<button class="btn btn-outline" data-act="editMhs" data-nim="' + esc(nim) + '">' + SP.icon('pencil') + ' Ubah data</button><label class="btn btn-outline" style="cursor:pointer">' + SP.icon('image') + ' Unggah foto<input type="file" accept="image/png,image/jpeg" class="hide" data-ch="fotoMhs" data-nim="' + esc(nim) + '"></label><button class="btn btn-outline" style="color:var(--danger);border-color:rgba(220,38,38,0.35)" data-act="konfirmasiHapusMhs" data-nim="' + esc(nim) + '">' + SP.icon('trash') + ' Hapus Mahasiswa</button><button class="btn btn-primary" data-act="tutupModal">Tutup</button>'
    });
    SP.api('ambilFoto', { nim: nim }).then(function (r) {
      const f = h.el.querySelector('#dm-foto'); if (f && r.dataUrl) f.innerHTML = '<img src="' + r.dataUrl + '" alt="" style="width:100%;height:100%;object-fit:cover">';
    }).catch(function () { /* foto opsional */ });
  };
  SP.actions.editMhs = function (el) {
    const m = SP.X.mhs[el.dataset.nim]; SP.tutupModal();
    SP.modal({
      judul: 'Ubah Data Mahasiswa', lebar: 480,
      isi: '<div class="stack"><div class="field"><label>NIM</label><input class="input mono" value="' + esc(m.nim) + '" readonly></div><div class="field"><label for="em-n">Nama lengkap</label><input id="em-n" class="input" value="' + esc(m.nama) + '"></div><div class="field"><label for="em-e">Email mahasiswa</label><input id="em-e" type="email" class="input" value="' + esc(m.email) + '"></div><div class="field"><label for="em-hp">Nomor WhatsApp (Notifikasi Sertifikat &amp; Pengulangan)</label><input id="em-hp" class="input mono" value="' + esc(m.no_hp || '') + '" placeholder="081234567890"></div></div>',
      footer: '<button class="btn btn-outline" data-act="tutupModal">Batal</button><button class="btn btn-primary" data-act="simpanMhs" data-nim="' + esc(m.nim) + '">Simpan</button>'
    });
  };
  SP.actions.simpanMhs = async function (el) {
    const nama = SP.$('#em-n').value.trim(), email = SP.$('#em-e').value.trim(), no_hp = SP.$('#em-hp') ? SP.$('#em-hp').value.trim() : '';
    el.disabled = true;
    try {
      const r = await SP.api('mahasiswaUbah', { nim: el.dataset.nim, nama: nama, email: email, no_hp: no_hp });
      SP.terapkanHasil({ mahasiswa: [{ nim: el.dataset.nim, nama: nama, email: email.toLowerCase(), no_hp: r.no_hp !== undefined ? r.no_hp : no_hp, status_wa: r.status_wa || '' }] });
      SP.simpanCache(); SP.tutupModal(); SP.toast('Data mahasiswa diperbarui.'); SP.renderUlang();
    }
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

  // ------------------------------------------------------------
  // TAMBAH & HAPUS MAHASISWA MANUAL (TUNGGAL)
  // ------------------------------------------------------------
  SP.actions.bukaTambahMhsManual = function (el) {
    const s = SP.set();
    const taAktif = s.tahun_ajaran_aktif || '';
    const thDefault = taAktif ? taAktif.slice(0, 4) : String(new Date().getFullYear());
    const kelasTerpilih = (el && el.dataset && el.dataset.kelas) || '';

    let daftarKelas = [];
    if (SP.isAdmin()) {
      daftarKelas = SP.S.kelas.filter(function (k) { return k.status !== 'ARSIP'; });
    } else {
      const penugasan = SP.penugasanAktifSaya();
      const kIds = {};
      penugasan.forEach(function (p) { if (SP.peran(p)) kIds[p.kelas_id] = true; });
      daftarKelas = SP.S.kelas.filter(function (k) { return kIds[k.id]; });
    }

    if (!daftarKelas.length) {
      return SP.toast('Tidak ada kelas aktif yang tersedia untuk penambahan mahasiswa.', 'warn');
    }

    daftarKelas.sort(function (a, b) {
      const aMatch = String(a.angkatan) === String(thDefault) ? 1 : 0;
      const bMatch = String(b.angkatan) === String(thDefault) ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;
      return a.nama < b.nama ? -1 : 1;
    });

    const opsiKelas = daftarKelas.map(function (k) {
      const tagAngk = k.angkatan ? ' [Angkatan ' + esc(k.angkatan) + ']' : '';
      return '<option value="' + esc(k.id) + '" ' + (k.id === kelasTerpilih ? 'selected' : '') + '>' + esc(k.nama) + tagAngk + (k.prodi ? ' (' + esc(k.prodi) + ')' : '') + '</option>';
    }).join('');

    SP.modal({
      judul: 'Tambah Mahasiswa Manual', lebar: 520,
      isi: '<div class="stack gap12">' +
        '<div class="callout" style="margin-bottom:8px;padding:10px 14px"><div class="ic">' + SP.icon('info') + '</div><div class="tx" style="font-size:12.5px">Mendaftarkan 1 mahasiswa langsung ke kelas tanpa berkas CSV. Mahasiswa didaftarkan pada <b>Semester ' + esc(SP.semLabel(s.semester_aktif)) + ' ' + esc(taAktif) + '</b>.</div></div>' +
        '<div class="field"><label for="tm-nim">NIM Mahasiswa <span style="color:var(--danger)">*</span></label><input id="tm-nim" class="input mono" placeholder="Contoh: 2310601001" maxlength="20" required></div>' +
        '<div class="field"><label for="tm-nama">Nama Lengkap <span style="color:var(--danger)">*</span></label><input id="tm-nama" class="input" placeholder="Nama lengkap mahasiswa" maxlength="120" required></div>' +
        '<div class="grid2 gap12">' +
          '<div class="field"><label for="tm-email">Email Mahasiswa <span style="color:var(--danger)">*</span></label><input id="tm-email" type="email" class="input" placeholder="contoh@mhs.ac.id" required></div>' +
          '<div class="field"><label for="tm-hp">Nomor WhatsApp (Opsional)</label><input id="tm-hp" class="input mono" placeholder="081234567890" maxlength="20"></div>' +
        '</div>' +
        '<div class="grid2 gap12">' +
          '<div class="field"><label for="tm-angkatan">Angkatan (Tahun) <span style="color:var(--danger)">*</span></label><input id="tm-angkatan" class="input num" placeholder="YYYY" value="' + esc(thDefault) + '" maxlength="4" required></div>' +
          '<div class="field"><label for="tm-kelas">Kelas Tujuan <span style="color:var(--danger)">*</span></label><select id="tm-kelas" class="select">' + opsiKelas + '</select></div>' +
        '</div>' +
        '</div>',
      footer: '<button class="btn btn-outline" data-act="tutupModal">Batal</button><button class="btn btn-primary" data-act="simpanMhsManual">' + SP.icon('check') + ' Simpan Mahasiswa</button>'
    });
  };

  SP.actions.simpanMhsManual = async function (el) {
    const nim = (SP.$('#tm-nim').value || '').trim();
    const nama = (SP.$('#tm-nama').value || '').trim();
    const email = (SP.$('#tm-email').value || '').trim().toLowerCase();
    const no_hp = SP.$('#tm-hp') ? (SP.$('#tm-hp').value || '').trim() : '';
    const angkatan = (SP.$('#tm-angkatan').value || '').trim();
    const kelas_id = SP.$('#tm-kelas').value;

    if (!/^\d{5,20}$/.test(nim)) return SP.toast('Format NIM tidak valid (harus 5–20 digit angka).', 'err');
    if (!nama || nama.length > 120) return SP.toast('Nama mahasiswa wajib diisi (maks. 120 karakter).', 'err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return SP.toast('Format email tidak valid.', 'err');
    if (!/^\d{4}$/.test(angkatan)) return SP.toast('Angkatan harus 4 digit tahun (contoh: 2026).', 'err');
    if (!kelas_id) return SP.toast('Silakan pilih kelas tujuan.', 'err');

    el.disabled = true;
    el.innerHTML = '<span class="spin"></span> Menyimpan…';
    try {
      const res = await SP.api('mahasiswaTambah', {
        nim: nim, nama: nama, email: email, no_hp: no_hp, angkatan: angkatan, kelas_id: kelas_id
      });
      SP.terapkanHasil(res);
      SP.simpanCache();
      SP.tutupModal();
      const kNama = SP.kelasNama(kelas_id);
      SP.toast('Mahasiswa <b>' + esc(nama) + '</b> (' + esc(nim) + ') berhasil ditambahkan ke kelas <b>' + esc(kNama) + '</b>.', 'ok');
      SP.renderUlang();
    } catch (e) {
      el.disabled = false;
      el.innerHTML = SP.icon('check') + ' Simpan Mahasiswa';
      SP.toast(esc(e.message), 'err', 8000);
    }
  };

  SP.actions.konfirmasiHapusMhs = async function (el) {
    const nim = el.dataset.nim;
    const m = SP.X.mhs[nim];
    if (!m) return;
    const ya = await SP.konfirmasi({
      judul: 'Hapus Data Mahasiswa',
      pesan: 'Apakah Anda yakin ingin menghapus data mahasiswa <b>' + esc(m.nama) + ' (' + esc(m.nim) + ')</b>?<br><br><span style="color:var(--danger);font-size:13px">Peringatan: Seluruh data pendaftaran kelas dan riwayat nilai terkait mahasiswa ini akan dihapus dari sistem.</span>',
      bahaya: true,
      ya: 'Ya, Hapus Data',
      batal: 'Batal'
    });
    if (!ya) return;
    SP.tutupModal();
    try {
      await SP.api('mahasiswaHapus', { nim: nim });
      SP.S.mahasiswa = SP.S.mahasiswa.filter(function (x) { return x.nim !== nim; });
      SP.S.km = SP.S.km.filter(function (x) { return x.nim !== nim; });
      SP.S.nilai = SP.S.nilai.filter(function (x) { return x.nim !== nim; });
      SP.S.pengulangan = SP.S.pengulangan.filter(function (x) { return x.nim !== nim; });
      SP.S.sert = SP.S.sert.filter(function (x) { return x.nim !== nim; });
      SP.indeks();
      SP.simpanCache();
      SP.toast('Data mahasiswa <b>' + esc(m.nama) + '</b> berhasil dihapus.', 'ok');
      SP.renderUlang();
    } catch (e) {
      SP.toast(esc(e.message), 'err', 8000);
    }
  };

  // ============================================================
  // STATUS KELULUSAN
  // ============================================================
  SP.ui.kel = SP.ui.kel || { q: '', angkatan: '', kelas: '', prodi: '', status: '', mhsStatus: 'AKTIF', page: 1, per: 10, aturan: true };

  function kelBaris() {
    const u = SP.ui.kel, q = u.q.toLowerCase();
    return SP.barisKelulusan().filter(function (b) {
      if (u.mhsStatus === 'AKTIF' && b.m.status === 'NONAKTIF') return false;
      if (u.mhsStatus === 'NONAKTIF' && b.m.status !== 'NONAKTIF') return false;
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
    const pctTotal = semua.length ? Math.round((f.length / semua.length) * 100) : 100;
    return SP.stat({
      label: 'Total Mahasiswa',
      nilai: SP.n(f.length),
      ikon: 'users',
      progress: pctTotal,
      foot: '<span>Persentase</span><b>' + (f.length === semua.length ? '100%' : SP.pctStr(SP.pct(f.length, semua.length))) + '</b>',
      title: f.length === semua.length ? 'Total semua mahasiswa terdaftar' : 'Hasil filter: ' + SP.n(f.length) + ' dari ' + SP.n(semua.length) + ' mahasiswa'
    }) +
      SP.stat({ label: 'Lulus penuh (yudisium)', nilai: SP.n(c.l), ikon: 'checkCircle', warna: 'g', foot: '<span>Persentase</span><b>' + SP.pctStr(SP.pct(c.l, f.length)) + '</b>', progress: SP.pct(c.l, f.length) || 0 }) +
      SP.stat({ label: 'Wajib mengulang', nilai: SP.n(c.w), ikon: 'rotate', warna: 'o', kelas: 'warn', foot: '<span>Persentase</span><b>' + SP.pctStr(SP.pct(c.w, f.length)) + '</b>', progress: SP.pct(c.w, f.length) || 0, progWarna: 'o' }) +
      SP.stat({ label: 'Nilai belum lengkap', nilai: SP.n(c.b), ikon: 'clock', warna: 'n', foot: '<span>Persentase</span><b>' + SP.pctStr(SP.pct(c.b, f.length)) + '</b>', progress: SP.pct(c.b, f.length) || 0, progWarna: 'g' });
  };
  SP.parts.kelTabel = function () {
    const u = SP.ui.kel, f = kelBaris(), pg = SP.paginate(f, u.page, u.per); u.page = pg.page;
    const kkm = Number((SP.set() && SP.set().kkm) || 75);
    const sel = function (p, b) {
      const st = b.kel.program[p];
      const angka = SP.nilaiAngkaProgram ? SP.nilaiAngkaProgram(b.m.nim, p) : '';
      if (st === 'LULUS') {
        const val = angka || String(kkm);
        return '<span class="badge b-ok num" style="min-width:38px;justify-content:center;font-weight:700;font-size:12.5px" title="Nilai: ' + esc(val) + '">' + esc(val) + '</span>';
      }
      if (st === 'TIDAK_LULUS') {
        return '<span class="badge b-bad num" style="min-width:38px;justify-content:center;font-weight:700;font-size:12.5px" title="Tidak Lulus' + (angka ? ' (Nilai: ' + esc(angka) + ')' : '') + '">' + (angka ? esc(angka) : 'Tdk Lulus') + '</span>';
      }
      return '<span class="badge b-null" style="min-width:38px;justify-content:center">-</span>';
    };
    if (!pg.total) return '<div class="card">' + SP.kosong('search', 'Tidak ada data', 'Tidak ada mahasiswa yang cocok dengan filter saat ini.') + '</div>';
    return '<div class="card"><div class="card-h" style="padding:14px 20px"><div class="row gap8">' + SP.icon('shieldCheck') + '<b>Data Rekap Kelulusan 4 Mata Uji</b></div><div class="row wrap gap8 muted" style="font-size:12.5px"><span><span class="dotp" style="color:var(--primary)"></span> Lulus (4 modul)</span><span><span class="dotp" style="color:#F97316"></span> Wajib mengulang (≥1 gagal)</span><span><span class="dotp" style="color:#6B7280"></span> Belum lengkap</span></div></div>' +
      '<div class="tbl-wrap" style="border:0;border-radius:0"><table class="tbl cards compact"><thead><tr><th class="col-no">No</th><th>NIM</th><th>Nama mahasiswa</th><th>Kelas</th><th>Arab Ganjil</th><th>Inggris Ganjil</th><th>Arab Genap</th><th>Inggris Genap</th><th>Status akhir</th><th>Aksi</th></tr></thead><tbody>' +
      pg.items.map(function (b, i) {
        return '<tr class="' + (b.akhir === 'WAJIB_MENGULANG' ? 'rowbad' : '') + '"><td data-l="No" class="col-no num muted">' + String(pg.dari + i).padStart(2, '0') + '</td><td data-l="NIM" class="mono"><b style="' + (b.akhir === 'WAJIB_MENGULANG' ? 'color:var(--danger)' : '') + '">' + esc(b.m.nim) + '</b></td>' +
          '<td data-l="Nama" class="nm"><b>' + esc(b.m.nama) + '</b>' + (b.m.status === 'NONAKTIF' ? ' <span class="chip nul" style="font-size:10.5px;padding:1px 6px">Nonaktif</span>' : '') + '<small>' + esc(b.kelas ? b.kelas.prodi || '' : '') + '</small></td><td data-l="Kelas">' + esc(b.kelas ? b.kelas.nama : '-') + '</td>' +
          SP.PROGRAM.map(function (p) { return '<td data-l="' + esc(SP.PROG_SHORT[p]) + '">' + sel(p, b) + '</td>'; }).join('') + '<td data-l="Status akhir">' + SP.badge(b.akhir) + '</td>' +
          '<td><button class="btn btn-outline btn-sm" data-act="detailMhs" data-nim="' + esc(b.m.nim) + '">' + SP.icon('eye') + ' Detail</button></td></tr>';
      }).join('') + '</tbody></table></div><div class="tbl-foot" style="border-top:1px solid var(--border)"><span>Menampilkan ' + pg.dari + ' – ' + pg.sampai + ' dari <b class="num">' + SP.n(pg.total) + '</b> data mahasiswa <select class="select" style="width:auto;height:30px;margin-left:8px" data-ch="kelPer" aria-label="Baris per halaman">' + [10, 25, 50, 100].map(function (n) { return '<option ' + (n === u.per ? 'selected' : '') + '>' + n + '</option>'; }).join('') + '</select></span>' + SP.pagerHtml('kelHal', pg) + '</div></div>';
  };
  SP.parts.kelFilterAktif = function () {
    const u = SP.ui.kel, ch = [];
    const tambah = function (k, label) { ch.push('<span class="chip">' + esc(label) + ' <button class="btn btn-ghost btn-sm" style="height:20px;padding:0 2px" data-act="kelHapusFilter" data-k="' + k + '" aria-label="Hapus filter">' + SP.icon('x', 'sm') + '</button></span>'); };
    if (u.mhsStatus && u.mhsStatus !== 'AKTIF') tambah('mhsStatus', 'Status Data: ' + (u.mhsStatus === 'NONAKTIF' ? 'Arsip / Nonaktif' : 'Semua Data'));
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
      const aksiHeader = '<div class="row wrap gap8">' +
        '<button class="btn btn-outline" data-act="bukaTambahMhsManual">' + SP.icon('plus') + ' Tambah Mahasiswa</button>' +
        (SP.isAdmin() ? '<button class="btn btn-outline" data-act="bukaModalArsipMhs">' + SP.icon('archive') + ' Arsip &amp; Pembersihan Data</button>' : '') +
        '<div style="position:relative"><button class="btn btn-primary" data-act="menuUnduh">' + SP.icon('download') + ' Unduh Rekapitulasi ' + SP.icon('chevronDown', 'sm') + '</button><div class="dd hide" id="menu-unduh" style="min-width:230px"><button class="dd-i" data-act="kelXlsx">' + SP.icon('file') + ' Excel (.xlsx)</button><button class="dd-i" data-act="kelCsv">' + SP.icon('download') + ' CSV</button><button class="dd-i" data-act="kelPdf">' + SP.icon('printer') + ' Cetak / Simpan PDF</button></div></div></div>';
      return SP.header({
        crumbs: [['Dasbor', '#/dasbor'], ['Status Kelulusan']], judul: 'Status Kelulusan 4 Program', desc: 'Rekapitulasi penetapan kelulusan mahasiswa Bahasa Arab &amp; Bahasa Inggris (Semester Ganjil &amp; Genap).',
        aksi: aksiHeader
      }) +
        '<div class="callout mb16"><div class="ic">' + SP.icon('shieldCheck', 'lg') + '</div><div class="grow"><div class="row between"><div><div class="cap" style="color:var(--primary)">MATRIKS VALIDASI AKADEMIK</div><div class="h3">Aturan Kelulusan Komprehensif 4 Gerbang Program</div></div><button class="btn btn-ghost btn-sm" data-act="kelAturan" aria-label="Lipat">' + SP.icon(u.aturan ? 'chevronUp' : 'chevronDown') + '</button></div>' +
        (u.aturan ? '<div class="row wrap gap8 mt16" style="background:#fff;border-radius:10px;padding:12px">' + SP.PROGRAM.map(function (p, i) { return (i ? '<span class="muted3">+</span>' : '') + '<span class="chip ok">' + SP.icon('checkCircle', 'sm') + ' ' + esc(SP.PROG_SHORT[p]) + ': Lulus</span>'; }).join('') + SP.icon('arrowRight') + '<span class="badge b-solid" style="height:30px;padding:0 12px">' + SP.icon('award') + ' STATUS AKHIR: LULUS (BERHAK SERTIFIKAT)</span></div><p class="tx mt8" style="color:var(--text2);font-size:13px">Mahasiswa <b>hanya dinyatakan LULUS</b> apabila memenuhi ketuntasan di seluruh 4 program tanpa terkecuali. <b style="color:var(--danger)">1 program saja yang tidak lulus</b> menyebabkan penetapan status <b style="color:var(--accent-d)">Wajib Mengulang</b> pada program tersebut di semester berikutnya.</p>' : '') + '</div></div>' +
        '<div class="grid4 mb16" data-part="kelStat">' + SP.parts.kelStat() + '</div>' +
        '<div class="toolbar"><div class="sch">' + SP.icon('search') + '<input class="input" placeholder="Cari NIM, nama mahasiswa…" data-in="kelQ" value="' + esc(u.q) + '" aria-label="Cari"></div>' +
        '<div class="field"><select class="select" data-ch="kelMhsStatus" aria-label="Status Data"><option value="AKTIF" ' + (u.mhsStatus === 'AKTIF' ? 'selected' : '') + '>Data Aktif</option><option value="NONAKTIF" ' + (u.mhsStatus === 'NONAKTIF' ? 'selected' : '') + '>Data Arsip/Nonaktif</option><option value="SEMUA" ' + (u.mhsStatus === 'SEMUA' ? 'selected' : '') + '>Semua Data</option></select></div>' +
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
  SP.changes.kelMhsStatus = function (el) { SP.ui.kel.mhsStatus = el.value; kelUlang(); };
  SP.changes.kelPer = function (el) { SP.ui.kel.per = Number(el.value); SP.ui.kel.page = 1; SP.refresh('kelTabel'); };
  SP.actions.kelHal = function (el) { SP.ui.kel.page = Number(el.dataset.p); SP.refresh('kelTabel'); };
  SP.actions.kelAturan = function () { SP.ui.kel.aturan = !SP.ui.kel.aturan; SP.renderUlang(); };
  SP.actions.kelHapusFilter = function (el) {
    if (el.dataset.k === 'mhsStatus') SP.ui.kel.mhsStatus = 'AKTIF';
    else SP.ui.kel[el.dataset.k] = '';
    SP.renderUlang();
  };
  SP.actions.kelReset = function () { Object.assign(SP.ui.kel, { angkatan: '', kelas: '', prodi: '', status: '', mhsStatus: 'AKTIF', q: '' }); SP.renderUlang(); };
  SP.actions.menuUnduh = function () { const m = SP.$('#menu-unduh'); if (m) m.classList.toggle('hide'); };
  function dataEkspor() {
    const kkm = Number((SP.set() && SP.set().kkm) || 75);
    return { h: ['NIM', 'Nama', 'Kelas', 'Angkatan', 'Status Data', 'Arab Ganjil', 'Inggris Ganjil', 'Arab Genap', 'Inggris Genap', 'Status Akhir'], r: kelBaris().map(function (b) {
      const t = function (p) {
        const st = b.kel.program[p];
        const angka = SP.nilaiAngkaProgram ? SP.nilaiAngkaProgram(b.m.nim, p) : '';
        if (st === 'LULUS') return angka || String(kkm);
        if (st === 'TIDAK_LULUS') return angka ? String(angka) : 'Tidak Lulus';
        return 'Belum Diisi';
      };
      return [b.m.nim, b.m.nama, b.kelas ? b.kelas.nama : '', b.m.angkatan, b.m.status === 'NONAKTIF' ? 'Nonaktif' : 'Aktif'].concat(SP.PROGRAM.map(function (p) { return t(p); })).concat([{ LULUS: 'Lulus', WAJIB_MENGULANG: 'Wajib Mengulang', BELUM_LENGKAP: 'Belum Lengkap' }[b.akhir]]);
    }) };
  }
  SP.actions.kelXlsx = function () { const d = dataEkspor(); if (!d.r.length) return SP.toast('Tidak ada data.', 'warn'); SP.eksporXlsx('Status Kelulusan', d.h, d.r); };
  SP.actions.kelCsv = function () { const d = dataEkspor(); if (!d.r.length) return SP.toast('Tidak ada data.', 'warn'); SP.unduhCsv('status-kelulusan.csv', d.h, d.r); };
  SP.actions.kelPdf = function () { const d = dataEkspor(); if (!d.r.length) return SP.toast('Tidak ada data.', 'warn'); SP.cetakTabel('Status Kelulusan 4 Program', d.h, d.r, SP.set().nama_lembaga + ' · dicetak ' + SP.tgl(SP.hariIni(), true)); };
  document.addEventListener('click', function (e) { const m = SP.$('#menu-unduh'); if (m && !m.classList.contains('hide') && !e.target.closest('#menu-unduh') && !e.target.closest('[data-act="menuUnduh"]')) m.classList.add('hide'); });

  // ============================================================
  // ARSIP & PEMBERSIHAN DATA MAHASISWA (Superadmin)
  // ============================================================
  SP.ui.arsip = SP.ui.arsip || {
    angkatan: '',
    kriteria: 'LULUS_SAJA',
    backupDiunduh: false,
    sedang: false
  };

  function arsipKandidat() {
    const u = SP.ui.arsip;
    return SP.barisKelulusan().filter(function (b) {
      if (u.angkatan && b.m.angkatan !== u.angkatan) return false;
      if (u.kriteria === 'LULUS_SAJA' && b.akhir !== 'LULUS') return false;
      return true;
    });
  }

  function isiModalArsip() {
    const u = SP.ui.arsip;
    const angkatanList = SP.angkatanList();
    if (!u.angkatan && angkatanList.length) u.angkatan = angkatanList[0];
    const kandidat = arsipKandidat();
    const nLulus = kandidat.filter(function (b) { return b.akhir === 'LULUS'; }).length;
    const nBelum = kandidat.length - nLulus;

    return '<div class="stack gap16">' +
      '<div class="callout edge" style="padding:12px 16px"><div class="ic">' + SP.icon('shieldCheck', 'lg') + '</div><div class="grow">' +
        '<div class="ct">Manajemen Siklus Hidup &amp; Arsip Data</div>' +
        '<div class="tx" style="font-size:13px">Nonaktifkan atau bersihkan data mahasiswa yang telah selesai/lulus dari kampus agar database tidak terbebani. <b>Wajib mengunduh berkas cadangan (backup)</b> sebelum melakukan pembersihan data.</div>' +
      '</div></div>' +
      '<div class="grid2 gap12">' +
        '<div class="field"><label for="ar-ang">Pilih Angkatan</label><select id="ar-ang" class="select" data-ch="arsipAngkatan">' +
          angkatanList.map(function (a) { return '<option value="' + esc(a) + '" ' + (a === u.angkatan ? 'selected' : '') + '>Angkatan ' + esc(a) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label for="ar-kri">Kriteria Mahasiswa</label><select id="ar-kri" class="select" data-ch="arsipKriteria">' +
          '<option value="LULUS_SAJA" ' + (u.kriteria === 'LULUS_SAJA' ? 'selected' : '') + '>Hanya yang Lulus 4 Program (Direkomendasikan)</option>' +
          '<option value="SEMUA" ' + (u.kriteria === 'SEMUA' ? 'selected' : '') + '>Semua Mahasiswa pada Angkatan Tersebut</option>' +
        '</select></div>' +
      '</div>' +
      '<div class="card card-p20 row between wrap gap12" style="background:var(--callout);border-color:var(--callout-bd)">' +
        '<div><div class="cap">Ringkasan Data Terpilih</div><div class="h2 mt4">' + SP.n(kandidat.length) + ' <small style="font-size:14px;font-weight:400;color:var(--text2)">Mahasiswa Angkatan ' + esc(u.angkatan) + '</small></div></div>' +
        '<div class="row wrap gap8"><span class="chip ok">' + SP.icon('checkCircle', 'sm') + ' ' + nLulus + ' Lulus 4 Program</span>' + (nBelum ? '<span class="chip warn">' + SP.icon('alert', 'sm') + ' ' + nBelum + ' Belum Lengkap / Mengulang</span>' : '') + '</div>' +
      '</div>' +
      '<div class="card card-p20" style="border:1.5px solid var(--border)">' +
        '<div class="row between mb8"><div><span class="stepno" style="width:24px;height:24px;font-size:12px;background:' + (u.backupDiunduh ? 'var(--primary)' : 'var(--text3)') + '">1</span> <b style="font-size:14px">Langkah 1: Unduh Berkas Cadangan (Backup Wajib)</b></div>' + (u.backupDiunduh ? '<span class="chip ok">' + SP.icon('check', 'sm') + ' Berkas Cadangan Terunduh</span>' : '<span class="chip bad">Wajib Diunduh</span>') + '</div>' +
        '<p class="muted" style="font-size:12.5px;margin-bottom:12px">Simpan berkas CSV cadangan ke komputer lembaga sebagai arsip permanen nilai dan sertifikat mahasiswa sebelum data diubah.</p>' +
        '<button class="btn btn-outline" style="width:100%" data-act="arsipUnduhBackup" ' + (kandidat.length ? '' : 'disabled') + '>' + SP.icon('download') + ' Unduh Berkas Cadangan (.csv)</button>' +
      '</div>' +
      '<div class="card card-p20" style="border:1.5px solid var(--border)">' +
        '<div class="mb8"><span class="stepno" style="width:24px;height:24px;font-size:12px;background:var(--text3)">2</span> <b style="font-size:14px">Langkah 2: Pilih Tindakan Pembersihan Database</b></div>' +
        '<p class="muted" style="font-size:12.5px;margin-bottom:12px">Pilih opsi pembersihan di bawah ini. Tombol akan aktif setelah berkas cadangan pada Langkah 1 diunduh.</p>' +
        '<div class="grid2 gap12">' +
          '<button class="btn btn-outline" data-act="arsipEksekusi" data-tipe="NONAKTIF" ' + (kandidat.length && u.backupDiunduh && !u.sedang ? '' : 'disabled') + ' title="Ubah status jadi Nonaktif">' + SP.icon('archive') + ' Nonaktifkan (Arsip Data)</button>' +
          '<button class="btn btn-danger" data-act="arsipEksekusi" data-tipe="HAPUS" ' + (kandidat.length && u.backupDiunduh && !u.sedang ? '' : 'disabled') + ' title="Hapus permanen dari database Spreadsheet">' + SP.icon('trash') + ' Hapus Permanen dari Database</button>' +
        '</div>' +
        '<div class="row between mt8 muted" style="font-size:11.5px"><span><b>Opsi Nonaktif:</b> Sembunyikan dari tabel harian, tetap tersimpan di sheet.</span><span style="color:var(--danger)"><b>Opsi Hapus:</b> Hapus baris dari Spreadsheet untuk menghemat kuota.</span></div>' +
      '</div>' +
      '</div>';
  }

  let modalArsipRef = null;
  SP.actions.bukaModalArsipMhs = function () {
    if (!SP.isAdmin()) return;
    SP.ui.arsip.backupDiunduh = false;
    SP.ui.arsip.sedang = false;
    modalArsipRef = SP.modal({
      judul: 'Arsip & Pembersihan Data Mahasiswa',
      lebar: 640,
      isi: isiModalArsip(),
      footer: '<button class="btn btn-outline" data-act="tutupModal">Tutup</button>'
    });
  };

  function segarkanModalArsip() {
    if (modalArsipRef && modalArsipRef.body) {
      modalArsipRef.body.innerHTML = isiModalArsip();
    }
  }

  SP.changes.arsipAngkatan = function (el) {
    SP.ui.arsip.angkatan = el.value;
    SP.ui.arsip.backupDiunduh = false;
    segarkanModalArsip();
  };

  SP.changes.arsipKriteria = function (el) {
    SP.ui.arsip.kriteria = el.value;
    SP.ui.arsip.backupDiunduh = false;
    segarkanModalArsip();
  };

  SP.actions.arsipUnduhBackup = function () {
    const u = SP.ui.arsip;
    const kandidat = arsipKandidat();
    if (!kandidat.length) return SP.toast('Tidak ada data mahasiswa untuk dicadangkan.', 'warn');
    const kkm = Number((SP.set() && SP.set().kkm) || 75);
    const headers = [
      'NIM', 'NAMA_LENGKAP', 'EMAIL', 'ANGKATAN', 'KELAS_TERAKHIR', 'STATUS_DATA',
      'NILAI_ARAB_GANJIL', 'NILAI_INGGRIS_GANJIL', 'NILAI_ARAB_GENAP', 'NILAI_INGGRIS_GENAP',
      'STATUS_KELULUSAN', 'NOMOR_SERTIFIKAT', 'TANGGAL_SERTIFIKAT'
    ];
    const rows = kandidat.map(function (b) {
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
        b.kelas ? b.kelas.nama : '',
        b.m.status === 'NONAKTIF' ? 'Nonaktif' : 'Aktif',
        getVal('ARB_GJL'),
        getVal('ING_GJL'),
        getVal('ARB_GNP'),
        getVal('ING_GNP'),
        { LULUS: 'Lulus', WAJIB_MENGULANG: 'Wajib Mengulang', BELUM_LENGKAP: 'Belum Lengkap' }[b.akhir] || b.akhir,
        sert ? sert.nomor : '',
        sert ? sert.tanggal_cetak : ''
      ];
    });

    const namaFile = 'backup-mahasiswa-angkatan-' + (u.angkatan || 'semua') + '-' + SP.hariIni() + '.csv';
    SP.unduhCsv(namaFile, headers, rows);
    u.backupDiunduh = true;
    SP.toast('Berkas cadangan berhasil diunduh: <b>' + esc(namaFile) + '</b>.', 'ok');
    segarkanModalArsip();
  };

  SP.actions.arsipEksekusi = async function (el) {
    const u = SP.ui.arsip;
    if (!u.backupDiunduh) {
      return SP.toast('Harap unduh berkas cadangan (backup) pada Langkah 1 terlebih dahulu.', 'warn');
    }
    const tipe = el.dataset.tipe;
    const kandidat = arsipKandidat();
    if (!kandidat.length) return SP.toast('Tidak ada mahasiswa yang memenuhi kriteria.', 'warn');

    if (tipe === 'HAPUS') {
      const ya = await SP.konfirmasi({
        judul: 'Hapus Permanen ' + kandidat.length + ' Mahasiswa?',
        pesan: '<b style="color:var(--danger)">PERINGATAN KERAS:</b> Anda akan menghapus permanen data <b>' + kandidat.length + ' mahasiswa</b> Angkatan ' + esc(u.angkatan) + ' beserta seluruh riwayat pendaftaran kelas dan nilainya dari Google Sheets.<br><br>Pastikan berkas cadangan (.csv) yang baru saja diunduh sudah tersimpan aman di komputer Anda. Tindakan ini tidak dapat dibatalkan!',
        bahaya: true,
        ya: 'Ya, Hapus Permanen dari Spreadsheet',
        batal: 'Batal'
      });
      if (!ya) return;
    } else {
      const ya = await SP.konfirmasi({
        judul: 'Nonaktifkan ' + kandidat.length + ' Mahasiswa?',
        pesan: 'Apakah Anda yakin ingin menonaktifkan (mengarsipkan) data <b>' + kandidat.length + ' mahasiswa</b> Angkatan ' + esc(u.angkatan) + '?<br><br>Status mereka akan diubah menjadi NONAKTIF dan disembunyikan dari tampilan kerja harian, namun tetap tersimpan di sheet historis.',
        bahaya: false,
        ya: 'Ya, Nonaktifkan (Arsip)',
        batal: 'Batal'
      });
      if (!ya) return;
    }

    u.sedang = true;
    segarkanModalArsip();
    try {
      const res = await SP.api('mahasiswaArsipMassal', {
        angkatan: u.angkatan,
        kriteria: u.kriteria,
        tipe: tipe
      });

      const nimMap = {};
      (res.nims || []).forEach(function (n) { nimMap[n] = true; });

      if (tipe === 'NONAKTIF') {
        SP.S.mahasiswa.forEach(function (m) {
          if (nimMap[m.nim]) m.status = 'NONAKTIF';
        });
        SP.toast('<b>' + res.jumlah + ' mahasiswa</b> Angkatan ' + esc(u.angkatan) + ' berhasil dinonaktifkan (diarsipkan).', 'ok');
      } else {
        SP.S.mahasiswa = SP.S.mahasiswa.filter(function (m) { return !nimMap[m.nim]; });
        SP.S.km = SP.S.km.filter(function (r) { return !nimMap[r.nim]; });
        SP.S.nilai = SP.S.nilai.filter(function (r) { return !nimMap[r.nim]; });
        SP.S.pengulangan = SP.S.pengulangan.filter(function (r) { return !nimMap[r.nim]; });
        SP.S.sert = SP.S.sert.filter(function (s) { return !nimMap[s.nim]; });
        SP.toast('<b>' + res.jumlah + ' mahasiswa</b> Angkatan ' + esc(u.angkatan) + ' berhasil dihapus permanen dari database.', 'ok');
      }

      SP.indeks();
      SP.simpanCache();
      SP.tutupModal();
      SP.renderUlang();
    } catch (e) {
      u.sedang = false;
      segarkanModalArsip();
      SP.toast(esc(e.message), 'err', 8000);
    }
  };

  // ============================================================
  // CETAK SERTIFIKAT (2 SISI: DEPAN & BELAKANG)
  // ============================================================
  SP.ui.cert = SP.ui.cert || { kelas: '', angkatan: '', tab: 'siap', sel: {}, q: '', page: 1, job: null, sisi: 'dua', previewNim: '' };
  if (!SP.ui.cert.sisi) SP.ui.cert.sisi = 'dua';

  SP.renderSertifikatDepanHtml = function (info, aset) {
    aset = aset || {};
    const logoSrc = aset.logo || 'assets/logo.png';
    const qrUrl = SP.qrDataUrl ? SP.qrDataUrl(info.urlVerifikasi || info.nomor, 1) : '';
    return '<div class="cert-sheet cert-front">' +
      '<div class="cert-frame">' +
        '<div class="cert-head">' +
          '<img class="cert-logo" src="' + esc(logoSrc) + '" alt="Logo" onerror="this.style.display=\'none\'">' +
          '<div class="cert-lb">' + esc(info.lembaga) + '</div>' +
          '<div class="cert-tt">SERTIFIKAT KEMAHIRAN BAHASA</div>' +
          '<div class="cert-sub">Program Intensif Bahasa Arab &amp; Bahasa Inggris</div>' +
          '<div class="cert-divider"></div>' +
          '<div class="cert-no">Nomor: ' + esc(info.nomor) + '</div>' +
        '</div>' +
        '<div class="cert-body-front">' +
          '<div class="cert-foto-box">' +
            (aset.foto ? '<img src="' + esc(aset.foto) + '" alt="Foto">' : '<span>PASFOTO<br>3 × 4</span>') +
          '</div>' +
          '<div class="cert-recipient">' +
            '<div class="cert-gv">Diberikan dengan penuh kehormatan kepada:</div>' +
            '<div class="cert-nm">' + esc(String(info.m.nama || '').toUpperCase()) + '</div>' +
            '<div class="cert-ni">NIM: <b>' + esc(info.m.nim) + '</b> &nbsp;·&nbsp; Program Studi: <b>' + esc(info.prodi) + '</b> &nbsp;·&nbsp; Kelas: <b>' + esc(info.kelas) + '</b> &nbsp;·&nbsp; Angkatan: <b>' + esc(info.angkatan) + '</b></div>' +
            '<div class="cert-st">Telah mengikuti dan dinyatakan <b>LULUS</b> pada seluruh <b>4 (Empat) Program Kemahiran Bahasa Arab dan Bahasa Inggris</b> (Semester Ganjil dan Semester Genap) sesuai standar Kriteria Ketuntasan Minimal (KKM ' + esc(info.kkm) + ') yang ditetapkan lembaga.</div>' +
            '<div class="cert-score-pill">Rata-rata Skor: ' + esc(info.rataAngka) + ' &nbsp;•&nbsp; Predikat: ' + esc(info.predikatAkhir) + ' (' + esc(info.hurufAkhir) + ') &nbsp;•&nbsp; Rincian Skor di Halaman Belakang</div>' +
          '</div>' +
        '</div>' +
        '<div class="cert-foot">' +
          '<div class="cert-sig">' +
            '<div>' + esc(info.ttd1.jabatan) + '</div>' +
            '<div class="cert-sig-space">' + (aset.ttd1 ? '<img src="' + esc(aset.ttd1) + '" alt="TTD 1">' : '') + '</div>' +
            '<div class="cert-sig-line"></div>' +
            '<div class="cert-sig-name">' + esc(info.ttd1.nama) + '</div>' +
            (info.ttd1.nip ? '<div class="cert-sig-nip">' + esc(info.ttd1.nip) + '</div>' : '') +
          '</div>' +
          '<div class="cert-center-qr">' +
            '<div class="cert-tg">Diterbitkan pada ' + esc(info.tanggalLabel) + '</div>' +
            '<div class="cert-qr-box"><img src="' + esc(qrUrl) + '" alt="QR" onerror="this.outerHTML=\'<div class=cert-qr-fallback></div>\'"></div>' +
            '<div class="cert-qr-cap">Verifikasi Keaslian</div>' +
          '</div>' +
          '<div class="cert-sig">' +
            '<div>' + esc(info.ttd2.jabatan) + '</div>' +
            '<div class="cert-sig-space">' + (aset.ttd2 ? '<img src="' + esc(aset.ttd2) + '" alt="TTD 2">' : '') + '</div>' +
            '<div class="cert-sig-line"></div>' +
            '<div class="cert-sig-name">' + esc(info.ttd2.nama) + '</div>' +
            (info.ttd2.nip ? '<div class="cert-sig-nip">' + esc(info.ttd2.nip) + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

  SP.renderSertifikatBelakangHtml = function (info, aset) {
    aset = aset || {};
    return '<div class="cert-sheet cert-back">' +
      '<div class="cert-frame">' +
        '<div class="cert-back-head">' +
          '<div class="cert-lb">' + esc(info.lembaga) + '</div>' +
          '<div class="cert-back-tt">DAFTAR NILAI KELULUSAN (TRANSKRIP SKOR 4 PROGRAM)</div>' +
          '<div class="cert-back-sub">Rincian Capaian Evaluasi Kemahiran Bahasa Arab &amp; Bahasa Inggris (Semester Ganjil dan Semester Genap)</div>' +
        '</div>' +
        '<div class="cert-id-grid">' +
          '<div class="cert-id-row"><span class="k">Nama Mahasiswa</span><span>:</span><b class="v">' + esc(String(info.m.nama || '').toUpperCase()) + '</b></div>' +
          '<div class="cert-id-row"><span class="k">Kelas / Prodi</span><span>:</span><b class="v">' + esc(info.kelas + ' / ' + info.prodi) + '</b></div>' +
          '<div class="cert-id-row"><span class="k">NIM / Angkatan</span><span>:</span><b class="v">' + esc(info.m.nim + ' (Angkatan ' + info.angkatan + ')') + '</b></div>' +
          '<div class="cert-id-row"><span class="k">Nomor Sertifikat</span><span>:</span><b class="v mono">' + esc(info.nomor) + '</b></div>' +
        '</div>' +
        '<table class="cert-score-tbl">' +
          '<thead><tr>' +
            '<th class="c" style="width:5%">No</th>' +
            '<th class="c" style="width:11%">Kode</th>' +
            '<th style="width:32%">Program Kemahiran Bahasa</th>' +
            '<th class="c" style="width:11%">Semester</th>' +
            '<th class="c" style="width:8%">KKM</th>' +
            '<th class="c" style="width:10%">Skor Angka</th>' +
            '<th class="c" style="width:8%">Huruf</th>' +
            '<th class="c" style="width:15%">Predikat / Status</th>' +
          '</tr></thead>' +
          '<tbody>' +
            info.programRows.map(function (r) {
              return '<tr>' +
                '<td class="c">' + r.no + '</td>' +
                '<td class="c mono" style="font-weight:700">' + esc(r.kodeLabel) + '</td>' +
                '<td><span class="prog-nm">' + esc(r.nama) + '</span><span class="prog-sub">' + esc(r.sub) + '</span></td>' +
                '<td class="c">' + esc(r.semester) + '</td>' +
                '<td class="c mono">' + esc(r.kkm) + '</td>' +
                '<td class="c sc-num">' + esc(r.angka) + '</td>' +
                '<td class="c sc-grd">' + esc(r.huruf) + '</td>' +
                '<td class="c"><span class="sc-pass">' + esc(r.predikat) + ' · ' + esc(r.status) + '</span></td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
          '<tfoot><tr>' +
            '<td colspan="4" style="text-align:right;padding-right:1.2cqw">RATA-RATA SKOR KELULUSAN KEEMPAT PROGRAM :</td>' +
            '<td class="c mono">' + esc(info.kkm) + '</td>' +
            '<td class="c sc-num">' + esc(info.rataAngka) + '</td>' +
            '<td class="c sc-grd">' + esc(info.hurufAkhir) + '</td>' +
            '<td class="c">' + esc(info.predikatAkhir) + ' (LULUS)</td>' +
          '</tr></tfoot>' +
        '</table>' +
        '<div class="cert-back-foot">' +
          '<div class="cert-scale-box">' +
            '<b class="hd">Pedoman Konversi Skor &amp; Kualifikasi Kelulusan (Standar KKM: ' + esc(info.kkm) + ')</b>' +
            '<div class="cert-scale-grid">' +
              '<span><b>85 – 100</b> : A (Sangat Memuaskan / Mumtaz)</span>' +
              '<span><b>60 – ' + esc(Math.max(60, info.kkm - 1)) + '</b> : C (Cukup / Belum Tuntas)</span>' +
              '<span><b>' + esc(info.kkm) + ' – 84</b> : B (Memuaskan / Jayyid Jiddan)</span>' +
              '<span><b>&lt; 60</b> : D (Kurang / Wajib Mengulang)</span>' +
            '</div>' +
          '</div>' +
          '<div class="cert-back-sig">' +
            '<div>Diterbitkan pada ' + esc(info.tanggalLabel) + '</div>' +
            '<div>' + esc(info.ttd2.jabatan) + '</div>' +
            '<div class="cert-sig-space" style="height:3.2cqw">' + (aset.ttd2 ? '<img src="' + esc(aset.ttd2) + '" alt="TTD 2">' : '') + '</div>' +
            '<div class="cert-sig-line"></div>' +
            '<div class="cert-sig-name">' + esc(info.ttd2.nama) + '</div>' +
            (info.ttd2.nip ? '<div class="cert-sig-nip">' + esc(info.ttd2.nip) + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

  SP.cetakSertifikat2Sisi = async function (nim, cfgOverride) {
    const info = SP.rincianSertifikatMhs(nim, cfgOverride);
    const aset = Object.assign({}, (SP.ui.set && SP.ui.set.aset) || {});
    ['logo', 'ttd1', 'ttd2'].forEach(function (k) {
      if (aset[k] === undefined) {
        SP.api('ambilAset', { kunci: k }).then(function (r) { if (r && r.dataUrl) aset[k] = r.dataUrl; }).catch(function () {});
      }
    });
    if (nim && !info.isContoh) {
      try {
        const rf = await SP.api('ambilFoto', { nim: nim });
        if (rf && rf.dataUrl) aset.foto = rf.dataUrl;
      } catch (e) { /* foto opsional */ }
    }
    const depanHtml = SP.renderSertifikatDepanHtml(info, aset);
    const belakangHtml = SP.renderSertifikatBelakangHtml(info, aset);
    const cssHref = new URL('css/style.css', location.href).href;
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentWindow.document;
    d.open();
    d.write('<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Sertifikat_' + esc(info.m.nim) + '_' + esc(info.m.nama) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">' +
      '<link rel="stylesheet" href="' + esc(cssHref) + '">' +
      '<style>' +
        '@page { size: A4 landscape; margin: 8mm; }' +
        'html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
        '.print-page { width: 100%; container-type: inline-size; page-break-after: always; break-after: page; display: flex; align-items: center; justify-content: center; }' +
        '.print-page:last-child { page-break-after: auto; break-after: auto; }' +
        '.print-page .cert-sheet { width: 100%; box-shadow: none; }' +
      '</style></head><body>' +
      '<div class="print-page">' + depanHtml + '</div>' +
      '<div class="print-page">' + belakangHtml + '</div>' +
      '</body></html>');
    d.close();
    setTimeout(function () {
      f.contentWindow.focus();
      f.contentWindow.print();
      setTimeout(function () { f.remove(); }, 3000);
    }, 650);
  };

  function certData() {
    const izin = {}; SP.kelasCetak().forEach(function (k) { izin[k.id] = true; });
    const adm = SP.isAdmin();
    const u = SP.ui.cert;
    return SP.barisKelulusan().filter(function (b) {
      if (b.akhir !== 'LULUS') return false;
      if (u.angkatan && b.m.angkatan !== u.angkatan) return false;
      const rows = (SP.X.km[b.m.nim] || []).filter(function (r) { return r.jenis !== 'PENGULANGAN'; });
      if (!adm && !rows.some(function (r) { return izin[r.kelas_id]; })) return false;
      if (u.kelas && !rows.some(function (r) { return r.kelas_id === u.kelas; })) return false;
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
    if (!s) return '<span class="muted3">-</span>';
    const k = { TERKIRIM: 'TERKIRIM', ANTRE: 'ANTRE', GAGAL: 'GAGAL', BELUM: 'BELUM_KIRIM' }[s.status_email] || 'BELUM_KIRIM';
    return SP.badge(k) + (s.status_email === 'GAGAL' ? ' <button class="btn btn-ghost btn-sm" style="color:var(--danger)" data-act="certKirim" data-nim="' + esc(s.nim) + '">Kirim Ulang</button>' : '');
  }

  SP.parts.certKuota = function () {
    const q = SP.S.meta.kuotaEmail || { sisa: 0, total: 1500, terpakai: 0 };
    const sisa = typeof q.sisa === 'number' ? q.sisa : 0;
    const terkirim = (SP.S.sert || []).filter(function (s) {
      return s.status_email === 'TERKIRIM' && String(s.waktu_email || '').indexOf(SP.hariIni()) === 0;
    }).length;
    const total = Math.max(q.total || 1500, sisa + terkirim);
    const pctTersedia = Math.min(100, Math.round((sisa / (total || 1)) * 100));
    return '<div class="ic">' + SP.icon('mail', 'lg') + '</div><div class="grow"><div class="h3">Kuota Pengiriman Email Hari Ini <span class="badge b-ok" style="vertical-align:middle">' + pctTersedia + '% SIAP KIRIM</span></div>' +
      '<p class="muted" style="font-size:13px">Tersisa <b class="num" style="color:var(--primary)">' + SP.n(sisa) + ' email</b> siap kirim (' + SP.n(terkirim) + ' terkirim hari ini dari kapasitas ' + SP.n(total) + '). Sertifikat PDF dibuat otomatis di Google Drive dan dikirim bertahap lewat antrean.</p></div>' +
      '<div style="min-width:220px"><div class="row between" style="font-size:13px"><span>Sisa kuota: <b>' + SP.n(sisa) + ' email</b></span><b style="color:var(--primary)">' + pctTersedia + '%</b></div>' + SP.prog(pctTersedia, '') + '<div class="muted3 mt8" style="font-size:12px">Reset harian pukul 00:00 WIB</div></div>';
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
    const u = SP.ui.cert, d = certData();
    const pilih = u.previewNim || Object.keys(u.sel).filter(function (n) { return u.sel[n]; })[0];
    const b = d.filter(function (x) { return x.m.nim === pilih; })[0] || d[0];
    const targetNim = b ? b.m.nim : '';
    const info = SP.rincianSertifikatMhs(targetNim);
    const aset = (SP.ui.set && SP.ui.set.aset) || {};
    const sisi = u.sisi || 'dua';

    const tabSisi = '<div class="row between wrap gap8 mb12">' +
      '<div class="seg">' +
        '<button class="' + (sisi === 'dua' ? 'on' : '') + '" data-act="certSisi" data-v="dua">2 Sisi (Depan &amp; Belakang)</button>' +
        '<button class="' + (sisi === 'depan' ? 'on' : '') + '" data-act="certSisi" data-v="depan">Sisi Depan</button>' +
        '<button class="' + (sisi === 'belakang' ? 'on' : '') + '" data-act="certSisi" data-v="belakang">Sisi Belakang (Skor)</button>' +
      '</div>' +
      '<button class="btn btn-primary btn-sm" data-act="certCetak2Sisi" data-nim="' + esc(targetNim) + '">' + SP.icon('printer', 'sm') + ' Cetak / PDF 2 Sisi</button>' +
    '</div>';

    const pilihMhsHtml = d.length > 1
      ? '<div class="field mb12"><label for="cp-mhs" style="font-size:11.5px">Mahasiswa pada Pratinjau</label><select id="cp-mhs" class="select" style="height:34px;font-size:12.5px" data-ch="certPreviewMhs">' +
        d.map(function (x) {
          return '<option value="' + esc(x.m.nim) + '"' + (x.m.nim === targetNim ? ' selected' : '') + '>' + esc(x.m.nama + ' (' + x.m.nim + ') - ' + (x.kelas ? x.kelas.nama : '')) + '</option>';
        }).join('') +
        '</select></div>'
      : '';

    let lembarHtml = '';
    if (sisi === 'depan' || sisi === 'dua') {
      lembarHtml += '<div class="cert-side-block">' +
        '<div class="cert-side-label"><span>Halaman 1: Sisi Depan (Keterangan Lulus &amp; Pengesahan)</span><span>A4 Landscape</span></div>' +
        SP.renderSertifikatDepanHtml(info, aset) +
      '</div>';
    }
    if (sisi === 'belakang' || sisi === 'dua') {
      lembarHtml += '<div class="cert-side-block">' +
        '<div class="cert-side-label back"><span>Halaman 2: Sisi Belakang (Transkrip Skor 4 Program)</span><span>Rata-rata: ' + esc(info.rataAngka) + ' (' + esc(info.hurufAkhir) + ')</span></div>' +
        SP.renderSertifikatBelakangHtml(info, aset) +
      '</div>';
    }

    return tabSisi + pilihMhsHtml + '<div class="cert-wrap">' + lembarHtml + '</div>';
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
      '<button class="btn btn-accent btn-sm" data-act="certCetak" ' + (nSel ? '' : 'disabled') + '>' + SP.icon('printer') + ' Terbitkan ke Drive (' + nSel + ')</button><button class="btn btn-primary btn-sm" data-act="certKirim" ' + (nSel ? '' : 'disabled') + '>' + SP.icon('send') + ' Kirim Email</button></div>' +
      (pg.total ? '<div class="tbl-wrap has-foot"><table class="tbl cards compact"><thead><tr><th></th><th>Mahasiswa</th><th>Skor 4 Program</th><th>No. sertifikat</th><th>Status terbit</th><th>Status email</th><th>Aksi</th></tr></thead><tbody>' +
        pg.items.map(function (b) {
          const c = certStatus(b);
          const info = SP.rincianSertifikatMhs(b.m.nim);
          const ringkasSkor = info.programRows.map(function (r) {
            return '<span class="chip ok" style="font-size:10.5px;padding:1px 6px" title="' + esc(r.nama + ': ' + r.angka + ' (' + r.predikat + ')') + '">' + esc(r.kodeLabel.split('-')[0] + ' ' + r.semester[0] + ': ' + r.angka) + '</span>';
          }).join(' ');
          return '<tr><td><label class="chk"><input type="checkbox" data-ch="certPilih" data-nim="' + esc(b.m.nim) + '" ' + (u.sel[b.m.nim] ? 'checked' : '') + ' aria-label="Pilih ' + esc(b.m.nama) + '"></label></td><td data-l="Mahasiswa" class="nm"><b>' + esc(b.m.nama) + '</b><small><span class="mono">' + esc(b.m.nim) + '</span> · ' + esc(b.kelas ? b.kelas.nama : '') + '</small></td>' +
            '<td data-l="Skor 4 Program"><div class="row wrap gap4">' + ringkasSkor + '</div><small class="muted">Rata-rata: <b>' + esc(info.rataAngka) + ' (' + esc(info.predikatAkhir) + ')</b></small></td>' +
            '<td data-l="No. sertifikat" class="mono" style="font-size:12px">' + esc(c.sert ? c.sert.nomor : '-') +
              (c.sert && c.sert.sig_hmac ? '<div class="row gap4 mt4"><span class="badge b-ok" style="font-size:10px;padding:1px 6px" title="Hash PDF SHA-256: ' + esc(c.sert.hash_pdf || '-') + '">' + SP.icon('shieldCheck', 'sm') + ' HMAC</span><button class="btn btn-ghost btn-sm" style="height:22px;padding:0 6px;font-size:10.5px" data-act="salinUrlVerif" data-url="' + esc(info.urlVerifikasi) + '" title="Salin tautan verifikasi ber-HMAC">' + SP.icon('copy', 'sm') + '</button></div>' : '') +
            '</td><td data-l="Status terbit">' + SP.badge(c.terbit ? 'DITERBITKAN' : 'SIAP_CETAK') + '</td><td data-l="Status email">' + badgeEmail(c.sert) + '</td>' +
            '<td><div class="row gap4">' +
              '<button class="btn btn-outline btn-sm" data-act="certCetak2Sisi" data-nim="' + esc(b.m.nim) + '" title="Cetak / Simpan PDF 2 Sisi (Depan &amp; Belakang)">' + SP.icon('printer') + ' 2 Sisi</button>' +
              (c.terbit ? '<button class="btn btn-outline btn-sm" data-act="unduhSert" data-nim="' + esc(b.m.nim) + '" title="Unduh PDF Drive">' + SP.icon('download') + ' Drive</button> <button class="btn btn-ghost btn-sm" data-act="certUlang" data-nim="' + esc(b.m.nim) + '" title="Terbitkan ulang ke Drive">' + SP.icon('refresh') + '</button>' : '<button class="btn btn-accent btn-sm" data-act="certSatu" data-nim="' + esc(b.m.nim) + '" title="Terbitkan PDF ke Google Drive">' + SP.icon('uploadCloud') + ' Drive</button>') +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div><div class="tbl-foot"><span>Menampilkan ' + pg.dari + '–' + pg.sampai + ' dari ' + pg.total + ' mahasiswa berhak sertifikat</span>' + SP.pagerHtml('certHal', pg) + '</div>'
        : '<div class="card">' + SP.kosong('award', u.tab === 'siap' ? 'Tidak ada sertifikat yang siap dicetak' : 'Belum ada data', u.tab === 'siap' ? 'Mahasiswa yang lulus pada keempat program akan muncul di sini.' : 'Tidak ada baris pada tab ini.') + '</div>');
  };

  SP.views.sertifikat = {
    judul: 'Cetak Sertifikat',
    render: function () {
      if (!SP.bolehCetakUI()) {
        return SP.header({ crumbs: [['Dasbor', '#/dasbor'], ['Cetak Sertifikat']], judul: 'Penerbitan & Pencetakan Sertifikat' }) + '<div class="card">' + SP.kosong('lock', 'Akses Terbatas', 'Modul pencetakan sertifikat hanya boleh dilakukan oleh <b>Superadmin</b> dan <b>tutor yang diberikan izin akses</b> oleh Administrator.') + '</div>';
      }
      const u = SP.ui.cert, s = SP.set();
      return SP.header({
        crumbs: [['Dasbor', '#/dasbor'], ['Cetak Sertifikat']], eyebrow: 'Modul Registrar & Kelulusan', judul: 'Penerbitan & Pencetakan Sertifikat (2 Sisi)', desc: 'Sertifikat resmi 2 sisi: <b>Sisi Depan</b> (Keterangan Kelulusan &amp; Pengesahan) dan <b>Sisi Belakang</b> (Transkrip Skor 4 Program Bahasa Arab &amp; Inggris).',
        aksi: '<button class="btn btn-outline" data-act="certCetak2Sisi">' + SP.icon('printer') + ' Cetak Contoh 2 Sisi</button><button class="btn btn-outline" data-act="certContoh">' + SP.icon('download') + ' Contoh PDF Drive</button>' + (SP.isAdmin() ? '<a class="btn btn-outline" href="#/pengaturan">' + SP.icon('sliders') + ' Pengaturan Template</a>' : '')
      }) +
        (s.template_slides_id || !SP.isAdmin() ? '' : SP.callout({ tipe: 'warn', ikon: 'alert', judul: 'Template sertifikat Google Slides belum diatur', teks: 'Buka <a href="#/pengaturan"><b>Pengaturan</b></a> lalu klik <b>Buat template bawaan</b> untuk membuat template 2 sisi di Google Drive.' })) +
        '<div class="card kuota" data-part="certKuota" style="background:var(--callout)">' + SP.parts.certKuota() + '</div>' +
        '<div class="grid-main" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1.1fr)"><div><div class="toolbar"><div class="field" style="min-width:200px"><label for="cs-k">Kelas</label><select id="cs-k" class="select" data-ch="certKelas"><option value="">Semua kelas (' + SP.kelasCetak().length + ')</option>' + SP.kelasCetak().map(function (k) { return '<option value="' + esc(k.id) + '" ' + (u.kelas === k.id ? 'selected' : '') + '>' + esc(k.nama) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field" style="min-width:160px"><label for="cs-a">Angkatan</label><select id="cs-a" class="select" data-ch="certAngkatan"><option value="">Semua Angkatan</option>' + SP.angkatanList().map(function (a) { return '<option value="' + a + '" ' + (u.angkatan === a ? 'selected' : '') + '>Angkatan ' + a + '</option>'; }).join('') + '</select></div>' +
        '<div class="sch" style="align-self:flex-end"><span style="position:absolute;left:12px;top:11px;color:var(--text3)">' + SP.icon('search') + '</span><input class="input" style="padding-left:38px" placeholder="Cari NIM atau nama…" data-in="certQ" value="' + esc(u.q) + '"></div></div>' +
        '<div data-part="certTabel">' + SP.parts.certTabel() + '</div></div>' +
        '<div class="card card-p" style="position:sticky;top:84px"><div class="row between mb12"><h2 class="h3">' + SP.icon('award') + ' Pratinjau Sertifikat 2 Sisi (Depan &amp; Belakang)</h2><span class="chip ok">2 Halaman A4</span></div><div data-part="certPreview">' + SP.parts.certPreview() + '</div>' +
        '<p class="muted mt12" style="font-size:12px">Sertifikat terdiri atas <b>Halaman 1 (Sisi Depan)</b> berisi keterangan lulus &amp; pengesahan, serta <b>Halaman 2 (Sisi Belakang)</b> berisi transkrip nilai/skor keempat program.</p></div></div>' +
        '<div data-part="certJob">' + SP.parts.certJob() + '</div>';
    },
    after: function () {
      SP.ui.set = SP.ui.set || { tab: 'set', f: null, aset: {}, log: null, logQ: '', logAksi: '', logPage: 1 };
      ['logo', 'ttd1', 'ttd2'].forEach(function (k) {
        if (SP.ui.set.aset[k] !== undefined) return;
        SP.ui.set.aset[k] = '';
        SP.api('ambilAset', { kunci: k }).then(function (r) {
          SP.ui.set.aset[k] = (r && r.dataUrl) || '';
          if (SP.rute && SP.rute.nama === 'sertifikat') SP.refresh('certPreview');
        }).catch(function () {});
      });
    }
  };
  SP.actions.certTab = function (el) { SP.ui.cert.tab = el.dataset.v; SP.ui.cert.page = 1; SP.refresh('certTabel'); };
  SP.actions.certHal = function (el) { SP.ui.cert.page = Number(el.dataset.p); SP.refresh('certTabel'); };
  SP.actions.certSisi = function (el) { SP.ui.cert.sisi = el.dataset.v; SP.refresh('certPreview'); };
  SP.changes.certPreviewMhs = function (el) { SP.ui.cert.previewNim = el.value; SP.refresh('certPreview'); };
  SP.actions.certCetak2Sisi = function (el) {
    const u = SP.ui.cert;
    const nim = (el && el.dataset && el.dataset.nim) || u.previewNim || Object.keys(u.sel).filter(function (n) { return u.sel[n]; })[0] || '';
    SP.cetakSertifikat2Sisi(nim);
  };
  SP.changes.certKelas = function (el) { SP.ui.cert.kelas = el.value; SP.ui.cert.page = 1; SP.ui.cert.sel = {}; SP.ui.cert.previewNim = ''; SP.refresh('certTabel'); SP.refresh('certPreview'); };
  SP.changes.certAngkatan = function (el) { SP.ui.cert.angkatan = el.value; SP.ui.cert.page = 1; SP.ui.cert.sel = {}; SP.ui.cert.previewNim = ''; SP.refresh('certTabel'); SP.refresh('certPreview'); };
  SP.inputs.certQ = SP.debounce(function (el) { SP.ui.cert.q = el.value; SP.ui.cert.page = 1; SP.refresh('certTabel'); }, 150);
  SP.changes.certPilih = function (el) { SP.ui.cert.sel[el.dataset.nim] = el.checked; if (el.checked) SP.ui.cert.previewNim = el.dataset.nim; SP.refresh('certTabel'); SP.refresh('certPreview'); };
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
      const pilih = SP.ui.cert.previewNim || Object.keys(SP.ui.cert.sel).filter(function (n) { return SP.ui.cert.sel[n]; })[0];
      const r = await SP.api('contohSertifikat', { nim: pilih || '' }, { timeout: 90000 }); SP.unduhBase64(r.nama, r.base64, 'application/pdf');
    } catch (e) { SP.toast(esc(e.message), 'err'); }
    el.disabled = false;
  };
  async function jalankanCetak(nims, ulang) {
    const u = SP.ui.cert; if (u.job && u.job.selesai < u.job.total && !u.job.henti) return SP.toast('Masih ada proses pencetakan yang berjalan.', 'warn');
    const j = (u.job = { total: nims.length, selesai: 0, gagal: [], jeda: false, henti: false, mulai: Date.now(), label: (u.kelas ? SP.kelasNama(u.kelas) : 'Semua kelas') + ' - ' + SP.set().semester_aktif.toLowerCase() + ' ' + SP.set().tahun_ajaran_aktif });
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
  SP.actions.salinUrlVerif = function (el) {
    if (el.dataset.url) SP.salin(el.dataset.url);
  };
})();
