"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserTasks,
  createPomodoroSession,
  completePomodoroSession,
  getUserPomodoroSessions,
  type TaskDocument,
  type PomodoroSession,
} from "@/lib/firestore";
import { computePomodoroFocus } from "@/lib/pomodoroFuzzy";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";

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

function PomodoroContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get("taskId");

  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(5 * 60);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const fuzzyResult = selectedTask
    ? computePomodoroFocus(selectedTask.priorityScore, selectedTask.difficulty / 10, selectedTask.estimatedTotalMinutes)
    : computePomodoroFocus(30, 5);

  // Load data
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    const load = async () => {
      try {
        const [userTasks, userSessions] = await Promise.all([
          getUserTasks(user.uid),
          getUserPomodoroSessions(user.uid),
        ]);
        const activeTasks = userTasks.filter((t) => t.status !== "done");
        setTasks(activeTasks);
        setSessions(userSessions);
        if (initialTaskId && activeTasks.some((t) => t.id === initialTaskId)) {
          setSelectedTaskId(initialTaskId);
        } else if (activeTasks.length > 0) {
          setSelectedTaskId(activeTasks[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, authLoading, router, initialTaskId]);

  // Update timer when task changes and not running
  useEffect(() => {
    if (!isRunning && !sessionCompleted && phase === "focus") {
      const timerVal = fuzzyResult.recommendedMinutes * 60;
      const breakVal = fuzzyResult.breakMinutes * 60;
      const t = setTimeout(() => {
        setTimerSeconds(timerVal);
        setBreakSeconds(breakVal);
      }, 0);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId, fuzzyResult.recommendedMinutes, fuzzyResult.breakMinutes]);

  const handleComplete = useCallback(async () => {
    if (sessionIdRef.current && user) {
      try {
        await completePomodoroSession(sessionIdRef.current);
        const updated = await getUserPomodoroSessions(user.uid);
        setSessions(updated);
      } catch (e) {
        console.error(e);
      }
    }
    setSessionCompleted(true);
    setIsRunning(false);
  }, [user]);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            // Timer finished
            clearInterval(intervalRef.current!);
            if (phase === "focus") {
              handleComplete();
              // Switch to break
              setTimeout(() => {
                setPhase("break");
                setTimerSeconds(breakSeconds);
                setIsRunning(false);
              }, 500);
            } else {
              setPhase("focus");
              setIsRunning(false);
              setTimerSeconds(fuzzyResult.recommendedMinutes * 60);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase, breakSeconds, fuzzyResult.recommendedMinutes, handleComplete]);

  const handleStart = async () => {
    if (!selectedTask || !user) return;
    if (!sessionId) {
      try {
        const sId = await createPomodoroSession(
          user.uid,
          selectedTask.id,
          selectedTask.title,
          fuzzyResult.recommendedMinutes
        );
        setSessionId(sId);
        sessionIdRef.current = sId;
      } catch (e) {
        console.error(e);
      }
    }
    setIsRunning(true);
    setSessionCompleted(false);
  };

  const handlePause = () => setIsRunning(false);

  const handleReset = () => {
    setIsRunning(false);
    setPhase("focus");
    setTimerSeconds(fuzzyResult.recommendedMinutes * 60);
    setSessionId(null);
    sessionIdRef.current = null;
    setSessionCompleted(false);
  };

  // Analytics
  const todaySessions = sessions.filter((s) => {
    const d = s.startedAt?.toDate ? s.startedAt.toDate() : null;
    if (!d) return false;
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const totalFocusToday = todaySessions.filter((s) => s.completed).reduce((acc, s) => acc + s.duration, 0);
  const totalSessions = sessions.filter((s) => s.completed).length;

  // Streak (consecutive days with at least 1 session)
  const streakDays = (() => {
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const hasSession = sessions.some((s) => {
        const sd = s.startedAt?.toDate ? s.startedAt.toDate() : null;
        return sd && sd.toDateString() === dayStr && s.completed;
      });
      if (hasSession) streak++;
      else if (i > 0) break;
    }
    return streak;
  })();

  // Progress circle
  const totalSecs = phase === "focus" ? fuzzyResult.recommendedMinutes * 60 : fuzzyResult.breakMinutes * 60;
  const progress = timerSeconds / totalSecs;
  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference * (1 - progress);

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
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
                <a href="/tasks/create" className="font-bold underline">Create one →</a>
              </p>
            ) : (
              <select
                value={selectedTaskId}
                onChange={(e) => { setSelectedTaskId(e.target.value); handleReset(); }}
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
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PRIORITY_BADGE[selectedTask.priorityLevel]}`}>
                  {selectedTask.priorityLevel}
                </span>
                <span className="text-xs text-gray-500">
                  Priority Score: <span className="font-bold text-primary">{selectedTask.priorityScore}</span>
                </span>
                <span className="text-xs text-gray-500">
                  Difficulty: <span className="font-bold">{selectedTask.difficulty}/10</span>
                </span>
              </div>
            )}
          </div>

          {/* Fuzzy Recommendation */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-primary">Fuzzy Recommendation</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-[#1F2937]">{fuzzyResult.recommendedMinutes}m</p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Focus Duration</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-[#1F2937]">{fuzzyResult.breakMinutes}m</p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Break Duration</p>
              </div>
              <div className="text-center">
                <p className={`text-xl font-extrabold ${fuzzyResult.label === "Long" ? "text-red-600" : fuzzyResult.label === "Medium" ? "text-amber-600" : "text-emerald-600"}`}>
                  {fuzzyResult.label}
                </p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Intensity</p>
              </div>
            </div>
          </div>

          {/* Timer Circle */}
          <div className="bg-white rounded-2xl border border-border shadow-card p-8 flex flex-col items-center gap-6">
            {/* Phase Badge */}
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${
              phase === "focus" ? "bg-primary text-white" : "bg-blue-100 text-blue-700"
            }`}>
              {phase === "focus" ? <Flame className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
              {phase === "focus" ? "Focus Session" : "Break Time"}
            </div>

            {/* SVG Circle Timer */}
            <div className="relative">
              <svg width="280" height="280" viewBox="0 0 280 280">
                {/* Background circle */}
                <circle cx="140" cy="140" r="120" fill="none" stroke="#e5e7eb" strokeWidth="12" />
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
                />
                {/* Time text */}
                <text x="140" y="130" textAnchor="middle" className="font-mono" fontSize="48" fontWeight="900" fill="#1F2937">
                  {formatTime(timerSeconds)}
                </text>
                <text x="140" y="165" textAnchor="middle" fontSize="13" fill="#9ca3af" fontWeight="600">
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
            <div className="flex items-center gap-4">
              <Button variant="outline" size="md" onClick={handleReset} icon={<RotateCcw className="w-4 h-4" />}>
                Reset
              </Button>
              {isRunning ? (
                <Button variant="primary" size="lg" onClick={handlePause} icon={<Pause className="w-5 h-5" />} className="px-8">
                  Pause
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStart}
                  disabled={!selectedTask}
                  icon={<Play className="w-5 h-5" />}
                  className="px-8"
                >
                  {sessionCompleted ? "New Session" : "Start Focus"}
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
                <p className="text-2xl font-extrabold text-primary">{totalFocusToday}</p>
                <p className="text-[10px] text-gray-500 font-medium">minutes today</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{todaySessions.length}</p>
                <p className="text-[10px] text-gray-500 font-medium">sessions today</p>
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
                <span className="text-xs text-gray-500 font-medium">Total Sessions</span>
                <span className="text-sm font-bold text-[#1F2937]">{totalSessions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Focus Streak</span>
                <span className="text-sm font-bold text-orange-500 flex items-center gap-1">
                  <Flame className="w-4 h-4" /> {streakDays} days
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Total Focus Time</span>
                <span className="text-sm font-bold text-[#1F2937]">
                  {sessions.filter((s) => s.completed).reduce((acc, s) => acc + s.duration, 0)} min
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
              <p className="text-xs text-gray-400 text-center py-4">No completed sessions yet</p>
            ) : (
              <div className="space-y-2">
                {sessions.filter((s) => s.completed).slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{session.taskTitle}</p>
                      <p className="text-[10px] text-gray-400">{session.duration} min session</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function PomodoroPage() {
  return (
    <Suspense fallback={
      <DashboardShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    }>
      <PomodoroContent />
    </Suspense>
  );
}
