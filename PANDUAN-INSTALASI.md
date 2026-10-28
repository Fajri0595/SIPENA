# Panduan Instalasi SIPENA

**Sistem Manajemen Nilai Mahasiswa Program Bahasa Arab & Inggris**
Frontend di **GitHub Pages** · Backend **Google Apps Script** (REST API) · Database **Google Sheets**

Panduan ini ditulis untuk pemula. Ikuti **urut dari Tahap 1 sampai Tahap 8**. Total waktu sekitar 45–60 menit untuk pertama kali. Kalau macet, lihat bagian **Pemecahan Masalah** di akhir.

---

## 0. Gambaran Singkat

```
 Peramban (Tutor / Superadmin)
        │  Masuk dengan akun Google
        ▼
 GitHub Pages  ──────────►  Google Apps Script (API)  ──►  Google Sheets (database)
 (tampilan: 12 file)         (6 file .gs/.json)            Google Drive (PDF sertifikat)
                                                           Gmail (email ke mahasiswa)
```

Anda akan memasang **dua bagian** yang terpisah:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** (6 file) | `Kode.gs`, `Data.gs`, `Logika.gs`, `Aksi.gs`, `Sertifikat.gs`, `appsscript.json` | Editor Google Apps Script |
| **Frontend** (13 file) | `index.html`, `style.css`, `config.js`, `ui.js`, `logic.js`, `api.js`, `views-auth.js`, `views-main.js`, `views-data.js`, `views-laporan.js`, `views-admin.js`, `app.js`, `README.md` | GitHub Pages |

> ⚠️ **File backend (`.gs`) JANGAN dimasukkan ke GitHub.** Hanya 13 file frontend yang ke GitHub.

### Struktur file frontend itu rata (tanpa sub-folder)

Semua 13 file frontend diletakkan **dalam satu folder yang sama** (tidak ada folder `css/` atau `js/`). Jadi Anda cukup mengunduh tiap file lalu menaruhnya bersama-sama di satu folder. `index.html` memanggil file lain dengan nama langsung, sehingga tidak ada risiko CSS/JS tidak ditemukan karena salah folder.

---

## Tahap 1 — Pasang Backend di Google Apps Script

> Gunakan **akun Google lembaga** (atau akun yang akan menjadi Superadmin pertama). Akun inilah yang otomatis menjadi **Superadmin pertama** aplikasi.

1. Buka <https://script.google.com> → klik **Proyek baru** (*New project*).
2. Klik nama proyek di kiri atas (“Untitled project”) → ganti menjadi **SIPENA**.
3. Tampilkan file manifest: klik ikon **⚙ Setelan proyek** (*Project Settings*) di sisi kiri → centang **Tampilkan file manifes "appsscript.json" di editor**. Kembali ke ikon **< > Editor**.
4. Siapkan 6 file. Di panel kiri **Berkas** (*Files*):
   - File bawaan `Code.gs` → klik titik tiga → **Ganti nama** → `Kode`. Hapus seluruh isinya, lalu tempel isi file **`Kode.gs`** yang Anda unduh.
   - Klik **+** di sebelah *Files* → **Skrip** → beri nama `Data` → tempel isi **`Data.gs`**.
   - Ulangi untuk `Logika` (isi `Logika.gs`), `Aksi` (isi `Aksi.gs`), dan `Sertifikat` (isi `Sertifikat.gs`).
   - Buka `appsscript.json` → hapus isinya → tempel isi file **`appsscript.json`** yang Anda unduh.
5. Tekan **Ctrl+S** (simpan semua).

> 💡 Cara menyalin: buka file unduhan dengan Notepad → **Ctrl+A** → **Ctrl+C** → klik di editor Apps Script → **Ctrl+A** → **Ctrl+V**.

---

## Tahap 2 — Buat OAuth Client ID (agar tombol “Masuk dengan Google” berfungsi)

Aplikasi memakai **Google Sign-In**. Hanya email yang didaftarkan Superadmin yang boleh masuk. Anda perlu satu **Client ID** (gratis).

> Anda perlu tahu dulu alamat situs GitHub Pages Anda. Bentuknya: **`https://USERNAME.github.io`** (USERNAME = nama akun GitHub Anda). Kalau belum punya akun GitHub, daftar dulu di <https://github.com> (Tahap 6) lalu kembali ke sini.

1. Buka <https://console.cloud.google.com> (masuk dengan akun yang sama).
2. Di bagian atas klik pemilih proyek → **Proyek baru** → nama `SIPENA` → **Buat**. Pastikan proyek `SIPENA` terpilih.
3. Menu ☰ → **API & Layanan** → **Layar persetujuan OAuth** (*OAuth consent screen*).
   - Jika akun Anda **Google Workspace for Education** → pilih **Internal**. Jika akun Gmail biasa → pilih **Eksternal**.
   - Isi **Nama aplikasi**: `SIPENA`, **Email dukungan pengguna**: email Anda, **Email kontak developer**: email Anda → **Simpan dan lanjutkan** sampai selesai (cakupan/scope tidak perlu ditambah).
   - Jika memilih **Eksternal**: klik **Publikasikan aplikasi** (*Publish app*) agar semua tutor bisa masuk. Cakupan yang dipakai hanya dasar (email & profil), jadi tidak perlu verifikasi Google.
4. Menu ☰ → **API & Layanan** → **Kredensial** → **+ Buat kredensial** → **ID klien OAuth** (*OAuth client ID*).
   - **Jenis aplikasi:** `Aplikasi web`.
   - **Nama:** `SIPENA Web`.
   - **Asal JavaScript yang diizinkan** (*Authorized JavaScript origins*) → **+ Tambahkan URI** → isi **`https://USERNAME.github.io`**
     - ❗ Hanya domain, **tanpa** `/NAMA-REPO` di belakangnya dan **tanpa** garis miring di akhir.
     - (Opsional, untuk uji di komputer sendiri: tambahkan juga `http://localhost:8080`.)
   - Klik **Buat**.
5. Muncul jendela berisi **ID Klien** berbentuk `1234567890-abcdefg.apps.googleusercontent.com`. **Salin dan simpan di Notepad.**
6. Kembali ke editor Apps Script → buka **`Kode.gs`** → cari baris:
   ```js
   const GOOGLE_CLIENT_ID = 'ISI_CLIENT_ID_ANDA.apps.googleusercontent.com';
   ```
   Ganti isinya dengan Client ID Anda, lalu **Ctrl+S**.

> ℹ️ Proyek Google Cloud ini **tidak perlu** dihubungkan ke proyek Apps Script. Cukup salin Client ID-nya.

---

## Tahap 3 — Jalankan Setup (membuat database & folder otomatis)

1. Di editor Apps Script, pilih file **`Kode.gs`**.
2. Di bilah atas pilih fungsi **`setupAppEnvironment`** pada menu dropdown → klik **▶ Jalankan** (*Run*).
3. Muncul **Perlu otorisasi** → **Tinjau izin** → pilih akun Anda → jika muncul peringatan “Google belum memverifikasi aplikasi ini” klik **Lanjutan** → **Buka SIPENA (tidak aman)** → **Izinkan**. (Aman: ini skrip milik Anda sendiri.)
4. Tunggu 20–40 detik. Buka **Log eksekusi** (*Execution log*) di bawah. Anda harus melihat:
   ```
   ✅ Setup selesai!
      Superadmin pertama : akun-anda@...
      Spreadsheet        : https://docs.google.com/spreadsheets/d/...
   ```
5. Pilih fungsi **`setupTriggers`** → **▶ Jalankan**. Ini memasang tugas otomatis (kirim antrean email tiap 10 menit, hangatkan cache, cadangan harian).
6. *(Opsional, hanya untuk uji coba)* Jalankan **`isiDataContoh`** untuk membuat 2 kelas & 8 mahasiswa contoh.

> ⚠️ Jalankan `setupAppEnvironment` **hanya sekali**. Kalau dijalankan lagi, sistem menolak dan memberi tahu bahwa setup sudah ada (tidak membuat data ganda).

Di **Google Drive** Anda sekarang ada folder **📁 SIPENA** berisi database, folder PDF sertifikat, template, dan cadangan.

---

## Tahap 4 — Deploy Backend sebagai Web App

1. Klik **Deploy** (pojok kanan atas) → **Deployment baru** (*New deployment*).
2. Klik ikon ⚙ di sebelah “Pilih jenis” → **Aplikasi web**.
3. Isi:
   | Kolom | Nilai |
   |---|---|
   | Deskripsi | `SIPENA v1` |
   | Jalankan sebagai (*Execute as*) | **Saya** (akun Anda) |
   | Pihak yang memiliki akses (*Who has access*) | **Siapa saja** (*Anyone*) |
4. Klik **Deploy** → salin **URL aplikasi web** yang berakhiran **`/exec`**. Simpan di Notepad.
5. **Uji:** tempel URL itu di tab baru lalu tambahkan `?action=ping` di belakangnya. Harus tampil JSON seperti:
   ```json
   {"success":true,"data":{"app":"SIPENA","versi":"1.0.0", ...}}
   ```

> 🔒 “Siapa saja” hanya berarti *alamat API-nya* dapat dipanggil. Semua data tetap **terkunci**: server memeriksa token Google dan daftar email terdaftar pada **setiap** permintaan.

> 🔁 **Setelah mengubah kode backend nanti:** Deploy → **Kelola deployment** → ✏ (edit) → **Versi: Versi baru** → **Deploy**. URL `/exec` tetap sama. (Jangan buat “Deployment baru” lagi, karena URL-nya berubah.)

---

## Tahap 5 — Isi `config.js` di Frontend

1. Buat folder baru di komputer, misalnya **`C:\sipena-frontend`** (Mac/Linux: `~/sipena-frontend`).
2. Unduh **ke-13 file frontend** dan taruh **semuanya langsung di dalam folder itu**.
3. Buka **`config.js`** dengan Notepad. Isi dua nilai:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',     // dari Tahap 4
   GOOGLE_CLIENT_ID: '1234567890-abcdefg.apps.googleusercontent.com', // dari Tahap 2
   ```
4. Simpan.

---

## Tahap 6 — Pasang Git & siapkan akun GitHub

**A. Pasang Git**
- **Windows:** unduh dari <https://git-scm.com/download/win>, instal dengan pengaturan bawaan (klik Next terus). Lalu buka **PowerShell** dari menu Start.
- **Mac:** buka *Terminal*, ketik `git --version`. Jika belum ada, macOS menawarkan instalasi otomatis.
- **Linux:** `sudo apt install git`.

Cek:
```bash
git --version
```
Harus muncul angka versi, mis. `git version 2.45.0`.

**B. Buat akun GitHub** (jika belum): <https://github.com> → **Sign up**. Ingat: **username** Anda menjadi bagian alamat situs (`username.github.io`).

**C. Atur identitas Git (sekali seumur komputer)**
```bash
git config --global user.name "Nama Lengkap Anda"
git config --global user.email "email-akun-github@contoh.com"
```
(`user.name` bebas, hanya label di riwayat. Bukan password.)

**D. Buat repository kosong di GitHub**
1. Di github.com klik **+** (kanan atas) → **New repository**.
2. **Repository name:** `sipena` (atau nama lain).
3. Pilih **Public** (wajib agar GitHub Pages gratis).
4. **JANGAN** centang *Add a README*, *.gitignore*, atau *license*.
5. Klik **Create repository**. Biarkan halaman berikutnya terbuka.

---

## Tahap 7 — Kirim Frontend ke GitHub (lewat terminal)

> ❗ **Folder kerja Anda adalah folder yang berisi `index.html` — yaitu `C:\sipena-frontend`.** Perintah `git init` **harus** dijalankan di folder ini, bukan di folder induknya.

**7a. Masuk ke folder yang benar**

Cara tercepat di Windows: buka folder `sipena-frontend` di File Explorer → klik **address bar** → ketik `powershell` → Enter. PowerShell langsung terbuka di folder itu.

Atau manual:
```powershell
cd "C:\sipena-frontend"
```

**7b. Verifikasi isi folder (gerbang terpenting!)**
```powershell
dir
```
(Mac/Linux: `ls -la`)

Yang **harus** terlihat: **`index.html`** di daftar, bersama `style.css`, `config.js`, `app.js`, `api.js`, `ui.js`, `logic.js`, `views-*.js`, dan `README.md`.

- ✅ Terlihat `index.html` → lanjut.
- ❌ Yang terlihat justru folder `frontend` atau `backend` → Anda satu level terlalu tinggi. Ketik `cd frontend` lalu `dir` lagi.
- ❌ Ada file `.gs` → pindahkan keluar dari folder ini (file backend tidak boleh ke GitHub).

**7c. Kirim satu per satu** (periksa hasil tiap perintah):
```bash
git init
```
→ `Initialized empty Git repository ...`
```bash
git add .
```
→ (diam = berhasil). **Ada titik di akhir.**
```bash
git commit -m "Upload pertama SIPENA"
```
→ muncul daftar `create mode 100644 index.html` dst.
```bash
git branch -M main
git remote add origin https://github.com/USERNAME/sipena.git
```
Ganti `USERNAME` dan `sipena` dengan milik Anda.
```bash
git push -u origin main
```
Saat diminta:
- **Username:** username GitHub Anda.
- **Password:** tempel **Personal Access Token** (bukan password akun) — lihat 7d.

> 💡 Saat mengetik/menempel token, **layar tampak kosong**. Ini **normal**. Di PowerShell klik kanan untuk menempel, lalu Enter.

Berhasil jika muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

**7d. Membuat Personal Access Token (jika diminta / muncul “Password authentication is not supported”)**
1. Buka <https://github.com/settings/tokens> → **Generate new token** → **Generate new token (classic)**.
2. **Note:** `sipena-push` · **Expiration:** 90 days · centang **repo**.
3. **Generate token** → **salin** token (`ghp_...`). Hanya tampil sekali.
4. Ulangi `git push -u origin main`, tempel token sebagai password.

*(Alternatif tanpa terminal: **GitHub Desktop**, <https://desktop.github.com> → Add Local Repository → pilih folder → Publish repository.)*

**7e. Aktifkan GitHub Pages**
1. Buka `https://github.com/USERNAME/sipena` → **Settings** → **Pages** (menu kiri).
2. **Source:** `Deploy from a branch` · **Branch:** `main` · folder `/ (root)` → **Save**.
3. Centang **Enforce HTTPS**.
4. Tunggu 1–2 menit, refresh. Muncul: *“Your site is live at https://USERNAME.github.io/sipena/”*.

**7f. Cek repository:** buka halaman repo. `index.html` harus tampak langsung di daftar teratas, **tanpa** file `.gs`.

---

## Tahap 8 — Pemakaian Pertama

1. Buka `https://USERNAME.github.io/sipena/` → klik **Lanjutkan dengan Google** → pilih akun Superadmin (akun yang menjalankan setup).
2. **Pengaturan & Log** (menu Superadmin):
   - Isi **Nama lembaga**, **Tahun akademik aktif** (mis. `2026/2027`), **Semester aktif**, **Batas finalisasi nilai**.
   - Di bagian **Template Sertifikat** klik **Buat template bawaan** (jika belum otomatis). Isi nama & jabatan **dua pejabat**, unggah **tanda tangan (PNG transparan)** dan **logo** (opsional).
   - Isi **URL aplikasi** (`https://USERNAME.github.io/sipena`) agar QR verifikasi muncul di sertifikat.
   - **Simpan Pengaturan Sistem**. Coba **Kirim Email Uji Coba ke Saya**.
3. **Kelola Pengguna & Kelas:**
   - **Daftarkan Tutor Baru** (email Google, rumpun Arab/Inggris). Tutor hanya bisa masuk jika emailnya terdaftar di sini.
   - **Tambah Kelas Baru** (PAI A, PBA B, …).
   - Tab **Matriks Penugasan** → atur **1 tutor Arab + 1 tutor Inggris** per kelas.
4. Tutor masuk → **Impor Mahasiswa** (unduh template CSV, isi, unggah) → **Input Nilai** (Lulus / Tidak Lulus per mahasiswa) → **Simpan & Publikasikan**.
5. Saat semester berganti ke **Genap**: Superadmin ubah **Semester aktif** di Pengaturan → daftar mahasiswa **otomatis diteruskan** ke semester genap. Lalu atur penugasan tutor genap.
6. Mahasiswa yang lulus semua 4 program muncul di **Cetak Sertifikat** (khusus tutor semester genap & Superadmin) → pilih → **Cetak Terpilih** → **Kirim Email**.

### Aturan penting yang dijalankan sistem
- Lulus = **4 program** (Arab Ganjil, Inggris Ganjil, Arab Genap, Inggris Genap) semuanya Lulus.
- Tidak lulus di satu program → **wajib mengulang program itu saja** pada semester sejenis tahun berikutnya (notifikasi muncul otomatis). Superadmin menjadwalkan lewat **Wajib Mengulang → Atur Kelas Ulang**.
- Pindah kelas (Superadmin): nilai ikut mahasiswa karena terikat **NIM + program**, bukan kelas.
- Tutor semester genap **tidak input ulang** data mahasiswa; langsung melanjutkan nilai.
- Tutor Pengganti: dapat ditunjuk oleh tutor utama atau Superadmin; akses berlaku otomatis sesuai tanggal dan bisa dicabut.

---

## Cara Memperbarui di Kemudian Hari

**Frontend** (mengubah file tampilan): ganti file di folder `sipena-frontend`, lalu dari folder itu:
```bash
git add .
git commit -m "Deskripsi singkat perubahan"
git push
```
Tunggu 1–2 menit. Jika masih tampil versi lama: **Ctrl+Shift+R** atau buka di jendela Incognito.

**Backend** (mengubah file `.gs`): tempel kode baru → simpan → **Deploy → Kelola deployment → ✏ → Versi baru → Deploy**.

---

## Pemecahan Masalah

| Gejala | Penyebab & Solusi |
|---|---|
| Halaman 404 di GitHub Pages | `git init` dijalankan di folder yang salah. Pastikan `dir` menampilkan `index.html`. Perbaikan: masuk ke folder yang benar, `git init`, `git add .`, `git commit -m "fix"`, `git branch -M main`, `git remote add origin URL`, `git push -u origin main --force` (`--force` menimpa isi lama yang memang salah). |
| Halaman “Konfigurasi belum lengkap” | `config.js` belum diisi `GAS_URL`/`GOOGLE_CLIENT_ID`. Isi, simpan, lalu `git add . && git commit -m "config" && git push`. |
| Tombol Google tidak muncul / “Error 400: origin_mismatch” | Di Google Cloud → Kredensial → Client ID → **Asal JavaScript** harus persis `https://USERNAME.github.io` (tanpa nama repo). Tunggu 5 menit setelah mengubah. |
| “Token tidak ditujukan untuk aplikasi ini” | `GOOGLE_CLIENT_ID` di `Kode.gs` berbeda dengan di `config.js`. Samakan, lalu **deploy versi baru**. |
| “Akses Ditolak” padahal akun benar | Email belum didaftarkan/dinonaktifkan di **Kelola Pengguna**. Superadmin pertama = akun yang menjalankan `setupAppEnvironment`. |
| “Backend belum disetup” | Jalankan `setupAppEnvironment` (Tahap 3) pada proyek Apps Script yang sama dengan yang di-deploy. |
| Perubahan kode backend tidak berefek | Anda belum membuat **versi baru** pada deployment (lihat Tahap 4). |
| `Password authentication is not supported` | Pakai Personal Access Token (Tahap 7d). |
| Sertifikat gagal dibuat | Pastikan template Slides ada (Pengaturan → Buat template bawaan) dan ada tanda tangan/nama pejabat. Cek **Eksekusi** di editor Apps Script untuk pesan galat. |
| Email tidak terkirim | Kuota harian Gmail terpakai (Gratis ±100/hari, Workspace ±1.500/hari). Sisa antrean dikirim otomatis keesokan harinya oleh trigger. |
| Data lama muncul setelah update | Tekan **Ctrl+Shift+R**, atau menu pengguna → **Muat ulang data**. |

---

## Keamanan & Batasan

- **Jangan** membagikan spreadsheet database ke orang lain; semua akses data lewat aplikasi.
- Data mahasiswa **tidak** ada di GitHub. Repository hanya berisi tampilan.
- Peran dicek **di server** pada setiap permintaan; menyembunyikan menu di layar hanya kosmetik.
- Batas Google Apps Script: eksekusi maksimal 6 menit (cetak sertifikat dipecah per 3 mahasiswa), email harian terbatas (lihat kuota di halaman **Cetak Sertifikat**).
- Cadangan otomatis dibuat harian di folder **SIPENA/Exports** (14 terakhir disimpan).
- Aplikasi diuji untuk ±1.000 mahasiswa dan 30 kelas; perpindahan halaman bersifat lokal (tanpa menunggu server).
