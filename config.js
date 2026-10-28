// ============================================================
// SIPENA — config.js
// Satu-satunya file yang perlu Anda sunting sebelum deploy.
// ============================================================
window.SIPENA_CONFIG = {
  // URL Web App Google Apps Script (berakhiran /exec) — dari Deploy > New deployment
  GAS_URL: 'https://script.google.com/macros/s/AKfycbym1SVvao38AQT6kBNftgXXzx6LTRaPuIJyT5ePc6jqtn_KcMsVBSdD9DvLgcJE8Orv/exec',

  // OAuth Client ID (Google Cloud Console). HARUS sama dengan GOOGLE_CLIENT_ID di Kode.gs
  GOOGLE_CLIENT_ID: '885566076576-0e8gkurret0n83g3ggdhdmhqjjbagjan.apps.googleusercontent.com',

  APP_NAME: 'SIPENA',
  // Interval muat ulang data otomatis di latar belakang (menit)
  REFRESH_MENIT: 5
};
