"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Brain, 
  Zap, 
  BarChart3, 
  Clock, 
  BookOpen, 
  Target,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Flame,
  Bot,
  Play,
  Pause,
  RotateCcw,
  Check,
  Layers,
  Award,
  SlidersHorizontal,
  HelpCircle,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/Button";

// FAQ Item Interface
interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "Apa itu MindFlow AI dan bagaimana cara kerjanya?",
    answer: "MindFlow AI adalah platform manajemen belajar pintar yang menggabungkan AI Assistant, sistem prioritas Logika Fuzzy, manajemen catatan, dan Pomodoro timer. Platform ini menyesuaikan antarmuka dan rekomendasi belajar berdasarkan hasil VARK assessment gaya belajar Anda."
  },
  {
    question: "Bagaimana VARK Learning Style Assessment membantu saya?",
    answer: "Assessment mendiagnosis apakah Anda tipe belajar Visual, Auditory, Read/Write, atau Kinesthetic. AI Assistant dan rangkuman catatan akan menyesuaikan format penjelasan agar sesuai dengan intuisi belajar Anda yang paling efektif."
  },
  {
    question: "Apa keunggulan Fuzzy Logic pada prioritas tugas?",
    answer: "Berbeda dari aplikasi to-do list biasa, MindFlow AI menghitung skor urgensi tugas secara matematis berdasarkan kombinasi tenggat waktu (deadline), tingkat kesulitan, dan estimasi waktu pengerjaan. Tugas paling penting otomatis muncul di urutan atas."
  },
  {
    question: "Apakah aplikasi ini gratis untuk mahasiswa/pelajar?",
    answer: "Ya, MindFlow AI 100% gratis untuk diakses oleh seluruh pelajar dan mahasiswa tanpa memerlukan kartu kredit atau komitmen berbayar."
  },
  {
    question: "Apakah data catatan dan akun saya aman?",
    answer: "Sangat aman. Seluruh data tersimpan terenkripsi menggunakan infrastruktur Firebase Cloud Store dengan aturan Firestore Security Rules yang ketat. Hanya Anda yang memiliki akses ke catatan pribadi Anda."
  }
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Active Interactive Tour Tab
  const [activeTab, setActiveTab] = useState<"assessment" | "notes" | "tasks" | "pomodoro" | "assistant">("assessment");
  
  // Interactive Pomodoro Demo State
  const [pomoTime, setPomoTime] = useState(1500); // 25 min
  const [pomoRunning, setPomoRunning] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Pomodoro Demo Ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pomoRunning && pomoTime > 0) {
      interval = setInterval(() => setPomoTime((prev) => prev - 1), 1000);
    } else if (pomoTime === 0) {
      setPomoRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomoRunning, pomoTime]);

  const formatPomoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleGetStarted = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background text-[#1F2937] font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      
      {/* ─────────────────────────────────────────────────────────────
          1. STICKY GLASS NAVBAR
      ────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/80 transition-all">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4D3E] via-[#2D6A4F] to-[#4F8A6B] flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-primary">MindFlow AI</span>
              <span className="text-[10px] font-semibold text-gray-500 tracking-wider uppercase">Smart Academic Hub</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
            <a href="#features" className="hover:text-primary transition-colors">Fitur Utama</a>
            <a href="#demo" className="hover:text-primary transition-colors">Preview Interactive</a>
            <a href="#workflow" className="hover:text-primary transition-colors">Cara Kerja</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGetStarted}
              className="hidden sm:inline-flex font-semibold"
            >
              Masuk
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGetStarted}
              className="font-bold shadow-md shadow-primary/25 hover:shadow-lg transition-all"
            >
              Mulai Gratis
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION WITH LOGIN-STYLE DARK GREEN GRADIENT ACCENTS
      ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 sm:pt-20 pb-20 sm:pb-32 px-6 sm:px-10 overflow-hidden">
        {/* Deep ambient glow blobs matching Login page BrandingPanel */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-br from-[#1B4D3E]/15 via-[#2D6A4F]/10 to-primary/5 blur-3xl rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 -right-24 w-[350px] h-[350px] bg-[#8BBF9F]/20 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] mb-6">
              Revolusi Cara Belajar Anda dengan <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#1B4D3E] via-[#2D6A4F] to-primary bg-clip-text text-transparent">
                Kecerdasan Buatan & Intuisi Personal
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed font-normal">
              MindFlow AI memetakan gaya belajar unik Anda, mengurutkan prioritas tugas secara otomatis dengan <strong>Fuzzy Logic</strong>, dan mendampingi studi Anda lewat <strong>AI Tutor</strong> personal.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16">
              <Button
                variant="primary"
                size="lg"
                onClick={handleGetStarted}
                className="w-full sm:w-auto font-bold text-base px-8 h-13 shadow-xl shadow-primary/30 hover:scale-[1.02] transition-transform"
              >
                Coba MindFlow AI Sekarang
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <a href="#demo" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto font-semibold text-base px-8 h-13 bg-white/80 hover:bg-white"
                >
                  <Play className="w-4 h-4 ml-1 fill-current text-primary" />
                  Lihat Demo Interaktif
                </Button>
              </a>
            </div>

            {/* Quick Proof Metrics */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 w-full max-w-3xl pt-8 border-t border-border/80">
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/60 backdrop-blur-sm border border-border/60">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#1B4D3E]">100%</span>
                <span className="text-xs text-gray-500 font-medium">Personalized VARK</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/60 backdrop-blur-sm border border-border/60">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#1B4D3E]">25/5 min</span>
                <span className="text-xs text-gray-500 font-medium">Pomodoro Focus</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/60 backdrop-blur-sm border border-border/60">
                <span className="text-2xl sm:text-3xl font-extrabold text-primary">AI Tutor</span>
                <span className="text-xs text-gray-500 font-medium">Respon Real-Time</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. INTERACTIVE PRODUCT SHOWCASE & SIMULATOR ("SHOW AND TELL")
      ────────────────────────────────────────────────────────────── */}
      <section id="demo" className="py-20 px-6 sm:px-10 bg-gradient-to-b from-transparent via-primary/5 to-transparent relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937] tracking-tight mb-4">
              Jelajahi Fitur Utama dalam Mode Live Preview
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">
              Klik tab di bawah ini untuk mensimulasikan bagaimana MindFlow AI membantu aktivitas studi Anda setiap hari.
            </p>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
            {[
              { id: "assessment", label: "🧠 1. VARK Assessment", icon: Brain },
              { id: "notes", label: "📝 2. Catatan Smart AI", icon: BookOpen },
              { id: "tasks", label: "⚡ 3. Prioritas Fuzzy", icon: Target },
              { id: "pomodoro", label: "⏱️ 4. Pomodoro Focus", icon: Clock },
              { id: "assistant", label: "🤖 5. AI Study Assistant", icon: Bot },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#1B4D3E] text-white shadow-lg shadow-[#1B4D3E]/20 scale-105"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Window Frame Mockup */}
          <div className="bg-white rounded-3xl border border-border shadow-2xl overflow-hidden max-w-5xl mx-auto">
            {/* Top Browser Bar */}
            <div className="bg-[#1F2937] text-white px-5 py-3.5 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-gray-400 ml-2 hidden sm:inline">https://mindflow.ai/app/{activeTab}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold bg-primary/20 text-[#8BBF9F] px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Interactive Mode
              </div>
            </div>

            {/* Mockup Canvas Content */}
            <div className="p-6 sm:p-10 min-h-[420px] bg-[#F8FAF8] flex flex-col justify-center">

              {/* TAB 1: ASSESSMENT */}
              {activeTab === "assessment" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Langkah Awal</span>
                      <h3 className="text-xl sm:text-2xl font-bold text-[#1F2937]">VARK Learning Style Diagnosis</h3>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">Teridentifikasi: Visual & Kinesthetic</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-white border border-border shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">V</div>
                        <h4 className="font-bold text-sm text-[#1F2937]">Visual Learner (45%)</h4>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Sangat efektif memahami diagram, bagan, dan warna. AI akan otomatis memvisualisasikan rangkuman catatan Anda.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-border shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">K</div>
                        <h4 className="font-bold text-sm text-[#1F2937]">Kinesthetic Learner (35%)</h4>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Suka belajar lewat praktek dan simulasi langsung. AI akan menyarankan tantangan studi & latihan soal singkat.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1B4D3E]/5 border border-[#1B4D3E]/20 text-xs text-[#1B4D3E] font-medium flex items-center gap-3">
                    <Brain className="w-5 h-5 shrink-0 text-[#1B4D3E]" />
                    <span>Hasil ini langsung menyinkronkan prompt AI Assistant dan cara penyampaian ringkasan materi Anda!</span>
                  </div>
                </div>
              )}

              {/* TAB 2: SMART NOTES */}
              {activeTab === "notes" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-6 h-6 text-primary" />
                      <h3 className="text-xl font-bold text-[#1F2937]">Catatan: "Algoritma Pencarian Grafo & AI"</h3>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-200 text-gray-700">Tersimpan Otomatis</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-border space-y-3 font-mono text-xs sm:text-sm">
                    <p className="text-gray-800 font-sans font-medium">
                      Pencarian A* menggunakan fungsi evaluasi <code className="bg-gray-100 px-1.5 py-0.5 rounded text-primary">f(n) = g(n) + h(n)</code> di mana g(n) adalah biaya awal dan h(n) adalah heuristik terestimasi.
                    </p>
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 font-sans text-xs text-primary-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <Sparkles className="w-4 h-4" /> Rangkuman AI Instan:
                      </div>
                      <p>1. Algoritma A* selalu optimal jika fungsi heuristik bersifat admissible (tidak overestimasi).</p>
                      <p>2. Cocok untuk pencarian rute terpendek dengan matriks bobot positif.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FUZZY TASKS */}
              {activeTab === "tasks" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h3 className="text-xl font-bold text-[#1F2937]">Prioritas Tugas Logika Fuzzy</h3>
                      <p className="text-xs text-gray-500">Mengkombinasikan Deadline + Bobot Kesulitan = Skor Urgensi</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-xs">High Urgency Mode</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { title: "Tugas Besar Artificial Intelligence - Fuzzy Engine", deadline: "Besok (11:59 PM)", priority: "SANGAT TINGGI (Skor 9.4)", color: "bg-rose-50 border-rose-200 text-rose-700" },
                      { title: "Review Jurnal Sistem Terdistribusi", deadline: "3 Hari lagi", priority: "SEDANG (Skor 6.2)", color: "bg-amber-50 border-amber-200 text-amber-700" },
                      { title: "Persiapan Presentasi Bahasa Inggris", deadline: "Minggu Depan", priority: "RENDAH (Skor 3.1)", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                    ].map((item, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${item.color}`}>
                        <div className="font-bold text-xs sm:text-sm">{item.title}</div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="opacity-80">Deadline: {item.deadline}</span>
                          <span className="font-black px-2 py-0.5 rounded bg-white/80">{item.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: POMODORO */}
              {activeTab === "pomodoro" && (
                <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in py-4">
                  <div className="text-center space-y-1">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">Sesi Fokus Belajar</span>
                    <h3 className="text-2xl font-bold text-[#1F2937]">Teknik Pomodoro</h3>
                  </div>

                  <div className="text-5xl sm:text-6xl font-black font-mono tracking-wider text-[#1B4D3E] bg-white px-8 py-4 rounded-3xl border border-border shadow-inner">
                    {formatPomoTime(pomoTime)}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant={pomoRunning ? "outline" : "primary"}
                      size="md"
                      onClick={() => setPomoRunning(!pomoRunning)}
                      className="font-bold"
                    >
                      {pomoRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {pomoRunning ? "Jeda Sesi" : "Mulai Fokus"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => { setPomoTime(1500); setPomoRunning(false); }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 5: AI ASSISTANT */}
              {activeTab === "assistant" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-3 border-b border-border pb-3">
                    <Bot className="w-6 h-6 text-primary" />
                    <div>
                      <h3 className="text-base font-bold text-[#1F2937]">MindFlow AI Tutor</h3>
                      <span className="text-xs text-emerald-600 font-semibold">● Online - Paham Profil Visual Anda</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="p-3.5 rounded-2xl bg-white border border-border max-w-md ml-auto text-right">
                      "Tolong jelaskan konsep Overfitting dalam Machine Learning secara singkat!"
                    </div>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1B4D3E] to-[#2D6A4F] text-white max-w-lg space-y-2 shadow-md">
                      <p className="font-semibold text-xs text-[#8BBF9F]">🤖 MindFlow AI (Visual Format):</p>
                      <p className="leading-relaxed text-xs sm:text-sm">
                        Bayangkan model seperti siswa yang <strong>menghafal kunci jawaban</strong> secara mentah alih-alih memahami konsep dasar. Hasilnya: Nilai 100 saat latihan, tapi <strong>gagal total</strong> saat ujian sebenarnya! 📈
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. HOW TO USE THE PROGRAM (STEP-BY-STEP DETAILED GUIDE)
      ────────────────────────────────────────────────────────────── */}
      <section id="workflow" className="py-20 sm:py-32 px-6 sm:px-10 bg-white relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full">
              Panduan Lengkap
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#1F2937] tracking-tight mt-4 mb-4">
              Bagaimana Cara Menggunakan MindFlow AI?
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">
              Empat langkah intuitif dari pendaftaran awal hingga otomatisasi produktivitas akademik harian Anda.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            
            {[
              {
                step: "01",
                title: "Daftar & Assessment VARK",
                desc: "Buat akun gratis dan selesaikan 5 pertanyaan assessment awal. Sistem menganalisis preferensi sensorik Anda (Visual, Auditory, Read/Write, Kinesthetic).",
                detail: "Menentukan warna tema, struktur catatan, dan gaya rekomendasi AI Tutor.",
                icon: SlidersHorizontal,
                color: "border-emerald-500/30 bg-emerald-50/50"
              },
              {
                step: "02",
                title: "Input Catatan & Task Board",
                desc: "Tulis materi perkuliahan dengan editor pintar. Tambahkan daftar tugas beserta estimasi deadline dan bobot kesulitannya.",
                detail: "Sistem Fuzzy Engine langsung menghitung skor urgensi setiap tugas.",
                icon: Layers,
                color: "border-blue-500/30 bg-blue-50/50"
              },
              {
                step: "03",
                title: "Jalankan Sesi Pomodoro",
                desc: "Pilih tugas teratas dari urutan prioritas Fuzzy, aktifkan timer fokus 25 menit, dan kumpulkan poin streak belajar tanpa distraksi.",
                detail: "Dilengkapi reminder jeda istirahat dan musik ambient produktivitas.",
                icon: Flame,
                color: "border-amber-500/30 bg-amber-50/50"
              },
              {
                step: "04",
                title: "Review Insight & AI Tutor",
                desc: "Konsultasikan topik sulit ke AI Assistant dan pantau statistik perkembangan jam belajar Anda lewat grafik visual real-time.",
                detail: "Menerima laporan progres bulanan dan evaluasi produktivitas.",
                icon: Award,
                color: "border-purple-500/30 bg-purple-50/50"
              }
            ].map((item, idx) => (
              <div 
                key={idx} 
                className={`p-8 rounded-3xl border ${item.color} flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-black text-[#1B4D3E]/30 group-hover:text-primary transition-colors">
                      {item.step}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-primary">
                      <item.icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[#1F2937] mb-3">
                    {item.title}
                  </h3>

                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-4">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200/80 text-xs font-semibold text-[#1B4D3E]">
                  💡 <strong>Detail:</strong> {item.detail}
                </div>
              </div>
            ))}

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. FEATURE CARDS GRID WITH RICH STYLING
      ────────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6 sm:px-10 bg-background">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937] mb-4">
              Semua Fitur Canggih dalam Satu Ekosistem
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">
              Dirancang khusus untuk mendukung performa akademik yang optimal dan terstruktur.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "Logika Fuzzy Smart Priority",
                desc: "Perhitungan matematika otomatis untuk menentukan urutan tugas paling mendesak berdasarkan waktu pengerjaan dan batas deadline."
              },
              {
                icon: BookOpen,
                title: "Rich Text Editor & Rangkuman AI",
                desc: "Editor catatan modern dengan dukungan format lengkap dan pembuatan ringkasan poin-poin penting secara otomatis."
              },
              {
                icon: Bot,
                title: "AI Personal Tutor 24/7",
                desc: "Asisten kecerdasan buatan yang siap menjawab pertanyaan materi kuliah sesuai dengan gaya belajar spesifik Anda."
              },
              {
                icon: Clock,
                title: "Pomodoro Timer & Focus Mode",
                desc: "Sistem manajemen waktu dengan metode 25/5 menit untuk menjaga konsentrasi tinggi dan mencegah burn out."
              },
              {
                icon: BarChart3,
                title: "Analytics & Insight Produktivitas",
                desc: "Visualisasi grafik data real-time untuk memantau durasi belajar, jumlah catatan, dan persentase kelulusan tugas."
              },
              {
                icon: ShieldCheck,
                title: "Aman & Terenkripsi Cloud",
                desc: "Penyimpanan data otomatis berbasis Firebase Security Rules yang memastikan catatan Anda tidak pernah hilang."
              }
            ].map((feat, idx) => (
              <div 
                key={idx} 
                className="p-8 rounded-3xl bg-white border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <feat.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1F2937] mb-2">{feat.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. FAQ ACCORDION SECTION
      ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-6 sm:px-10 bg-white">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs mb-3">
              <HelpCircle className="w-4 h-4" /> Pertanyaan Umum
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937]">
              Pertanyaan Sering Diajukan (FAQ)
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_DATA.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="rounded-2xl border border-border bg-background overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-6 text-left font-bold text-base sm:text-lg text-[#1F2937] flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/80 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-primary shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-gray-600 leading-relaxed border-t border-border/50 pt-4 bg-white">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. HIGH-IMPACT CTA BANNER MATCHING LOGIN BRANDING PANEL
      ────────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-6 sm:px-10 bg-gradient-to-br from-[#1B4D3E] via-[#2D6A4F] to-[#357A5B] text-white relative overflow-hidden">
        {/* Subtle Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md text-white font-bold text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-[#8BBF9F]" />
            Daftar Cepat Dalam 1 Menit
          </div>

          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Mulai Tingkatkan Performa Akademik Anda Sekarang
          </h2>

          <p className="text-white/80 text-base sm:text-xl max-w-2xl mx-auto font-normal leading-relaxed">
            Bergabunglah dan rasakan kemudahan mengelola tugas & catatan secara pintar dengan asisten AI yang dipersonalisasi.
          </p>

          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleGetStarted}
              className="bg-white text-[#1B4D3E] hover:bg-white/90 font-extrabold text-base px-10 h-14 shadow-2xl hover:scale-105 transition-transform"
            >
              Mulai Sekarang Gratis
              <ArrowRight className="w-5 h-5 ml-2 text-[#1B4D3E]" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs sm:text-sm text-white/70 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#8BBF9F]" /> Tanpa Kartu Kredit
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#8BBF9F]" /> Akses Penuh Asisten AI
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#8BBF9F]" /> Terenkripsi Safe & Secure
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. FOOTER
      ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-white text-gray-600">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1B4D3E] flex items-center justify-center text-white">
              <Brain className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-primary tracking-tight">MindFlow AI</span>
          </div>

          <p className="text-xs text-gray-500">
            © 2026 MindFlow AI. Powered by Advanced AI & Fuzzy Logic Technology.
          </p>
        </div>
      </footer>

    </div>
  );
}
