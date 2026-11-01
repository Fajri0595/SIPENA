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
      '<aside class="sb" aria-label="Navigasi utama"><div class="sb-brand"><div class="sb-logo-wrap"><img src="logo.png" alt="SIPENA Logo" class="sb-brand-logo"></div><div><div class="sb-title">SIPENA</div><div class="sb-sub">Nilai Bahasa Arab &amp; Inggris</div></div></div>' +
      '<nav class="sb-nav" id="sb-nav"></nav><div class="sb-user" data-act="bukaModalAkun" role="button" tabindex="0" title="Klik untuk Pengaturan Akun &amp; Profil">' + SP.avatarHtml(m.nama, m.email, 'sm') + '<div class="ut grow"><div class="nm trunc" style="max-width:125px">' + esc(m.nama) + '</div><span class="rl">' + esc(rolLabel()) + '</span></div>' +
      '<div class="sb-user-gear" title="Pengaturan Profil">' + SP.icon('settings', 'sm') + '</div></div></aside><div class="sb-ovl" data-act="tutupSb"></div>' +
      '<div class="main"><header class="tb"><button class="tb-menu" data-act="bukaSb" aria-label="Menu">' + SP.icon('menu', 'lg') + '</button>' +
      '<div class="tb-crumb">SIPENA ' + SP.icon('chevronRight', 'sm') + ' <b>Portal Akademik</b></div><span class="pill-ta" id="pill-ta"></span>' +
      '<div class="tb-search">' + SP.icon('search') + '<input class="input" id="gsearch" placeholder="Cari NIM, Nama, Kelas…" autocomplete="off" aria-label="Pencarian global"><div id="gsr"></div></div>' +
      '<div style="position:relative"><button class="tb-btn" data-act="toggleNotif" aria-label="Notifikasi">' + SP.icon('bell', 'lg') + '<span class="tb-badge hide" id="bell-n">0</span></button><div id="dd-notif"></div></div>' +
      '<div style="position:relative"><button class="tb-user" data-act="toggleUser">' + SP.avatarHtml(m.nama, m.email) + '<span class="tx2"><div class="nm trunc" style="max-width:150px">' + esc(m.nama) + '</div><div class="rl">' + esc(rolLabel()) + '</div></span>' + SP.icon('chevronDown', 'sm') + '</button><div id="dd-user"></div></div></header>' +
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
    el.classList.remove('view-enter');
    void el.offsetWidth;
    el.classList.add('view-enter');
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
    if (!buka) return;
    const m = SP.S.me;
    el.innerHTML = '<div class="dd">' +
      '<div class="dd-h">' +
        SP.avatarHtml(m.nama, m.email, 'sm') +
        '<div style="min-width:0;flex:1">' +
          '<div class="trunc" style="font-weight:700;font-size:13.5px">' + esc(m.nama) + '</div>' +
          '<div class="muted trunc" style="font-size:11.5px;font-weight:400">' + esc(m.email) + '</div>' +
        '</div>' +
        '<span class="badge b-solid" style="background:var(--primary);color:#fff;font-size:10px">' + esc(rolLabel()) + '</span>' +
      '</div>' +
      '<button class="dd-i" data-act="bukaModalAkun">' + SP.icon('settings') + ' Pengaturan Profil &amp; Akun</button>' +
      '<button class="dd-i" data-act="muatPaksa">' + SP.icon('refresh') + ' Muat Ulang Data Sinkronisasi</button>' +
      '<button class="dd-i danger" data-act="keluar">' + SP.icon('logout') + ' Keluar dari Aplikasi</button>' +
    '</div>';
  };

  // ---------------- Pengaturan Akun & Profil ----------------
  SP.bukaModalAkun = function () {
    SP.tutupMenu();
    const m = SP.S.me;
    const gInfo = SP.Auth && SP.Auth.info ? SP.Auth.info() : null;
    const punyaFotoGoogle = !!(gInfo && gInfo.picture);
    window._akunFotoPending = undefined;

    function updatePreviewAvatar(url) {
      const box = SP.$('#akun-avatar-preview');
      if (!box) return;
      if (url) {
        box.innerHTML = '<span class="avatar lg has-img"><img src="' + SP.esc(url) + '" alt="' + esc(m.nama) + '" onerror="this.remove()"></span><div class="akun-avatar-btn" title="Ganti foto">' + SP.icon('camera', 'sm') + '</div>';
      } else if (url === '') {
        box.innerHTML = '<span class="avatar lg">' + esc(SP.inisial(m.nama)) + '</span><div class="akun-avatar-btn" title="Ganti foto">' + SP.icon('camera', 'sm') + '</div>';
      } else {
        box.innerHTML = SP.avatarHtml(m.nama, m.email, 'lg') + '<div class="akun-avatar-btn" title="Ganti foto">' + SP.icon('camera', 'sm') + '</div>';
      }
    }
    SP._updatePreviewAvatarAkun = updatePreviewAvatar;

    SP.modal({
      judul: 'Pengaturan Akun &amp; Profil',
      lebar: 540,
      isi:
        '<div class="akun-hero">' +
          '<div class="akun-avatar-wrap" id="akun-avatar-preview" data-act="pilihFotoAkun" title="Klik untuk mengubah foto profil">' +
            SP.avatarHtml(m.nama, m.email, 'lg') +
            '<div class="akun-avatar-btn" title="Ganti foto">' + SP.icon('camera', 'sm') + '</div>' +
          '</div>' +
          '<div style="min-width:0;flex:1">' +
            '<div style="font-size:17px;font-weight:800;color:var(--text);letter-spacing:-.01em" class="trunc">' + esc(m.nama) + '</div>' +
            '<div style="font-size:12.5px;color:var(--text2);margin-top:2px" class="trunc">' + esc(m.email) + '</div>' +
            '<div class="row gap8" style="margin-top:8px;flex-wrap:wrap">' +
              '<span class="badge b-solid" style="background:var(--primary);color:#fff;font-size:11px">' + esc(rolLabel()) + '</span>' +
              (m.bahasa ? '<span class="badge b-soft" style="background:#E0E7FF;color:#3730A3;font-size:11px">Bahasa ' + esc(m.bahasa === 'ARAB' ? 'Arab' : 'Inggris') + '</span>' : '') +
              '<span class="badge b-soft" style="background:#DCFCE7;color:#166534;font-size:11px">Status Aktif</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div style="margin-bottom:18px">' +
          '<div class="akun-section-title">' + SP.icon('camera', 'sm') + ' Foto Profil Pengguna</div>' +
          '<div class="akun-photo-actions">' +
            '<input type="file" id="akun-foto-file" accept="image/jpeg,image/png,image/webp" style="display:none" data-ch="unggahFotoAkun">' +
            '<button type="button" class="btn btn-sm btn-outline" data-act="pilihFotoAkun">' + SP.icon('uploadCloud', 'sm') + ' Unggah Foto Baru</button>' +
            (punyaFotoGoogle ? '<button type="button" class="btn btn-sm btn-outline" data-act="pakaiFotoGoogle">' + SP.icon('shieldCheck', 'sm') + ' Gunakan Foto Google</button>' : '') +
            '<button type="button" class="btn btn-sm btn-outline" style="color:var(--danger);border-color:rgba(220,38,38,0.3)" data-act="hapusFotoAkun">' + SP.icon('trash', 'sm') + ' Hapus Foto</button>' +
          '</div>' +
          '<div class="help" style="margin-top:6px;font-size:11.5px">Format didukung: JPG, PNG, atau WebP. Gambar otomatis dioptimalkan agar ringan dan cepat.</div>' +
        '</div>' +

        '<div style="margin-bottom:16px">' +
          '<div class="akun-section-title">' + SP.icon('user', 'sm') + ' Informasi Data Diri</div>' +
          '<div class="field" style="margin-bottom:12px">' +
            '<label for="akun-nama">Nama Lengkap &amp; Gelar <span style="color:var(--danger)">*</span></label>' +
            '<input class="input" id="akun-nama" value="' + esc(m.nama) + '" placeholder="Masukkan nama lengkap dengan gelar">' +
          '</div>' +
          '<div class="field" style="margin-bottom:12px">' +
            '<label for="akun-nip">NIP / NIDN (Opsional)</label>' +
            '<input class="input" id="akun-nip" value="' + esc(m.nip || '') + '" placeholder="Contoh: 198501012010011001">' +
          '</div>' +
          '<div class="field">' +
            '<label>Email Google Terautentikasi</label>' +
            '<div class="akun-field-ro">' +
              '<span class="mono" style="font-size:13px">' + esc(m.email) + '</span>' +
              '<span class="badge b-soft" style="background:#E0F2FE;color:#0369A1;font-size:10.5px">' + SP.icon('shieldCheck', 'sm') + ' Akun Terverifikasi</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="akun-logout-card">' +
          '<div class="tx">' +
            '<b>Sesi Masuk Pengguna</b>' +
            '<span>Keluar dari aplikasi dengan aman dan bersihkan sesi aktif.</span>' +
          '</div>' +
          '<button type="button" class="btn btn-danger btn-sm" data-act="keluarDariAkun">' + SP.icon('logout', 'sm') + ' Keluar Sesi</button>' +
        '</div>',
      footer:
        '<button class="btn btn-outline" data-act="tutupModal">Batal</button>' +
        '<button class="btn btn-primary" data-act="simpanProfilAkun">' + SP.icon('check', 'sm') + ' Simpan Profil</button>'
    });
  };

  SP.actions.bukaModalAkun = function () { SP.bukaModalAkun(); };
  SP.actions.pilihFotoAkun = function () {
    const f = SP.$('#akun-foto-file');
    if (f) { f.value = ''; f.click(); }
  };
  SP.changes.unggahFotoAkun = async function (el) {
    const file = el.files && el.files[0];
    if (!file) return;
    if (!/^image\//i.test(file.type)) {
      SP.toast('File harus berupa gambar (JPG, PNG, atau WebP).', 'warn');
      return;
    }
    const t = SP.toast('Memproses foto…', 'info', 10000);
    try {
      const dataUrl = await SP.kecilkanGambar(file, 256, 'image/jpeg');
      window._akunFotoPending = dataUrl;
      if (SP._updatePreviewAvatarAkun) SP._updatePreviewAvatarAkun(dataUrl);
      t.remove();
      SP.toast('Foto profil dipilih. Klik "Simpan Profil" untuk menerapkan.', 'ok');
    } catch (e) {
      t.remove();
      SP.toast('Gagal memproses gambar: ' + esc(e.message), 'err');
    }
  };
  SP.actions.pakaiFotoGoogle = function () {
    const gInfo = SP.Auth && SP.Auth.info ? SP.Auth.info() : null;
    if (gInfo && gInfo.picture) {
      window._akunFotoPending = gInfo.picture;
      if (SP._updatePreviewAvatarAkun) SP._updatePreviewAvatarAkun(gInfo.picture);
      SP.toast('Foto dari akun Google dipilih. Klik "Simpan Profil" untuk menerapkan.', 'ok');
    } else {
      SP.toast('Foto profil Google tidak tersedia.', 'warn');
    }
  };
  SP.actions.hapusFotoAkun = function () {
    window._akunFotoPending = '';
    if (SP._updatePreviewAvatarAkun) SP._updatePreviewAvatarAkun('');
    SP.toast('Foto dihapus. Klik "Simpan Profil" untuk menerapkan.', 'info');
  };
  SP.actions.keluarDariAkun = async function () {
    SP.tutupModal();
    await SP.actions.keluar();
  };
  SP.actions.simpanProfilAkun = async function () {
    const namaIn = SP.$('#akun-nama'), nipIn = SP.$('#akun-nip');
    const nama = (namaIn ? namaIn.value : '').trim();
    const nip = (nipIn ? nipIn.value : '').trim();
    if (!nama) {
      SP.toast('Nama lengkap tidak boleh kosong.', 'warn');
      if (namaIn) namaIn.focus();
      return;
    }

    const payload = { nama: nama, nip: nip };
    if (window._akunFotoPending !== undefined) {
      payload.foto = window._akunFotoPending;
    }

    SP.S.me.nama = nama;
    SP.S.me.nip = nip;
    if (payload.foto !== undefined) {
      SP.S.me.foto = payload.foto;
      if (payload.foto) {
        localStorage.setItem('sipena_foto_' + SP.S.me.email.toLowerCase(), payload.foto);
      } else {
        localStorage.removeItem('sipena_foto_' + SP.S.me.email.toLowerCase());
      }
    }
    if (Array.isArray(SP.S.pengguna)) {
      const u = SP.S.pengguna.find(function (x) { return (x.email || '').toLowerCase() === SP.S.me.email.toLowerCase(); });
      if (u) {
        u.nama = nama;
        u.nip = nip;
        if (payload.foto !== undefined) u.foto = payload.foto;
      }
    }
    SP.Cache.simpan();
    SP.tutupModal();
    renderShell();
    SP.renderUlang();
    SP.toast('Profil berhasil diperbarui.', 'ok');

    try {
      await SP.api('profilSimpan', payload);
    } catch (e) {
      console.warn('Sinkronisasi profil ke server tertunda:', e);
    }
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
    if (!('ontouchstart' in window) && window.innerWidth > 768) {
      SP.Auth.diam();
    }
  }

  window.addEventListener('resize', SP.debounce(function () {
    const g = SP.$('#gbtn');
    if (g && SP.Auth && !SP.Auth.token()) {
      SP.Auth.tombol(g);
    }
  }, 300));

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
