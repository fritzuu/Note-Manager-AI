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
  Clock,
  Target,
  BarChart2,
  BookOpen,
  ChevronDown,
  ChevronUp,
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
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/utils";

const PRIORITY_BADGE_STYLE: Record<PriorityLevel, { bg: string; text: string; border: string; label: string }> = {
  Critical: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20", label: "Urgent Priority" },
  High:     { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", label: "High Priority" },
  Medium:   { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", label: "Medium Priority" },
  Low:      { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", label: "Flexible Priority" },
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

export default function EditTaskPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [form, setForm] = useState({
    title: "",
    workspace: "",
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

  const WORKSPACE_PRESETS = [
    "Kecerdasan Buatan",
    "Basis Data",
    "Pemrograman Web",
    "Jaringan Komputer",
    "Proyek Akhir",
    "Organisasi",
    "Personal",
  ];

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
          workspace:   task.workspace || task.course || "",
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
    if (!form.deadline)      { setError("Deadline wajib diisi."); return; }
    setSaving(true);
    setError("");
    try {
      const selectedWs = form.workspace.trim() || "Umum";
      await updateTask(taskId, {
        title:                  form.title.trim(),
        workspace:              selectedWs,
        course:                 selectedWs,
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
      <DashboardShell fullWidth>
        <LoadingScreen label="Memuat Detail Tugas..." subtext="Mengambil data tugas dari Firestore" fullHeight />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell fullWidth>
        <ErrorState
          title="Tugas Tidak Ditemukan"
          message={error}
          showHomeButton
          fullHeight
        />
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
              className="p-2.5 rounded-xl border border-border hover:bg-primary-50 hover:border-primary/40 text-gray-500 hover:text-primary transition-all shadow-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
                Edit Tugas
                <span className="text-xs md:text-sm font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  AI-Powered
                </span>
              </h1>
              <p className="text-sm md:text-base text-gray-500 mt-1">
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
              className="bg-white rounded-2xl border border-border shadow-card p-6 md:p-8 space-y-6"
            >
              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm md:text-base rounded-xl px-4 py-3.5">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Status Selector */}
              <div className="space-y-2">
                <label className="text-sm md:text-base font-bold text-gray-800">
                  Status Pengerjaan
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "todo" as const, label: "To Do" },
                    { id: "doing" as const, label: "In Progress" },
                    { id: "done" as const, label: "Completed" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, status: s.id }))}
                      className={cn(
                        "py-3 rounded-xl border text-sm font-bold transition-all",
                        form.status === s.id
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-border hover:bg-gray-50 text-gray-700 bg-gray-50/50"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm md:text-base font-bold text-gray-800" htmlFor="edit-title">
                  Nama Tugas <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full h-12 md:h-13 px-4 rounded-xl border border-border bg-white text-base text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Workspace / Mata Kuliah */}
              <div className="space-y-3 bg-gradient-to-br from-primary/5 to-secondary/5 p-4 rounded-2xl border border-primary/15">
                <div className="flex items-center justify-between">
                  <label className="text-sm md:text-base font-bold text-gray-800 flex items-center gap-2" htmlFor="edit-workspace">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span>Workspace / Mata Kuliah</span>
                  </label>
                  <span className="text-xs text-gray-400 font-semibold">Pilih atau ubah</span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {WORKSPACE_PRESETS.map((preset) => {
                    const isSelected = form.workspace === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, workspace: isSelected ? "" : preset }))}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                          isSelected
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-white text-gray-600 border-border hover:border-primary/40 hover:bg-primary-50/40"
                        )}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                <input
                  id="edit-workspace"
                  name="workspace"
                  type="text"
                  placeholder="Atau ketik nama workspace kustom (misal: Struktur Data, Robotika)..."
                  value={form.workspace}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-border bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium shadow-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm md:text-base font-bold text-gray-800" htmlFor="edit-description">
                  Catatan Tambahan
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  rows={3}
                  value={form.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <label className="text-sm md:text-base font-bold text-gray-800 flex items-center gap-2" htmlFor="edit-deadline">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <span>Deadline <span className="text-red-500">*</span></span>
                </label>
                <input
                  id="edit-deadline"
                  name="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-white text-base text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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

              {/* Importance Section (Manual Number + Slider + Presets) */}
              <div className="space-y-3 bg-gray-50/60 p-4 rounded-2xl border border-border/80">
                <div className="flex items-center justify-between">
                  <label className="text-sm md:text-base font-bold text-gray-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Tingkat Kepentingan
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Input Manual:</span>
                    <input
                      type="number"
                      name="importance"
                      min={1}
                      max={10}
                      value={form.importance}
                      onChange={handleChange}
                      className="w-16 h-8 text-center text-sm font-black text-primary bg-white border border-primary/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs font-bold text-gray-400">/ 10</span>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  name="importance"
                  min={1}
                  max={10}
                  step={1}
                  value={form.importance}
                  onChange={handleChange}
                  className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-primary cursor-pointer"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {IMPORTANCE_PRESETS.map((p) => {
                    const isSelected = form.importance === p.value;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, importance: p.value }))}
                        className={cn(
                          "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30 shadow-sm"
                            : "border-border hover:border-gray-300 text-gray-700 bg-white"
                        )}
                      >
                        <span className="text-xs md:text-sm font-extrabold">{p.label}</span>
                        <span className="text-[11px] text-gray-500 leading-tight mt-0.5">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Section (Manual Number + Slider + Presets) */}
              <div className="space-y-3 bg-gray-50/60 p-4 rounded-2xl border border-border/80">
                <div className="flex items-center justify-between">
                  <label className="text-sm md:text-base font-bold text-gray-800 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-primary" />
                    Tingkat Kesulitan
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Input Manual:</span>
                    <input
                      type="number"
                      name="difficulty"
                      min={1}
                      max={10}
                      value={form.difficulty}
                      onChange={handleChange}
                      className="w-16 h-8 text-center text-sm font-black text-primary bg-white border border-primary/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs font-bold text-gray-400">/ 10</span>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  name="difficulty"
                  min={1}
                  max={10}
                  step={1}
                  value={form.difficulty}
                  onChange={handleChange}
                  className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-primary cursor-pointer"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {DIFFICULTY_PRESETS.map((p) => {
                    const isSelected = form.difficulty === p.value;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, difficulty: p.value }))}
                        className={cn(
                          "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30 shadow-sm"
                            : "border-border hover:border-gray-300 text-gray-700 bg-white"
                        )}
                      >
                        <span className="text-xs md:text-sm font-extrabold">{p.label}</span>
                        <span className="text-[11px] text-gray-500 leading-tight mt-0.5">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress Slider & Manual Number */}
              <div className="space-y-2 bg-gray-50/60 p-4 rounded-2xl border border-border/80">
                <div className="flex items-center justify-between">
                  <label className="text-sm md:text-base font-bold text-gray-800" htmlFor="edit-progress">
                    Progres Pengerjaan
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      name="progress"
                      min={0}
                      max={100}
                      value={form.progress}
                      onChange={handleChange}
                      className="w-16 h-8 text-center text-sm font-black text-primary bg-white border border-primary/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs font-bold text-gray-500">%</span>
                  </div>
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
                  className="w-full h-2.5 rounded-full appearance-none bg-gray-200 accent-primary cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button type="submit" variant="primary" size="lg" loading={saving} className="flex-1 py-3 text-base font-bold shadow-md">
                  {saving ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
                </Button>
                <Button variant="outline" size="lg" href="/tasks" className="py-3 text-base font-semibold">
                  Batal
                </Button>
              </div>
            </form>
          </div>

          {/* ════════════════════════════════════════════
              RIGHT PANEL: AI Smart Summary (5 Cols)
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
                    <p className="text-xs md:text-sm text-gray-500">Otomatis dihitung ulang saat ada perubahan detail</p>
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
                    {preview.priorityScore}
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
                  <span className="font-bold text-gray-900 text-base">{preview.estimatedTotalMinutes} Menit</span>
                </div>
              </div>

              {/* AI Insight Reason */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1.5">
                <p className="text-xs md:text-sm font-bold text-blue-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" /> Analisis & Saran AI
                </p>
                <p className="text-sm text-blue-950/90 leading-relaxed font-normal">
                  {preview.reasoning}
                </p>
              </div>
            </div>

            {/* Expandable Advanced Math & Engine Details */}
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
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-border space-y-2">
                    <p className="font-bold text-gray-900">Inferensi Mamdani Fuzzy (80 Aturan)</p>
                    <p className="text-xs text-gray-500">
                      Aturan aktif teratas: {preview.activatedRules.length} aturan terpicu dengan metode defuzzifikasi Centroid.
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {preview.activatedRules.slice(0, 4).map((rule) => (
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
