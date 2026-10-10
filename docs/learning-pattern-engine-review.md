# Analisis engine Pola belajar

Catatan historis sebelum perbaikan. Implementasi lanjutannya dijelaskan di [Profil belajar v2](learning-profile-v2.md).

Tanggal: 10 Oktober 2026. Analisis berdasarkan kode sumber, formulir, pipeline pelatihan, dan struktur data dalam repository. Tidak menjalankan model, mengukur akurasi, memeriksa layanan produksi, atau membuka preview. Artefak model yang tersimpan belum dibandingkan dengan pipeline pelatihan.

## Cara kerja saat ini

1. Jawaban formulir disimpan di `academic_assessments`.
2. `/api/academic-insight` mengirim 14 masukan ke layanan Python dari `ML_API_URL`, dengan alamat bawaan `http://localhost:8000` dan batas tunggu 3,5 detik.
3. Pipeline Python menggunakan scaler, Random Forest classifier, dan encoder. Model memilih kelompok Low, Average, Good, atau Excellent; probabilitas kelompok terbesar disebut confidence.
4. Skor 0–100 dibuat dengan interpolasi rentang kelompok berdasarkan confidence. Ini bukan prediksi langsung atas `exam_score`.
5. Jika layanan tidak memberikan hasil, API memakai rumus berbobot sederhana. Saran dan catatan kebiasaan berasal dari aturan ambang, baik pada layanan Python maupun fallback.
6. Hasil disimpan di `academic_insights`, lalu digunakan kembali sampai diperbarui. Diskusi menggunakan Gemini atau OpenRouter, terpisah dari model klasifikasi.
7. `deriveAcademicRiskFromInsight` menurunkan risiko dari skor dan label. Risiko tersebut juga dipakai dalam perhitungan prioritas tugas.

## Temuan utama

### 1. Representasi formulir berbeda dengan data latih — prioritas pertama

| Masukan | Formulir saat ini | Pemetaan pipeline data latih |
| --- | --- | --- |
| Gender | Laki-laki 0, perempuan 1 | Male 1, Female 0 |
| Pola makan | Penilaian 1–5 | Poor 0, Fair 1, Good 2, Excellent 3 |
| Internet | Penilaian 1–5 | Poor 0, Average 1, Good 2 |
| Pendidikan orang tua | Lima kelompok 0–4, SMA/SMK 2 dan sarjana 3 | High School 0, Bachelor 1, Master 2, PhD 3 |

Sumber: `web/src/app/assessment/page.tsx`, `ml/eda/eda.py` sekitar baris 682–694. API Python langsung menerima angka tersebut tanpa konversi. Artinya model dapat membaca kategori yang salah atau kategori di luar domain latih. Pendidikan orang tua tidak dapat diselesaikan dengan pengurangan angka sederhana karena kelompok formulir dan kelompok dataset berbeda.

Perbaikan: definisikan satu kontrak kategori yang dipakai formulir, penyimpanan, API, preprocessing, dan training. Tambahkan versi profil agar data lama dapat dimigrasikan dengan jelas. Jangan diam-diam mengubah arti jawaban tersimpan. Evaluasi apakah gender dan pendidikan orang tua memang diperlukan untuk tujuan produk.

### 2. Skor yang dibuat bukan prediksi nilai ujian

Sumber: `ml/main.py`, `ml/predict.py`, `ml/train.py`.

Training menargetkan `performance_label`, bukan angka `exam_score`. Contoh aritmetika dari rumus: kelompok Good dengan confidence 50% menghasilkan 72; kelompok Good dengan confidence 90% menghasilkan 77,6. Dua angka ini dibuat dari rentang 65–79, bukan keluaran model regresi. Keyakinan terhadap kategori tidak menentukan posisi nilai di dalam kategori tersebut.

Perbaikan: gunakan kategori sebagai hasil utama. Jika produk benar-benar membutuhkan estimasi nilai, latih model regresi terpisah dan evaluasi kesalahan prediksinya. Jangan menjadikan skor buatan ini dasar janji kenaikan nilai.

### 3. Confidence tidak dapat diperlakukan sebagai akurasi

Fallback selalu mengembalikan `0.88`, tanpa pengukuran ketidakpastian. Layanan Python memakai probabilitas kelas terbesar; pipeline belum melakukan kalibrasi probabilitas. UI lama menampilkan “Data Validasi: 99.2%” secara tetap. Angka itu tidak berasal dari respons model.

Dalam redesign ini klaim 99,2% dan label “Terpercaya” dihapus. Confidence fallback tidak ditampilkan sebagai keyakinan model. Hasil lama tanpa sumber tidak diasumsikan berasal dari model. Hasil model baru menampilkan confidence hanya di detail, dengan penjelasan bahwa angka itu bukan akurasi. Angka fallback dalam API belum diubah, sehingga konsumen lain masih perlu diperiksa sebelum menghapus field tersebut.

### 4. Dua engine menghasilkan kategori dan penjelasan yang berbeda

Fallback memakai kategori Needs Academic Support / Moderate Performance / High Academic Performance, dengan batas 60 dan 80. Model memakai Low / Average / Good / Excellent dengan batas kategori dataset 50, 65, dan 80. Aturan penjelasan juga berbeda: misalnya belajar 2–4 jam tidak diberi catatan negatif oleh Python, tetapi termasuk kelemahan pada fallback. Tidur lebih dari 9 jam tetap diberi label positif oleh aturan, sedangkan bonus skor fallback hanya berlaku pada 7–9 jam.

Perbaikan: gunakan kategori baku dan aturan penjelasan yang sama; bedakan sumber hasil tanpa menyamakan reliabilitasnya. Aturan penjelasan perlu dinyatakan sebagai catatan profil, bukan penyebab prediksi model.

### 5. Risiko turunan ikut memengaruhi prioritas tugas

Sumber: `web/src/lib/fuzzyLogic.ts`, `web/src/lib/fuzzy/rules.ts`, halaman tasks/create/edit.

Risiko dimulai dari `100 - score`, kemudian berubah berdasarkan pencocokan teks. Label Excellent mengurangi 20, Good mengurangi 10, Low menambah 25. Label fallback High Academic Performance dan Needs Academic Support tidak cocok dengan cabang yang setara. Maka skor yang sama dapat menghasilkan risiko berbeda tergantung sumber dan ejaan label.

Perbaikan: gunakan kode kategori baku, bukan pencarian potongan kalimat. Definisikan pengaruh risiko terhadap tugas secara konsisten. Kesalahan masukan profil dapat menyebar ke prioritas tugas, sehingga kontrak masukan harus dibereskan sebelum memperkuat pengaruh risiko.

### 6. Validasi masukan dan respons masih lemah

API Next hanya memeriksa keberadaan jam belajar dan kehadiran. Tidak ada pemeriksaan semua field sebagai angka finite dengan batas yang sesuai. Masukan tidak lengkap dapat membuat fallback menghasilkan NaN, yang berubah menjadi null dalam JSON. Python mewajibkan field float tetapi tidak menetapkan batas kategori atau rentang. API Next juga menerima respons model tanpa memvalidasi struktur hasil.

Perbaikan: validasi semua masukan dan keluaran di server. Kembalikan kesalahan yang jelas saat profil tidak valid, jangan menyamarkannya menjadi hasil fallback yang terlihat normal. Redesign menolak respons baru yang skor atau daftar catatannya tidak valid sebelum disimpan; validasi server tetap perlu dibuat.

### 7. Evaluasi pelatihan perlu dipisahkan dengan benar

`ml/train.py` melakukan `scaler.fit_transform(X)` sebelum pembagian train/test. Statistik data test ikut masuk preprocessing. Dampaknya pada Random Forest mungkin kecil, tetapi prosedur evaluasinya tetap perlu dirapikan. Pengisian nilai kosong pada pipeline EDA juga dilakukan sebelum pembagian data.

Perbaikan: split data mentah dahulu, fit preprocessing hanya pada train, lalu transform test. Simpan versi dataset, kontrak fitur, konfigurasi model, metrik per kelas, confusion matrix, dan metrik kalibrasi bersama artefak. Jangan menampilkan angka akurasi produk sebelum ada bukti evaluasi yang dapat dilacak. Kode saat ini hanya mencetak hasil evaluasi; laporan EDA bukan bukti akurasi artefak yang sedang dilayani.

### 8. Hasil tersimpan belum terkait dengan versi profil

Halaman memuat hasil tersimpan dan profil terkini secara terpisah. Alur submit formulir mencoba regenerasi, tetapi jika gagal, hasil lama dapat tetap ada. Hasil tidak menyimpan snapshot/fingerprint profil atau versi model. Diskusi dapat memperoleh skor dari profil lama bersama jawaban profil baru.

Perbaikan: simpan fingerprint atau snapshot masukan dan versi engine bersama hasil. Tandai hasil perlu diperbarui saat profil berubah; gunakan snapshot yang sama untuk percakapan. Data screen time dan sesi fokus saat ini belum menjadi masukan engine ini, sehingga Pola belajar harus tetap disebut hasil profil, bukan analisis aktivitas langsung.

### 9. API diskusi perlu batas penggunaan

Route dalam repository belum melakukan verifikasi identitas pengguna, pembatasan ukuran history/pertanyaan, atau rate limit. Bila endpoint dapat diakses publik dan key server aktif, pemanggil dapat memakai kuota server. Client juga mengirim konteks insight sendiri; konteks tersebut belum diverifikasi dari profil tersimpan.

Perbaikan: verifikasi sesi pengguna, batasi panjang masukan/riwayat, atur kuota, timeout, dan validasi provider. Gunakan konteks profil yang diverifikasi bila hasil diskusi diperlakukan sebagai keluaran terpercaya. Prompt tetap bukan pengganti validasi server.

## Yang diubah dalam pekerjaan ini

- Desain halaman diganti: ringkasan utama, detail perhitungan, dua area kebiasaan, jawaban profil, dan percakapan.
- Fitur ubah profil, perbarui hasil, skor, kategori, risiko, saran, link tugas/fokus, pertanyaan cepat, rencana tujuh hari, salin, dan hapus percakapan tetap tersedia.
- Teks hasil engine yang dikenal disajikan dalam Bahasa Indonesia dengan kalimat lebih singkat.
- Respons model baru diberi metadata sumber; tipe data menyimpan sumber opsional untuk kompatibilitas hasil lama.
- Klaim akurasi tetap dihapus; prompt diskusi diperjelas agar tidak menganggap skor sebagai nilai ujian atau data profil sebagai aktivitas live.
- Regenerasi tidak menghilangkan hasil lama ketika pembaruan gagal. Pergantian akun dijaga agar respons lama tidak masuk ke tampilan akun lain.
- Rumus skor, data latih, artefak model, dan aturan prioritas tidak diubah. Perbaikan engine membutuhkan keputusan kontrak data serta evaluasi terpisah.

## Urutan perbaikan yang disarankan

1. Samakan arti masukan dan migrasikan profil lama secara eksplisit.
2. Validasi masukan/keluaran serta bakukan kategori dan sumber hasil.
3. Hubungkan hasil dengan snapshot profil dan versi model.
4. Rapikan perhitungan risiko dan peran skor ringkasan.
5. Latih/evaluasi ulang dengan pemisahan data yang benar; tentukan apakah kategori saja sudah cukup atau membutuhkan regresi.
6. Tambahkan kontrol penggunaan endpoint diskusi.

Kesimpulan: engine sudah memiliki jalur model, fallback, penyimpanan, dan diskusi. Masalah terbesar saat ini adalah konsistensi arti data dan penyajian hasil, bukan kurangnya fitur atau kebutuhan model yang lebih kompleks.
