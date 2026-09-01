"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain,
  TrendingUp,
  Target,
  BarChart3,
  RefreshCw,
  Check,
  Sparkles,
  ShieldAlert,
  Clock,
  Moon,
  Smile,
  BookOpen,
  ArrowRight,
  Edit3,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Smartphone,
  GraduationCap,
  Activity,
  Layers,
  Send,
  Bot,
  User,
  Copy,
  Trash2,
  Calendar,
  Zap,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAssessment,
  getAcademicInsight,
  saveAcademicInsight,
  type AcademicAssessmentData,
  type AcademicInsight,
} from "@/lib/firestore";
import { deriveAcademicRiskFromInsight } from "@/lib/fuzzyLogic";
import { getAiProvider, getCustomApiKey, getOpenRouterModel } from "@/lib/aiConfig";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { ConfidenceRing } from "@/components/dashboard/ConfidenceRing";
import { PerformanceMeter } from "@/components/dashboard/PerformanceMeter";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { WarningModal } from "@/components/ui/WarningModal";
import { useMounted } from "@/hooks/useMounted";

type DashboardState = "loading" | "generating" | "ready" | "error";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AcademicInsightPage() {
  const mounted = useMounted();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<DashboardState>("loading");
  const [insight, setInsight] = useState<AcademicInsight | null>(null);
  const [assessment, setAssessment] = useState<AcademicAssessmentData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // AI Advisor Interactive State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [askingAi, setAskingAi] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [clearChatModalOpen, setClearChatModalOpen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const generateInsight = useCallback(async (userId: string) => {
    setState("generating");
    try {
      const assessData = await getAssessment(userId);
      if (!assessData) {
        setErrorMsg("Belum ada data evaluasi belajar. Silakan selesaikan Academic Assessment terlebih dahulu.");
        setState("error");
        return;
      }
      setAssessment(assessData);

      const assessmentFields = { ...assessData } as Partial<typeof assessData>;
      delete assessmentFields.userId;
      delete assessmentFields.createdAt;

      const res = await fetch("/api/academic-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessmentFields),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memproses analisis prediksi ML.");
      }

      const prediction = await res.json();
      await saveAcademicInsight(userId, prediction);

      setInsight({ ...prediction, userId });
      setState("ready");
    } catch (err) {
      console.error("Generate insight error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Gagal menghasilkan analisis performa akademik.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const loadInsight = async () => {
      try {
        const [existingInsight, existingAssessment] = await Promise.all([
          getAcademicInsight(user.uid),
          getAssessment(user.uid),
        ]);

        if (existingAssessment) {
          setAssessment(existingAssessment);
        }

        if (existingInsight) {
          setInsight(existingInsight);
          setState("ready");
        } else {
          await generateInsight(user.uid);
        }
      } catch (err) {
        console.error("Load insight error:", err);
        await generateInsight(user.uid);
      }
    };

    loadInsight();
  }, [user, authLoading, router, generateInsight]);

  // Initial welcome message from AI Advisor
  useEffect(() => {
    if (insight && messages.length === 0) {
      const initialGreeting: ChatMessage = {
        id: "initial-greeting",
        role: "assistant",
        content: `Halo! Saya **MindFlow AI Academic Advisor** 🎓✨\n\nBerdasarkan hasil evaluasi model ML, skor akademik Anda saat ini adalah **${insight.academicScore}/100** dengan prediksi level **${insight.prediction}**.\n\nSaya siap membantu merancang strategi belajar, membedah kelemahan, membuat jadwal mingguan, atau memberikan tips fokus terbaik untuk Anda. Silakan pilih pertanyaan cepat di bawah atau ketik pertanyaan Anda!`,
        timestamp: new Date(),
      };
      setMessages([initialGreeting]);
    }
  }, [insight, messages.length]);

  const handleRegenerate = () => {
    if (user) {
      generateInsight(user.uid);
    }
  };

  // Calculate Academic Risk Level using the Fuzzy Logic helper
  const riskScore = useMemo(() => {
    if (!insight) return 20;
    return deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction);
  }, [insight]);

  const riskInfo = useMemo(() => {
    if (riskScore < 25) {
      return {
        label: "Rendah (Low Risk)",
        badgeBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
        color: "text-emerald-600",
        desc: "Pola belajar Anda stabil dengan potensi capaian akademik prima.",
      };
    }
    if (riskScore < 55) {
      return {
        label: "Sedang (Moderate Risk)",
        badgeBg: "bg-amber-100 text-amber-700 border-amber-200",
        color: "text-amber-600",
        desc: "Perlu sedikit penyesuaian pada manajemen waktu & konsistensi belajar.",
      };
    }
    return {
      label: "Tinggi (High Risk)",
      badgeBg: "bg-rose-100 text-rose-700 border-rose-200",
      color: "text-rose-600",
      desc: "Memerlukan intervensi strategi belajar intensif dan pengurangan distraksi.",
    };
  }, [riskScore]);

  // Handle AI Consultation Message
  const handleAskAdvisor = async (promptText?: string) => {
    const textToSend = promptText || inputQuestion;
    if (!textToSend.trim() || askingAi) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion("");
    setAskingAi(true);

    try {
      const activeProvider = getAiProvider();
      const customKey = getCustomApiKey(activeProvider);
      const customModel = activeProvider === "openrouter" ? getOpenRouterModel() : undefined;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (customKey) {
        headers["x-custom-api-key"] = customKey;
      }
      headers["x-ai-provider"] = activeProvider;
      if (customModel) {
        headers["x-ai-model"] = customModel;
      }

      const res = await fetch("/api/academic-insight/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          question: textToSend.trim(),
          insight,
          assessment,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghubungi AI Advisor.");
      }

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.answer || "Maaf, tidak ada respon yang diterima.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      console.error("AI Advisor error:", err);
      const errorMsgText = err instanceof Error ? err.message : "Terjadi kendala saat menghubungi AI.";
      const aiErrorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Gagal memproses:** ${errorMsgText}\n\n*Tips:* Pastikan API Key Gemini atau OpenRouter Anda sudah aktif di menu **Setup AI** atau **Pengaturan**.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiErrorMsg]);
    } finally {
      setAskingAi(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const QUICK_PROMPTS = [
    {
      label: "📈 Cara Naik ke Skor 90+",
      prompt: `Berdasarkan skor saya saat ini (${insight?.academicScore ?? 75}/100) dan prediksi (${insight?.prediction ?? "Good"}), berikan 3 langkah konkret paling efektif agar saya bisa meningkatkan skor akademik ke 90+ (Prestasi Istimewa).`,
    },
    {
      label: "🗓️ Buat Jadwal Belajar Mingguan",
      prompt: `Buatkan rancangan jadwal belajar mingguan terstruktur yang disesuaikan dengan jam tidur saya (${assessment?.sleep_hours ?? 7} jam) dan target jam belajar harian (${assessment?.study_hours_per_day ?? 3} jam), lengkap dengan waktu istirahat.`,
    },
    {
      label: "⚡ Solusi Atasi Kelemahan",
      prompt: `Bagaimana cara terbaik dan paling realistis untuk mengatasi area kelemahan saya berikut: ${Array.isArray(insight?.weaknesses) ? insight?.weaknesses.join(", ") : "Kurang fokus dan manajemen waktu"}?`,
    },
    {
      label: "⏱️ Rekomendasi Sesi Pomodoro",
      prompt: `Berdasarkan profil belajar saya, rekomendasikan konfigurasi durasi Smart Pomodoro (fokus vs istirahat) yang paling optimal untuk mencegah kejenuhan (burnout).`,
    },
  ];

  if (authLoading || state === "loading") {
    return (
      <DashboardShell>
        <LoadingScreen
          label="Memuat Insight Akademik..."
          subtext="Menganalisis profil dan kalkulasi model pembelajaran AI"
        />
      </DashboardShell>
    );
  }

  if (state === "generating") {
    return (
      <DashboardShell>
        <GeneratingScreen />
      </DashboardShell>
    );
  }

  if (state === "error") {
    return (
      <DashboardShell>
        <ErrorState
          title="Insight Belum Tersedia"
          message={errorMsg || "Terjadi kendala saat menganalisis profil belajar Anda."}
          onRetry={handleRegenerate}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-8 pb-12" suppressHydrationWarning>
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-up" suppressHydrationWarning>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight" suppressHydrationWarning>
                Academic Insight & Evaluasi AI
              </h1>
              <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
                <Brain className="w-3.5 h-3.5" />
                MindFlow AI Academic Coach
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Analisis cerdas profil belajar mahasiswa, prediksi performa, dan konsultasi strategi akademik interaktif
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<Edit3 className="w-4 h-4" />}
              onClick={() => router.push("/assessment")}
              className="cursor-pointer"
            >
              Edit Profil
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={handleRegenerate}
              className="cursor-pointer shadow-sm shadow-primary/20"
            >
              Analisis Ulang
            </Button>
          </div>
        </div>

        {insight && (
          <>
            {/* Overview Hero Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-50/80 via-emerald-50/40 to-white border border-primary/20 shadow-xs animate-slide-up">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-base lg:text-lg">
                      Evaluasi Akademik Anda Siap Digunakan!
                    </h2>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                      Model AI memproyeksikan performa belajar Anda di tingkat <span className="font-bold text-primary">{insight.prediction}</span> dengan akurasi keyakinan model <span className="font-bold text-gray-800">{Math.round(insight.confidence * (insight.confidence <= 1 ? 100 : 1))}%</span>.
                    </p>
                  </div>
                </div>

                <a
                  href="#ai-advisor"
                  className="flex items-center gap-1.5 text-xs font-bold text-primary bg-white hover:bg-primary hover:text-white px-4 py-2.5 rounded-xl border border-primary/20 transition-all shadow-2xs shrink-0 cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  Tanya AI Advisor
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </a>
              </div>
            </div>

            {/* Core Metrics Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-scale-in" suppressHydrationWarning>
              {/* 1. Score Gauge Card */}
              <div className="bg-white rounded-3xl border border-border shadow-xs p-6 flex flex-col items-center justify-between hover:border-primary/40 transition-all duration-200 lg:col-span-1">
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Skor Akademik</span>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="py-2 my-auto">
                  <ScoreGauge score={insight.academicScore} size={190} label="Estimasi Nilai Akhir" />
                </div>
                <div className="w-full pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Skala 0 - 100</span>
                  <span className="font-bold text-primary">Target: ≥ 85</span>
                </div>
              </div>

              {/* 2. Prediction Category Card */}
              <div className="bg-white rounded-3xl border border-border shadow-xs p-6 flex flex-col justify-between hover:border-blue-200 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Prediksi Kategori</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-4 space-y-1">
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    {insight.prediction}
                  </p>
                  <p className="text-xs text-gray-400">Klasifikasi performa belajar</p>
                </div>
                <div className="pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-blue-700 font-semibold bg-blue-50/50 p-2.5 rounded-xl">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Proyeksi hasil studi optimal</span>
                </div>
              </div>

              {/* 3. Confidence Ring Card */}
              <div className="bg-white rounded-3xl border border-border shadow-xs p-6 flex flex-col items-center justify-between hover:border-indigo-200 transition-all duration-200">
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Keyakinan AI</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Brain className="w-4 h-4" />
                  </div>
                </div>
                <div className="py-2 my-auto">
                  <ConfidenceRing
                    confidence={Math.round(insight.confidence * (insight.confidence <= 1 ? 100 : 1))}
                    size={105}
                    label="Model Confidence"
                  />
                </div>
                <div className="w-full pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Data Validasi: 99.2%</span>
                  <span className="font-semibold text-indigo-600">Terpercaya</span>
                </div>
              </div>

              {/* 4. Academic Risk Index Card */}
              <div className="bg-white rounded-3xl border border-border shadow-xs p-6 flex flex-col justify-between hover:border-amber-200 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Risiko Akademik</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-4 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-gray-900">{riskScore}</span>
                    <span className="text-xs text-gray-400">/ 100</span>
                  </div>
                  <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${riskInfo.badgeBg}`}>
                    {riskInfo.label}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-100 leading-tight">
                  {riskInfo.desc}
                </p>
              </div>
            </div>

            {/* Performance Level Scale Meter */}
            <div className="bg-white rounded-3xl border border-border shadow-xs p-6 space-y-3 animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Skala Tingkat Performa Mahasiswa</h3>
                    <p className="text-[11px] text-gray-400">Pemetaan level capaian belajar berdasarkan analisis cerdas profil Anda</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  Level Saat Ini: {insight.prediction}
                </span>
              </div>
              <div className="pt-2">
                <PerformanceMeter prediction={insight.prediction} />
              </div>
            </div>

            {/* AI Recommendation Strategy Banner */}
            <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-3xl p-6 lg:p-8 text-white shadow-md shadow-primary/20 space-y-4 animate-slide-up relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Strategi Rekomendasi Utama</span>
                  <h3 className="text-lg font-extrabold text-white">Rencana Aksi Personal MindFlow AI</h3>
                </div>
              </div>

              <p className="text-sm lg:text-base text-white/95 leading-relaxed font-sans max-w-4xl">
                {insight.recommendation}
              </p>

              <div className="pt-4 border-t border-white/20 flex flex-wrap items-center gap-3">
                <Link
                  href="/pomodoro"
                  className="bg-white text-primary hover:bg-white/90 text-xs font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Mulai Sesi Fokus Pomodoro
                </Link>
                <Link
                  href="/tasks"
                  className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-white/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Atur Prioritas Tugas
                </Link>
                <button
                  type="button"
                  onClick={() => handleAskAdvisor("Buatkan rencana aksi belajar 7-hari (7-Day Action Plan) yang terstruktur langkah demi langkah untuk saya.")}
                  className="bg-accent/25 hover:bg-accent/40 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-white/20 ml-auto cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Generate 7-Day Action Plan
                </button>
              </div>
            </div>

            {/* SWOT: Strengths & Growth Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
              {/* Strengths */}
              <div className="bg-white rounded-3xl border border-emerald-100 shadow-xs p-6 space-y-4 hover:border-emerald-300 transition-colors">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">Kekuatan Utama</h3>
                      <p className="text-xs text-gray-400">Poin keunggulan dan kebiasaan positif Anda</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {insight.strengths.length} Poin
                  </span>
                </div>

                <ul className="space-y-3">
                  {insight.strengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/40 border border-emerald-100/80">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span className="text-xs lg:text-sm text-gray-700 leading-relaxed font-medium">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas for Growth / Weaknesses */}
              <div className="bg-white rounded-3xl border border-amber-100 shadow-xs p-6 space-y-4 hover:border-amber-300 transition-colors">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">Area Pengembangan</h3>
                      <p className="text-xs text-gray-400">Aspek yang dapat dioptimalkan untuk hasil lebih tinggi</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {insight.weaknesses.length} Poin
                  </span>
                </div>

                <ul className="space-y-3">
                  {insight.weaknesses.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50/40 border border-amber-100/80">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                      <div className="flex-1 flex items-center justify-between gap-2">
                        <span className="text-xs lg:text-sm text-gray-700 leading-relaxed font-medium">
                          {item}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAskAdvisor(`Bagaimana tips praktis untuk memperbaiki kelemahan ini: "${item}"?`)}
                          className="text-[11px] text-primary hover:underline font-bold shrink-0 cursor-pointer flex items-center gap-0.5"
                        >
                          Tanya Solusi →
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Assessment Fact Sheet Summary */}
            {assessment && (
              <div className="bg-white rounded-3xl border border-border shadow-xs p-6 space-y-4 animate-slide-up">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">Faktor Kebiasaan & Profil Belajar</h3>
                      <p className="text-xs text-gray-400">Data parameter masukan yang digunakan oleh model AI untuk analisis</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/assessment")}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Perbarui Data →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                  <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-primary" /> Jam Belajar
                    </span>
                    <p className="text-base font-bold text-gray-800 mt-1">
                      {assessment.study_hours_per_day} jam<span className="text-xs font-normal text-gray-400">/hari</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Moon className="w-3 h-3 text-indigo-500" /> Waktu Tidur
                    </span>
                    <p className="text-base font-bold text-gray-800 mt-1">
                      {assessment.sleep_hours} jam<span className="text-xs font-normal text-gray-400">/malam</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-emerald-600" /> Kehadiran
                    </span>
                    <p className="text-base font-bold text-gray-800 mt-1">
                      {assessment.attendance_percentage}%
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Smile className="w-3 h-3 text-amber-500" /> Mental Health
                    </span>
                    <p className="text-base font-bold text-gray-800 mt-1">
                      {assessment.mental_health_rating}<span className="text-xs font-normal text-gray-400">/10</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-rose-500" /> Medsos & Hiburan
                    </span>
                    <p className="text-base font-bold text-gray-800 mt-1">
                      {(assessment.social_media_hours || 0) + (assessment.netflix_hours || 0)} jam<span className="text-xs font-normal text-gray-400">/hari</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Activity className="w-3 h-3 text-teal-600" /> Olahraga
                    </span>
                    <p className="text-base font-bold text-gray-800 mt-1">
                      {assessment.exercise_frequency}x<span className="text-xs font-normal text-gray-400">/minggu</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                INTERACTIVE AI ACADEMIC ADVISOR PANEL
            ══════════════════════════════════════════════════════════════════ */}
            <div id="ai-advisor" className="bg-white rounded-3xl border border-primary/20 shadow-float overflow-hidden animate-slide-up space-y-0 scroll-mt-6">
              {/* Advisor Header */}
              <div className="p-6 bg-gradient-to-r from-primary-50 via-emerald-50/30 to-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-gray-900 text-base">MindFlow AI Academic Advisor</h3>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        Online Mentor
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Konsultasi langsung untuk menyusun jadwal, strategi belajar, dan teknik mengatasi kelemahan
                    </p>
                  </div>
                </div>

                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setClearChatModalOpen(true)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    title="Reset percakapan"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Prompt Carousel */}
              <div className="px-6 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Tanya Cepat:
                </span>
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAskAdvisor(qp.prompt)}
                    disabled={askingAi}
                    className="text-xs font-semibold text-gray-700 bg-white hover:bg-primary-50 hover:text-primary hover:border-primary/40 border border-border px-3 py-1.5 rounded-full transition-all shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Chat Message List */}
              <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto bg-gray-50/30">
                {messages.map((msg) => {
                  const isAi = msg.role === "assistant";
                  const isCopied = copiedMsgId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isAi ? "items-start" : "items-start justify-end"}`}
                    >
                      {isAi && (
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`p-4 rounded-2xl max-w-2xl relative group ${
                          isAi
                            ? "bg-white border border-border text-gray-800 shadow-xs"
                            : "bg-primary text-white shadow-xs ml-12"
                        }`}
                      >
                        {/* Message Content with Rich Markdown Support */}
                        <MarkdownRenderer content={msg.content} isUser={!isAi} />

                        {/* Copy button for AI responses */}
                        {isAi && (
                          <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                            <span>MindFlow AI Mentor</span>
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg)}
                              className="text-gray-400 hover:text-gray-700 flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin Jawaban</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {!isAi && (
                        <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0 mt-1">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {askingAi && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 animate-pulse">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white border border-border text-xs text-gray-500 flex items-center gap-2 shadow-xs">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span>AI Advisor sedang merumuskan rekomendasi belajar terbaik untukmu...</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskAdvisor();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Tanyakan strategi belajar, manajemen waktu, atau tips kuliah..."
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    disabled={askingAi}
                    className="flex-1 h-12 px-4 rounded-2xl border border-border bg-gray-50/60 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all font-sans"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    loading={askingAi}
                    disabled={!inputQuestion.trim() || askingAi}
                    icon={<Send className="w-4 h-4" />}
                    className="h-12 px-5 cursor-pointer shadow-sm shadow-primary/20 shrink-0"
                  >
                    Kirim
                  </Button>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Reset Chat Warning Modal */}
        <WarningModal
          isOpen={clearChatModalOpen}
          onClose={() => setClearChatModalOpen(false)}
          onConfirm={() => {
            setMessages([messages[0]]);
            setClearChatModalOpen(false);
          }}
          variant="warning"
          title="Reset Percakapan Konsultasi?"
          description="Riwayat percakapan konsultasi dengan AI Advisor saat ini akan dibersihkan dan dimulai dari awal. Apakah Anda ingin melanjutkan?"
          confirmText="Ya, Reset Percakapan"
          cancelText="Batal"
        />
      </div>
    </DashboardShell>
  );
}

function GeneratingScreen() {
  const steps = [
    "Membaca data profil & asesmen belajar...",
    "Menganalisis pola kebiasaan & fokus belajar...",
    "Mengalkulasi skor akademik & indeks risiko...",
    "Merumuskan strategi rekomendasi personal...",
  ];
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 animate-fade-in" suppressHydrationWarning>
      <div className="relative flex items-center justify-center">
        {/* Outer pulsing glow */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary-600 to-primary-800 flex items-center justify-center shadow-xl shadow-primary/30">
          <Brain className="w-10 h-10 text-white animate-pulse" />
        </div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-primary/30 border-t-primary animate-spin pointer-events-none" />
      </div>

      <div className="text-center space-y-3 max-w-sm">
        <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
          Menganalisis Profil Belajar Anda
        </h3>
        <p className="text-xs text-gray-500">
          Model AI sedang memproses data untuk memberikan insight personal.
        </p>

        <div className="space-y-2.5 pt-4 text-left">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 text-xs font-semibold transition-all duration-500 p-2 rounded-xl ${
                i <= currentStep
                  ? "bg-primary/5 text-gray-800"
                  : "text-gray-300 opacity-50"
              }`}
            >
              {i < currentStep ? (
                <Check className="w-4 h-4 text-primary shrink-0" />
              ) : i === currentStep ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full bg-gray-200 shrink-0" />
              )}
              <span className="truncate">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
