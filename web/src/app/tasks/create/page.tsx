"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";
import {
  ChevronLeft,
  AlertTriangle,
  CalendarDays,
  Sparkles,
  Timer,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  BarChart2,
  BookOpen,
  Plus,
  Layers,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createTask, getAcademicInsight, getAssessment, getUserTasks, getEffectiveWorkspaces } from "@/lib/firestore";
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
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { cn } from "@/lib/utils";

// ── Badges and Visual Mappings ────────────────────────────────────────────────

const PRIORITY_BADGE_STYLE: Record<PriorityLevel, { bg: string; text: string; border: string; label: string; glow: string }> = {
  Critical: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20", label: "Urgent Priority", glow: "shadow-red-500/10" },
  High:     { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", label: "High Priority", glow: "shadow-amber-500/10" },
  Medium:   { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", label: "Medium Priority", glow: "shadow-blue-500/10" },
  Low:      { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", label: "Flexible Priority", glow: "shadow-emerald-500/10" },
};

const IMPORTANCE_PRESETS = [
  { value: 2, label: "Low (2)", desc: "Bisa santai / fleksibel" },
  { value: 5, label: "Normal (5)", desc: "Tugas mingguan standar" },
  { value: 8, label: "Important (8)", desc: "Tugas besar / Ujian" },
  { value: 10, label: "Critical (10)", desc: "Skripsi / Wajib selesai" },
];

const DIFFICULTY_PRESETS = [
  { value: 2, label: "Mudah (2)", desc: "Baca materi / Kuis kilat" },
  { value: 5, label: "Sedang (5)", desc: "Paper / Laporan praktikum" },
  { value: 8, label: "Sulit (8)", desc: "Coding rumit / Riset mendalam" },
];

function CreateTaskForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryWorkspace = searchParams.get("workspace");

  // Default deadline: 7 days from now
  const defaultDeadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  // Task form state
  const [form, setForm] = useState({
    title:       "",
    workspace:   queryWorkspace || "",
    description: "",
    deadline:    defaultDeadline,
    importance:  5,
    difficulty:  5,
    progress:    0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Dynamic user workspaces fetched from existing tasks
  const [existingWorkspaces, setExistingWorkspaces] = useState<string[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  // AI context loaded from Firestore
  const [academicRisk, setAcademicRisk] = useState(40);
  const [prediction, setPrediction] = useState<string>("—");
  const [academicScore, setAcademicScore] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [insight, userTasks] = await Promise.all([
          getAcademicInsight(user.uid).catch(() => null),
          getUserTasks(user.uid).catch(() => []),
          getAssessment(user.uid).catch(() => null),
        ]);

        if (insight) {
          setPrediction(insight.prediction || "—");
          setAcademicScore(insight.academicScore ?? null);
          setAcademicRisk(deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction));
        }

        // Extract distinct workspaces matching exactly what is on /tasks page
        let hidden: string[] = [];
        try {
          const saved = localStorage.getItem("mindflow_hidden_workspaces");
          if (saved) hidden = JSON.parse(saved);
        } catch {}

        const effective = getEffectiveWorkspaces(userTasks || [], hidden);
        setExistingWorkspaces(effective);

        // Pre-select workspace from URL or first available workspace
        if (queryWorkspace) {
          setForm((prev) => ({ ...prev, workspace: queryWorkspace }));
        } else if (!form.workspace && effective.length === 1) {
          setForm((prev) => ({ ...prev, workspace: effective[0] }));
        }
      } catch (e) {
        console.error("Failed to load user AI context and workspaces for task form:", e);
      } finally {
        setLoadingWorkspaces(false);
      }
    };
    load();
  }, [user, queryWorkspace]);

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
    if (name === "importance" || name === "difficulty") {
      let num = Number(value);
      if (isNaN(num)) num = 1;
      num = Math.max(1, Math.min(10, num));
      setForm((prev) => ({ ...prev, [name]: num }));
    } else if (name === "progress") {
      let num = Number(value);
      if (isNaN(num)) num = 0;
      num = Math.max(0, Math.min(100, num));
      setForm((prev) => ({ ...prev, [name]: num }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { setError("Judul tugas wajib diisi."); return; }
    if (!form.deadline)      { setError("Tenggat waktu (deadline) wajib diisi."); return; }

    setSaving(true);
    setError("");
    try {
      const selectedWs = form.workspace.trim() || "Umum";
      await createTask(user.uid, {
        title:                  form.title.trim(),
        workspace:              selectedWs,
        course:                 selectedWs,
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
      <DashboardShell fullWidth>
        <LoadingScreen label="Menyiapkan Formulir Tugas..." subtext="Menghubungkan konteks AI & profil belajar" fullHeight />
      </DashboardShell>
    );
  }

  const badgeStyle = PRIORITY_BADGE_STYLE[fuzzy.priorityLevel] || PRIORITY_BADGE_STYLE.Medium;
  const isMicro = pomodoro.label === "Micro";
  const totalSessions = !isMicro ? Math.max(1, Math.round(fuzzy.estimatedTotalMinutes / pomodoro.recommendedMinutes)) : 1;

  return (
    <DashboardShell fullWidth>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-primary transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali ke Papan Tugas
          </Link>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            Fuzzy AI Dynamic Engine
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: FORM (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-border p-6 shadow-xs">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
                  <Plus className="w-5 h-5" />
                </div>
                Tambah Tugas Baru
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Isi parameter tugasmu. Sistem AI akan otomatis memprioritaskan jadwal dan menghitung durasi fokus ideal.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl border border-border shadow-xs p-6 md:p-8 space-y-6"
            >
              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3.5">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-800 flex items-center justify-between" htmlFor="title">
                  <span>Nama Tugas <span className="text-red-500">*</span></span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Contoh: Tugas Paper Implementasi Neural Network"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-2xl border border-border bg-gray-50/50 focus:bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                />
              </div>

              {/* Workspace / Mata Kuliah - Dynamic from User's Tasks */}
              <div className="space-y-3 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-5 rounded-3xl border border-primary/15">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-2" htmlFor="workspace">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>Workspace / Mata Kuliah</span>
                  </label>
                  <span className="text-xs text-gray-400 font-semibold">
                    {loadingWorkspaces ? "Memuat workspace..." : `${existingWorkspaces.length} workspace terdeteksi`}
                  </span>
                </div>

                {/* Dynamic Workspaces Pill List */}
                <div className="flex flex-wrap gap-1.5">
                  {existingWorkspaces.map((preset) => {
                    const isSelected = (form.workspace || "").toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, workspace: isSelected ? "" : preset }))}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5",
                          isSelected
                            ? "bg-primary text-white border-primary shadow-xs ring-2 ring-primary/20"
                            : "bg-white text-gray-700 border-border hover:border-primary/40 hover:bg-primary-50/40"
                        )}
                      >
                        <BookOpen className="w-3 h-3 opacity-70" />
                        <span>{preset}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Workspace Custom Input with Datalist Autocomplete */}
                <div className="relative">
                  <input
                    id="workspace"
                    name="workspace"
                    type="text"
                    list="user-workspaces-datalist"
                    placeholder="Pilih dari tombol di atas atau ketik nama workspace kustom..."
                    value={form.workspace}
                    onChange={handleChange}
                    className="w-full h-11 px-3.5 rounded-xl border border-border bg-white text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                  />
                  <datalist id="user-workspaces-datalist">
                    {existingWorkspaces.map((ws) => (
                      <option key={ws} value={ws} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-800" htmlFor="description">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Instruksi tugas, referensi bab, atau link sumber..."
                  value={form.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-gray-50/50 focus:bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all leading-relaxed"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2" htmlFor="deadline">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span>Tenggat Waktu (Deadline) <span className="text-red-500">*</span></span>
                </label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-2xl border border-border bg-gray-50/50 focus:bg-white text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Sliders: Importance & Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* Importance */}
                <div className="space-y-3 bg-gray-50/60 p-4 rounded-2xl border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-gray-800" htmlFor="importance">
                      Tingkat Kepentingan: <span className="text-primary text-sm font-black">{form.importance}/10</span>
                    </label>
                  </div>
                  <input
                    id="importance"
                    name="importance"
                    type="range"
                    min={1}
                    max={10}
                    value={form.importance}
                    onChange={handleChange}
                    className="w-full accent-primary h-2 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    {IMPORTANCE_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, importance: p.value }))}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all text-left",
                          form.importance === p.value
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-gray-600 border-border hover:bg-gray-100"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-3 bg-gray-50/60 p-4 rounded-2xl border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-gray-800" htmlFor="difficulty">
                      Tingkat Kesulitan: <span className="text-primary text-sm font-black">{form.difficulty}/10</span>
                    </label>
                  </div>
                  <input
                    id="difficulty"
                    name="difficulty"
                    type="range"
                    min={1}
                    max={10}
                    value={form.difficulty}
                    onChange={handleChange}
                    className="w-full accent-primary h-2 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <div className="grid grid-cols-3 gap-1">
                    {DIFFICULTY_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, difficulty: p.value }))}
                        className={cn(
                          "px-1.5 py-1 rounded-lg text-[10px] font-semibold border transition-all text-center truncate",
                          form.difficulty === p.value
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-gray-600 border-border hover:bg-gray-100"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Slider (Advanced) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary transition-colors cursor-pointer"
                >
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{showAdvanced ? "Sembunyikan Opsi Lanjutan" : "Atur Progres Awal Tugas (Opsional)"}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-4 bg-gray-50/60 rounded-2xl border border-border space-y-2 animate-slide-up">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700" htmlFor="progress">
                        Progres Saat Ini: <span className="text-primary font-extrabold">{form.progress}%</span>
                      </label>
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
                      className="w-full accent-primary h-2 bg-gray-200 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <Link href="/tasks">
                  <Button type="button" variant="secondary" size="md">
                    Batal
                  </Button>
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={saving}
                  icon={<Plus className="w-4 h-4" />}
                  className="font-bold shadow-sm cursor-pointer"
                >
                  Simpan & Masukkan ke Papan
                </Button>
              </div>
            </form>
          </div>

          {/* RIGHT: AI PREVIEW (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-border p-6 shadow-xs space-y-6 sticky top-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-extrabold text-gray-900">Analisis AI Fuzzy & Pomodoro</h2>
                </div>
                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", badgeStyle.bg, badgeStyle.text, badgeStyle.border)}>
                  {badgeStyle.label}
                </span>
              </div>

              {/* Priority Metric Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-gray-50/80 border border-border/80">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Skor Prioritas</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900">{fuzzy.priorityScore}</span>
                    <span className="text-xs text-gray-400 font-bold">/ 100</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50/80 border border-border/80">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Estimasi Beban</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900">{fuzzy.estimatedTotalMinutes}</span>
                    <span className="text-xs text-gray-400 font-bold">menit</span>
                  </div>
                </div>
              </div>

              {/* Pomodoro Recommendation */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-primary" />
                    <span className="text-xs font-extrabold text-primary-950">Rekomendasi Pomodoro</span>
                  </div>
                  <span className="text-[11px] font-extrabold bg-white text-primary px-2 py-0.5 rounded-md shadow-2xs border border-primary/20">
                    {pomodoro.label} ({pomodoro.recommendedMinutes}m)
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Disarankan membagi sesi pengerjaan menjadi <strong>{totalSessions} sesi fokus</strong> ({pomodoro.recommendedMinutes} menit fokus + {pomodoro.breakMinutes} menit istirahat).
                </p>
              </div>

              {/* AI Reasoning Text */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Alasan Prioritas Otomatis:
                </span>
                <p className="text-xs text-gray-600 bg-gray-50 p-3.5 rounded-2xl border border-border leading-relaxed">
                  {fuzzy.reasoning}
                </p>
              </div>

              {/* Profile Academic Context */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5 text-gray-400" />
                  Profil Risiko Akademik:
                </span>
                <span className="font-extrabold text-gray-800">
                  {prediction} ({academicScore !== null ? `Skor: ${academicScore}` : "Default"})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function CreateTaskPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell fullWidth>
          <LoadingScreen label="Menyiapkan Formulir Tugas..." subtext="Menghubungkan konteks AI & profil belajar" fullHeight />
        </DashboardShell>
      }
    >
      <CreateTaskForm />
    </Suspense>
  );
}
