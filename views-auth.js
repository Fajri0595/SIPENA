// ============================================================
// SIPENA — views-auth.js
// Halaman tanpa shell: Login, Akses Ditolak, Verifikasi Sertifikat,
// galat konfigurasi, dan overlay "sesi berakhir".
// ============================================================
(function () {
  const SP = window.SP;
  SP.views = SP.views || {};

  function topbar() {
    return '<header class="auth-top">' +
      '<div class="auth-logo">' +
        '<img src="logo.png" alt="SIPENA Logo" class="auth-brand-logo">' +
        '<div><b>SIPENA</b><small>SISTEM PENILAIAN &amp; KELULUSAN BAHASA</small></div>' +
      '</div>' +
      '<div class="auth-live-pill">' +
        '<span class="auth-live-dot"></span>' +
        '<span>Sistem Aktif &amp; Terpantau</span>' +
      '</div>' +
      '<nav class="auth-nav">' +
        '<a href="#/" data-act="panduanLogin" data-native>' + SP.icon('help', 'sm') + ' Panduan Tutor</a>' +
        '<a href="#/verifikasi">' + SP.icon('award', 'sm') + ' Verifikasi Sertifikat</a>' +
        '<a href="#/" data-act="bantuanLogin" data-native>' + SP.icon('mail', 'sm') + ' Bantuan</a>' +
      '</nav>' +
    '</header>';
  }
  function footer(info) {
    const nama = (info && info.nama_lembaga) || 'Pusat Pengembangan Bahasa';
    return '<footer class="auth-foot">' +
      '<div><b style="color:var(--text)">SIPENA • ' + SP.esc(nama) + '</b><br>Tata Kelola Sertifikasi dan Penilaian Akademik Terpadu</div>' +
      '<div class="row gap8 muted" style="font-size:12px">' +
        '<span>' + SP.icon('shieldCheck', 'sm') + ' OAuth 2.0 Enkripsi</span>' +
        '<span>•</span>' +
        '<span>© ' + new Date().getFullYear() + ' ' + SP.esc(nama) + '</span>' +
      '</div>' +
    '</footer>';
  }
  SP.infoPublik = null;
  async function muatInfo() {
    if (SP.infoPublik) return SP.infoPublik;
    try { SP.infoPublik = await SP.apiGet('publicInfo'); } catch (e) { SP.infoPublik = null; }
    return SP.infoPublik;
  }

  // ---------------- Login ----------------
  SP.tampilLogin = async function (pesan) {
    document.getElementById('app').innerHTML = topbar() +
      '<main class="auth-body">' +
        '<div class="auth-decor" aria-hidden="true">' +
          '<div class="auth-orb auth-orb-1"></div>' +
          '<div class="auth-orb auth-orb-2"></div>' +
          '<div class="auth-orb auth-orb-3"></div>' +
          '<div class="auth-grid-pattern"></div>' +
        '</div>' +
        '<div class="login">' +
          '<section class="login-l">' +
            '<div class="login-l-head">' +
              '<div class="sb-logo-wrap" style="width:50px;height:50px;padding:4px;border-radius:12px;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.2)">' +
                '<img src="logo.png" alt="SIPENA Logo" style="width:100%;height:100%;object-fit:contain;display:block">' +
              '</div>' +
              '<div>' +
                '<div class="sb-title" style="font-size:24px;letter-spacing:-.01em">SIPENA</div>' +
                '<div class="cap" style="color:var(--primary-l);letter-spacing:.08em" id="lg-lembaga">LEMBAGA PENGEMBANGAN BAHASA</div>' +
              '</div>' +
            '</div>' +
            '<span class="login-badge-hero">' +
              '<span class="auth-live-dot" style="background:var(--primary-l)"></span>' +
              'PROGRAM INTENSIF BAHASA ARAB &amp; INGGRIS' +
            '</span>' +
            '<h2 class="login-hero-title">Portal Penilaian &amp; Sertifikasi Digital Terpadu</h2>' +
            '<p class="login-hero-sub">Pusat tata kelola nilai komprehensif, evaluasi kelulusan multi-semester berbasis KKM institusi, dan penerbitan sertifikat elektronik resmi.</p>' +
            '<div class="login-features">' +
              [
                ['layers', 'Sinkronisasi Multi-Tutor Real-Time', 'Nilai semester ganjil &amp; genap dari pengajar terintegrasi otomatis dalam satu basis data terpusat.', 'Otomatis'],
                ['shieldCheck', 'Evaluasi Kelulusan 4 Program', 'Perhitungan otomatis status kelulusan Arab &amp; Inggris 2 semester sesuai ambang batas KKM.', 'Standar KKM'],
                ['award', 'Penerbitan Sertifikat &amp; Surel Digital', 'Sertifikat resmi berseri dengan QR Code validasi langsung terdistribusi ke email mahasiswa.', 'QR Verifikasi']
              ].map(function (f) {
                return '<div class="ft-card">' +
                  '<div class="ic">' + SP.icon(f[0]) + '</div>' +
                  '<div class="ft-card-body">' +
                    '<div class="ft-card-head">' +
                      '<b>' + f[1] + '</b>' +
                      '<span class="ft-card-tag">' + f[3] + '</span>' +
                    '</div>' +
                    '<div class="ft-card-desc">' + f[2] + '</div>' +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
            '<div class="login-pills">' +
              '<span class="login-pill-item">' + SP.icon('check', 'sm') + ' 2 Bahasa Asing</span>' +
              '<span class="login-pill-item">' + SP.icon('calendar', 'sm') + ' 2 Semester</span>' +
              '<span class="login-pill-item">' + SP.icon('award', 'sm') + ' Sertifikat QR</span>' +
              '<span class="login-pill-item">' + SP.icon('zap', 'sm') + ' Cloud Apps Script</span>' +
            '</div>' +
            '<div class="infra">' +
              SP.icon('zap', 'lg') +
              '<div>' +
                '<div class="cap" style="color:var(--primary-l)">INFRASTRUKTUR RESMI TERVERIFIKASI</div>' +
                'Google Cloud Workspace &amp; Google Apps Script' +
              '</div>' +
            '</div>' +
          '</section>' +
          '<section class="login-r">' +
            '<div class="login-eyebrow">' +
              '<span class="auth-live-dot" style="background:var(--primary)"></span>' +
              'AUTENTIKASI AKSES AKADEMIK' +
            '</div>' +
            '<div>' +
              '<h1 class="login-title">Masuk ke Portal</h1>' +
              '<p class="login-sub">Silakan autentikasi menggunakan akun Google resmi yang telah didaftarkan oleh Superadmin.</p>' +
            '</div>' +
            (pesan ? '<div class="callout bad"><div class="ic">' + SP.icon('alert') + '</div><div class="tx">' + SP.esc(pesan) + '</div></div>' : '') +
            '<div class="login-auth-box">' +
              '<div class="login-auth-box-head">' +
                '<div class="login-auth-box-title">' +
                  SP.icon('lock', 'sm') +
                  '<span>Lanjutkan dengan Akun Google</span>' +
                '</div>' +
                '<span class="badge b-ok" style="font-size:10px;padding:2px 7px">OAuth 2.0</span>' +
              '</div>' +
              '<div class="gbtn" id="gbtn">' +
                '<div class="sk" style="height:44px;width:100%;max-width:380px;border-radius:8px"></div>' +
              '</div>' +
              '<div class="login-auth-box-foot">' +
                SP.icon('shieldCheck', 'sm') +
                '<span>Akses aman langsung via Google Identity Services</span>' +
              '</div>' +
            '</div>' +
            '<div class="login-server-card" id="card-server-status">' +
              '<div class="login-server-info">' +
                '<span class="auth-live-dot" id="server-dot"></span>' +
                '<div>' +
                  '<b id="server-status-label">Status Server Cloud</b>' +
                  '<small id="server-status-desc">Google Apps Script API siap merespons</small>' +
                '</div>' +
              '</div>' +
              '<button class="btn btn-outline btn-sm" data-act="ujiServer" id="btn-uji" title="Klik untuk menguji latensi server">' +
                SP.icon('zap', 'sm') + ' <span id="btn-uji-tx">Uji Respon</span>' +
              '</button>' +
            '</div>' +
            '<div class="login-guide-card">' +
              SP.icon('lock') +
              '<div>' +
                '<b>Akses Khusus Pendidik &amp; Administrator</b>' +
                '<p>Hanya Tutor aktif dan Superadmin yang memiliki hak akses ke sistem. Mahasiswa tidak memiliki akun login — seluruh rekapan nilai dan sertifikat dikirim otomatis melalui surel resmi.</p>' +
              '</div>' +
            '</div>' +
            '<div class="row between wrap gap8 muted" style="font-size:12.5px;padding-top:4px">' +
              '<span class="row gap4">' + SP.icon('calendar', 'sm') + ' T.A. Aktif: <b id="lg-ta" style="color:var(--text)">…</b></span>' +
              '<span class="row gap8">' +
                '<button class="btn btn-ghost btn-sm" data-act="panduanLogin" style="padding:0 4px;height:auto">' + SP.icon('help', 'sm') + ' Panduan</button>' +
                '<span>•</span>' +
                '<button class="btn btn-ghost btn-sm" data-act="bantuanLogin" style="padding:0 4px;height:auto">' + SP.icon('mail', 'sm') + ' Bantuan</button>' +
              '</span>' +
            '</div>' +
          '</section>' +
        '</div>' +
      '</main>' +
      footer(SP.infoPublik);

    const info = await muatInfo();
    if (info) {
      const l = SP.$('#lg-lembaga'); if (l) l.textContent = String(info.nama_lembaga).toUpperCase();
      const t = SP.$('#lg-ta'); if (t) t.textContent = info.tahun_ajaran_aktif;
    } else { const t = SP.$('#lg-ta'); if (t) t.textContent = '—'; }
    const g = SP.$('#gbtn'); if (g) { g.innerHTML = ''; SP.Auth.tombol(g); }
  };

  SP.actions.ujiServer = async function (el) {
    const t0 = Date.now(); el.disabled = true;
    const tx = SP.$('#btn-uji-tx'); if (tx) tx.innerHTML = '<span class="spin" style="width:12px;height:12px"></span>';
    try {
      await SP.apiGet('ping');
      const ms = Date.now() - t0;
      SP.toast('Server merespons dalam <b>' + ms + ' ms</b>.', 'ok');
      const desc = SP.$('#server-status-desc');
      if (desc) desc.innerHTML = 'Latensi: <b style="color:var(--ok-tx)">' + ms + ' ms</b> (Optimal)';
      const dot = SP.$('#server-dot');
      if (dot) dot.style.background = ms < 900 ? '#22C55E' : '#F59E0B';
    } catch (e) {
      SP.toast('Server tidak merespons: ' + SP.esc(e.message), 'err');
      const desc = SP.$('#server-status-desc');
      if (desc) desc.innerHTML = '<span style="color:var(--danger)">Gagal terhubung</span>';
      const dot = SP.$('#server-dot');
      if (dot) dot.style.background = '#EF4444';
    }
    el.disabled = false;
    if (tx) tx.textContent = 'Uji Respon';
  };
  SP.actions.panduanLogin = function () {
    SP.modal({ judul: 'Panduan Login Tutor & Admin', isi: '<ol style="padding-left:20px;line-height:1.8"><li>Klik <b>Lanjutkan dengan Google</b>.</li><li>Pilih akun Google yang <b>didaftarkan Superadmin</b> (email lembaga).</li><li>Jika muncul “Akses Ditolak”, hubungi Superadmin agar email Anda didaftarkan atau diaktifkan.</li></ol>', footer: '<button class="btn btn-primary" data-act="tutupModal">Mengerti</button>' });
  };
  SP.actions.bantuanLogin = function () {
    const k = SP.infoPublik && SP.infoPublik.kontak_bantuan;
    SP.modal({ judul: 'Bantuan Registrasi Akun', isi: '<p>Registrasi akun dilakukan oleh <b>Superadmin</b> lembaga.' + (k ? '<br>Kontak bantuan: <b>' + SP.esc(k) + '</b>' : '') + '</p>', footer: '<button class="btn btn-primary" data-act="tutupModal">Tutup</button>' });
  };
  SP.actions.tutupModal = function () { SP.tutupModal(); };

  // ---------------- Akses ditolak ----------------
  SP.tampilDitolak = async function (email) {
    const info = await muatInfo();
    document.getElementById('app').innerHTML = topbar() + '<main class="auth-body"><div>' +
      '<div class="center mb16"><span class="pill-ta"><i style="background:var(--danger)"></i> SIPENA · ' + SP.esc(String((info && info.nama_lembaga) || 'Pusat Pengembangan Bahasa').toUpperCase()) + '</span></div>' +
      '<div class="card deny"><div class="big">' + SP.icon('shieldX', 'xl') + '</div><h1 class="h1" style="font-size:28px">Akses Ditolak</h1>' +
      '<p class="muted mt8">Akun Google Anda tidak terdaftar atau sudah dinonaktifkan pada sistem SIPENA.</p>' +
      '<div class="deny"  style="padding:0;box-shadow:none"><div class="box"><div class="row between"><span class="cap">IDENTITAS PERCOBAAN MASUK</span><span class="badge b-bad">' + SP.icon('x') + 'Nonaktif / Tidak Terdaftar</span></div>' +
      '<div class="row mt8" style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:10px 12px"><span class="muted3">' + SP.icon('mail') + '</span><span class="mono grow trunc">' + SP.esc(email || '—') + '</span><button class="btn btn-ghost btn-sm" data-act="salinEmail" data-v="' + SP.esc(email || '') + '" aria-label="Salin">' + SP.icon('copy') + '</button></div></div>' +
      '<div class="box" style="background:var(--subtle);border-color:var(--border)"><div class="row gap8 mb16"><span class="muted">' + SP.icon('help') + '</span><b class="h3">Langkah Penyelesaian Mandiri</b></div>' +
      '<div class="row top mb16"><span class="stepno">1</span><span>Pastikan Anda masuk menggunakan <b>akun surel resmi lembaga</b> yang telah didaftarkan oleh Superadmin.</span></div>' +
      '<div class="row top"><span class="stepno">2</span><span>Jika Anda tutor baru atau tutor pengganti, hubungi <b>Superadmin</b> agar email Anda didaftarkan dan penugasan kelas diaktifkan.</span></div></div></div>' +
      '<div class="row mt24" style="justify-content:center"><button class="btn btn-primary btn-lg" data-act="kembaliLogin">' + SP.icon('arrowLeft') + ' Kembali ke Login</button>' +
      '<button class="btn btn-soft btn-lg" data-act="bantuanLogin" style="color:var(--accent-d)">' + SP.icon('help') + ' Bantuan Superadmin</button></div>' +
      '<p class="muted3 mt24" style="font-size:12px">Kode galat: AUTH-403 · ' + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB</p></div></div></main>' + footer(info);
  };
  SP.actions.kembaliLogin = function () { SP.Auth.keluar(); };
  SP.actions.salinEmail = function (el) { SP.salin(el.dataset.v); };

  // ---------------- Galat konfigurasi ----------------
  SP.tampilGalatKonfig = function (pesan) {
    document.getElementById('app').innerHTML = topbar() + '<main class="auth-body"><div class="card card-p" style="max-width:640px">' +
      '<div class="empty"><div class="ic" style="background:var(--warn-bg);color:var(--accent)">' + SP.icon('alert', 'xl') + '</div><h3 class="h2">Konfigurasi belum lengkap</h3>' +
      '<p style="margin-top:8px">' + SP.esc(pesan) + '</p><p class="mt16">Buka file <code class="mono">config.js</code>, isi <code class="mono">GAS_URL</code> dan <code class="mono">GOOGLE_CLIENT_ID</code>, lalu unggah ulang ke GitHub Pages. Langkah rinci ada di <b>PANDUAN-INSTALASI.md</b>.</p></div></div></main>' + footer(null);
  };

  // ---------------- Overlay sesi berakhir ----------------
  let overlayPromise = null;
  SP.tampilLoginOverlay = function () {
    if (overlayPromise) return overlayPromise;
    overlayPromise = new Promise(function (resolve) {
      const m = SP.modal({
        judul: 'Sesi Anda berakhir', lebar: 460, statis: true, tanpaFokus: true,
        isi: '<p class="muted">Demi keamanan, silakan masuk kembali dengan akun Google Anda. <b>Perubahan yang belum tersimpan tidak akan hilang.</b></p><div id="ov-g" class="mt16 center" style="min-height:44px"></div>'
      });
      SP.Auth.tombol(m.el.querySelector('#ov-g'));
      SP.Auth._waiters.push(function (t) { m.tutup(); overlayPromise = null; resolve(t); });
    });
    return overlayPromise;
  };

  // ---------------- Verifikasi sertifikat (publik) ----------------
  SP.tampilVerifikasi = async function (nomor) {
    document.getElementById('app').innerHTML = topbar() + '<main class="auth-body"><div class="card card-p" style="width:min(560px,100%)">' +
      '<div class="eyebrow">VERIFIKASI PUBLIK</div><h1 class="h1" style="font-size:26px">Verifikasi Keaslian Sertifikat</h1><p class="lead">Masukkan nomor sertifikat, atau pindai kode QR pada sertifikat.</p>' +
      '<div class="row mt16"><input class="input" id="vf-no" placeholder="mis. CERT/ARB-ENG/2027/001" value="' + SP.esc(nomor || '') + '"><button class="btn btn-primary" data-act="cekVerifikasi">Periksa</button></div>' +
      '<div id="vf-hasil" class="mt16"></div></div></main>' + footer(null);
    if (nomor) SP.actions.cekVerifikasi();
  };
  SP.actions.cekVerifikasi = async function () {
    const no = SP.$('#vf-no').value.trim(); const h = SP.$('#vf-hasil'); if (!no) return;
    h.innerHTML = '<div class="sk" style="height:90px"></div>';
    try {
      const r = await SP.apiGet('verifikasi', { nomor: no });
      h.innerHTML = r.valid
        ? '<div class="callout ok"><div class="ic">' + SP.icon('shieldCheck', 'lg') + '</div><div><div class="ct">Sertifikat VALID</div><dl class="kv mt8"><dt>Nomor</dt><dd class="mono">' + SP.esc(r.nomor) + '</dd><dt>Nama</dt><dd>' + SP.esc(r.nama) + '</dd><dt>NIM</dt><dd class="mono">' + SP.esc(r.nim) + '</dd><dt>Diterbitkan</dt><dd>' + SP.esc(r.tanggal) + '</dd><dt>Lembaga</dt><dd>' + SP.esc(r.lembaga) + '</dd></dl></div></div>'
        : '<div class="callout bad"><div class="ic">' + SP.icon('shieldX', 'lg') + '</div><div><div class="ct">Sertifikat tidak ditemukan</div><div class="tx">Nomor tidak terdaftar pada sistem. Periksa kembali penulisannya.</div></div></div>';
    } catch (e) { h.innerHTML = '<div class="callout bad"><div class="ic">' + SP.icon('alert') + '</div><div class="tx">' + SP.esc(e.message) + '</div></div>'; }
  };
})();
