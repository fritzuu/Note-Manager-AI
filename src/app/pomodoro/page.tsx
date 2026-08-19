"use client";

import React, { useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
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
  TrendingUp,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PRIORITY_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
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
  const [mounted, setMounted] = React.useState(false);

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
      <div className="flex items-center justify-center py-24" suppressHydrationWarning>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
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

  // Progress circle
  const totalSecs =
    phase === "focus"
      ? fuzzyResult.recommendedMinutes * 60
      : fuzzyResult.breakMinutes * 60;
  const progress = totalSecs > 0 ? timerSeconds / totalSecs : 0;
  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="space-y-8 animate-fade-in" suppressHydrationWarning>
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight flex items-center gap-2">
          <Timer className="w-6 h-6 text-primary" />
          Smart Pomodoro
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Fuzzy Logic recommends your optimal focus duration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-scale-in">
        {/* Main Timer Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Selector */}
          <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
            <label className="text-sm font-semibold text-gray-700">
              Select Task to Focus On
            </label>
            {tasks.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                No active tasks found.{" "}
                <a href="/tasks/create" className="font-bold underline">
                  Create one →
                </a>
              </p>
            ) : (
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                disabled={isRunning}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}

            {/* Selected Task Info */}
            {selectedTask && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      PRIORITY_BADGE[selectedTask.priorityLevel] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {selectedTask.priorityLevel}
                  </span>
                  <span className="text-xs text-gray-500">
                    Priority Score:{" "}
                    <span className="font-bold text-primary">
                      {selectedTask.priorityScore}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">
                    Difficulty:{" "}
                    <span className="font-bold">{selectedTask.difficulty}/10</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    Progress:{" "}
                    <span className="font-bold">{selectedTask.progress}%</span>
                  </span>
                </div>

                {targetSessions > 0 && (
                  <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-gray-50 border border-border w-fit">
                    <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
                      🍅 Target Sessions:
                    </span>
                    <div className="flex gap-1">
                      {Array.from({
                        length: Math.max(targetSessions, completedTaskSessions),
                      }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-2.5 h-2.5 rounded-full transition-all duration-300",
                            i < completedTaskSessions
                              ? "bg-primary shadow-sm scale-110"
                              : i < targetSessions
                              ? "bg-gray-200 border border-gray-300"
                              : "bg-orange-200 border border-orange-300"
                          )}
                          title={
                            i < completedTaskSessions
                              ? `Session ${i + 1} completed`
                              : `Session ${i + 1} estimated`
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 ml-1.5 font-medium">
                      {completedTaskSessions} / {targetSessions} sessions
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fuzzy Recommendation */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5" suppressHydrationWarning>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-primary">
                Fuzzy Recommendation
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4" suppressHydrationWarning>
              <div className="text-center" suppressHydrationWarning>
                <p className="text-2xl font-extrabold text-[#1F2937]" suppressHydrationWarning>
                  {fuzzyResult.recommendedMinutes}m
                </p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                  Focus Duration
                </p>
              </div>
              <div className="text-center" suppressHydrationWarning>
                <p className="text-2xl font-extrabold text-[#1F2937]" suppressHydrationWarning>
                  {fuzzyResult.breakMinutes}m
                </p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                  Break Duration
                </p>
              </div>
              <div className="text-center" suppressHydrationWarning>
                <p
                  className={`text-xl font-extrabold ${
                    fuzzyResult.label === "Long"
                      ? "text-red-600"
                      : fuzzyResult.label === "Medium"
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                  suppressHydrationWarning
                >
                  {fuzzyResult.label}
                </p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                  Intensity
                </p>
              </div>
            </div>
          </div>

          {/* Timer Circle */}
          <div className="bg-white rounded-2xl border border-border shadow-card p-8 flex flex-col items-center gap-6" suppressHydrationWarning>
            {/* Phase Badge */}
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${
                phase === "focus"
                  ? "bg-primary text-white"
                  : "bg-blue-100 text-blue-700"
              }`}
              suppressHydrationWarning
            >
              {phase === "focus" ? (
                <Flame className="w-4 h-4" />
              ) : (
                <Coffee className="w-4 h-4" />
              )}
              {phase === "focus" ? "Focus Session" : "Break Time"}
            </div>

            {/* SVG Circle Timer */}
            <div className="relative" suppressHydrationWarning>
              <svg width="280" height="280" viewBox="0 0 280 280" suppressHydrationWarning>
                {/* Background circle */}
                <circle
                  cx="140"
                  cy="140"
                  r="120"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                {/* Progress circle */}
                <circle
                  cx="140"
                  cy="140"
                  r="120"
                  fill="none"
                  stroke={phase === "focus" ? "#4F8A6B" : "#3b82f6"}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 140 140)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                  suppressHydrationWarning
                />
                {/* Time text */}
                <text
                  x="140"
                  y="130"
                  textAnchor="middle"
                  className="font-mono"
                  fontSize="48"
                  fontWeight="900"
                  fill="#1F2937"
                  suppressHydrationWarning
                >
                  {formatTime(timerSeconds)}
                </text>
                <text
                  x="140"
                  y="165"
                  textAnchor="middle"
                  fontSize="13"
                  fill="#9ca3af"
                  fontWeight="600"
                  suppressHydrationWarning
                >
                  {phase === "focus" ? "minutes to focus" : "break remaining"}
                </text>
              </svg>
            </div>

            {/* Session Complete */}
            {sessionCompleted && phase === "focus" && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-5 py-3 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Session complete! Great work 🎉
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Button
                variant="outline"
                size="md"
                onClick={resetTimer}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                Reset
              </Button>
              {isRunning ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={pauseTimer}
                  icon={<Pause className="w-5 h-5" />}
                  className="px-8"
                >
                  Pause
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={startTimer}
                  icon={<Play className="w-5 h-5" />}
                  className="px-8"
                >
                  {sessionCompleted ? "New Session" : "Start Focus"}
                </Button>
              )}
              {(isRunning || sessionId || timerSeconds < (phase === "focus" ? fuzzyResult.recommendedMinutes * 60 : fuzzyResult.breakMinutes * 60)) && !sessionCompleted && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={endSession}
                  icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                >
                  End Session
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Stats */}
        <div className="space-y-4">
          {/* Today's Stats */}
          <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-gray-800 text-sm">Today&apos;s Focus</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-primary">
                  {totalFocusToday}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">
                  minutes today
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-amber-600">
                  {todaySessions.length}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">
                  sessions today
                </p>
              </div>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-gray-800 text-sm">Overall Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  Total Sessions
                </span>
                <span className="text-sm font-bold text-[#1F2937]">
                  {totalSessions}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  Focus Streak
                </span>
                <span className="text-sm font-bold text-orange-500 flex items-center gap-1">
                  <Flame className="w-4 h-4" /> {streakDays} days
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  Total Focus Time
                </span>
                <span className="text-sm font-bold text-[#1F2937]">
                  {sessions
                    .filter((s) => s.completed)
                    .reduce((acc, s) => acc + s.duration, 0)}{" "}
                  min
                </span>
              </div>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Timer className="w-4 h-4 text-gray-400" />
              Recent Sessions
            </h3>
            {sessions.filter((s) => s.completed).slice(0, 5).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                No completed sessions yet
              </p>
            ) : (
              <div className="space-y-2">
                {sessions
                  .filter((s) => s.completed)
                  .slice(0, 5)
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {session.taskTitle}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {session.duration} min session
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Check-in Prompt (Alternatif B) */}
      {showProgressPrompt && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-border shadow-2xl max-w-md w-full p-6 space-y-6 animate-scale-in relative">
            <button
              onClick={() => setShowProgressPrompt(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  Focus Session Finished! 🍅
                </h3>
                <p className="text-xs text-gray-500">
                  How much progress did you make?
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border border-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Session Summary
              </p>
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-700">
                  {selectedTask.title}
                </p>
                <p className="text-xs text-gray-500">
                  Focused for{" "}
                  <span className="font-semibold text-primary">
                    {fuzzyResult.recommendedMinutes} minutes
                  </span>
                </p>
              </div>
              <div className="border-t border-border/60 pt-2 flex items-center justify-between text-xs">
                <span className="text-gray-500">AI Estimated Progress:</span>
                <span className="font-bold text-primary">
                  +{progressIncrement}%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">
                  Update Progress
                </span>
                <span className="text-sm font-bold text-primary">
                  {adjustedProgress}%
                </span>
              </div>
              <input
                type="range"
                min={selectedTask.progress}
                max="100"
                value={adjustedProgress}
                onChange={(e) => setAdjustedProgress(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>Current: {selectedTask.progress}%</span>
                <span>Suggested: {suggestedProgress}%</span>
                <span>Complete: 100%</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowProgressPrompt(false)}
                disabled={isUpdatingProgress}
              >
                Skip / No Progress
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={saveTaskProgress}
                loading={isUpdatingProgress}
              >
                Update Progress
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PomodoroPage() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <DashboardShell>
      {!mounted ? (
        <div className="flex items-center justify-center py-24" suppressHydrationWarning>
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24" suppressHydrationWarning>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }
        >
          <PomodoroContentImpl />
        </Suspense>
      )}
    </DashboardShell>
  );
}
