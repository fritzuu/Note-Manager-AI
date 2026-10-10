/** Keep the actual provider failure visible without exposing account details. */
export function googleAuthErrorMessage(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "";
  const messages: Record<string, string> = {
    "auth/popup-blocked": "Jendela login Google diblokir browser. Izinkan popup untuk situs ini, lalu coba lagi. Jika memakai browser dalam aplikasi, coba buka situs di Chrome atau Safari.",
    "auth/popup-closed-by-user": "Jendela login Google ditutup sebelum selesai. Coba lagi dan selesaikan pemilihan akun. Jika jendelanya langsung tertutup, coba buka situs di Chrome atau Safari.",
    "auth/cancelled-popup-request": "Ada proses login Google lain yang masih terbuka. Selesaikan atau tutup jendela tersebut, lalu coba lagi.",
    "auth/unauthorized-domain": "Domain situs ini belum diizinkan untuk login Google di Firebase. Tambahkan domain ini ke Authorized domains pada pengaturan Authentication.",
    "auth/operation-not-allowed": "Login Google belum diaktifkan pada pengaturan Authentication Firebase.",
    "auth/network-request-failed": "Koneksi ke layanan login Google gagal. Periksa koneksi internet, lalu coba lagi.",
    "auth/web-storage-unsupported": "Browser tidak mengizinkan penyimpanan yang diperlukan untuk login. Izinkan penyimpanan situs atau coba browser lain.",
    "auth/invalid-api-key": "Konfigurasi Firebase situs ini belum valid. API key perlu diperiksa.",
    "auth/account-exists-with-different-credential": "Email ini sudah terdaftar dengan metode masuk lain. Gunakan metode yang dipakai saat mendaftar.",
    "auth/too-many-requests": "Terlalu banyak percobaan login. Tunggu sebentar sebelum mencoba lagi.",
    "auth/profile-timeout": "Google sudah mengautentikasi akunmu, tetapi profil belum selesai dimuat. Periksa koneksi lalu coba lagi.",
    "permission-denied": "Akses ke profil pengguna ditolak. Aturan akses Firestore perlu diperiksa.",
    "unavailable": "Profil pengguna belum bisa dimuat karena layanan sedang tidak tersedia. Coba lagi sebentar.",
  };
  if (code.startsWith("auth/api-key-not-valid")) return messages["auth/invalid-api-key"];
  if (messages[code]) return messages[code];
  return code ? `Login Google belum berhasil (kode: ${code}). Coba lagi atau laporkan kode ini.` : "Login Google belum berhasil. Coba lagi melalui Chrome atau Safari.";
}
