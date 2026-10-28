// ============================================================
// SIPENA — api.js
// - Autentikasi Google Sign-In (ID token) + pembaruan sesi senyap
// - Panggilan REST ke Google Apps Script
// - Cache lokal (stale-while-revalidate) agar aplikasi langsung tampil
// - Outbox: perubahan nilai disimpan di perangkat lebih dulu,
//   lalu disinkronkan di latar belakang (optimistic UI)
// ============================================================
(function () {
  const SP = window.SP;
  const C = (SP.CFG = window.SIPENA_CONFIG || {});
  const TK = 'sipena_token_v1';

  // ---------------- Autentikasi ----------------
  SP.Auth = {
    _waiters: [], _inited: false, _tm: null,
    decode: function (t) {
      try { const p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(p)))); } catch (e) { return null; }
    },
    token: function () {
      const t = localStorage.getItem(TK); if (!t) return null;
      const p = this.decode(t); if (!p || p.exp * 1000 < Date.now() + 30000) return null;
      return t;
    },
    info: function () { const t = localStorage.getItem(TK); return t ? this.decode(t) : null; },
    simpan: function (t) {
      localStorage.setItem(TK, t);
      const w = this._waiters.splice(0); w.forEach(function (f) { f(t); });
      this.jadwalkan();
    },
    hapus: function () { localStorage.removeItem(TK); },
    gis: function () {
      return new Promise(function (res) {
        let n = 0;
        (function cek() { if (window.google && google.accounts && google.accounts.id) return res(true); if (++n > 100) return res(false); setTimeout(cek, 100); })();
      });
    },
    init: async function () {
      if (this._inited) return true;
      if (!(await this.gis())) return false;
      const self = this;
      google.accounts.id.initialize({
        client_id: C.GOOGLE_CLIENT_ID, auto_select: true, cancel_on_tap_outside: false,
        callback: function (r) { if (r && r.credential) { self.simpan(r.credential); if (SP.onLogin) SP.onLogin(); } }
      });
      this._inited = true; return true;
    },
    tombol: async function (el, opsi) {
      if (!(await this.init())) {
        el.innerHTML = '<div class="callout bad"><div class="ic">' + SP.icon('cloudOff') + '</div><div class="tx">Layanan Google Sign-In tidak dapat dimuat. Periksa koneksi internet lalu muat ulang halaman.</div></div>';
        return;
      }
      google.accounts.id.renderButton(el, Object.assign({ theme: 'outline', size: 'large', type: 'standard', text: 'continue_with', shape: 'rectangular', logo_alignment: 'center', locale: 'id', width: Math.max(200, Math.min(400, el.offsetWidth || 360)) }, opsi || {}));
    },
    // Pembaruan sesi tanpa interaksi (One Tap / auto select)
    diam: async function () {
      if (!(await this.init())) return null;
      const self = this;
      return new Promise(function (res) {
        self._waiters.push(res);
        const lepas = function () { const i = self._waiters.indexOf(res); if (i >= 0) { self._waiters.splice(i, 1); res(null); } };
        try {
          google.accounts.id.prompt(function (n) {
            if ((n.isNotDisplayed && n.isNotDisplayed()) || (n.isSkippedMoment && n.isSkippedMoment())) lepas();
          });
        } catch (e) { lepas(); }
        setTimeout(lepas, 5000);
      });
    },
    jadwalkan: function () {
      clearTimeout(this._tm);
      const p = this.info(); if (!p) return;
      const self = this;
      this._tm = setTimeout(function () { self.diam(); }, Math.max(30000, p.exp * 1000 - Date.now() - 5 * 60000));
    },
    pastikan: async function () {
      let t = this.token(); if (t) return t;
      t = await this.diam(); if (t) return t;
      return SP.tampilLoginOverlay();
    },
    keluar: function () {
      try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) { /* abaikan */ }
      this.hapus(); SP.Cache.hapus(); localStorage.removeItem('sipena_outbox_v1');
      location.hash = ''; location.reload();
    }
  };

  // ---------------- Panggilan API ----------------
  function errConfig() {
    const e = new Error('GAS_URL belum diisi di config.js. Ikuti PANDUAN-INSTALASI.md.'); e.code = 'CONFIG'; return e;
  }
  SP.api = async function (action, data, opt) {
    opt = opt || {};
    if (!C.GAS_URL || C.GAS_URL.indexOf('ISI_DEPLOYMENT_ID') >= 0) throw errConfig();
    let ulang = 0;
    for (;;) {
      const token = opt.publik ? '' : (SP.Auth.token() || (await SP.Auth.pastikan()));
      let json;
      try {
        const ctrl = new AbortController();
        const tm = setTimeout(function () { ctrl.abort(); }, opt.timeout || 70000);
        const res = await fetch(C.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, token: token, data: data || {} }), signal: ctrl.signal });
        clearTimeout(tm);
        json = await res.json();
      } catch (e) {
        const err = new Error(e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
        err.code = 'NETWORK'; throw err;
      }
      if (json.success) return json.data;
      const err = new Error(json.message || 'Terjadi kesalahan.'); err.code = json.code; err.extra = json.extra;
      if ((json.code === 'AUTH_EXPIRED' || json.code === 'AUTH_REQUIRED') && ulang < 1 && !opt.publik) { ulang++; SP.Auth.hapus(); continue; }
      throw err;
    }
  };
  SP.apiGet = async function (action, params) {
    if (!C.GAS_URL || C.GAS_URL.indexOf('ISI_DEPLOYMENT_ID') >= 0) throw errConfig();
    const q = new URLSearchParams(Object.assign({ action: action }, params || {}));
    let json;
    try { json = await (await fetch(C.GAS_URL + '?' + q.toString())).json(); }
    catch (e) { const err = new Error('Tidak dapat terhubung ke server.'); err.code = 'NETWORK'; throw err; }
    if (!json.success) { const err = new Error(json.message || 'Terjadi kesalahan.'); err.code = json.code; throw err; }
    return json.data;
  };

  // ---------------- Cache lokal ----------------
  SP.Cache = {
    k: 'sipena_cache_v1',
    simpan: function () {
      try { if (SP.S.me) localStorage.setItem(this.k, JSON.stringify({ email: SP.S.me.email, ts: Date.now(), data: SP.dataMentah() })); } catch (e) { /* kuota penuh */ }
    },
    muat: function (email) {
      try { const v = JSON.parse(localStorage.getItem(this.k) || 'null'); if (v && v.email === email) return v; } catch (e) { /* rusak */ }
      return null;
    },
    hapus: function () { localStorage.removeItem(this.k); }
  };
  SP.simpanCache = SP.debounce(function () { SP.Cache.simpan(); }, 800);

  // ---------------- Status sinkronisasi ----------------
  SP.sinkron = { status: 'idle' };
  SP.setSinkron = function (status) {
    SP.sinkron.status = status || 'idle';
    const n = SP.Outbox.daftar().length;
    document.querySelectorAll('[data-sync]').forEach(function (el) {
      let teks, kls;
      if (SP.sinkron.status === 'menyimpan') { teks = 'Menyinkronkan ke server…'; kls = 'o'; }
      else if (n > 0) { teks = n + ' perubahan menunggu sinkronisasi'; kls = 'r'; }
      else { teks = 'Semua perubahan tersinkron'; kls = ''; }
      el.innerHTML = '<span class="dotg ' + kls + '"></span><span>' + teks + '</span>' + (n > 0 && SP.sinkron.status !== 'menyimpan' ? ' <button class="btn btn-outline btn-sm" data-act="sinkronUlang">Coba lagi</button>' : '');
    });
  };
  SP.actions.sinkronUlang = function () { SP.Outbox.flush(); };

  // ---------------- Outbox ----------------
  SP.Outbox = {
    k: 'sipena_outbox_v1', sedang: false, _p: null,
    daftar: function () { try { return JSON.parse(localStorage.getItem(this.k) || '[]'); } catch (e) { return []; } },
    tulis: function (l) { localStorage.setItem(this.k, JSON.stringify(l)); SP.setSinkron(SP.sinkron.status); },
    tambah: function (op) {
      const l = this.daftar(); op.id = op.id || 'op' + Date.now() + Math.random().toString(36).slice(2, 6);
      l.push(op); this.tulis(l); return op;
    },
    hapusOp: function (id) { this.tulis(this.daftar().filter(function (x) { return x.id !== id; })); },
    flush: function () {
      if (this.sedang) return this._p;
      const self = this; self.sedang = true;
      self._p = (async function () {
        let ok = true;
        try {
          let l = self.daftar();
          while (l.length) {
            const op = l[0];
            SP.setSinkron('menyimpan');
            try {
              const res = await SP.api(op.action, op.data);
              SP.terapkanHasil(res); SP.simpanCache();
              self.hapusOp(op.id);
              if (SP.onOpSukses) SP.onOpSukses(op, res);
            } catch (e) {
              if (e.code === 'NETWORK' || e.code === 'AUTH_REQUIRED' || e.code === 'CONFIG') { ok = false; break; }
              self.hapusOp(op.id);
              SP.toast('<b>Perubahan ditolak server:</b> ' + SP.esc(e.message) + '<br><small>' + SP.esc(op.label || '') + '</small>', 'err', 9000);
              if (SP.onOpDitolak) SP.onOpDitolak(op, e);
            }
            l = self.daftar();
          }
        } finally { self.sedang = false; SP.setSinkron('idle'); }
        return ok;
      })();
      return self._p;
    }
  };
  window.addEventListener('online', function () { SP.Outbox.flush(); });
  setInterval(function () { if (SP.Outbox.daftar().length && !SP.Outbox.sedang && SP.S.me) SP.Outbox.flush(); }, 20000);

  // ---------------- Muat data (bootstrap) ----------------
  SP.muat = function () {
    if (SP._muat) return SP._muat;
    SP._muat = (async function () {
      try {
        if (SP.Outbox.daftar().length) {
          const ok = await SP.Outbox.flush();
          if (!ok || SP.Outbox.daftar().length) return false;
        }
        const d = await SP.api('bootstrap', {});
        SP.terapkanData(d);
        SP.siap = true; SP.Cache.simpan(); SP.terakhirMuat = Date.now();
        if (SP.setelahMuat) SP.setelahMuat(); else if (SP.renderUlang) SP.renderUlang();
        return true;
      } finally { SP._muat = null; }
    })();
    return SP._muat;
  };

  // ---------------- Ekspor Excel via server ----------------
  SP.eksporXlsx = async function (judul, headers, rows) {
    const t = SP.toast('Menyiapkan berkas Excel…', 'info', 90000);
    try {
      const r = await SP.api('exportXlsx', { judul: judul, headers: headers, rows: rows }, { timeout: 120000 });
      SP.unduhBase64(r.nama, r.base64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      t.remove(); SP.toast('Berkas Excel berhasil diunduh.');
    } catch (e) { t.remove(); SP.toast(SP.esc(e.message), 'err'); }
  };
})();
