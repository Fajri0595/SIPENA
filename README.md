# SIPENA — Frontend (GitHub Pages)

Sistem Manajemen Nilai Mahasiswa Program Bahasa Arab & Inggris.
Folder ini berisi **tampilan** aplikasi (HTML/CSS/JavaScript murni, tanpa build). Backend ada di Google Apps Script (terpisah, tidak di repository ini).

## Struktur Direktori
| Folder / File | Fungsi |
|---|---|
| `index.html` | Halaman utama (SPA) — wajib di root |
| `config.js` | **Satu-satunya file yang perlu Anda sunting**: `GAS_URL` & `GOOGLE_CLIENT_ID` |
| `manifest.json` · `sw.js` | Konfigurasi Progressive Web App (PWA) & Service Worker offline cache |
| `css/style.css` | Gaya visual (tema hijau–oranye–merah, responsif) |
| `assets/` | Logo lembaga (`logo.png`), `favicon.png`, dan ikon PWA (`icon-192.png`, `icon-512.png`) |
| `js/ui.js` · `js/logic.js` · `js/api.js` | Utilitas tampilan & QR lokal · aturan kelulusan sisi klien · autentikasi HMAC, API, cache, outbox |
| `js/views-auth.js` | Login, Login Darurat, Akses Ditolak, Portal Verifikasi Sertifikat Kriptografi (HMAC & SHA-256) |
| `js/views-main.js` | Dasbor, Kelas Saya, Input Nilai |
| `js/views-data.js` | Impor Mahasiswa, Status Kelulusan, Cetak Sertifikat 2 Sisi |
| `js/views-laporan.js` | Wajib Mengulang & Notifikasi, Laporan |
| `js/views-admin.js` | Tutor Pengganti, Kelola Pengguna, Pindah Kelas, Pengaturan, WhatsApp Gateway & CRM, Log |
| `js/app.js` | Kerangka (sidebar, topbar), router, pencarian global, PWA installer, boot |
| `docs/PANDUAN-INSTALASI.md` | Dokumentasi panduan instalasi & deployment lengkap |

## Deploy
Ikuti `docs/PANDUAN-INSTALASI.md`. Ringkasnya: isi `config.js` → `git init` di folder ini → push ke GitHub → aktifkan Pages (branch `main`, folder `/ (root)`).
