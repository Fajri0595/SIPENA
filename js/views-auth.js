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
        '<img src="assets/logo.png" alt="SIPENA Logo" class="auth-brand-logo">' +
        '<div><b>SIPENA</b><small>SISTEM PENILAIAN &amp; KELULUSAN BAHASA</small></div>' +
      '</div>' +
    '</header>';
  }
  function footer(info) {
    const nama = (info && info.nama_lembaga) || 'Pusat Pengembangan Bahasa';
    return '<footer class="auth-foot">' +
      '<div><b style="color:var(--text)">SIPENA • ' + SP.esc(nama) + '</b><br>Tata Kelola Sertifikasi dan Penilaian Akademik Terpadu</div>' +
      '<div class="row gap8 muted" style="font-size:12px">' +
        '<span>' + SP.icon('shieldCheck', 'sm') + ' Terenkripsi &amp; Aman</span>' +
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

  function ilustrasiLogin() {
    return '<div class="login-illo-stage" aria-hidden="true">' +
      '<div class="illo-float-badge illo-fb-1"><span class="illo-fb-dot"></span><span><b>AR &amp; EN</b> • 4 Program</span></div>' +
      '<div class="illo-float-badge illo-fb-2"><span class="illo-fb-ic">✓</span><span>Evaluasi KKM Otomatis</span></div>' +
      '<div class="illo-float-badge illo-fb-3"><span class="illo-fb-ic">★</span><span>E-Sertifikat QR</span></div>' +
      '<div class="illo-float-badge illo-fb-4"><span class="illo-fb-dot" style="background:#FBBF24;box-shadow:0 0 8px #FBBF24"></span><span>Sinkronisasi Real-Time</span></div>' +
      '<svg class="login-illo-svg" viewBox="0 0 460 310" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<radialGradient id="ilGlow" cx="50%" cy="54%" r="48%">' +
            '<stop offset="0%" stop-color="#93E0A2" stop-opacity="0.42"/>' +
            '<stop offset="60%" stop-color="#4ADE80" stop-opacity="0.14"/>' +
            '<stop offset="100%" stop-color="#166534" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<radialGradient id="ilSphere1" cx="35%" cy="30%" r="65%">' +
            '<stop offset="0%" stop-color="#BBF7D0"/>' +
            '<stop offset="55%" stop-color="#22C55E"/>' +
            '<stop offset="100%" stop-color="#064E3B"/>' +
          '</radialGradient>' +
          '<radialGradient id="ilSphere2" cx="35%" cy="30%" r="65%">' +
            '<stop offset="0%" stop-color="#FED7AA"/>' +
            '<stop offset="55%" stop-color="#F97316"/>' +
            '<stop offset="100%" stop-color="#7C2D12"/>' +
          '</radialGradient>' +
          '<linearGradient id="ilDesk" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#0D4A26"/>' +
            '<stop offset="100%" stop-color="#052110"/>' +
          '</linearGradient>' +
          '<linearGradient id="ilSweater" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#FFFFFF"/>' +
            '<stop offset="100%" stop-color="#D5E3DA"/>' +
          '</linearGradient>' +
          '<linearGradient id="ilPants" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#115E30"/>' +
            '<stop offset="100%" stop-color="#052913"/>' +
          '</linearGradient>' +
          '<linearGradient id="ilFace" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#FFE4C8"/>' +
            '<stop offset="100%" stop-color="#F2B48C"/>' +
          '</linearGradient>' +
          '<linearGradient id="ilHat" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#F97316"/>' +
            '<stop offset="100%" stop-color="#9A3412"/>' +
          '</linearGradient>' +
          '<linearGradient id="ilMon" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#334155"/>' +
            '<stop offset="100%" stop-color="#0F172A"/>' +
          '</linearGradient>' +
          '<linearGradient id="ilLap" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#EA580C"/>' +
            '<stop offset="100%" stop-color="#991B1B"/>' +
          '</linearGradient>' +
          '<linearGradient id="ilPlant" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#86EFAC"/>' +
            '<stop offset="100%" stop-color="#15803D"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<!-- Ambient Halo & Orbital Rings -->' +
        '<ellipse cx="235" cy="175" rx="185" ry="105" fill="url(#ilGlow)"/>' +
        '<ellipse class="illo-orbit" cx="235" cy="165" rx="165" ry="52" stroke="rgba(147,224,162,0.18)" stroke-width="1.5" stroke-dasharray="6 8"/>' +
        '<!-- Floating 3D Spheres -->' +
        '<circle class="illo-sphere-1" cx="76" cy="108" r="10" fill="url(#ilSphere1)" opacity="0.85"/>' +
        '<circle class="illo-sphere-2" cx="384" cy="122" r="8" fill="url(#ilSphere2)" opacity="0.85"/>' +
        '<circle class="illo-sphere-1" cx="356" cy="64" r="5" fill="url(#ilSphere1)" opacity="0.65"/>' +
        '<!-- Floor Shadow -->' +
        '<ellipse cx="230" cy="284" rx="190" ry="10" fill="#031A0C" fill-opacity="0.5"/>' +
        '<!-- Main Scene Scaled Up & Centered -->' +
        '<g transform="translate(8, 12) scale(1.25)">' +
          '<!-- Potted Plant (Left) -->' +
          '<g class="illo-plant">' +
            '<ellipse cx="52" cy="172" rx="15" ry="20" fill="url(#ilPlant)"/>' +
            '<circle cx="52" cy="155" r="12" fill="#4ADE80" fill-opacity="0.7"/>' +
            '<rect x="41" y="190" width="22" height="4.5" rx="2.2" fill="#FB923C"/>' +
            '<path d="M43 194.5H61L58 216H46L43 194.5Z" fill="url(#ilHat)"/>' +
            '<rect x="42" y="215" width="20" height="3" rx="1.5" fill="#072814"/>' +
          '</g>' +
          '<!-- Swivel Chair Base & Seat -->' +
          '<rect x="175" y="166" width="6" height="40" rx="3" fill="#CBD5E1"/>' +
          '<path d="M156 212L178 200L200 212" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<line x1="178" y1="200" x2="178" y2="214" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round"/>' +
          '<circle cx="155" cy="215" r="3.8" fill="#0F172A"/>' +
          '<circle cx="178" cy="216" r="3.8" fill="#0F172A"/>' +
          '<circle cx="201" cy="215" r="3.8" fill="#0F172A"/>' +
          '<rect x="148" y="155" width="60" height="13" rx="6.5" fill="url(#ilHat)"/>' +
          '<!-- Character Lower Body / Legs under Desk -->' +
          '<path d="M156 144L128 176L142 186L172 155Z" fill="url(#ilPants)"/>' +
          '<path d="M200 144L228 176L214 186L184 155Z" fill="url(#ilPants)"/>' +
          '<!-- Sneakers -->' +
          '<g transform="translate(111, 174) rotate(-24)">' +
            '<rect x="0" y="0" width="26" height="11" rx="5.5" fill="#166534"/>' +
            '<rect x="-2" y="8.5" width="30" height="4.2" rx="2" fill="#FFFFFF"/>' +
          '</g>' +
          '<g transform="translate(221, 163) rotate(24)">' +
            '<rect x="0" y="0" width="26" height="11" rx="5.5" fill="#166534"/>' +
            '<rect x="-2" y="8.5" width="30" height="4.2" rx="2" fill="#FFFFFF"/>' +
          '</g>' +
          '<!-- Character Torso & Raised Waving Arm -->' +
          '<g class="illo-waving-arm">' +
            '<path d="M206 112L239 58" stroke="url(#ilSweater)" stroke-width="15" stroke-linecap="round"/>' +
            '<!-- Hand Peace / Wave Sign -->' +
            '<circle cx="243" cy="50" r="7.5" fill="url(#ilFace)"/>' +
            '<line x1="241" y1="44" x2="238" y2="33" stroke="#F2B48C" stroke-width="3.8" stroke-linecap="round"/>' +
            '<line x1="246" y1="44" x2="250" y2="34" stroke="#F2B48C" stroke-width="3.8" stroke-linecap="round"/>' +
          '</g>' +
          '<!-- Left Arm to Keyboard -->' +
          '<path d="M150 112L128 130" stroke="url(#ilSweater)" stroke-width="14" stroke-linecap="round"/>' +
          '<!-- Sweater Body -->' +
          '<rect x="144" y="95" width="68" height="49" rx="22" fill="url(#ilSweater)"/>' +
          '<ellipse cx="178" cy="97" rx="17" ry="5.5" fill="#CBD5E1"/>' +
          '<!-- Character Head & Hat -->' +
          '<g class="illo-head">' +
            '<circle cx="151" cy="72" r="6.5" fill="#F2B48C"/>' +
            '<circle cx="205" cy="72" r="6.5" fill="#F2B48C"/>' +
            '<rect x="154" y="48" width="48" height="44" rx="22" fill="url(#ilFace)"/>' +
            '<!-- Hair under hat -->' +
            '<path d="M154 62C154 50 202 50 202 62" fill="#1E293B"/>' +
            '<!-- Eyes (with Blink) & Smile -->' +
            '<g class="illo-eyes">' +
              '<circle cx="169" cy="70" r="2.8" fill="#1E293B"/>' +
              '<circle cx="187" cy="70" r="2.8" fill="#1E293B"/>' +
              '<circle cx="170" cy="69" r="0.9" fill="#FFFFFF"/>' +
              '<circle cx="188" cy="69" r="0.9" fill="#FFFFFF"/>' +
            '</g>' +
            '<circle cx="163" cy="75.5" r="5" fill="#FB7185" fill-opacity="0.45"/>' +
            '<circle cx="193" cy="75.5" r="5" fill="#FB7185" fill-opacity="0.45"/>' +
            '<path d="M173.5 77.5Q178 82 182.5 77.5" stroke="#9A3412" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
            '<!-- Stylish Cap / Hat -->' +
            '<path d="M158 50C158 38 198 38 198 50Z" fill="url(#ilHat)"/>' +
            '<ellipse cx="178" cy="51" rx="34" ry="6" fill="#FB923C"/>' +
            '<ellipse cx="178" cy="52.8" rx="31" ry="3.8" fill="#9A3412" fill-opacity="0.45"/>' +
          '</g>' +
          '<!-- Action Spark Lines Above Monitor -->' +
          '<g class="illo-sparks" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round">' +
            '<line x1="94" y1="60" x2="88" y2="47"/>' +
            '<line x1="104" y1="58" x2="104" y2="44"/>' +
            '<line x1="114" y1="60" x2="119" y2="48"/>' +
          '</g>' +
          '<!-- Desktop Monitor (Left of Desk) -->' +
          '<rect x="64" y="70" width="76" height="52" rx="7" fill="url(#ilMon)" stroke="rgba(255,255,255,0.25)" stroke-width="1.3"/>' +
          '<!-- Sticky Note on Monitor Back -->' +
          '<rect x="118" y="87" width="12" height="14" rx="2" fill="#FEF08A" transform="rotate(-6 118 87)"/>' +
          '<!-- Monitor Stand -->' +
          '<path d="M95 100H110L114 133H91L95 100Z" fill="#E2E8F0"/>' +
          '<rect x="84" y="131" width="37" height="4.5" rx="2.2" fill="#CBD5E1"/>' +
          '<!-- Keyboard on Desk -->' +
          '<rect x="142" y="130" width="64" height="4.5" rx="2.2" fill="#1E293B"/>' +
          '<!-- Laptop on Stand (Right of Desk) -->' +
          '<rect x="230" y="118" width="35" height="16" rx="2.5" fill="#94A3B8"/>' +
          '<path d="M218 88H270L265 120H213L218 88Z" fill="url(#ilLap)"/>' +
          '<circle cx="242" cy="104" r="4.5" fill="#93E0A2" fill-opacity="0.9"/>' +
          '<circle cx="255" cy="96" r="2.8" fill="#FDE047" fill-opacity="0.9"/>' +
          '<!-- Desk Tabletop & Legs -->' +
          '<rect x="46" y="134" width="268" height="9" rx="4.5" fill="url(#ilDesk)"/>' +
          '<rect x="46" y="134" width="268" height="2.5" rx="1.2" fill="#4ADE80" fill-opacity="0.5"/>' +
          '<!-- Desk Hanging Tag -->' +
          '<rect x="278" y="140" width="12" height="15" rx="2" fill="#E2E8F0" transform="rotate(10 278 140)"/>' +
          '<!-- Desk Legs -->' +
          '<rect x="64" y="143" width="9" height="73" fill="url(#ilDesk)"/>' +
          '<rect x="58" y="213" width="21" height="4.5" rx="2.2" fill="#4ADE80" fill-opacity="0.55"/>' +
          '<rect x="287" y="143" width="9" height="73" fill="url(#ilDesk)"/>' +
          '<rect x="281" y="213" width="21" height="4.5" rx="2.2" fill="#4ADE80" fill-opacity="0.55"/>' +
        '</g>' +
      '</svg>' +
    '</div>';
  }

  // ---------------- Login ----------------
  SP.tampilLogin = async function (pesan) {
    document.getElementById('app').innerHTML =
      '<main class="auth-body auth-body-notop">' +
        '<div class="auth-decor" aria-hidden="true">' +
          '<div class="auth-orb auth-orb-1"></div>' +
          '<div class="auth-orb auth-orb-2"></div>' +
          '<div class="auth-orb auth-orb-3"></div>' +
          '<div class="auth-grid-pattern"></div>' +
        '</div>' +
        '<div class="login">' +
          '<div class="login-card-glow login-card-glow-tr" aria-hidden="true"></div>' +
          '<div class="login-card-glow login-card-glow-bl" aria-hidden="true"></div>' +
          '<section class="login-l">' +
            '<div class="login-l-top">' +
              '<span class="login-badge-hero">' +
                '<span class="auth-live-dot" style="background:var(--primary-l)"></span>' +
                'PROGRAM INTENSIF BAHASA ARAB &amp; INGGRIS' +
              '</span>' +
              '<h2 class="login-hero-title">Portal Penilaian &amp; Sertifikasi Digital Terpadu</h2>' +
              '<p class="login-hero-sub">Pusat tata kelola nilai komprehensif, evaluasi kelulusan multi-semester berbasis KKM institusi, dan penerbitan sertifikat elektronik resmi.</p>' +
            '</div>' +
            ilustrasiLogin() +
          '</section>' +
          '<section class="login-r">' +
            '<div class="login-r-brand">' +
              '<div class="login-r-logo-ring">' +
                '<img src="assets/logo.png" alt="SIPENA Logo">' +
              '</div>' +
              '<div class="login-r-brand-txt">' +
                '<span class="login-r-brand-name">SIPENA</span>' +
                '<span class="login-r-brand-sub" id="lg-lembaga">LEMBAGA PENGEMBANGAN BAHASA</span>' +
              '</div>' +
            '</div>' +
            '<div class="login-r-head">' +
              '<div class="login-eyebrow">' +
                '<span class="auth-live-dot" style="background:var(--primary)"></span>' +
                'AUTENTIKASI AKSES AKADEMIK' +
              '</div>' +
              '<h1 class="login-title">Masuk ke Portal</h1>' +
              '<p class="login-sub">Silakan autentikasi menggunakan akun Google resmi yang telah didaftarkan oleh Superadmin.</p>' +
            '</div>' +
            (pesan ? '<div class="callout bad" style="width:100%;max-width:430px;text-align:left"><div class="ic">' + SP.icon('alert') + '</div><div class="tx">' + SP.esc(pesan) + '</div></div>' : '') +
            '<div class="login-form-stack">' +
              '<div class="login-guide-card">' +
                '<div class="login-guide-ic">' + SP.icon('lock') + '</div>' +
                '<div class="login-guide-tx">' +
                  '<b>Akses Khusus Pendidik &amp; Administrator</b>' +
                  '<p>Hanya Tutor aktif dan Superadmin yang memiliki hak akses ke sistem. Mahasiswa tidak memiliki akun login — seluruh rekapan nilai dan sertifikat dikirim otomatis melalui surel resmi.</p>' +
                '</div>' +
              '</div>' +
              '<div class="login-auth-box">' +
                '<div class="login-auth-cta-bar">' +
                  SP.icon('lock', 'sm') +
                  '<span>Lanjutkan dengan Akun Google</span>' +
                '</div>' +
                '<div class="gbtn" id="gbtn">' +
                  '<div class="sk" style="height:44px;width:100%;max-width:380px;border-radius:10px"></div>' +
                '</div>' +
                '<div class="login-auth-box-foot">' +
                  SP.icon('shieldCheck', 'sm') +
                  '<span>Akses aman langsung via Google Identity Services</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="login-or-divider">' +
              '<span>' + SP.icon('calendar', 'sm') + ' T.A. Aktif: <b id="lg-ta" style="color:var(--text)">…</b></span>' +
            '</div>' +
            '<div class="login-quick-row">' +
              '<button type="button" class="login-quick-btn" data-act="panduanLogin">' +
                '<span class="qb-ic qb-ic-ok">' + SP.icon('help', 'sm') + '</span>' +
                '<span>Panduan Tutor</span>' +
              '</button>' +
              '<a class="login-quick-btn" href="#/verifikasi" style="text-decoration:none">' +
                '<span class="qb-ic qb-ic-ok">' + SP.icon('award', 'sm') + '</span>' +
                '<span>Verifikasi Sertifikat</span>' +
              '</a>' +
              '<button type="button" class="login-quick-btn" data-act="bantuanLogin">' +
                '<span class="qb-ic qb-ic-info">' + SP.icon('mail', 'sm') + '</span>' +
                '<span>Bantuan</span>' +
              '</button>' +
              '<button type="button" class="login-quick-btn" data-act="loginDaruratModal" title="Akses Darurat Superadmin">' +
                '<span class="qb-ic qb-ic-warn">' + SP.icon('shield', 'sm') + '</span>' +
                '<span>Akses Darurat</span>' +
              '</button>' +
              '<button type="button" data-act="installPWA" id="btn-pwa-auth" class="login-quick-btn login-quick-btn-wide ' + (SP.PWA && !SP.PWA.isStandalone() ? '' : 'hide') + '">' +
                '<span class="qb-ic qb-ic-ok">' + SP.icon('download', 'sm') + '</span>' +
                '<span>Install Aplikasi SIPENA</span>' +
              '</button>' +
            '</div>' +
          '</section>' +
        '</div>' +
      '</main>' +
      footer(SP.infoPublik);

    // Render tombol Google Sign-In segera jika Client ID sudah ada di config.js
    const g = SP.$('#gbtn');
    if (g && SP.Auth.clientId()) {
      g.innerHTML = '';
      SP.Auth.tombol(g);
    }

    const info = await muatInfo();
    if (info) {
      const l = SP.$('#lg-lembaga'); if (l) l.textContent = String(info.nama_lembaga).toUpperCase();
      const t = SP.$('#lg-ta'); if (t) t.textContent = info.tahun_ajaran_aktif;
    } else { const t = SP.$('#lg-ta'); if (t) t.textContent = '—'; }
    if (g && !SP.Auth._inited) { g.innerHTML = ''; SP.Auth.tombol(g); }
  };

  SP.actions.panduanLogin = function () {
    SP.modal({ judul: 'Panduan Login Tutor & Admin', isi: '<ol style="padding-left:20px;line-height:1.8"><li>Klik <b>Lanjutkan dengan Google</b>.</li><li>Pilih akun Google yang <b>didaftarkan Superadmin</b> (email lembaga).</li><li>Jika muncul “Akses Ditolak”, hubungi Superadmin agar email Anda didaftarkan atau diaktifkan.</li></ol>', footer: '<button class="btn btn-primary" data-act="tutupModal">Mengerti</button>' });
  };
  SP.actions.bantuanLogin = function () {
    const k = SP.infoPublik && SP.infoPublik.kontak_bantuan;
    SP.modal({
      judul: 'Bantuan Registrasi Akun',
      isi: '<p>Registrasi akun dilakukan oleh <b>Superadmin</b> lembaga.' + (k ? '<br>Kontak bantuan: <b>' + SP.esc(k) + '</b>' : '') + '</p>' +
        '<div class="callout mt16" style="padding:10px 12px"><div class="tx" style="font-size:12.5px">Apabila Anda adalah <b>Superadmin</b> dan layanan Google OAuth sedang mengalami gangguan, gunakan <button class="btn btn-ghost btn-sm" data-act="loginDaruratModal" style="padding:0 4px;height:auto;color:var(--primary);font-weight:700">Akses Darurat Superadmin</button>.</div></div>',
      footer: '<button class="btn btn-primary" data-act="tutupModal">Tutup</button>'
    });
  };
  SP.actions.loginDaruratModal = function () {
    SP.tutupModal();
    const m = SP.modal({
      judul: 'Akses Darurat Superadmin (Break-Glass)',
      lebar: 460,
      isi: '<div class="stack">' +
        '<div class="callout warn" style="padding:10px 12px"><div class="ic">' + SP.icon('shield') + '</div><div class="tx" style="font-size:12.5px">Gunakan jalur ini <b>hanya</b> apabila Google Sign-In mengalami gangguan. Sandi darurat diverifikasi terhadap hash SHA-256 di <b>Script Properties</b> (maksimal 5 percobaan per 15 menit).</div></div>' +
        '<div class="field"><label for="emg-email">Email Superadmin <span class="req">*</span></label><input id="emg-email" type="email" class="input" placeholder="admin@kampus.ac.id" autocomplete="username"></div>' +
        '<div class="field"><label for="emg-pass">Sandi Darurat <span class="req">*</span></label><input id="emg-pass" type="password" class="input" placeholder="Masukkan sandi darurat" autocomplete="current-password"></div>' +
      '</div>',
      footer: '<button class="btn btn-outline" data-act="tutupModal">Batal</button><button class="btn btn-primary" id="btn-emg-masuk">' + SP.icon('lock', 'sm') + ' Masuk Darurat</button>'
    });
    const btn = m.el.querySelector('#btn-emg-masuk');
    const go = async function () {
      const email = (SP.$('#emg-email', m.el).value || '').trim();
      const sandi = SP.$('#emg-pass', m.el).value || '';
      if (!email || !sandi) return SP.toast('Email dan sandi darurat wajib diisi.', 'warn');
      btn.disabled = true;
      try {
        const r = await SP.api('loginDarurat', { email: email, sandi: sandi }, { publik: true, retries: 0 });
        if (r && r.sessionToken) {
          SP.Auth.simpanSesi(r.sessionToken);
          m.tutup();
          SP.toast('Login darurat berhasil. Selamat datang, ' + SP.esc((r.me && r.me.nama) || email) + '.', 'ok');
          if (SP.onLogin) SP.onLogin(); else if (SP.setelahLogin) SP.setelahLogin();
        }
      } catch (e) {
        btn.disabled = false;
        SP.toast(SP.esc(e.message), 'err', 7000);
      }
    };
    btn.addEventListener('click', go);
    m.el.querySelector('#emg-pass').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go(); });
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

  // ---------------- Verifikasi sertifikat (publik & kriptografi) ----------------
  SP._vfData = null;
  SP.tampilVerifikasi = async function (rawParam) {
    let nomor = String(rawParam || '').trim();
    let sig = '';
    if (nomor.indexOf('?sig=') >= 0) {
      const parts = nomor.split('?sig=');
      nomor = parts[0].trim();
      sig = (parts[1] || '').split('&')[0].trim();
    }
    SP._vfSig = sig;
    const info = await muatInfo();
    document.getElementById('app').innerHTML = topbar() + '<main class="auth-body"><div class="card card-p" style="width:min(680px,100%)">' +
      '<div class="row between wrap gap8">' +
        '<div><div class="eyebrow">PORTAL VERIFIKASI PUSAT · KRIPTOGRAFI HMAC &amp; SHA-256</div><h1 class="h1" style="font-size:24px">Verifikasi Keaslian Sertifikat</h1></div>' +
        '<a class="btn btn-outline btn-sm" href="#/">' + SP.icon('arrowLeft', 'sm') + ' Halaman Login</a>' +
      '</div>' +
      '<p class="lead mt4" style="font-size:13.5px">Masukkan nomor sertifikat atau pindai QR Code pada sertifikat untuk memeriksa keaslian data kelulusan, tanda tangan kriptografi <b>HMAC-SHA256</b>, serta keutuhan berkas PDF.</p>' +
      '<div class="row mt16 gap8"><input class="input grow mono" id="vf-no" placeholder="mis. CERT/ARB-ENG/2026/001" value="' + SP.esc(nomor || '') + '"><button class="btn btn-primary" data-act="cekVerifikasi">' + SP.icon('search', 'sm') + ' Periksa</button></div>' +
      '<div id="vf-hasil" class="mt16"></div></div></main>' + footer(info);
    const inp = SP.$('#vf-no');
    if (inp) {
      inp.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { SP._vfSig = ''; SP.actions.cekVerifikasi(); }
      });
    }
    if (nomor) SP.actions.cekVerifikasi(null, null, sig);
  };

  SP.actions.cekVerifikasi = async function (el, ev, sigOpt) {
    const inp = SP.$('#vf-no');
    const h = SP.$('#vf-hasil');
    if (!inp || !h) return;
    let no = inp.value.trim();
    let sig = sigOpt !== undefined ? sigOpt : (SP._vfSig || '');
    if (no.indexOf('?sig=') >= 0) {
      const p = no.split('?sig=');
      no = p[0].trim();
      sig = (p[1] || '').split('&')[0].trim();
      inp.value = no;
    }
    SP._vfSig = '';
    if (!no) return;
    h.innerHTML = '<div class="sk" style="height:140px"></div>';
    try {
      const r = await SP.apiGet('verifikasi', { nomor: no, sig: sig });
      SP._vfData = r;
      if (!r.valid) {
        h.innerHTML = '<div class="callout bad"><div class="ic">' + SP.icon('shieldX', 'lg') + '</div><div><div class="ct">Sertifikat Tidak Ditemukan</div><div class="tx">Nomor sertifikat <b class="mono">' + SP.esc(no) + '</b> tidak terdaftar pada pangkalan data resmi SIPENA. Pastikan penulisan nomor sudah benar.</div></div></div>';
        return;
      }

      let cryptoBadge = '';
      if (r.sigCocok === true) {
        cryptoBadge = '<span class="badge b-ok">' + SP.icon('shieldCheck', 'sm') + ' Terverifikasi Kriptografi QR (HMAC-SHA256)</span>';
      } else if (r.sigCocok === false) {
        cryptoBadge = '<span class="badge b-warn">' + SP.icon('alert', 'sm') + ' Tanda Tangan QR Tidak Cocok (Cek Manual)</span>';
      } else {
        cryptoBadge = '<span class="badge b-info">' + SP.icon('check', 'sm') + ' Terdaftar Resmi di Server</span>';
      }

      const progRows = (r.programSkor || []).map(function (p) {
        return '<tr><td><b>' + SP.esc(p.label) + '</b></td><td class="num mono"><b>' + SP.esc(p.skor) + '</b></td><td class="center"><b>' + SP.esc(p.huruf) + '</b></td><td>' + SP.esc(p.predikat) + '</td></tr>';
      }).join('');

      h.innerHTML =
        '<div class="stack gap12">' +
          '<div class="callout ok" style="align-items:flex-start">' +
            '<div class="ic">' + SP.icon('shieldCheck', 'lg') + '</div>' +
            '<div class="grow">' +
              '<div class="row between wrap gap8">' +
                '<div class="ct" style="font-size:16px">Sertifikat SAH &amp; Terdaftar Resmi</div>' +
                cryptoBadge +
              '</div>' +
              '<div class="tx mt4">Diterbitkan secara sah oleh <b>' + SP.esc(r.lembaga) + '</b> melalui Sistem Manajemen Nilai &amp; Sertifikat (SIPENA).</div>' +
            '</div>' +
          '</div>' +

          '<div class="card card-p" style="background:var(--subtle)">' +
            '<div class="cap mb8">IDENTITAS PEMEGANG SERTIFIKAT</div>' +
            '<dl class="kv">' +
              '<dt>Nomor Sertifikat</dt><dd class="mono"><b>' + SP.esc(r.nomor) + '</b></dd>' +
              '<dt>Nama Lengkap</dt><dd><b>' + SP.esc(r.nama) + '</b></dd>' +
              '<dt>NIM (Disamarkan)</dt><dd class="mono">' + SP.esc(r.nim) + '</dd>' +
              '<dt>Program Studi / Kelas</dt><dd>' + SP.esc(r.prodi || '-') + ' · Kelas <b>' + SP.esc(r.kelas || '-') + '</b> (Angkatan ' + SP.esc(r.angkatan || '-') + ')</dd>' +
              '<dt>Tanggal Terbit</dt><dd>' + SP.esc(r.tanggal) + ' (TA ' + SP.esc(r.tahunAjaran || '-') + ')</dd>' +
              '<dt>Hasil Akhir</dt><dd><span class="badge b-ok">LULUS</span> · Rata-rata Skor: <b>' + SP.esc(r.rataSkor || '-') + '</b> · Predikat: <b>' + SP.esc(r.predikatAkhir || '-') + ' (' + SP.esc(r.hurufAkhir || '-') + ')</b></dd>' +
            '</dl>' +
          '</div>' +

          (progRows ? (
            '<div class="card">' +
              '<div class="card-h"><span class="cap">RINGKASAN TRANSKRIP SKOR 4 PROGRAM (KKM ' + SP.esc(r.kkm || '75') + ')</span></div>' +
              '<div class="tbl-wrap"><table><thead><tr><th>Program Bahasa</th><th class="num">Skor</th><th class="center">Huruf</th><th>Predikat</th></tr></thead><tbody>' + progRows + '</tbody></table></div>' +
            '</div>'
          ) : '') +

          '<div class="card card-p">' +
            '<div class="row between wrap gap8">' +
              '<div><div class="cap">INTEGRITAS DOKUMEN DIGITAL (SHA-256 CHECKSUM)</div><div class="muted" style="font-size:12.5px">Cocokkan sidik jari kriptografi di bawah ini atau pilih file PDF sertifikat untuk menguji keaslian dokumen 100% byte-demi-byte.</div></div>' +
              '<label class="btn btn-soft btn-sm" style="cursor:pointer">' + SP.icon('upload', 'sm') + ' Uji File PDF Sertifikat<input type="file" accept="application/pdf,.pdf" class="hide" data-ch="ujiHashPdfSertifikat"></label>' +
            '</div>' +
            '<div class="mt8" style="background:var(--subtle);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:11.5px">' +
              '<div class="row between"><span class="muted3">SHA-256 PDF Server:</span><span class="mono" style="color:var(--primary)">HMAC-ID: ' + SP.esc(r.sigHmac || '-') + '</span></div>' +
              '<div class="mono mt4" style="word-break:break-all;color:var(--ink)">' + SP.esc(r.hashPdf || 'Hash PDF akan tercatat otomatis saat sertifikat diunduh/dicetak ulang.') + '</div>' +
            '</div>' +
            '<div id="vf-pdf-check" class="mt8"></div>' +
          '</div>' +
        '</div>';
    } catch (e) {
      h.innerHTML = '<div class="callout bad"><div class="ic">' + SP.icon('alert') + '</div><div class="tx">' + SP.esc(e.message) + '</div></div>';
    }
  };

  SP.changes.ujiHashPdfSertifikat = async function (el) {
    const file = el.files && el.files[0];
    const box = SP.$('#vf-pdf-check');
    if (!file || !box) return;
    const r = SP._vfData;
    if (!r || !r.hashPdf) {
      box.innerHTML = '<div class="callout warn"><div class="ic">' + SP.icon('alert') + '</div><div class="tx">Sertifikat ini diterbitkan sebelum fitur pencatatan SHA-256 diaktifkan dan belum memiliki rekaman hash PDF di server.</div></div>';
      el.value = '';
      return;
    }
    box.innerHTML = '<div class="muted" style="font-size:12.5px">Menghitung sidik jari SHA-256 berkas <b>' + SP.esc(file.name) + '</b>…</div>';
    try {
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      const arr = Array.from(new Uint8Array(digest));
      const hex = arr.map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      const cocok = hex.toLowerCase() === String(r.hashPdf).toLowerCase();
      box.innerHTML = cocok
        ? '<div class="callout ok"><div class="ic">' + SP.icon('shieldCheck') + '</div><div><div class="ct">BERKAS PDF 100% ASLI &amp; OTENTIK</div><div class="tx">Sidik jari SHA-256 berkas <b>' + SP.esc(file.name) + '</b> identik byte-demi-byte dengan dokumen asli yang diterbitkan server SIPENA. Tidak ada modifikasi sedikit pun.</div><div class="mono mt4" style="font-size:11px;word-break:break-all">' + SP.esc(hex) + '</div></div></div>'
        : '<div class="callout bad"><div class="ic">' + SP.icon('shieldX') + '</div><div><div class="ct">PERINGATAN: BERKAS PDF TIDAK IDENTIK DENGAN CETAKAN ASLI SERVER</div><div class="tx">Sidik jari SHA-256 berkas <b>' + SP.esc(file.name) + '</b> berbeda dari rekaman resmi server. Berkas mungkin telah dikompres ulang, disunting, atau bukan unduhan asli dari SIPENA.</div><div class="mono mt4" style="font-size:11px;word-break:break-all">Hash Berkas Ini: ' + SP.esc(hex) + '</div></div></div>';
    } catch (e) {
      box.innerHTML = '<div class="callout bad"><div class="ic">' + SP.icon('alert') + '</div><div class="tx">Gagal membaca berkas PDF: ' + SP.esc(e.message) + '</div></div>';
    }
    el.value = '';
  };
})();
