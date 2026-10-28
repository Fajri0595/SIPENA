// ============================================================
// SIPENA — app.js
// Shell aplikasi (sidebar + topbar), router berbasis hash,
// pencarian global, notifikasi, dan proses boot.
// Perpindahan halaman 100% lokal (tanpa panggilan server) = instan.
// ============================================================
(function () {
  const SP = window.SP;
  const esc = SP.esc;

  const MENU = [
    ['dasbor', 'dashboard', 'Dasbor'], ['kelas', 'book', 'Kelas Saya'], ['nilai', 'edit', 'Input Nilai'], ['impor', 'upload', 'Impor Mahasiswa'],
    ['kelulusan', 'checkCircle', 'Status Kelulusan'], ['sertifikat', 'printer', 'Cetak Sertifikat'], ['mengulang', 'rotate', 'Wajib Mengulang'],
    ['pengganti', 'user', 'Tutor Pengganti'], ['laporan', 'chart', 'Laporan']
  ];
  const MENU_ADMIN = [['pengguna', 'users', 'Kelola Pengguna & Kelas'], ['pindah', 'swap', 'Pindah Kelas'], ['pengaturan', 'sliders', 'Pengaturan & Log']];
  const ADMIN_ONLY = { pengguna: 1, pindah: 1, pengaturan: 1 };

  SP.rute = null;
  function parseHash() {
    const p = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    // nomor sertifikat dipecah oleh '/', gabungkan kembali untuk rute verifikasi
    if (p[0] === 'verifikasi') return { nama: 'verifikasi', params: [p.slice(1).join('/')] };
    return { nama: p[0] || '', params: p.slice(1).map(function (x) { return x; }) };
  }

  // ---------------- Shell ----------------
  function sidebarNav() {
    const item = function (r) {
      const id = r[0], aktif = SP.rute && SP.rute.nama === id;
      let extra = '';
      if (id === 'mengulang') { const n = SP.jumlahMahasiswaMengulang(); if (n) extra = '<span class="sb-count">' + n + '</span>'; }
      if (id === 'sertifikat' && SP.bolehCetakUI() && SP.barisKelulusan().some(function (b) { return b.akhir === 'LULUS' && !(SP.X.sert[b.m.nim] && SP.X.sert[b.m.nim].file_id); })) extra = '<span class="sb-dot" title="Ada sertifikat siap cetak"></span>';
      return '<a class="sb-item ' + (aktif ? 'active' : '') + '" href="#/' + id + '" title="' + esc(r[2]) + '">' + SP.icon(r[1]) + '<span class="tx">' + esc(r[2]) + '</span>' + extra + '</a>';
    };
    return '<div class="sb-label">Modul Utama</div>' + MENU.map(item).join('') + (SP.isAdmin() ? '<div class="sb-label">Superadmin</div>' + MENU_ADMIN.map(item).join('') : '');
  }
  function rolLabel() {
    const m = SP.S.me;
    if (m.peran === 'SUPERADMIN') return 'Superadmin';
    return 'Tutor' + (m.bahasa ? ' ' + (m.bahasa === 'ARAB' ? 'Arab' : 'Inggris') : '');
  }
  function renderShell() {
    const m = SP.S.me;
    document.getElementById('app').innerHTML =
      '<aside class="sb" aria-label="Navigasi utama"><div class="sb-brand"><div class="sb-logo">' + SP.icon('book', 'lg') + '</div><div><div class="sb-title">SIPENA</div><div class="sb-sub">Nilai Bahasa Arab &amp; Inggris</div></div></div>' +
      '<nav class="sb-nav" id="sb-nav"></nav><div class="sb-user"><span class="avatar sm" style="background:#fff;color:var(--primary-d)">' + esc(SP.inisial(m.nama)) + '</span><div class="ut grow"><div class="nm trunc" style="max-width:130px">' + esc(m.nama) + '</div><span class="rl">' + esc(rolLabel()) + '</span></div>' +
      '<button class="sb-out" data-act="keluar" title="Keluar" aria-label="Keluar">' + SP.icon('logout') + '</button></div></aside><div class="sb-ovl" data-act="tutupSb"></div>' +
      '<div class="main"><header class="tb"><button class="tb-menu" data-act="bukaSb" aria-label="Menu">' + SP.icon('menu', 'lg') + '</button>' +
      '<div class="tb-crumb">SIPENA ' + SP.icon('chevronRight', 'sm') + ' <b>Portal Akademik</b></div><span class="pill-ta" id="pill-ta"></span>' +
      '<div class="tb-search">' + SP.icon('search') + '<input class="input" id="gsearch" placeholder="Cari NIM, Nama, Kelas…" autocomplete="off" aria-label="Pencarian global"><div id="gsr"></div></div>' +
      '<div style="position:relative"><button class="tb-btn" data-act="toggleNotif" aria-label="Notifikasi">' + SP.icon('bell', 'lg') + '<span class="tb-badge hide" id="bell-n">0</span></button><div id="dd-notif"></div></div>' +
      '<div style="position:relative"><button class="tb-user" data-act="toggleUser"><span class="avatar">' + esc(SP.inisial(m.nama)) + '</span><span class="tx2"><div class="nm trunc" style="max-width:150px">' + esc(m.nama) + '</div><div class="rl">' + esc(rolLabel()) + '</div></span>' + SP.icon('chevronDown', 'sm') + '</button><div id="dd-user"></div></div></header>' +
      '<main class="page" id="view" tabindex="-1"></main></div>';
    SP.updateChrome();
  }
  SP.updateChrome = function () {
    const nav = SP.$('#sb-nav'); if (!nav) return;
    nav.innerHTML = sidebarNav();
    const s = SP.set(), pill = SP.$('#pill-ta');
    if (pill) pill.innerHTML = '<i></i>' + esc(s.tahun_ajaran_aktif + ' · Semester ' + SP.semLabel(s.semester_aktif)) + (s.mode_penilaian === 'TERKUNCI' ? ' · <span style="color:var(--danger)">Terkunci</span>' : '');
    const n = SP.notifBelum().length, b = SP.$('#bell-n');
    if (b) { b.textContent = n > 99 ? '99+' : n; b.classList.toggle('hide', !n); }
  };

  // ---------------- Router ----------------
  function renderView() {
    const v = SP.views[SP.rute.nama], el = SP.$('#view'); if (!v || !el) return;
    el.innerHTML = v.render(SP.rute.params);
    document.title = v.judul + ' — SIPENA';
    if (v.after) v.after(SP.rute.params);
    SP.setSinkron(SP.sinkron.status);
  }
  function route() {
    if (!SP.siap) return;
    const h = parseHash();
    let nama = h.nama || 'dasbor';
    if (!SP.views[nama] || nama === 'verifikasi' || (ADMIN_ONLY[nama] && !SP.isAdmin())) nama = 'dasbor';
    SP.rute = { nama: nama, params: h.params };
    renderView(); SP.updateChrome();
    window.scrollTo(0, 0); document.body.classList.remove('sb-open');
    SP.tutupMenu();
  }
  SP.renderUlang = function () {
    if (!SP.siap || !SP.rute || !SP.$('#view')) return;
    const y = window.scrollY; renderView(); SP.updateChrome(); window.scrollTo(0, y);
  };
  // Dipanggil setelah muat data di latar belakang: jangan ganggu pengguna yang sedang mengetik / modal terbuka
  SP.setelahMuat = function () {
    SP.updateChrome();
    const a = document.activeElement;
    const mengetik = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#view');
    if (SP.$('.modal-bg') || mengetik) { SP.perluRender = true; return; }
    SP.renderUlang();
  };
  window.addEventListener('hashchange', route);

  // ---------------- Menu & dropdown ----------------
  SP.tutupMenu = function () { const a = SP.$('#dd-notif'), b = SP.$('#dd-user'), c = SP.$('#gsr'); if (a) a.innerHTML = ''; if (b) b.innerHTML = ''; if (c) c.innerHTML = ''; };
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#dd-notif, #dd-user, [data-act="toggleNotif"], [data-act="toggleUser"], .tb-search')) SP.tutupMenu();
  });
  SP.actions.bukaSb = function () { document.body.classList.add('sb-open'); };
  SP.actions.tutupSb = function () { document.body.classList.remove('sb-open'); };
  SP.actions.keluar = async function () {
    if (SP.Outbox.daftar().length && !(await SP.konfirmasi({ judul: 'Ada perubahan belum tersinkron', pesan: 'Keluar sekarang akan membuang perubahan yang belum terkirim ke server. Tetap keluar?', ya: 'Tetap Keluar', bahaya: true }))) return;
    SP.Auth.keluar();
  };
  SP.actions.toggleUser = function () {
    const el = SP.$('#dd-user'), buka = !el.innerHTML; SP.tutupMenu();
    if (buka) el.innerHTML = '<div class="dd"><div class="dd-h"><div><div>' + esc(SP.S.me.nama) + '</div><div class="muted" style="font-size:12px;font-weight:400">' + esc(SP.S.me.email) + '</div></div></div><div class="dd-i" style="cursor:default"><span class="cap">Peran</span> <b>' + esc(rolLabel()) + '</b></div>' +
      '<button class="dd-i" data-act="muatPaksa">' + SP.icon('refresh') + ' Muat ulang data</button><button class="dd-i" data-act="keluar" style="color:var(--danger)">' + SP.icon('logout') + ' Keluar</button></div>';
  };
  SP.actions.muatPaksa = async function () {
    SP.tutupMenu(); const t = SP.toast('Memuat ulang data…', 'info', 30000);
    try { const ok = await SP.muat(); t.remove(); SP.toast(ok ? 'Data diperbarui.' : 'Masih ada perubahan yang belum tersinkron.', ok ? 'ok' : 'warn'); } catch (e) { t.remove(); SP.toast(esc(e.message), 'err'); }
  };
  SP.actions.toggleNotif = function () {
    const el = SP.$('#dd-notif'), buka = !el.innerHTML; SP.tutupMenu();
    if (!buka) return;
    const list = SP.S.notif.slice().sort(function (a, b) { return a.waktu < b.waktu ? 1 : -1; }).slice(0, 6);
    el.innerHTML = '<div class="dd" style="min-width:340px;max-width:92vw"><div class="dd-h"><span>Notifikasi</span><button class="btn btn-ghost btn-sm" data-act="notifSemua">Tandai semua dibaca</button></div>' +
      (list.length ? list.map(function (n) { return '<a class="dd-i ' + (n.dibaca ? '' : 'unread') + '" href="#/mengulang" data-act="bukaNotif">' + SP.icon('alert') + '<span><span style="font-size:13px">' + esc(n.pesan) + '</span><br><small class="muted">' + SP.waktu(n.waktu) + '</small></span></a>'; }).join('') : '<div class="empty" style="padding:24px">Belum ada notifikasi</div>') +
      '<a class="dd-i" href="#/mengulang" data-act="bukaNotif" style="justify-content:center;color:var(--primary);font-weight:600;border-top:1px solid var(--border)">Lihat semua</a></div>';
  };
  SP.actions.bukaNotif = function () { SP.ui.meng.tab = 'notif'; SP.tutupMenu(); location.hash = '#/mengulang'; SP.renderUlang(); };

  // ---------------- Pencarian global ----------------
  function bindSearch() {
    const inp = SP.$('#gsearch'); if (!inp) return;
    inp.addEventListener('input', SP.debounce(function () {
      const q = inp.value.toLowerCase().trim(), box = SP.$('#gsr');
      if (q.length < 2) { box.innerHTML = ''; return; }
      const mh = SP.S.mahasiswa.filter(function (m) { return (m.nim + ' ' + m.nama).toLowerCase().indexOf(q) >= 0; }).slice(0, 6);
      const kl = SP.S.kelas.filter(function (k) { return k.nama.toLowerCase().indexOf(q) >= 0; }).slice(0, 4);
      box.innerHTML = '<div class="sr-box">' + (mh.length ? '<div class="sr-h">Mahasiswa</div>' + mh.map(function (m) { return '<button class="sr-item" data-act="cariMhs" data-nim="' + esc(m.nim) + '"><span class="avatar sm">' + esc(SP.inisial(m.nama)) + '</span><span><b>' + esc(m.nama) + '</b><br><small class="mono muted">' + esc(m.nim) + '</small></span></button>'; }).join('') : '') +
        (kl.length ? '<div class="sr-h">Kelas</div>' + kl.map(function (k) { return '<button class="sr-item" data-act="cariKelas" data-id="' + esc(k.id) + '"><span class="avatar sm lt">' + SP.icon('book', 'sm') + '</span><span><b>' + esc(k.nama) + '</b><br><small class="muted">' + esc(k.prodi || '') + '</small></span></button>'; }).join('') : '') +
        (!mh.length && !kl.length ? '<div class="muted" style="padding:12px">Tidak ditemukan.</div>' : '') + '</div>';
    }, 120));
  }
  SP.actions.cariMhs = function (el) { SP.tutupMenu(); SP.$('#gsearch').value = ''; SP.bukaDetailMhs(el.dataset.nim); };
  SP.actions.cariKelas = function (el) { SP.tutupMenu(); SP.$('#gsearch').value = ''; SP.ui.kel.kelas = el.dataset.id; location.hash = '#/kelulusan'; if (SP.rute && SP.rute.nama === 'kelulusan') SP.renderUlang(); };

  // ---------------- Boot ----------------
  function layarGalat(judul, pesan, aksi) {
    document.getElementById('app').innerHTML = '<div class="fullload"><div class="card card-p" style="max-width:480px;margin:24px">' + SP.kosong('cloudOff', judul, esc(pesan), aksi) + '</div></div>';
  }
  function tanganiGalat(e, adaCache) {
    if (e.code === 'FORBIDDEN') { SP.Cache.hapus(); SP.siap = false; SP.tampilDitolak((e.extra && e.extra.email) || (SP.Auth.info() || {}).email); return; }
    if (e.code === 'CONFIG') { SP.tampilGalatKonfig(e.message); return; }
    if (adaCache) { SP.toast('Menampilkan data tersimpan. Tidak dapat memuat data terbaru: ' + esc(e.message), 'warn', 8000); return; }
    layarGalat('Tidak dapat memuat data', e.message, '<button class="btn btn-primary" onclick="location.reload()">Coba Lagi</button>');
  }
  async function mulaiSetelahLogin() {
    const info = SP.Auth.info(), email = ((info && info.email) || '').toLowerCase();
    const cache = SP.Cache.muat(email);
    if (cache) {
      SP.terapkanData(cache.data); SP.siap = true; renderShell(); bindSearch(); route();
      SP.muat().then(function () { if (SP.Outbox.daftar().length) SP.Outbox.flush(); }).catch(function (e) { tanganiGalat(e, true); });
    } else {
      document.getElementById('app').innerHTML = '<div class="fullload"><div><div class="spin"></div><div>Memuat data Anda…</div><div class="muted3" style="font-size:12px;margin-top:6px">Pertama kali bisa memerlukan beberapa detik.</div></div></div>';
      try {
        const d = await SP.api('bootstrap', {});
        SP.terapkanData(d); SP.siap = true; SP.Cache.simpan(); renderShell(); bindSearch(); route();
        if (SP.Outbox.daftar().length) SP.Outbox.flush();
      } catch (e) { tanganiGalat(e, false); }
    }
  }
  SP.setelahLogin = mulaiSetelahLogin;

  async function boot() {
    const h = parseHash();
    if (h.nama === 'verifikasi') return SP.tampilVerifikasi(h.params[0] || '');
    const C = SP.CFG;
    if (!C.GAS_URL || C.GAS_URL.indexOf('ISI_') >= 0 || !C.GOOGLE_CLIENT_ID || C.GOOGLE_CLIENT_ID.indexOf('ISI_') >= 0) {
      return SP.tampilGalatKonfig('GAS_URL dan/atau GOOGLE_CLIENT_ID di config.js belum diisi.');
    }
    if (SP.Auth.token()) { SP.Auth.jadwalkan(); return mulaiSetelahLogin(); }
    SP.tampilLogin();
    SP.onLogin = function () { SP.onLogin = null; mulaiSetelahLogin(); };
    SP.Auth.diam();
  }

  // Muat ulang berkala & saat tab kembali aktif
  setInterval(function () {
    if (SP.siap && !document.hidden && SP.terakhirMuat && Date.now() - SP.terakhirMuat > (SP.CFG.REFRESH_MENIT || 5) * 60000 && !SP.$('.modal-bg')) SP.muat().catch(function () { /* diam */ });
  }, 60000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && SP.siap && SP.terakhirMuat && Date.now() - SP.terakhirMuat > 2 * 60000) SP.muat().catch(function () { /* diam */ });
  });

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
