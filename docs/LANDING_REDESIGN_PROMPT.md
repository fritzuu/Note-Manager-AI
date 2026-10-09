Redesign landing page MindFlow AI pada branch landingpage agar menjelaskan produk yang benar-benar tersedia, terasa modern, punya identitas visual kuat, dan kaya animasi yang terarah. Kerjakan implementasi setelah prompt ini disetujui pengguna.

TARGET DAN CAKUPAN
- Fokus utama: web/src/app/landing/page.tsx. Pecah menjadi komponen khusus landing bila diperlukan.
- Pertahankan Next.js App Router, TypeScript, Tailwind CSS, Lucide, dan framer-motion yang sudah terpasang. Jangan tambah library animasi atau UI tanpa kebutuhan jelas.
- Pertahankan perilaku autentikasi: pengunjung bisa membuka landing tanpa login; pengguna yang sudah login tetap mengikuti redirect yang tersedia. Jangan ubah dashboard, backend, assessment, atau mekanisme auth untuk memenuhi desain.
- Gunakan Bahasa Indonesia yang natural, ringkas, dan spesifik. Hindari jargon pada copy utama.

KEJUJURAN KONTEN
Hapus “Trusted by students worldwide”, “50K+ Active Students”, “2M+ Tasks Completed”, “Join thousands”, testimoni Sarah/Alex/Jordan, klaim kenaikan GPA, dukungan 24/7, serta janji gratis selamanya dan unlimited yang belum punya dasar kebijakan produk. Hapus klaim note sharing/study group karena belum ditemukan implementasinya. Jangan ganti dengan angka pengguna, rating, logo kampus, atau kutipan rekaan lainnya.

Hapus klaim keamanan yang tidak dapat diverifikasi. Jangan mengatakan API key tidak pernah dikirim ke server: implementasi mengirim custom key melalui header ke API aplikasi. Jangan menjanjikan enkripsi end-to-end. Semua data pada mockup harus jelas diberi label “Contoh tampilan” atau “Data demo”. Insight akademik adalah estimasi untuk refleksi kebiasaan belajar, bukan jaminan nilai atau kenaikan IPK.

ARAH VISUAL
Buat tampilan workspace akademik yang rapi, editorial, dan terasa dibuat khusus untuk MindFlow. Pertahankan hijau sebagai identitas: forest green untuk aksi utama, latar ivory/off-white, teks charcoal, dan aksen sage; amber hanya untuk urgensi atau penanda tugas.

Gunakan hierarki tipografi kuat, judul dengan line-height rapat yang tetap terbaca, body yang nyaman, label kecil seperlunya, dan angka timer dengan tabular numerals. Maksimal dua keluarga font, utamakan font yang tersedia.

Variasikan komposisi: hero asimetris, preview aplikasi besar, daftar fitur yang terhubung dengan preview, serta satu bagian demonstrasi prioritas/fokus. Gunakan ruang kosong untuk memisahkan gagasan. Hindari semua section berupa tiga kartu identik, semua panel terlalu bulat, icon dalam kotak gradien berulang, glow berlebihan, blob dekoratif, emoji sebagai visual utama, dan paragraf marketing generik. Preview harus menyerupai UI aplikasi yang ada.

STRUKTUR HALAMAN

1. Navigasi
Logo MindFlow AI, anchor “Fitur”, “Cara kerja”, “Coba demo”, “FAQ”, serta CTA “Buat akun”. Sediakan menu mobile yang benar-benar bekerja, navigasi keyboard, dan scroll offset agar judul tidak tertutup navbar. Navbar boleh berubah halus saat melewati hero.

2. Hero
Headline awal: “Catatan rapi. Tugas terarah. Belajar lebih fokus.”
Deskripsi: “Tulis dan ringkas materi, tentukan tugas yang perlu didahulukan, lalu mulai sesi fokus yang sesuai dengan beban belajarmu.”
CTA utama “Buat akun” menuju /register. CTA sekunder “Jelajahi fitur” menuju demo produk dalam halaman. Gunakan /login untuk tautan “Masuk”.

Tampilkan preview dashboard yang berisi catatan, daftar prioritas tugas, timer adaptif, dan ringkasan aktivitas. Pakai contoh tugas mahasiswa yang masuk akal, misalnya review materi, laporan praktikum, dan revisi presentasi. Setelah pengantar selesai, pengguna boleh memilih tab preview. Jangan membuat tombol demo tanpa aksi.

3. Eksplorasi fitur
Buat enam kelompok fitur berikut. Setiap kelompok menjawab: apa yang bisa dilakukan, kapan berguna, dan seperti apa hasilnya. Gunakan contoh UI, bukan sekadar nama fitur.

A. Catatan dan ringkasan AI
Editor rich text dengan heading, highlight, list, tabel, gambar, dan code block; tag, pencarian, pin, arsip, serta template catatan. Tunjukkan contoh materi pendek yang menjadi konsep utama, poin penting, ringkasan, dan pertanyaan belajar. Sebutkan import Markdown, export Markdown/Word (.doc), serta cetak/simpan PDF melalui browser bila relevan. Jangan menjanjikan export .docx native.

B. Prioritas tugas
Workspace dan board Kanban untuk mengelola status tugas. Prioritas memperhitungkan deadline, kepentingan, kesulitan, progres, dan risiko akademik dari insight. Tampilkan skor, level Low/Medium/High/Critical, estimasi waktu, serta alasan prioritas dalam bahasa yang mudah dipahami. Jangan menyebut semuanya sebagai generative AI: scoring menggunakan fuzzy logic.

C. Pomodoro adaptif
Durasi standar 25/40/50 menit berdasarkan prioritas dan kesulitan, jeda 5/10/15 menit, serta sesi pendek untuk micro-task. Tampilkan pemilihan tugas, rekomendasi durasi, kontrol mulai/jeda/reset, dan riwayat sesi. Jelaskan bahwa durasi menyesuaikan tugas, bukan selalu 25 menit.

D. Insight akademik
Assessment kebiasaan belajar seperti durasi studi, kehadiran, tidur, dan distraksi menghasilkan estimasi performa, kekuatan, area pengembangan, dan saran tindakan. Ada Academic Advisor untuk mendiskusikan insight. Gunakan contoh sederhana tanpa mengiklankan akurasi model atau confidence sebagai akurasi teruji. Jangan membuat grafik korelasi atau prediksi hasil akademik tanpa sumber data.

E. Asisten belajar AI
Tanya jawab materi dengan konteks catatan yang disediakan aplikasi. Tampilkan contoh pertanyaan dan jawaban singkat yang jelas dilabeli ilustrasi. Sebutkan pilihan Gemini/OpenRouter; ketersediaan bergantung pada konfigurasi provider dan API key. Jangan menjanjikan AI unlimited, selalu tersedia, atau biaya provider nol.

F. Dashboard dan analitik
Widget dashboard bisa ditambah, dihapus, diurutkan, dan diubah ukurannya. Tampilkan kalender/deadline, catatan terbaru, tugas prioritas, timer, tren aktivitas tujuh hari, penyelesaian tugas, dan study streak. Jelaskan screen time sebagai aktivitas di dalam aplikasi, bukan pemantauan seluruh perangkat.

4. Demo interaktif
Sediakan dua demo ringan:
- Demo prioritas: ubah deadline dan kesulitan, lalu lihat prioritas, alasan, dan rekomendasi durasi berubah. Gunakan helper perhitungan produk bila bisa diimpor dengan aman; input lain tetap jelas pada nilai contoh. Jangan hardcode perubahan acak atau menyatakan demo memakai API live.
- Demo catatan: beralih antara “Materi asli” dan “Contoh ringkasan”. Tidak perlu memanggil provider AI atau meminta key pengunjung.

Timer demo harus benar-benar mendukung start/pause/reset. Batasi pilihan interaktif agar pengunjung memahami satu alur tanpa harus mempelajari seluruh aplikasi. Semua demo lokal tanpa menyimpan data ke akun.

5. Alur penggunaan
Jelaskan empat langkah pendek: buat akun, kenali kebiasaan lewat assessment, siapkan catatan dan tugas, lalu mulai fokus dan tinjau aktivitas. Hubungkan contoh visual dari langkah ke langkah agar terasa sebagai satu workflow.

6. FAQ
Jawab pertanyaan konkret: apa fungsi MindFlow, bagaimana prioritas ditentukan, apakah timer selalu 25 menit, apakah perlu API key sendiri, bagaimana insight digunakan, serta bagaimana membawa catatan keluar aplikasi. Bedakan akses aplikasi dari biaya atau kuota provider AI. Jangan mengarang kebijakan privasi, dukungan, atau pricing.

7. CTA dan footer
CTA penutup: “Siapkan ruang belajarmu berikutnya.” Tombol “Buat akun” dan link “Sudah punya akun? Masuk”. Footer ringkas dengan anchor fitur yang valid. Jangan gunakan href="#" atau tautan legal/download yang belum ada. Hindari pricing section sampai kebijakan harga dikonfirmasi.

MOTION DAN INTERAKSI
Gunakan banyak animasi yang memperlihatkan alur produk, dengan satu fokus visual pada satu waktu:
- Hero masuk berurutan: label, judul, deskripsi, CTA, lalu preview.
- Preview dashboard melakukan satu rangkaian: tugas diurutkan, catatan diringkas, rekomendasi fokus muncul.
- Transisi tab menggunakan AnimatePresence; pertahankan tinggi container supaya halaman tidak melompat.
- Reveal section dengan stagger pendek saat masuk viewport, umumnya hanya sekali.
- Perubahan skor memakai spring yang cepat dan tenang; urutan tugas memakai layout animation.
- Timer memiliki progres SVG dan transisi state yang halus.
- Preview widget menunjukkan perpindahan susunan secara singkat, dengan kontrol reset demo.
- FAQ accordion memiliki transisi tinggi/opacity dan status expanded yang benar.
- Hover/focus tombol serta kartu interaktif punya respons kecil; jangan memindahkan target klik.
- Parallax ringan hanya pada elemen dekoratif desktop; hilangkan jika mengganggu.

Utamakan transform dan opacity. Interaksi sekitar 150–250 ms, reveal 400–650 ms, stagger 50–90 ms. Hentikan loop di luar viewport. Demo berulang harus bisa dijeda, tanpa autoplay suara. Hormati prefers-reduced-motion: hentikan autoplay dan parallax, gunakan transisi minimal, dan tetap tampilkan seluruh konten. Jangan scroll hijacking, custom cursor, animasi loading palsu, atau ticker dekoratif yang mengganggu membaca.

RESPONSIVE, AKSESIBILITAS, DAN KUALITAS
- Desktop: lebar konten sekitar 1200–1280 px. Mobile: padding 20–24 px, susunan satu kolom, tanpa overflow horizontal.
- Preview tetap terbaca pada lebar 320–390 px; jangan mengecilkan screenshot desktop sampai teksnya tak terbaca.
- Gunakan satu h1, urutan heading benar, button/link semantik, focus ring terlihat, label kontrol, dan kontras yang cukup.
- Tab dan accordion bisa dipakai dengan keyboard; target sentuh sekitar 44 px. Konten penting tidak bergantung pada hover.
- Hindari hydration mismatch: akses window/localStorage setelah mount, nilai awal deterministik, dan pembersihan interval/listener.
- Jangan menunggu API, ML, atau Firebase berhasil untuk menampilkan materi demo pada landing.
- Ringan saat scroll; jangan tambah video besar, WebGL, atau aset berat tanpa alasan.

HASIL DAN VALIDASI
Implementasikan setelah pengguna menyetujui prompt. Tunjukkan landing yang berjalan, daftar perubahan utama, serta batas demo secara singkat. Verifikasi desktop dan mobile, CTA/anchor, tab, menu mobile, accordion, timer, reduced motion, dan console error. Jalankan pemeriksaan build/lint yang relevan; bila konfigurasi lingkungan menghalangi, laporkan hambatannya secara konkret.

Selesai bila pengunjung dapat memahami produk, mencoba interaksinya, dan melihat fitur pembeda MindFlow tanpa bergantung pada klaim pengguna, testimoni, atau hasil akademik rekaan.

