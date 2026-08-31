"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";
import {
  ChevronLeft,
  AlertTriangle,
  CalendarDays,
  Sparkles,
  Timer,
  Zap,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  BarChart2,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createTask, getAcademicInsight, getAssessment } from "@/lib/firestore";
import {
  computePriorityDetailed,
  deadlineToDays,
  deriveAcademicRiskFromInsight,
  type FuzzyDetailedResult,
  type PriorityLevel,
} from "@/lib/fuzzyLogic";
import { computePomodoroFocus } from "@/lib/pomodoroFuzzy";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// ── Badges and Visual Mappings ────────────────────────────────────────────────

const PRIORITY_BADGE_STYLE: Record<PriorityLevel, { bg: string; text: string; border: string; label: string; glow: string }> = {
  Critical: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20", label: "Urgent Priority", glow: "shadow-red-500/10" },
  High:     { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", label: "High Priority", glow: "shadow-amber-500/10" },
  Medium:   { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", label: "Medium Priority", glow: "shadow-blue-500/10" },
  Low:      { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", label: "Flexible Priority", glow: "shadow-emerald-500/10" },
};

const IMPORTANCE_PRESETS = [
  { value: 2, label: "Low", desc: "Bisa santai / fleksibel" },
  { value: 5, label: "Normal", desc: "Tugas mingguan standar" },
  { value: 8, label: "Important", desc: "Tugas besar / Ujian" },
  { value: 10, label: "Critical", desc: "Skripsi / Wajib selesai" },
];

const DIFFICULTY_PRESETS = [
  { value: 2, label: "Mudah", desc: "Baca materi / Kuis kilat" },
  { value: 5, label: "Sedang", desc: "Paper / Laporan praktikum" },
  { value: 8, label: "Sulit", desc: "Coding rumit / Riset mendalam" },
];

export default function CreateTaskPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Default deadline: 7 days from now
  const defaultDeadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  // Task form state
  const [form, setForm] = useState({
    title:       "",
    description: "",
    deadline:    defaultDeadline,
    importance:  5,
    difficulty:  5,
    progress:    0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // AI context loaded from Firestore
  const [academicRisk, setAcademicRisk] = useState(40);
  const [prediction, setPrediction] = useState<string>("—");
  const [academicScore, setAcademicScore] = useState<number | null>(null);
  const [aiContextReady, setAiContextReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [insight] = await Promise.all([
          getAcademicInsight(user.uid),
          getAssessment(user.uid),
        ]);
        if (insight) {
          const derived = deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction);
          setAcademicRisk(derived);
          setPrediction(insight.prediction);
          setAcademicScore(insight.academicScore);
        }
        setAiContextReady(true);
      } catch {
        setAiContextReady(true);
      }
    };
    load();
  }, [user]);

  // Derived priority & pomodoro values
  const deadlineDays = form.deadline ? deadlineToDays(new Date(form.deadline)) : 7;

  const fuzzy: FuzzyDetailedResult = useMemo(
    () =>
      computePriorityDetailed({
        deadlineDays,
        importance:   form.importance,
        difficulty:   form.difficulty,
        progress:     form.progress,
        academicRisk,
      }),
    [deadlineDays, form.importance, form.difficulty, form.progress, academicRisk]
  );

  const pomodoro = useMemo(
    () => computePomodoroFocus(fuzzy.priorityScore, form.difficulty, fuzzy.estimatedTotalMinutes),
    [fuzzy.priorityScore, form.difficulty, fuzzy.estimatedTotalMinutes]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "importance" || name === "difficulty" || name === "progress"
        ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { setError("Judul tugas wajib diisi."); return; }
    if (!form.deadline)      { setError("Tenggat waktu (deadline) wajib diisi."); return; }

    setSaving(true);
    setError("");
    try {
      await createTask(user.uid, {
        title:                  form.title.trim(),
        description:            form.description.trim(),
        deadline:               Timestamp.fromDate(new Date(form.deadline)),
        importance:             form.importance,
        difficulty:             form.difficulty,
        progress:               form.progress,
        academicRisk,
        priorityScore:          fuzzy.priorityScore,
        priorityLevel:          fuzzy.priorityLevel,
        riskLevel:              fuzzy.riskLevel,
        estimatedTotalMinutes:  fuzzy.estimatedTotalMinutes,
        reasoning:              fuzzy.reasoning,
        status:                 "todo",
      });
      router.push("/tasks");
    } catch (err) {
      console.error(err);
      setError("Gagal menyimpan tugas. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  const badgeStyle = PRIORITY_BADGE_STYLE[fuzzy.priorityLevel] || PRIORITY_BADGE_STYLE.Medium;
  const isMicro = pomodoro.label === "Micro";
  const totalSessions = !isMicro ? Math.max(1, Math.round(fuzzy.estimatedTotalMinutes / pomodoro.recommendedMinutes)) : 1;

  return (
    <DashboardShell fullWidth>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <Link
              href="/tasks"
              className="p-2.5 rounded-xl border border-border hover:bg-primary-50 hover:border-primary/40 text-gray-500 hover:text-primary transition-all shadow-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
                Tambah Tugas Baru
                <span className="text-xs md:text-sm font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  AI-Powered
                </span>
              </h1>
              <p className="text-sm md:text-base text-gray-500 mt-1">
                Atur tugas belajarmu, AI akan otomatis menghitung prioritas dan jadwal fokus terbaik.
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scale-in">

          {/* ════════════════════════════════════════════
              LEFT PANEL: Simple & Intuitive Task Form (7 Cols)
          ════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-5">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-border shadow-card p-6 md:p-8 space-y-6"
            >
              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm md:text-base rounded-xl px-4 py-3.5">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm md:text-base font-bold text-gray-800 flex items-center justify-between" htmlFor="title">
                  <span>Nama Tugas / Mata Kuliah <span className="text-red-500">*</span></span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Contoh: Tugas Paper AI & Machine Learning"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full h-12 md:h-13 px-4 rounded-xl border border-border bg-white text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm md:text-base font-bold text-gray-800" htmlFor="description">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Instruksi tugas, referensi bab, atau link sumber..."
                  value={form.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all leading-relaxed"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <label className="text-sm md:text-base font-bold text-gray-800 flex items-center gap-2" htmlFor="deadline">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <span>Tenggat Waktu (Deadline) <span className="text-red-500">*</span></span>
                </label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-white text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                />
                {form.deadline && (
                  <div className="flex items-center gap-2 pt-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className={cn(
                      "text-sm font-bold",
                      deadlineDays < 0 ? "text-red-600" : deadlineDays < 2 ? "text-red-500" : deadlineDays < 5 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {deadlineDays < 0 ? `Terlambat ${Math.abs(Math.round(deadlineDays))} hari` : deadlineDays < 1 ? "Jatuh tempo HARI INI!" : `Sisa waktu: ${Math.round(deadlineDays)} hari lagi`}
                    </span>
                  </div>
                )}
              </div>

              {/* Importance Preset Buttons */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm md:text-base font-bold text-gray-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Tingkat Kepentingan
                  </label>
                  <span className="text-xs md:text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                    Skala: {form.importance} / 10
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {IMPORTANCE_PRESETS.map((p) => {
                    const isSelected = Math.abs(form.importance - p.value) <= 1.5;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, importance: p.value }))}
                        className={cn(
                          "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30 shadow-sm"
                            : "border-border hover:border-gray-300 text-gray-700 bg-gray-50/70"
                        )}
                      >
                        <span className="text-sm font-extrabold">{p.label}</span>
                        <span className="text-xs text-gray-500 leading-snug mt-1">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Preset Buttons */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm md:text-base font-bold text-gray-800 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-primary" />
                    Tingkat Kesulitan
                  </label>
                  <span className="text-xs md:text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                    Skala: {form.difficulty} / 10
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {DIFFICULTY_PRESETS.map((p) => {
                    const isSelected = Math.abs(form.difficulty - p.value) <= 1.5;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, difficulty: p.value }))}
                        className={cn(
                          "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30 shadow-sm"
                            : "border-border hover:border-gray-300 text-gray-700 bg-gray-50/70"
                        )}
                      >
                        <span className="text-sm font-extrabold">{p.label}</span>
                        <span className="text-xs text-gray-500 leading-snug mt-1">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm md:text-base font-bold text-gray-800" htmlFor="progress">
                    Progres Pengerjaan Saat Ini
                  </label>
                  <span className="text-sm font-extrabold text-primary bg-primary/10 px-3 py-0.5 rounded-full">{form.progress}% Selesai</span>
                </div>
                <input
                  id="progress"
                  name="progress"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.progress}
                  onChange={handleChange}
                  className="w-full h-2.5 rounded-full appearance-none bg-gray-200 accent-primary cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button type="submit" variant="primary" size="lg" loading={saving} className="flex-1 py-3 text-base font-bold shadow-md">
                  {saving ? "Menyimpan Tugas..." : "Simpan Tugas"}
                </Button>
                <Link href="/tasks">
                  <Button type="button" variant="outline" size="lg" className="py-3 text-base font-semibold">Batal</Button>
                </Link>
              </div>
            </form>
          </div>

          {/* ════════════════════════════════════════════
              RIGHT PANEL: Clean AI Smart Summary (5 Cols)
          ════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-5">

            {/* Smart AI Recommendation Card */}
            <div className="bg-gradient-to-br from-white to-gray-50/90 rounded-2xl border border-border shadow-card p-6 space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Rekomendasi Pintar AI</h3>
                    <p className="text-xs md:text-sm text-gray-500">Dihitung otomatis berdasarkan deadline & profil belajarmu</p>
                  </div>
                </div>
              </div>

              {/* Priority Status Hero */}
              <div className={cn("p-5 rounded-2xl border flex items-center justify-between shadow-sm", badgeStyle.bg, badgeStyle.border)}>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Prioritas</p>
                  <p className={cn("text-xl md:text-2xl font-black", badgeStyle.text)}>
                    {badgeStyle.label}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-gray-900 leading-none">
                    {fuzzy.priorityScore}
                    <span className="text-sm text-gray-400 font-medium">/100</span>
                  </div>
                  <span className="text-xs text-gray-500 font-semibold">Skor Urgensi</span>
                </div>
              </div>

              {/* Focus & Pomodoro Recommendation */}
              <div className="p-5 rounded-2xl bg-white border border-border space-y-3.5 shadow-sm">
                <div className="flex items-center gap-2 text-sm md:text-base font-bold text-gray-900">
                  <Timer className="w-5 h-5 text-orange-500" />
                  Rekomendasi Sesi Pomodoro
                </div>

                <div className="flex items-center justify-between bg-orange-50/70 border border-orange-200/60 rounded-xl p-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                      {pomodoro.recommendedMinutes}m
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-bold text-gray-900">
                        Mode {pomodoro.label} Focus
                      </p>
                      <p className="text-xs md:text-sm text-gray-600">
                        Istirahat +{pomodoro.breakMinutes} menit tiap sesi
                      </p>
                    </div>
                  </div>
                  <span className="text-xs md:text-sm font-bold text-orange-700 bg-orange-100/90 px-3 py-1.5 rounded-full">
                    {isMicro ? "1 Sesi Singkat" : `${totalSessions} Sesi`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 pt-1 font-medium">
                  <span>Estimasi Total Waktu:</span>
                  <span className="font-bold text-gray-900 text-base">{fuzzy.estimatedTotalMinutes} Menit</span>
                </div>
              </div>

              {/* AI Insight Reason */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1.5">
                <p className="text-xs md:text-sm font-bold text-blue-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" /> Analisis & Saran AI
                </p>
                <p className="text-sm text-blue-950/90 leading-relaxed font-normal">
                  {fuzzy.reasoning}
                </p>
              </div>
            </div>

            {/* Expandable Advanced Math & Engine Details (For curious users / academic inspection) */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-bold text-gray-800">Detail Teknis AI & Logika Fuzzy</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs md:text-sm text-primary font-bold">
                  <span>{showAdvanced ? "Sembunyikan" : "Tampilkan"}</span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showAdvanced && (
                <div className="p-5 pt-0 border-t border-border space-y-4 bg-gray-50/50 text-sm">
                  <div className="p-4 rounded-xl bg-white border border-border space-y-2">
                    <p className="font-bold text-gray-900">Profil Akademik Mahasiswa</p>
                    <div className="grid grid-cols-2 gap-3 text-xs md:text-sm text-gray-600">
                      <div>Prediksi ML: <strong className="text-gray-900">{prediction}</strong></div>
                      <div>Academic Risk: <strong className="text-gray-900">{academicRisk}/100</strong></div>
                      {academicScore !== null && (
                        <div>Skor Akademik: <strong className="text-gray-900">{academicScore}</strong></div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-border space-y-2">
                    <p className="font-bold text-gray-900">Inferensi Mamdani Fuzzy (80 Aturan)</p>
                    <p className="text-xs text-gray-500">
                      Aturan aktif teratas: {fuzzy.activatedRules.length} aturan terpicu dengan metode defuzzifikasi Centroid.
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {fuzzy.activatedRules.slice(0, 4).map((rule) => (
                        <div key={rule.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-1">
                          <div className="flex justify-between font-bold text-gray-800">
                            <span>Rule #{rule.id}</span>
                            <span className="text-primary">{rule.conclusion} (α={rule.strength.toFixed(2)})</span>
                          </div>
                          <p className="text-gray-600 text-xs">{rule.conditions.join(" AND ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </DashboardShell>
  );
}
