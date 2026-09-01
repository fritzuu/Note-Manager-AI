"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Clock,
  CheckSquare,
  Flame,
  Brain,
  Zap,
  FileText,
  Layers,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useScreenTime, formatScreenTime } from "@/contexts/ScreenTimeContext";
import {
  getUserNotes,
  getUserTasks,
  getUserPomodoroSessions,
  getAcademicInsight,
  type TaskDocument,
  type PomodoroSession,
} from "@/lib/firestore";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { LivingFlame } from "@/components/dashboard/streak/LivingFlame";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";

function HighImpactCard({
  label,
  value,
  sub,
  icon,
  iconBg,
  highlight = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 flex items-center justify-between transition-all duration-300 ${
        highlight
          ? "bg-gradient-to-br from-primary-50/40 via-white to-emerald-50/20 border-primary/40 shadow-sm"
          : "bg-white border-border shadow-card hover:shadow-card-hover"
      }`}
      suppressHydrationWarning
    >
      <div className="space-y-1" suppressHydrationWarning>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-extrabold text-[#1F2937] tracking-tight" suppressHydrationWarning>{value}</p>
        {sub && <p className="text-xs text-gray-500 font-medium" suppressHydrationWarning>{sub}</p>}
      </div>
      <div className={`w-13 h-13 rounded-2xl flex items-center justify-center ${iconBg} shadow-2xs`}>
        {icon}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const { todayMinutes, formattedTodayTime, history: screenTimeHistory } = useScreenTime();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [notesCount, setNotesCount] = useState(0);
  const [academicScore, setAcademicScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [userTasks, userSessions, userNotes, userInsight] = await Promise.all([
        getUserTasks(user.uid).catch((e) => {
          console.warn("Analytics: Failed to fetch tasks:", e);
          return [];
        }),
        getUserPomodoroSessions(user.uid).catch((e) => {
          console.warn("Analytics: Failed to fetch sessions:", e);
          return [];
        }),
        getUserNotes(user.uid).catch((e) => {
          console.warn("Analytics: Failed to fetch notes:", e);
          return [];
        }),
        getAcademicInsight(user.uid).catch(() => null),
      ]);
      setTasks(userTasks || []);
      setSessions(userSessions || []);
      setNotesCount((userNotes || []).length);
      setAcademicScore(userInsight?.academicScore ?? null);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
      setError("Gagal memuat data analitik. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    loadData();
  }, [user, authLoading, router, loadData]);

  // Streak & Active calculations
  const today = useMemo(() => new Date(), []);
  const completedSessions = useMemo(() => sessions.filter((s) => s.completed), [sessions]);
  const pomodoroMinutesToday = useMemo(() => {
    return completedSessions
      .filter((s) => {
        const d = s.startedAt?.toDate ? s.startedAt.toDate() : null;
        return d && d.toDateString() === today.toDateString();
      })
      .reduce((acc, s) => acc + s.duration, 0);
  }, [completedSessions, today]);

  // Total active time today combines Screen Time (Context) + Pomodoro focus
  const totalActiveMinutesToday = useMemo(() => {
    return Math.max(todayMinutes, pomodoroMinutesToday);
  }, [todayMinutes, pomodoroMinutesToday]);

  // Consecutive Days Streak (Derived from screen time + focus session records)
  const streakDays = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const isoDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const hasSession = sessions.some((s) => {
        const sd = s.startedAt?.toDate ? s.startedAt.toDate() : null;
        return sd && sd.toDateString() === dayStr && s.completed;
      });

      const hasScreenTime =
        (i === 0 && todayMinutes > 0) ||
        screenTimeHistory.some((h) => h.dateStr === isoDateStr && h.screenTimeSeconds >= 60);

      if (hasSession || hasScreenTime) count++;
      else if (i > 0) break;
    }
    return count;
  }, [sessions, todayMinutes, screenTimeHistory, today]);

  // Task metrics
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Holistic Productivity Score (Activity + Tasks + Notes)
  const productivityScore = useMemo(() => {
    const taskPart = completionRate * 0.4;
    const activityPart = Math.min(100, (totalActiveMinutesToday / 60) * 100) * 0.35;
    const notePart = Math.min(100, notesCount * 15) * 0.25;
    return Math.min(100, Math.round(taskPart + activityPart + notePart));
  }, [completionRate, totalActiveMinutesToday, notesCount]);

  // 7-day Activity Chart Data (Screen Time & Focus Minutes)
  const last7DaysData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dayStr = d.toDateString();
      const isoDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });

      const focusMins = completedSessions
        .filter((s) => {
          const sd = s.startedAt?.toDate ? s.startedAt.toDate() : null;
          return sd && sd.toDateString() === dayStr;
        })
        .reduce((acc, s) => acc + s.duration, 0);

      const historyItem = screenTimeHistory.find((h) => h.dateStr === isoDateStr);
      const screenMins = i === 6 ? todayMinutes : historyItem ? Math.round(historyItem.screenTimeSeconds / 60) : 0;

      const totalMins = Math.max(focusMins, screenMins);

      return {
        day: dayName,
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        screenMins,
        focusMins,
        totalMins,
      };
    });
  }, [today, completedSessions, screenTimeHistory, todayMinutes]);

  const maxChartMins = useMemo(() => {
    const maxVal = Math.max(...last7DaysData.map((d) => d.totalMins), 60);
    return Math.max(60, Math.ceil(maxVal / 30) * 30);
  }, [last7DaysData]);

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <LoadingScreen label="Memuat Analitik..." subtext="Menghitung statistik & efisiensi belajar" />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <ErrorState
          title="Gagal Memuat Analitik"
          message={error}
          onRetry={loadData}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6" suppressHydrationWarning>
        {/* Header */}
        <div className="animate-slide-up" suppressHydrationWarning>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight" suppressHydrationWarning>
            Analitik & Aktivitas Belajar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pantau screen time, konsistensi streak, dan efisiensi penyelesaian tugasmu secara terpadu.
          </p>
        </div>

      {/* 4 Core High-Impact Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-scale-in">
        {/* 1. Screen Time & Waktu Aktif */}
        <HighImpactCard
          label="Screen Time Hari Ini"
          value={formattedTodayTime}
          sub={`${totalActiveMinutesToday} menit aktif belajar`}
          icon={<Clock className="w-6 h-6 text-primary" />}
          iconBg="bg-primary/10"
          highlight
        />

        {/* 2. Study Streak */}
        <HighImpactCard
          label="Study Streak"
          value={`${streakDays} Hari`}
          sub={streakDays > 0 ? "Aktivitas belajar konsisten" : "Mulai belajar hari ini"}
          icon={<LivingFlame streakDays={streakDays} size="sm" />}
          iconBg="bg-orange-50"
        />

        {/* 3. Task Completion */}
        <HighImpactCard
          label="Tingkat Tuntas Tugas"
          value={`${completionRate}%`}
          sub={`${doneTasks} dari ${totalTasks} tugas selesai`}
          icon={<CheckSquare className="w-6 h-6 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />

        {/* 4. Indeks Produktivitas */}
        <HighImpactCard
          label="Skor Produktivitas"
          value={`${productivityScore}%`}
          sub="Aktivitas + Tugas + Catatan"
          icon={<Zap className="w-6 h-6 text-amber-500" />}
          iconBg="bg-amber-50"
        />
      </div>

      {/* Main Visuals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-scale-in">
        {/* 7-Day Activity & Screen Time Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Tren Aktivitas & Screen Time (7 Hari)</h3>
                <p className="text-[11px] text-gray-400">Total durasi aktif di aplikasi per hari</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-primary bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-lg">
                Hari ini: {formattedTodayTime}
              </span>
            </div>
          </div>

          {/* Bar Chart Visual */}
          <div className="pt-4">
            <div className="flex items-end justify-between gap-3 h-44 border-b border-border/70 pb-2">
              {last7DaysData.map((item, idx) => {
                const heightPercent = Math.max(8, Math.round((item.totalMins / maxChartMins) * 100));
                const isToday = idx === 6;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-9 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-20">
                      {item.totalMins} menit ({formatScreenTime(item.totalMins * 60)})
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[36px] rounded-t-xl transition-all duration-500 shadow-sm ${
                        isToday
                          ? "bg-gradient-to-t from-primary to-primary-400"
                          : item.totalMins > 0
                          ? "bg-primary-200/80 hover:bg-primary-300"
                          : "bg-gray-100"
                      }`}
                    />
                    <span className={`text-[11px] font-bold ${isToday ? "text-primary" : "text-gray-400"}`}>
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 mt-3 font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Hari Ini
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-200" /> Hari Sebelumnya
                </span>
              </div>
              <span>Rata-rata: {Math.round(last7DaysData.reduce((a, b) => a + b.totalMins, 0) / 7)} m/hari</span>
            </div>
          </div>
        </div>

        {/* Ringkasan Komposisi Belajar (1 Column) */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-gray-800 text-sm">Komposisi Belajar</h3>
            </div>

            <div className="space-y-3.5 pt-1">
              {/* Screen Time Today */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-border/60">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-gray-700">Screen Time</span>
                </div>
                <span className="text-xs font-bold text-primary font-mono">{formattedTodayTime}</span>
              </div>

              {/* Pomodoro Focus Sessions */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-border/60">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-semibold text-gray-700">Sesi Pomodoro Selesai</span>
                </div>
                <span className="text-xs font-bold text-gray-800 font-mono">{completedSessions.length} sesi</span>
              </div>

              {/* Saved Notes */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-border/60">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-700">Catatan Tersimpan</span>
                </div>
                <span className="text-xs font-bold text-gray-800 font-mono">{notesCount} catatan</span>
              </div>

              {/* Academic ML Insight */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-border/60">
                <div className="flex items-center gap-2.5">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold text-gray-700">Skor Evaluasi ML</span>
                </div>
                <span className="text-xs font-bold text-purple-700 font-mono">
                  {academicScore !== null ? `${academicScore}%` : "Tersedia"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60">
            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              Semua waktu yang dihabiskan untuk membaca catatan, mengatur tugas, dan sesi Pomodoro otomatis dihitung ke dalam produktivitasmu.
            </p>
          </div>
        </div>
      </div>
    </div>
    </DashboardShell>
  );
}
