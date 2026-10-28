# SIPENA — Frontend (GitHub Pages)

Sistem Manajemen Nilai Mahasiswa Program Bahasa Arab & Inggris.
Folder ini berisi **tampilan** aplikasi (HTML/CSS/JavaScript murni, tanpa build). Backend ada di Google Apps Script (terpisah, tidak di repository ini).

## Isi
| File | Fungsi |
|---|---|
| `index.html` | Halaman utama (SPA) |
| `style.css` | Gaya visual (tema hijau–oranye–merah, responsif) |
| `config.js` | **Satu-satunya file yang perlu Anda sunting**: `GAS_URL` & `GOOGLE_CLIENT_ID` |
| `ui.js` · `logic.js` · `api.js` | Utilitas tampilan · aturan kelulusan sisi klien · autentikasi, API, cache, outbox |
| `views-auth.js` | Login, Akses Ditolak, Verifikasi sertifikat |
| `views-main.js` | Dasbor, Kelas Saya, Input Nilai |
| `views-data.js` | Impor Mahasiswa, Status Kelulusan, Cetak Sertifikat |
| `views-laporan.js` | Wajib Mengulang & Notifikasi, Laporan |
| `views-admin.js` | Tutor Pengganti, Kelola Pengguna, Pindah Kelas, Pengaturan & Log |
| `app.js` | Kerangka (sidebar, topbar), router, pencarian global, boot |

Semua file berada di **satu folder (tanpa sub-folder)**.

## Deploy
Ikuti `PANDUAN-INSTALASI.md`. Ringkasnya: isi `config.js` → `git init` di folder ini → push ke GitHub → aktifkan Pages (branch `main`, folder `/root`).
