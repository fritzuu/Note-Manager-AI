"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Flame,
  Zap,
  Coffee,
  BarChart2,
  X,
  Target,
  Sparkles,
  ChevronRight,
  Clock,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { LivingFlame } from "@/components/dashboard/streak/LivingFlame";
import { cn } from "@/lib/utils";

const PRIORITY_BADGE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  High:     { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  Medium:   { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Low:      { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function PomodoroContentImpl() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get("taskId");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    tasks,
    sessions,
    loading: pomodoroLoading,
    selectedTaskId,
    selectedTask,
    timerSeconds,
    isRunning,
    phase,
    sessionId,
    sessionCompleted,
    fuzzyResult,
    todaySessions,
    streakDays,
    totalFocusToday,
    totalSessions,
    showProgressPrompt,
    setShowProgressPrompt,
    progressIncrement,
    suggestedProgress,
    adjustedProgress,
    setAdjustedProgress,
    isUpdatingProgress,
    saveTaskProgress,
    startTimer,
    pauseTimer,
    resetTimer,
    endSession,
    setSelectedTaskId,
  } = usePomodoro();

  // Handle URL param taskId if present
  useEffect(() => {
    if (initialTaskId && initialTaskId !== selectedTaskId && !isRunning) {
      if (tasks.some((t) => t.id === initialTaskId)) {
        setSelectedTaskId(initialTaskId);
      }
    }
  }, [initialTaskId, selectedTaskId, tasks, isRunning, setSelectedTaskId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  if (!mounted || authLoading || pomodoroLoading) {
    return (
      <LoadingScreen label="Memuat Smart Pomodoro..." subtext="Menyiapkan rekomendasi durasi belajar pintar" />
    );
  }

  const completedTaskSessions = sessions.filter(
    (s) => s.taskId === selectedTaskId && s.completed
  ).length;

  const estimatedTotalSessions =
    selectedTask && fuzzyResult.recommendedMinutes > 0
      ? Math.round(selectedTask.estimatedTotalMinutes / fuzzyResult.recommendedMinutes)
      : 0;

  const targetSessions =
    selectedTask && selectedTask.estimatedTotalMinutes > 0
      ? Math.max(1, estimatedTotalSessions)
      : 0;

  // Progress circle calculations
  const totalSecs =
    phase === "focus"
      ? fuzzyResult.recommendedMinutes * 60
      : fuzzyResult.breakMinutes * 60;

  const progressFraction = totalSecs > 0 ? timerSeconds / totalSecs : 0;
  const progressPercent = Math.round(progressFraction * 100);
  const radius = 125;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressFraction);

  const priorityStyle =
    selectedTask && PRIORITY_BADGE_STYLE[selectedTask.priorityLevel]
      ? PRIORITY_BADGE_STYLE[selectedTask.priorityLevel]
      : PRIORITY_BADGE_STYLE.Medium;

  return (
    <div className="space-y-8 animate-fade-in pb-12" suppressHydrationWarning>
      {/* ════════════════════════════════════════════
          1. HEADER & AI BADGE
      ════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white shadow-md">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#1F2937] tracking-tight">
                Smart Pomodoro
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Timer fokus adaptif pintar untuk efisiensi belajar optimal.
              </p>
            </div>
          </div>
        </div>

        {/* AI Mode Indicator */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-border shadow-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Smart Adaptive Mode Aktif
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          2. MAIN WORKSPACE GRID (2 COLS + 1 COL)
      ════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-scale-in">
        
        {/* LEFT & CENTER PANEL: Focus Terminal & AI Rationale (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">

          {/* 🎯 Task Selection & Context Card */}
          <div className="bg-white rounded-3xl border border-border shadow-card p-6 space-y-5 transition-all">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary" />
                Fokus Pada Tugas
              </label>

              {selectedTask && (
                <Link
                  href={`/tasks/${selectedTask.id}/edit`}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Detail Tugas <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-800 flex items-center justify-between">
                <span className="text-xs font-semibold">
                  Belum ada tugas aktif untuk difokuskan.
                </span>
                <Button variant="primary" size="xs" href="/tasks/create">
                  Buat Tugas Baru
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  disabled={isRunning}
                  className="w-full h-12 px-4 rounded-2xl border border-border bg-gray-50/60 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all disabled:opacity-60 cursor-pointer shadow-2xs"
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.priorityLevel} · Score {t.priorityScore})
                    </option>
                  ))}
                </select>

                {/* Selected Task Metrics Ribbon */}
                {selectedTask && (
                  <div className="bg-gray-50/80 rounded-2xl border border-border/70 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
                        >
                          {selectedTask.priorityLevel} Priority
                        </span>
                        <span className="text-xs font-semibold text-gray-500">
                          Score: <strong className="text-primary font-bold font-mono">{selectedTask.priorityScore}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Kesulitan: <strong className="text-gray-800">{selectedTask.difficulty}/10</strong></span>
                        <span>·</span>
                        <span>Progress: <strong className="text-primary font-mono">{selectedTask.progress}%</strong></span>
                      </div>
                    </div>

                    {/* Target Sessions Indicator */}
                    {targetSessions > 0 && (
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500 flex items-center gap-1">
                          Estimasi Sesi Diperlukan:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-1 items-center">
                            {Array.from({
                              length: Math.min(10, Math.max(targetSessions, completedTaskSessions)),
                            }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                  i < completedTaskSessions
                                    ? "bg-primary shadow-xs scale-110 ring-2 ring-primary/20"
                                    : i < targetSessions
                                    ? "bg-gray-200 border border-gray-300"
                                    : "bg-orange-200 border border-orange-300"
                                )}
                                title={`Sesi ke-${i + 1}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-gray-700 font-mono ml-1">
                            {completedTaskSessions} / {targetSessions}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ⏱️ Core Focus Terminal (Timer Machine) */}
          <div
            className={cn(
              "rounded-3xl border shadow-card p-8 md:p-10 flex flex-col items-center justify-center gap-8 relative overflow-hidden transition-all duration-500",
              phase === "focus"
                ? "bg-gradient-to-b from-white via-primary-50/15 to-white border-primary/30"
                : "bg-gradient-to-b from-white via-blue-50/20 to-white border-blue-200"
            )}
            suppressHydrationWarning
          >
            {/* Ambient Background Aura */}
            <div
              className={cn(
                "absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-700",
                phase === "focus" ? "bg-primary" : "bg-blue-400"
              )}
            />
            <div
              className={cn(
                "absolute -bottom-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-700",
                phase === "focus" ? "bg-emerald-300" : "bg-cyan-300"
              )}
            />

            {/* Phase Badge */}
            <div
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-sm transition-all animate-scale-in",
                phase === "focus"
                  ? "bg-primary text-white shadow-primary/20"
                  : "bg-blue-600 text-white shadow-blue-500/20"
              )}
              suppressHydrationWarning
            >
              {phase === "focus" ? (
                <>
                  <Flame className="w-4 h-4 animate-pulse" />
                  Sesi Fokus Belajar
                </>
              ) : (
                <>
                  <Coffee className="w-4 h-4" />
                  Waktu Istirahat (Break)
                </>
              )}
            </div>

            {/* Glowing SVG Radial Countdown Meter */}
            <div className="relative flex items-center justify-center my-2" suppressHydrationWarning>
              <svg width="290" height="290" viewBox="0 0 290 290" className="rotate-[-90deg] drop-shadow-sm">
                {/* Background Ring Track */}
                <circle
                  cx="145"
                  cy="145"
                  r={radius}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="14"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="145"
                  cy="145"
                  r={radius}
                  fill="none"
                  stroke={phase === "focus" ? "#3D6E54" : "#2563EB"}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
                />
              </svg>

              {/* Digital Time & Subtext Inside Meter */}
              <div className="absolute flex flex-col items-center justify-center text-center select-none">
                <span
                  className="font-mono text-5xl md:text-6xl font-black text-gray-800 tracking-tight"
                  suppressHydrationWarning
                >
                  {formatTime(timerSeconds)}
                </span>
                <span className="text-xs font-bold text-gray-400 mt-1.5 flex items-center gap-1 uppercase tracking-wider">
                  {phase === "focus" ? (
                    isRunning ? (
                      <span className="text-primary flex items-center gap-1 font-bold">
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        Sedang Berjalan
                      </span>
                    ) : (
                      "Siap Fokus"
                    )
                  ) : (
                    "Istirahatkan Pikiran"
                  )}
                </span>
                <span className="text-[11px] text-gray-400 font-semibold mt-0.5 font-mono">
                  {progressPercent}% tersisa
                </span>
              </div>
            </div>

            {/* Session Complete Toast */}
            {sessionCompleted && phase === "focus" && (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs md:text-sm rounded-2xl px-5 py-3 font-bold shadow-xs animate-scale-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                Sesi selesai! Silakan ambil jeda istirahat atau perbarui progress tugasmu.
              </div>
            )}

            {/* Ergonomic Control Center Buttons */}
            <div className="flex items-center gap-3.5 flex-wrap justify-center w-full max-w-md pt-2">
              {/* Reset Button */}
              <Button
                variant="outline"
                size="lg"
                onClick={resetTimer}
                icon={<RotateCcw className="w-4 h-4 text-gray-600" />}
                className="rounded-2xl px-5 font-bold"
                title="Reset Timer"
              >
                Reset
              </Button>

              {/* Play / Pause Primary Action */}
              {isRunning ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={pauseTimer}
                  icon={<Pause className="w-5 h-5" />}
                  className="flex-1 py-4 text-base font-extrabold rounded-2xl shadow-md bg-amber-600 hover:bg-amber-700"
                >
                  Jeda Sesi (Pause)
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={startTimer}
                  icon={<Play className="w-5 h-5 fill-current" />}
                  className="flex-1 py-4 text-base font-extrabold rounded-2xl shadow-md"
                >
                  {sessionCompleted ? "Sesi Baru" : isRunning ? "Lanjutkan" : "Mulai Fokus"}
                </Button>
              )}

              {/* End Session Button */}
              {(isRunning || sessionId || timerSeconds < (phase === "focus" ? fuzzyResult.recommendedMinutes * 60 : fuzzyResult.breakMinutes * 60)) && !sessionCompleted && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={endSession}
                  icon={<Check className="w-4 h-4 text-emerald-600" />}
                  className="rounded-2xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-bold"
                >
                  Selesai
                </Button>
              )}
            </div>
          </div>

          {/* 🧠 Smart AI Rationale Card */}
          <div className="bg-white rounded-3xl border border-border shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Rekomendasi Durasi Belajar Pintar</h3>
                  <p className="text-[11px] text-gray-400">Parameter yang menentukan durasi fokus & istirahat</p>
                </div>
              </div>

              <span className="text-xs font-bold text-primary bg-primary-50 px-3 py-1 rounded-full border border-primary/20">
                {fuzzyResult.label} Session
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-gray-50 rounded-2xl p-3.5 text-center border border-border/60">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fokus Ideal</span>
                <p className="text-xl font-extrabold text-primary font-mono mt-0.5">{fuzzyResult.recommendedMinutes}m</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-3.5 text-center border border-border/60">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Break Ideal</span>
                <p className="text-xl font-extrabold text-blue-600 font-mono mt-0.5">{fuzzyResult.breakMinutes}m</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-3.5 text-center border border-border/60">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tingkat Urgensi</span>
                <p className="text-xl font-extrabold text-gray-800 font-mono mt-0.5">{selectedTask?.priorityLevel || "Medium"}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-3.5 text-center border border-border/60">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Beban Belajar</span>
                <p className="text-xl font-extrabold text-gray-800 font-mono mt-0.5">{selectedTask?.difficulty || 5}/10</p>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            RIGHT COLUMN: STREAK & FOCUS TIMELINE (1 Col)
        ════════════════════════════════════════════ */}
        <div className="space-y-6">

          {/* 🔥 Living Flame Streak Card */}
          <div className="bg-white rounded-3xl border border-border shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-gray-800 text-sm">Konsistensi Streak</h3>
              </div>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100 font-mono">
                {streakDays} Hari
              </span>
            </div>

            <div className="flex items-center justify-center py-4 bg-gradient-to-b from-orange-50/60 via-orange-50/20 to-transparent rounded-2xl border border-orange-100/60 shadow-inner">
              <LivingFlame streakDays={streakDays} size="lg" className="scale-105" />
            </div>

            <p className="text-xs text-gray-500 text-center font-medium">
              {streakDays > 0
                ? "Pertahankan momentum belajarmu setiap hari!"
                : "Selesaikan minimal 1 sesi fokus untuk menyalakan apimu."}
            </p>
          </div>

          {/* 📊 Today's Focus Metrics */}
          <div className="bg-white rounded-3xl border border-border shadow-card p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <BarChart2 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-gray-800 text-sm">Aktivitas Hari Ini</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-50/70 border border-primary/20 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-primary font-mono">{totalFocusToday}</p>
                <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Menit Fokus</p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-amber-700 font-mono">{todaySessions.length}</p>
                <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Sesi Selesai</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 space-y-2.5 text-xs text-gray-600">
              <div className="flex justify-between items-center">
                <span>Total Sesi Sepanjang Waktu:</span>
                <strong className="font-bold text-gray-800 font-mono">{totalSessions}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Waktu Fokus:</span>
                <strong className="font-bold text-primary font-mono">
                  {sessions.filter((s) => s.completed).reduce((acc, s) => acc + s.duration, 0)} m
                </strong>
              </div>
            </div>
          </div>

          {/* 🕒 Recent Completed Sessions Timeline */}
          <div className="bg-white rounded-3xl border border-border shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <h3 className="font-bold text-gray-800 text-sm">Riwayat Sesi Terkini</h3>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase">5 Sesi Terakhir</span>
            </div>

            {sessions.filter((s) => s.completed).slice(0, 5).length === 0 ? (
              <div className="p-6 text-center border border-dashed border-gray-200 rounded-2xl text-xs text-gray-400">
                Belum ada sesi selesai hari ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions
                  .filter((s) => s.completed)
                  .slice(0, 5)
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 bg-gray-50/80 hover:bg-primary-50/40 border border-border/60 rounded-2xl p-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">
                          {session.taskTitle || "Sesi Bebas"}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {session.duration} menit · Selesai
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          3. POST-SESSION PROGRESS UPDATE MODAL
      ════════════════════════════════════════════ */}
      {showProgressPrompt && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-border shadow-2xl max-w-md w-full p-6 space-y-6 animate-scale-in relative">
            <button
              onClick={() => setShowProgressPrompt(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-800 text-lg tracking-tight">
                  Sesi Fokus Selesai!
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Berapa persen kemajuan tugas yang tercapai?
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border border-border/80 rounded-2xl p-4 space-y-2.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Ringkasan Sesi
              </span>
              <p className="text-sm font-bold text-gray-800 truncate">
                {selectedTask.title}
              </p>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="text-gray-500">Estimasi Kemajuan AI:</span>
                <span className="font-bold text-primary font-mono">+{progressIncrement}%</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700">Perbarui Progress Tugas</span>
                <span className="text-sm font-extrabold text-primary font-mono">{adjustedProgress}%</span>
              </div>
              <input
                type="range"
                min={selectedTask.progress}
                max="100"
                value={adjustedProgress}
                onChange={(e) => setAdjustedProgress(Number(e.target.value))}
                className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[11px] text-gray-400 font-semibold">
                <span>Saat ini: {selectedTask.progress}%</span>
                <span>Saran AI: {suggestedProgress}%</span>
                <span>Tuntas: 100%</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowProgressPrompt(false)}
                disabled={isUpdatingProgress}
              >
                Lewati
              </Button>
              <Button
                variant="primary"
                className="flex-1 rounded-xl"
                onClick={saveTaskProgress}
                loading={isUpdatingProgress}
              >
                Simpan Progress
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PomodoroPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <DashboardShell>
      {!mounted ? (
        <LoadingScreen label="Memuat Smart Pomodoro..." subtext="Menyiapkan rekomendasi timer Fuzzy Logic" />
      ) : (
        <Suspense
          fallback={
            <LoadingScreen label="Memuat Smart Pomodoro..." subtext="Menyiapkan rekomendasi timer Fuzzy Logic" />
          }
        >
          <PomodoroContentImpl />
        </Suspense>
      )}
    </DashboardShell>
  );
}
