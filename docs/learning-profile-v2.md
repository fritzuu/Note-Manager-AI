# Profil belajar dan engine v2

Perubahan implementasi 10 Oktober 2026. Tidak menjalankan preview, build, lint, tes, pelatihan ulang, atau pemeriksaan layanan.

## Formulir

Empat bagian: tentang kamu, waktu belajar, istirahat dan kondisi diri, keseharian. Seluruh 14 masukan tetap tersedia. Dropdown memakai komponen bersama. Nilai numerik bisa digeser atau diketik. Pengaturan Gemini/OpenRouter/key/model tetap tersedia lewat Koneksi asisten; tidak menjadi syarat pengisian profil.

Jawaban lama yang angkanya masih memiliki arti yang jelas diisi kembali. Gender lama 0=laki-laki/1=perempuan dibalik saat ditampilkan di formulir v2 agar maknanya tetap sama. Pola makan, internet, dan pendidikan lama tidak ditebak: user memilih kembali karena kelompok dan skala lama berbeda dengan data latih. Dokumen lama tidak diubah sampai user menyimpan.

## Kontrak data

`schemaVersion: 2`. Gender perempuan=0/laki-laki=1/lainnya=2. Pola makan 0–3. Internet 0–2. Pendidikan SMA=0/sarjana=1/magister=2/doktor=3; di bawah SMA=4/diploma=5. Kategori yang tidak ada dalam data latih tetap bisa disimpan, tetapi menggunakan ringkasan aturan; tidak dikonversi paksa menjadi kelompok lain untuk model.

Server memeriksa seluruh 14 field, tipe angka finite, rentang, kategori integer, dan versi. Masukan lama tanpa versi tidak ditafsir ulang secara diam-diam: API meminta pembaruan profil. Layanan Python memiliki kontrak kategori/rentang yang sama untuk kategori yang didukung model.

## Hasil

- Model tetap klasifikasi Low/Average/Good/Excellent. Probabilitas berupa persen 0–100; tidak menebak apakah nilai <=1 merupakan pecahan. Hasil model divalidasi sebelum dipakai.
- Skor kebiasaan berasal dari aturan yang sama pada semua hasil, bukan confidence model dan bukan prediksi nilai ujian. Aturan ini adalah ringkasan produk, belum divalidasi sebagai pengukuran akademik.
- Saran, kekuatan, dan kebiasaan yang perlu perhatian dihitung dari aturan bersama di web. Ambang kategori pola makan/internet sudah memakai skala yang benar. Tidur >9 jam tidak lagi otomatis diberi catatan positif.
- Fallback menggunakan kode kelompok yang sama, namun kategori fallback dihitung dari skor aturan, bukan hasil model. UI membedakan sumbernya. Confidence fallback adalah null, bukan angka tetap 88%.
- Semua hasil menyimpan `engineVersion`, `scoreKind`, `modelVersion`, `fallbackReason`, snapshot profil, dan tanda kesamaan masukan.
- Penyimpanan hasil memeriksa snapshot terhadap profil terkini. Hasil lama atau berbeda profil tidak digunakan oleh pembaca `getAcademicInsight`; dokumennya tetap ada sampai diperbarui. Dengan demikian dashboard/tugas/diskusi tidak lagi mengambil hasil usang melalui helper tersebut.
- Risiko untuk tugas tidak memakai pencocokan teks label. Sinyal profil dibatasi menjadi 20–70 dengan titik netral 40: `40 + (60 - skor) × 0,5`. Ini pengaruh sekunder untuk kompatibilitas prioritas tugas, bukan estimasi probabilitas kegagalan. Tanpa hasil valid dipakai titik netral. Deadline, kepentingan, progres, dan kesulitan tetap menjadi masukan tugas.

## Python dan pelatihan

Service dan CLI memakai kontrak input yang sama. Service tidak lagi mengubah confidence menjadi angka nilai, atau memiliki kumpulan saran terpisah dari aturan web. Artefak lama masih dapat dibaca dan diberi versi `legacy-artifact-unversioned`; ini tidak membuktikan artefak tersebut cocok dengan pipeline terbaru.

Pipeline training sekarang mulai dari dataset mentah, memisahkan train/test sebelum imputasi dan scaling, mengisi nilai kosong dari statistik train saja, dan menyimpan metadata kategori, versi model, metrik, serta confusion matrix. Kolom exam_score hanya menentukan label, tidak menjadi masukan model. Probabilitas belum dikalibrasi dan dataset belum membuktikan ketepatan pada user aplikasi.

Artefak `.pkl` belum dilatih ulang atau diganti. Perubahan pipeline baru berlaku setelah training dijalankan. Layanan Python yang sudah berjalan perlu dimulai ulang/deploy ulang agar memakai kode baru; web tetap menyediakan hasil aturan bila layanan tidak tersedia. Tidak ada klaim akurasi baru.

## Batas pekerjaan

Ini memperbaiki kontrak profil, engine klasifikasi/ringkasan, pengaruh risiko, dan keterkaitan hasil dengan profil. Tidak menambahkan data screen time atau sesi fokus sebagai masukan model. Autentikasi dan pembatasan kuota server untuk endpoint percakapan tetap membutuhkan pekerjaan tersendiri. Percakapan sekarang memeriksa kecocokan profil/hasil, menghitung ulang skor dan catatan aturan di server, memvalidasi provider, serta membatasi panjang pertanyaan dan riwayat. Snapshot/validasi tidak menggantikan kontrol akses.
