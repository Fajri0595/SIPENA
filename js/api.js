// ============================================================
// SIPENA: api.js
// - Autentikasi Google Sign-In (ID token) + Token Sesi HMAC 12 Jam (gas-scale-turbo)
// - Akses Darurat Superadmin (gas-rahasia-script-properties)
// - Panggilan REST ke Google Apps Script dengan Idempotency (reqId),
//   Deduplikasi In-Flight, Smart Retry, & Telemetri Performa (gas-instant-ux-pro)
// - Cache lokal (stale-while-revalidate) + Outbox Optimistic UI
// ============================================================
(function () {
  const SP = window.SP;
  const C = (SP.CFG = window.SIPENA_CONFIG || {});
  const TK = 'sipena_token_v1';
  const GK = 'sipena_ginfo_v1';

  const AKSI_BACA = {
    bootstrap: 1,
    ambilFoto: 1,
    ambilAset: 1,
    logList: 1,
    contohSertifikat: 1,
    unduhSertifikat: 1,
    exportXlsx: 1,
    tukarSesi: 1
  };

  // ---------------- Telemetri Performa (gas-instant-ux-pro) ----------------
  SP.Perf = {
    logs: [],
    record: function (action, rttMs, serverMs, ok, meta) {
      this.logs.push({
        waktu: new Date().toLocaleTimeString('id-ID'),
        action: action,
        rttMs: Math.round(rttMs),
        serverMs: serverMs != null ? Math.round(serverMs) : null,
        ok: !!ok,
        info: meta || ''
      });
      if (this.logs.length > 200) this.logs.shift();
    },
    summary: function () {
      const g = {};
      this.logs.forEach(function (x) {
        const a = g[x.action] || (g[x.action] = { action: x.action, panggilan: 0, gagal: 0, rtts: [], srv: [], cacheHit: 0 });
        a.panggilan++;
        if (!x.ok) a.gagal++;
        a.rtts.push(x.rttMs);
        if (x.serverMs != null) a.srv.push(x.serverMs);
        if (String(x.info || '').indexOf('cache') >= 0) a.cacheHit++;
      });
      return Object.keys(g).map(function (k) {
        const a = g[k];
        a.rtts.sort(function (x, y) { return x - y; });
        const avgRtt = Math.round(a.rtts.reduce(function (s, v) { return s + v; }, 0) / a.rtts.length);
        const p95Rtt = a.rtts[Math.min(a.rtts.length - 1, Math.floor(a.rtts.length * 0.95))];
        const avgSrv = a.srv.length ? Math.round(a.srv.reduce(function (s, v) { return s + v; }, 0) / a.srv.length) : 0;
        return { action: a.action, panggilan: a.panggilan, avgRttMs: avgRtt, p95RttMs: p95Rtt, avgServerMs: avgSrv, cacheHit: a.cacheHit, gagal: a.gagal };
      });
    },
    table: function () {
      const s = this.summary();
      if (console && console.table) console.table(s);
      return s;
    }
  };

  // ---------------- Autentikasi ----------------
  SP.Auth = {
    _waiters: [], _inited: false, _tm: null,
    clientId: function () {
      return C.GOOGLE_CLIENT_ID || (SP.infoPublik && SP.infoPublik.google_client_id) || '';
    },
    decode: function (t) {
      try {
        const parts = String(t || '').split('.');
        if (parts.length < 2) return null;
        let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        return JSON.parse(decodeURIComponent(escape(atob(b64))));
      } catch (e) { return null; }
    },
    token: function () {
      const t = localStorage.getItem(TK); if (!t) return null;
      const p = this.decode(t); if (!p || p.exp * 1000 < Date.now() + 30000) return null;
      return t;
    },
    info: function () {
      const t = localStorage.getItem(TK);
      const p = t ? this.decode(t) : null;
      let g = null;
      try { g = JSON.parse(localStorage.getItem(GK) || 'null'); } catch (e) { g = null; }
      if (!p) return g;
      if (g && g.email && p.email && g.email.toLowerCase() === p.email.toLowerCase()) {
        return Object.assign({}, g, p);
      }
      return p;
    },
    simpan: function (t) {
      localStorage.setItem(TK, t);
      const p = this.decode(t);
      if (p && String(t).indexOf('h1.') !== 0) {
        try {
          localStorage.setItem(GK, JSON.stringify({
            email: (p.email || '').toLowerCase(),
            name: p.name || '',
            picture: p.picture || ''
          }));
        } catch (e) { /* abaikan */ }
      }
      const w = this._waiters.splice(0); w.forEach(function (f) { f(t); });
      this.jadwalkan();
    },
    simpanSesi: function (sToken) {
      if (!sToken) return;
      localStorage.setItem(TK, sToken);
      const w = this._waiters.splice(0); w.forEach(function (f) { f(sToken); });
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
      const cid = this.clientId();
      if (!cid) return false;
      const self = this;
      google.accounts.id.initialize({
        client_id: cid,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        callback: function (r) { if (r && r.credential) { self.simpan(r.credential); if (SP.onLogin) SP.onLogin(); } }
      });
      this._inited = true; return true;
    },
    tombol: async function (el, opsi) {
      if (!(await this.init())) {
        el.innerHTML = '<div class="callout bad"><div class="ic">' + SP.icon('cloudOff') + '</div><div class="tx">Layanan Google Sign-In tidak dapat dimuat. Periksa koneksi internet lalu muat ulang halaman.</div></div>';
        return;
      }
      const boxW = el.clientWidth || (el.parentElement ? el.parentElement.clientWidth : 320);
      const w = Math.max(220, Math.min(380, boxW > 40 ? boxW - 12 : 300));
      google.accounts.id.renderButton(el, Object.assign({
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center',
        locale: 'id',
        width: w
      }, opsi || {}));
    },
    // Pembaruan sesi: prioritaskan perpanjangan sesi HMAC (tukarSesi) sebelum fallback ke Google One Tap
    diam: async function () {
      const cur = localStorage.getItem(TK);
      if (cur) {
        const p = this.decode(cur);
        if (p && p.exp * 1000 > Date.now() + 15000) {
          try {
            const res = await fetch(C.GAS_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'tukarSesi', token: cur, data: {} })
            });
            const j = await res.json();
            if (j && j.success && j.data && j.data.sessionToken) {
              this.simpanSesi(j.data.sessionToken);
              return j.data.sessionToken;
            }
          } catch (eTukar) { /* lanjutkan ke GIS jika gagal */ }
        }
      }
      if (!(await this.init())) return null;
      const self = this;
      return new Promise(function (res) {
        let selesai = false;
        const lepas = function () {
          if (selesai) return;
          selesai = true;
          const i = self._waiters.indexOf(res);
          if (i >= 0) self._waiters.splice(i, 1);
          res(null);
        };
        self._waiters.push(res);
        try {
          google.accounts.id.prompt(function (n) {
            try {
              if (!n) { lepas(); return; }
              const reason = (typeof n.getNotDisplayedReason === 'function' && n.getNotDisplayedReason()) ||
                             (typeof n.getSkippedReason === 'function' && n.getSkippedReason()) ||
                             (typeof n.getDismissedReason === 'function' && n.getDismissedReason());
              if (reason) { lepas(); return; }
              if (typeof n.isNotDisplayed === 'function' && n.isNotDisplayed()) { lepas(); return; }
              if (typeof n.isSkippedMoment === 'function' && n.isSkippedMoment()) { lepas(); return; }
              if (typeof n.isDismissedMoment === 'function' && n.isDismissedMoment()) { lepas(); return; }
            } catch (e2) { lepas(); }
          });
        } catch (e) {
          lepas();
        }
        setTimeout(lepas, 4000);
      });
    },
    jadwalkan: function () {
      clearTimeout(this._tm);
      const t = localStorage.getItem(TK);
      const p = t ? this.decode(t) : null;
      if (!p || !p.exp) return;
      const self = this;
      const sisaMs = p.exp * 1000 - Date.now();
      const tungguMs = Math.max(45000, Math.min(3600000, sisaMs - 10 * 60000));
      this._tm = setTimeout(function () { self.diam(); }, tungguMs);
    },
    pastikan: async function () {
      let t = this.token(); if (t) return t;
      t = await this.diam(); if (t) return t;
      return SP.tampilLoginOverlay();
    },
    keluar: function () {
      try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) { /* abaikan */ }
      this.hapus(); localStorage.removeItem(GK); SP.Cache.hapus(); localStorage.removeItem('sipena_outbox_v1');
      location.hash = ''; location.reload();
    }
  };

  // ---------------- Panggilan API (Dedupe + Idempotency + Smart Retry) ----------------
  const _inflight = {};

  function errConfig() {
    const e = new Error('GAS_URL belum diisi di config.js. Ikuti PANDUAN-INSTALASI.md.'); e.code = 'CONFIG'; return e;
  }
  function buatReqId() {
    return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  function jeda(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  SP.api = function (action, data, opt) {
    opt = opt || {};
    const isBaca = !!AKSI_BACA[action];
    const dedupeKey = (isBaca && !opt.skipDedupe) ? (action + ':' + JSON.stringify(data || {})) : '';
    if (dedupeKey && _inflight[dedupeKey]) {
      return _inflight[dedupeKey];
    }

    const p = (async function () {
      if (!C.GAS_URL || C.GAS_URL.indexOf('ISI_DEPLOYMENT_ID') >= 0) throw errConfig();
      const reqId = isBaca ? '' : (opt.reqId || (data && data._reqId) || buatReqId());
      const maxRetry = opt.retries !== undefined ? opt.retries : (isBaca ? 1 : 2);
      let ulangAuth = 0;
      let ulangNet = 0;

      for (;;) {
        const t0 = performance.now();
        const token = opt.publik ? '' : (SP.Auth.token() || (await SP.Auth.pastikan()));
        let json;
        try {
          const ctrl = new AbortController();
          const tm = setTimeout(function () { ctrl.abort(); }, opt.timeout || 70000);
          const payload = { action: action, token: token, data: data || {} };
          if (reqId) payload.reqId = reqId;
          const res = await fetch(C.GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            signal: ctrl.signal
          });
          clearTimeout(tm);
          json = await res.json();
        } catch (e) {
          const rttErr = performance.now() - t0;
          SP.Perf.record(action, rttErr, null, false, e.name === 'AbortError' ? 'timeout' : 'network');
          if (e.name !== 'AbortError' && ulangNet < maxRetry && navigator.onLine !== false) {
            ulangNet++;
            await jeda(350 * Math.pow(2, ulangNet - 1) + Math.floor(Math.random() * 150));
            continue;
          }
          const err = new Error(e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
          err.code = 'NETWORK'; throw err;
        }

        const rtt = performance.now() - t0;
        if (json.sessionToken) {
          SP.Auth.simpanSesi(json.sessionToken);
        }
        if (json.success) {
          const infoMeta = json.deduped ? 'deduped' : (json.data && json.data.meta && json.data.meta.cacheHit ? 'cacheHit' : 'ok');
          SP.Perf.record(action, rtt, json.ms, true, infoMeta);
          return json.data;
        }
        SP.Perf.record(action, rtt, json.ms, false, json.code || 'ERROR');
        const err = new Error(json.message || 'Terjadi kesalahan.'); err.code = json.code; err.extra = json.extra;
        if ((json.code === 'AUTH_EXPIRED' || json.code === 'AUTH_REQUIRED') && ulangAuth < 1 && !opt.publik) {
          ulangAuth++; SP.Auth.hapus(); continue;
        }
        throw err;
      }
    })();

    if (dedupeKey) {
      _inflight[dedupeKey] = p;
      p.finally(function () { delete _inflight[dedupeKey]; }).catch(function () {});
    }
    return p;
  };

  SP.apiGet = async function (action, params) {
    if (!C.GAS_URL || C.GAS_URL.indexOf('ISI_DEPLOYMENT_ID') >= 0) throw errConfig();
    const q = new URLSearchParams(Object.assign({ action: action }, params || {}));
    const t0 = performance.now();
    let json;
    try { json = await (await fetch(C.GAS_URL + '?' + q.toString())).json(); }
    catch (e) {
      SP.Perf.record('GET:' + action, performance.now() - t0, null, false, 'network');
      const err = new Error('Tidak dapat terhubung ke server.'); err.code = 'NETWORK'; throw err;
    }
    SP.Perf.record('GET:' + action, performance.now() - t0, json.ms, !!json.success, json.success ? 'ok' : json.code);
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
      const l = this.daftar();
      op.id = op.id || 'op' + Date.now() + Math.random().toString(36).slice(2, 6);
      op.reqId = op.reqId || ('ob_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8));
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
              const res = await SP.api(op.action, op.data, { reqId: op.reqId || op.id });
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
  SP.muat = function (paksa) {
    if (SP._muat && !paksa) return SP._muat;
    SP._muat = (async function () {
      try {
        if (SP.Outbox.daftar().length) {
          const ok = await SP.Outbox.flush();
          if (!ok || SP.Outbox.daftar().length) return false;
        }
        const d = await SP.api('bootstrap', paksa ? { paksa: true } : {}, { skipDedupe: !!paksa });
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
