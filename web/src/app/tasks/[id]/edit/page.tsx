"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Clock,
  Target,
  BarChart2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getTask, updateTask, getAcademicInsight } from "@/lib/firestore";
import {
  computePriorityDetailed,
  deadlineToDays,
  deriveAcademicRiskFromInsight,
  type FuzzyDetailedResult,
  type PriorityLevel,
} from "@/lib/fuzzyLogic";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { computePomodoroFocus } from "@/lib/pomodoroFuzzy";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PRIORITY_BADGE_STYLE: Record<PriorityLevel, { bg: string; text: string; border: string; label: string }> = {
  Critical: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20", label: "Urgent Priority" },
  High:     { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", label: "High Priority" },
  Medium:   { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", label: "Medium Priority" },
  Low:      { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", label: "Flexible Priority" },
};

const IMPORTANCE_PRESETS = [
  { value: 2, label: "Low", desc: "Can be done anytime" },
  { value: 5, label: "Normal", desc: "Standard coursework" },
  { value: 8, label: "Important", desc: "Major assignment / Exam" },
  { value: 10, label: "Critical", desc: "Final project / Mandatory" },
];

const DIFFICULTY_PRESETS = [
  { value: 2, label: "Easy", desc: "Quick reading / Quiz" },
  { value: 5, label: "Medium", desc: "Standard essay / Lab" },
  { value: 8, label: "Hard", desc: "Complex coding / Thesis" },
];

export default function EditTaskPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
    importance: 5,
    difficulty: 5,
    progress: 0,
    status: "todo" as "todo" | "doing" | "done",
  });
  const [academicRisk, setAcademicRisk] = useState(40);
  const [prediction, setPrediction] = useState("—");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    const load = async () => {
      try {
        const [task, insight] = await Promise.all([
          getTask(taskId),
          getAcademicInsight(user.uid),
        ]);
        if (!task || task.userId !== user.uid) { router.push("/tasks"); return; }

        const deadlineDate = task.deadline?.toDate ? task.deadline.toDate() : new Date();
        setForm({
          title:       task.title,
          description: task.description,
          deadline:    deadlineDate.toISOString().split("T")[0],
          importance:  task.importance,
          difficulty:  task.difficulty,
          progress:    task.progress,
          status:      task.status,
        });

        if (insight) {
          setAcademicRisk(deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction));
          setPrediction(insight.prediction);
        } else {
          setAcademicRisk(task.academicRisk ?? 40);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, authLoading, taskId, router]);

  const deadlineDays = form.deadline ? deadlineToDays(new Date(form.deadline)) : 7;
  const preview: FuzzyDetailedResult = useMemo(
    () => computePriorityDetailed({ deadlineDays, importance: form.importance, difficulty: form.difficulty, progress: form.progress, academicRisk }),
    [deadlineDays, form.importance, form.difficulty, form.progress, academicRisk]
  );

  const pomodoro = useMemo(
    () => computePomodoroFocus(preview.priorityScore, form.difficulty, preview.estimatedTotalMinutes),
    [preview.priorityScore, form.difficulty, preview.estimatedTotalMinutes]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ["importance", "difficulty", "progress"].includes(name) ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { setError("Judul tugas wajib diisi."); return; }
    if (!form.deadline)      { setError("Deadline wajib diisi."); return; }
    setSaving(true);
    setError("");
    try {
      await updateTask(taskId, {
        title:                  form.title.trim(),
        description:            form.description.trim(),
        deadline:               Timestamp.fromDate(new Date(form.deadline)),
        importance:             form.importance,
        difficulty:             form.difficulty,
        progress:               form.progress,
        academicRisk,
        status:                 form.status,
        priorityScore:          preview.priorityScore,
        priorityLevel:          preview.priorityLevel,
        riskLevel:              preview.riskLevel,
        estimatedTotalMinutes:  preview.estimatedTotalMinutes,
        reasoning:              preview.reasoning,
      });
      router.push("/tasks");
    } catch (err) {
      console.error(err);
      setError("Gagal memperbarui tugas.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  const badgeStyle = PRIORITY_BADGE_STYLE[preview.priorityLevel] || PRIORITY_BADGE_STYLE.Medium;
  const isMicro = pomodoro.label === "Micro";
  const totalSessions = !isMicro ? Math.max(1, Math.round(preview.estimatedTotalMinutes / pomodoro.recommendedMinutes)) : 1;

  return (
    <DashboardShell fullWidth>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <Link
              href="/tasks"
              className="p-2 rounded-xl border border-border hover:bg-primary-50 hover:border-primary/40 text-gray-400 hover:text-primary transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Edit Tugas
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  AI-Powered
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Perbarui detail tugas dan lihat rekomendasi jadwal fokus terbaru.
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scale-in">

          {/* ════════════════════════════════════════════
              LEFT PANEL: Form (7 Cols)
          ════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-5">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-6"
            >
              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Status Pengerjaan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "todo", label: "To Do" },
                    { id: "doing", label: "In Progress" },
                    { id: "done", label: "Completed" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, status: s.id as any }))}
                      className={cn(
                        "py-2.5 rounded-xl border text-xs font-bold transition-all",
                        form.status === s.id
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-border hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide" htmlFor="edit-title">
                  Nama Tugas *
                </label>
                <input
                  id="edit-title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide" htmlFor="edit-description">
                  Catatan Tambahan
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  rows={2}
                  value={form.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5" htmlFor="edit-deadline">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Deadline *
                </label>
                <input
                  id="edit-deadline"
                  name="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {form.deadline && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className={cn(
                      "text-xs font-semibold",
                      deadlineDays < 0 ? "text-red-600" : deadlineDays < 2 ? "text-red-500" : deadlineDays < 5 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {deadlineDays < 0 ? `Terlambat ${Math.abs(Math.round(deadlineDays))} hari` : deadlineDays < 1 ? "Jatuh tempo HARI INI!" : `Sisa waktu: ${Math.round(deadlineDays)} hari lagi`}
                    </span>
                  </div>
                )}
              </div>

              {/* Importance Preset Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-primary" />
                    Tingkat Kepentingan
                  </label>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Skala: {form.importance} / 10
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {IMPORTANCE_PRESETS.map((p) => {
                    const isSelected = Math.abs(form.importance - p.value) <= 1.5;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, importance: p.value }))}
                        className={cn(
                          "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                            : "border-border hover:border-gray-300 text-gray-600 bg-gray-50/50"
                        )}
                      >
                        <span className="text-xs font-bold">{p.label}</span>
                        <span className="text-[10px] text-gray-400 leading-tight mt-0.5">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Preset Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    Tingkat Kesulitan
                  </label>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Skala: {form.difficulty} / 10
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_PRESETS.map((p) => {
                    const isSelected = Math.abs(form.difficulty - p.value) <= 1.5;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, difficulty: p.value }))}
                        className={cn(
                          "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                            : "border-border hover:border-gray-300 text-gray-600 bg-gray-50/50"
                        )}
                      >
                        <span className="text-xs font-bold">{p.label}</span>
                        <span className="text-[10px] text-gray-400 leading-tight mt-0.5">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide" htmlFor="edit-progress">
                    Progres Pengerjaan
                  </label>
                  <span className="text-xs font-bold text-gray-700">{form.progress}%</span>
                </div>
                <input
                  id="edit-progress"
                  name="progress"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.progress}
                  onChange={handleChange}
                  className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-primary cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-border">
                <Button type="submit" variant="primary" size="lg" loading={saving} className="flex-1 shadow-md">
                  {saving ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
                </Button>
                <Link href="/tasks">
                  <Button type="button" variant="outline" size="lg">Batal</Button>
                </Link>
              </div>
            </form>
          </div>

          {/* ════════════════════════════════════════════
              RIGHT PANEL: AI Smart Summary (5 Cols)
          ════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-4">

            {/* Smart AI Recommendation Card */}
            <div className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-border shadow-card p-5 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Rekomendasi Pintar AI</h3>
                    <p className="text-[11px] text-gray-500">Otomatis dihitung ulang saat ada perubahan detail</p>
                  </div>
                </div>
              </div>

              {/* Priority Status Hero */}
              <div className={cn("p-4 rounded-xl border flex items-center justify-between", badgeStyle.bg, badgeStyle.border)}>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status Prioritas</p>
                  <p className={cn("text-lg font-extrabold", badgeStyle.text)}>
                    {badgeStyle.label}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-gray-900 leading-none">
                    {preview.priorityScore}
                    <span className="text-xs text-gray-400 font-normal">/100</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">Skor Urgensi</span>
                </div>
              </div>

              {/* Focus & Pomodoro Recommendation */}
              <div className="p-4 rounded-xl bg-white border border-border space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <Timer className="w-4 h-4 text-orange-500" />
                  Rekomendasi Sesi Pomodoro
                </div>

                <div className="flex items-center justify-between bg-orange-50/60 border border-orange-100 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {pomodoro.recommendedMinutes}m
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        Mode {pomodoro.label} Focus
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Istirahat +{pomodoro.breakMinutes} menit tiap sesi
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full">
                    {isMicro ? "1 Sesi Singkat" : `${totalSessions} Sesi`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>Estimasi Total Waktu:</span>
                  <span className="font-bold text-gray-800">{preview.estimatedTotalMinutes} Menit</span>
                </div>
              </div>

              {/* AI Insight Reason */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1">
                <p className="text-[11px] font-bold text-blue-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-600" /> Analisis AI
                </p>
                <p className="text-xs text-blue-900/80 leading-relaxed">
                  {preview.reasoning}
                </p>
              </div>
            </div>

            {/* Expandable Advanced Math & Engine Details */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-700">Detail Teknis AI & Logika Fuzzy</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                  <span>{showAdvanced ? "Sembunyikan" : "Tampilkan"}</span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showAdvanced && (
                <div className="p-4 pt-0 border-t border-border space-y-3 bg-gray-50/50 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-border space-y-1.5">
                    <p className="font-bold text-gray-800">Profil Akademik Mahasiswa</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                      <div>Prediksi ML: <strong className="text-gray-900">{prediction}</strong></div>
                      <div>Academic Risk: <strong className="text-gray-900">{academicRisk}/100</strong></div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-border space-y-1.5">
                    <p className="font-bold text-gray-800">Inferensi Mamdani Fuzzy (80 Aturan)</p>
                    <p className="text-[11px] text-gray-500">
                      Aturan aktif teratas: {preview.activatedRules.length} aturan terpicu dengan metode defuzzifikasi Centroid.
                    </p>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {preview.activatedRules.slice(0, 4).map((rule) => (
                        <div key={rule.id} className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-[10px] space-y-0.5">
                          <div className="flex justify-between font-bold text-gray-700">
                            <span>Rule #{rule.id}</span>
                            <span className="text-primary">{rule.conclusion} (α={rule.strength.toFixed(2)})</span>
                          </div>
                          <p className="text-gray-500 text-[9px]">{rule.conditions.join(" AND ")}</p>
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
