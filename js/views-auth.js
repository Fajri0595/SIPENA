// ============================================================
// SIPENA: views-auth.js
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
      '<svg class="login-illo-svg" viewBox="0 0 460 300" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<radialGradient id="eduGlow" cx="50%" cy="52%" r="48%">' +
            '<stop offset="0%" stop-color="#93E0A2" stop-opacity="0.38"/>' +
            '<stop offset="55%" stop-color="#4ADE80" stop-opacity="0.12"/>' +
            '<stop offset="100%" stop-color="#166534" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<linearGradient id="eduPedestalTop" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#1F7A44"/>' +
            '<stop offset="100%" stop-color="#0D4724"/>' +
          '</linearGradient>' +
          '<linearGradient id="eduPedestalSide" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#0C3B1E"/>' +
            '<stop offset="100%" stop-color="#051E0E"/>' +
          '</linearGradient>' +
          '<linearGradient id="eduScreenFrame" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#1E293B"/>' +
            '<stop offset="100%" stop-color="#0F172A"/>' +
          '</linearGradient>' +
          '<linearGradient id="eduScreenBg" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#134E2B"/>' +
            '<stop offset="100%" stop-color="#092916"/>' +
          '</linearGradient>' +
          '<linearGradient id="eduGold" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#FDE047"/>' +
            '<stop offset="50%" stop-color="#F59E0B"/>' +
            '<stop offset="100%" stop-color="#B45309"/>' +
          '</linearGradient>' +
          '<linearGradient id="eduCapTop" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#1E293B"/>' +
            '<stop offset="100%" stop-color="#090D16"/>' +
          '</linearGradient>' +
          '<linearGradient id="eduCapSide" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#334155"/>' +
            '<stop offset="100%" stop-color="#0F172A"/>' +
          '</linearGradient>' +
          '<linearGradient id="eduBookGreen" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#22C55E"/>' +
            '<stop offset="100%" stop-color="#14532D"/>' +
          '</linearGradient>' +
          '<linearGradient id="eduBookAmber" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#EA580C"/>' +
            '<stop offset="100%" stop-color="#9A3412"/>' +
          '</linearGradient>' +
          '<linearGradient id="eduCertBg" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#FFFFFF"/>' +
            '<stop offset="100%" stop-color="#ECFDF5"/>' +
          '</linearGradient>' +
          '<radialGradient id="eduGlobe" cx="35%" cy="30%" r="68%">' +
            '<stop offset="0%" stop-color="#A7F3D0"/>' +
            '<stop offset="50%" stop-color="#10B981"/>' +
            '<stop offset="100%" stop-color="#064E3B"/>' +
          '</radialGradient>' +
          '<linearGradient id="eduBar1" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#86EFAC"/>' +
            '<stop offset="100%" stop-color="#16A34A"/>' +
          '</linearGradient>' +
          '<linearGradient id="eduBar2" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#FDE047"/>' +
            '<stop offset="100%" stop-color="#D97706"/>' +
          '</linearGradient>' +
        '</defs>' +

        '<!-- Ambient Halo & Perspective Orbital Rings -->' +
        '<ellipse cx="230" cy="160" rx="195" ry="110" fill="url(#eduGlow)"/>' +
        '<ellipse class="edu-orbit-1" cx="230" cy="155" rx="185" ry="56" stroke="rgba(147,224,162,0.22)" stroke-width="1.4" stroke-dasharray="6 8" transform="rotate(-6 230 155)"/>' +
        '<ellipse class="edu-orbit-2" cx="230" cy="155" rx="150" ry="42" stroke="rgba(253,224,71,0.16)" stroke-width="1.2" stroke-dasharray="4 10" transform="rotate(8 230 155)"/>' +

        '<!-- Glowing Academic Sparkles -->' +
        '<path class="edu-star edu-star-1" d="M74 62L76.5 68.5L83 71L76.5 73.5L74 80L71.5 73.5L65 71L71.5 68.5Z" fill="#FDE047" opacity="0.85"/>' +
        '<path class="edu-star edu-star-2" d="M388 54L390 59L395 61L390 63L388 68L386 63L381 61L386 59Z" fill="#A7F3D0" opacity="0.8"/>' +
        '<path class="edu-star edu-star-3" d="M108 242L109.5 246L113.5 247.5L109.5 249L108 253L106.5 249L102.5 247.5L106.5 246Z" fill="#86EFAC" opacity="0.7"/>' +

        '<!-- 3D Academic Pedestal Base -->' +
        '<ellipse cx="230" cy="266" rx="168" ry="22" fill="#03180B" fill-opacity="0.55"/>' +
        '<path d="M82 240C82 252 148 262 230 262C312 262 378 252 378 240V252C378 264 312 274 230 274C148 274 82 264 82 252V240Z" fill="url(#eduPedestalSide)"/>' +
        '<ellipse cx="230" cy="240" rx="148" ry="20" fill="url(#eduPedestalTop)" stroke="rgba(147,224,162,0.35)" stroke-width="1.2"/>' +
        '<ellipse cx="230" cy="240" rx="126" ry="15" stroke="rgba(147,224,162,0.18)" stroke-width="1" stroke-dasharray="5 5"/>' +

        '<!-- CENTER: Academic Assessment & Analytics Hub Monitor -->' +
        '<g class="edu-hub">' +
          '<!-- Monitor Stand -->' +
          '<path d="M212 204H248L256 236H204L212 204Z" fill="#CBD5E1"/>' +
          '<path d="M218 204H248L253 236H230L218 204Z" fill="#94A3B8" opacity="0.45"/>' +
          '<rect x="190" y="233" width="80" height="7" rx="3.5" fill="#E2E8F0"/>' +
          '<!-- Outer Bezel -->' +
          '<rect x="122" y="68" width="216" height="140" rx="14" fill="url(#eduScreenFrame)" stroke="rgba(255,255,255,0.28)" stroke-width="1.6"/>' +
          '<!-- Inner Academic Dashboard Screen -->' +
          '<rect x="130" y="76" width="200" height="120" rx="9" fill="url(#eduScreenBg)"/>' +
          '<!-- Top Window Bar -->' +
          '<rect x="130" y="76" width="200" height="18" rx="9" fill="rgba(255,255,255,0.07)"/>' +
          '<circle cx="141" cy="85" r="2.6" fill="#F87171"/>' +
          '<circle cx="150" cy="85" r="2.6" fill="#FBBF24"/>' +
          '<circle cx="159" cy="85" r="2.6" fill="#4ADE80"/>' +
          '<rect x="172" y="82.5" width="68" height="5" rx="2.5" fill="rgba(255,255,255,0.22)"/>' +

          '<!-- Left Widget: 4-Program Language Mastery Bar Chart -->' +
          '<rect x="140" y="102" width="104" height="84" rx="7" fill="rgba(255,255,255,0.05)" stroke="rgba(147,224,162,0.16)" stroke-width="1"/>' +
          '<rect x="148" y="110" width="48" height="4.5" rx="2.2" fill="rgba(255,255,255,0.35)"/>' +
          '<line x1="148" y1="174" x2="236" y2="174" stroke="rgba(255,255,255,0.18)" stroke-width="1.2"/>' +
          '<!-- Animated Academic Bars -->' +
          '<rect class="edu-bar edu-bar-1" x="154" y="138" width="13" height="36" rx="3" fill="url(#eduBar1)"/>' +
          '<rect class="edu-bar edu-bar-2" x="174" y="126" width="13" height="48" rx="3" fill="url(#eduBar1)"/>' +
          '<rect class="edu-bar edu-bar-3" x="194" y="132" width="13" height="42" rx="3" fill="url(#eduBar2)"/>' +
          '<rect class="edu-bar edu-bar-4" x="214" y="118" width="13" height="56" rx="3" fill="url(#eduBar1)"/>' +
          '<!-- Rising Trend Line over Bars -->' +
          '<path d="M160 135L180 123L200 128L220 113" stroke="#FDE047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle cx="220" cy="113" r="3.2" fill="#FDE047"/>' +

          '<!-- Right Widget: KKM & Academic Mastery Ring -->' +
          '<rect x="252" y="102" width="68" height="84" rx="7" fill="rgba(255,255,255,0.05)" stroke="rgba(147,224,162,0.16)" stroke-width="1"/>' +
          '<circle cx="286" cy="134" r="20" stroke="rgba(255,255,255,0.12)" stroke-width="5"/>' +
          '<circle class="edu-ring-prog" cx="286" cy="134" r="20" stroke="#4ADE80" stroke-width="5" stroke-linecap="round" stroke-dasharray="100 126" transform="rotate(-90 286 134)"/>' +
          '<path d="M280 134L284.5 138.5L293 129.5" stroke="#FDE047" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<rect x="264" y="164" width="44" height="4.5" rx="2.2" fill="rgba(255,255,255,0.35)"/>' +
          '<rect x="271" y="172" width="30" height="4" rx="2" fill="rgba(147,224,162,0.45)"/>' +
        '</g>' +

        '<!-- UPPER RIGHT: Floating 3D Academic Globe (International Language) -->' +
        '<g class="edu-globe-float">' +
          '<ellipse cx="378" cy="100" rx="34" ry="11" stroke="#FDE047" stroke-width="1.5" stroke-opacity="0.65" transform="rotate(-22 378 100)"/>' +
          '<circle cx="378" cy="100" r="22" fill="url(#eduGlobe)"/>' +
          '<ellipse cx="378" cy="100" rx="11" ry="22" stroke="rgba(255,255,255,0.35)" stroke-width="1.1"/>' +
          '<line x1="356" y1="100" x2="400" y2="100" stroke="rgba(255,255,255,0.35)" stroke-width="1.1"/>' +
          '<path d="M360 90C366 93 390 93 396 90" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>' +
          '<path d="M360 110C366 107 390 107 396 110" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>' +
          '<path d="M348 112C358 117 392 103 408 88" stroke="#FDE047" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.85"/>' +
        '</g>' +

        '<!-- LEFT FOREGROUND: Stacked University Books & Floating Graduation Cap -->' +
        '<g class="edu-books-group">' +
          '<!-- Bottom Book (Deep Emerald Volume) -->' +
          '<path d="M62 222L116 206L164 220L110 236Z" fill="url(#eduBookGreen)"/>' +
          '<path d="M62 222L110 236V250L62 236Z" fill="#0D4724"/>' +
          '<path d="M110 236L164 220V234L110 250Z" fill="#F1F5F9"/>' +
          '<line x1="112" y1="240" x2="162" y2="225" stroke="#CBD5E1" stroke-width="1.2"/>' +
          '<line x1="112" y1="244" x2="162" y2="229" stroke="#CBD5E1" stroke-width="1.2"/>' +
          '<path d="M60 235L110 250L165 233" stroke="#14532D" stroke-width="2.2" stroke-linecap="round"/>' +
          '<!-- Gold Spine Stripes -->' +
          '<line x1="74" y1="226" x2="74" y2="240" stroke="#FDE047" stroke-width="2"/>' +
          '<line x1="96" y1="232" x2="96" y2="246" stroke="#FDE047" stroke-width="2"/>' +

          '<!-- Top Book (Academic Terracotta/Gold Volume) -->' +
          '<path d="M68 202L118 188L160 200L110 214Z" fill="url(#eduBookAmber)"/>' +
          '<path d="M68 202L110 214V227L68 215Z" fill="#7C2D12"/>' +
          '<path d="M110 214L160 200V213L110 227Z" fill="#FFFBEB"/>' +
          '<line x1="112" y1="218" x2="158" y2="205" stroke="#FDE68A" stroke-width="1.2"/>' +
          '<line x1="112" y1="222" x2="158" y2="209" stroke="#FDE68A" stroke-width="1.2"/>' +
          '<!-- Gold Bookmark Ribbon -->' +
          '<path d="M128 220V235L133 231L138 235V217Z" fill="url(#eduGold)"/>' +
        '</g>' +

        '<!-- Floating 3D Graduation Mortarboard Cap (Topi Wisuda) -->' +
        '<g class="edu-cap-float">' +
          '<!-- Cap Shadow on Books -->' +
          '<ellipse cx="114" cy="194" rx="28" ry="7" fill="#041E0E" fill-opacity="0.35"/>' +
          '<!-- Skullcap Base -->' +
          '<path d="M88 152V172C88 180 100 186 114 186C128 186 140 180 140 172V152Z" fill="url(#eduCapSide)"/>' +
          '<path d="M88 168C100 175 128 175 140 168" stroke="url(#eduGold)" stroke-width="2"/>' +
          '<!-- Mortarboard Diamond Top -->' +
          '<path d="M56 146L114 124L172 146L114 168Z" fill="url(#eduCapTop)" stroke="#475569" stroke-width="1.2"/>' +
          '<path d="M56 146L114 168L172 146L172 150L114 172L56 150Z" fill="#0F172A"/>' +
          '<!-- Gold Center Button & Swaying Tassel -->' +
          '<ellipse cx="114" cy="145" rx="5.5" ry="3" fill="url(#eduGold)"/>' +
          '<g class="edu-tassel">' +
            '<path d="M114 145Q92 154 80 166" stroke="url(#eduGold)" stroke-width="2.4" stroke-linecap="round"/>' +
            '<path d="M80 165L75 178H84L80 165Z" fill="url(#eduGold)"/>' +
          '</g>' +
        '</g>' +

        '<!-- RIGHT FOREGROUND: Floating Official Academic E-Certificate & Seal -->' +
        '<g class="edu-cert-float">' +
          '<!-- Card Drop Shadow -->' +
          '<ellipse cx="348" cy="236" rx="44" ry="8" fill="#041E0E" fill-opacity="0.4"/>' +
          '<!-- Tilted Certificate Card -->' +
          '<g transform="translate(296, 152) rotate(-5)">' +
            '<rect x="0" y="0" width="98" height="72" rx="9" fill="url(#eduCertBg)" stroke="#86EFAC" stroke-width="1.6"/>' +
            '<rect x="6" y="6" width="86" height="60" rx="5" stroke="#BBF7D0" stroke-width="1" stroke-dasharray="3 2"/>' +
            '<!-- Certificate Header Ribbon -->' +
            '<rect x="14" y="13" width="46" height="6" rx="3" fill="#166534"/>' +
            '<rect x="14" y="23" width="66" height="4" rx="2" fill="#94A3B8"/>' +
            '<rect x="14" y="31" width="54" height="4" rx="2" fill="#CBD5E1"/>' +
            '<rect x="14" y="39" width="38" height="4" rx="2" fill="#CBD5E1"/>' +
            '<!-- Mini QR Verification Matrix -->' +
            '<rect x="14" y="47" width="14" height="14" rx="2" fill="#0F172A"/>' +
            '<rect x="16" y="49" width="4" height="4" fill="#FFFFFF"/>' +
            '<rect x="22" y="49" width="4" height="4" fill="#FFFFFF"/>' +
            '<rect x="16" y="55" width="4" height="4" fill="#FFFFFF"/>' +
            '<rect x="22" y="55" width="2" height="2" fill="#4ADE80"/>' +
            '<!-- Gold Academic Rosette Seal -->' +
            '<path d="M70 54L66 68L72 64L76 69L75 54Z" fill="#D97706"/>' +
            '<path d="M76 54L78 69L82 64L88 68L82 54Z" fill="#B45309"/>' +
            '<circle cx="76" cy="49" r="10.5" fill="url(#eduGold)" stroke="#FEF08A" stroke-width="1.5"/>' +
            '<path d="M72.5 49L75 51.5L80 46.5" stroke="#78350F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</g>' +
        '</g>' +

        '<!-- CENTER FOREGROUND: Rolled Academic Diploma Scroll -->' +
        '<g transform="translate(182, 224) rotate(-8)">' +
          '<rect x="0" y="0" width="76" height="15" rx="7.5" fill="#FEFCE8" stroke="#FDE68A" stroke-width="1.2"/>' +
          '<ellipse cx="74" cy="7.5" rx="3.5" ry="7.5" fill="#FDE047"/>' +
          '<rect x="31" y="-1" width="12" height="17" rx="2" fill="#DC2626"/>' +
          '<path d="M34 16L31 24L37 21L43 24L40 16Z" fill="#B91C1C"/>' +
          '<circle cx="37" cy="7.5" r="4" fill="url(#eduGold)"/>' +
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
    } else { const t = SP.$('#lg-ta'); if (t) t.textContent = '-'; }
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
      '<div class="row mt8" style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:10px 12px"><span class="muted3">' + SP.icon('mail') + '</span><span class="mono grow trunc">' + SP.esc(email || '-') + '</span><button class="btn btn-ghost btn-sm" data-act="salinEmail" data-v="' + SP.esc(email || '') + '" aria-label="Salin">' + SP.icon('copy') + '</button></div></div>' +
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
