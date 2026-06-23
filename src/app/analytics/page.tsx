"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Clock,
  CheckSquare,
  BarChart3,
  Flame,
  Brain,
  Award,
  Target,
  Zap,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotes,
  getUserTasks,
  getUserPomodoroSessions,
  getAcademicInsight,
  type TaskDocument,
  type PomodoroSession,
} from "@/lib/firestore";
import { DashboardShell } from "@/components/layout/DashboardShell";

function StatCard({
  label,
  value,
  sub,
  icon,
  iconBg,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 flex items-center justify-between hover:shadow-card-hover transition-all duration-300">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-extrabold text-[#1F2937]">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

function MiniBarChart({ data, label }: { data: number[]; label: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5 h-24">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-primary/70 transition-all duration-500"
              style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {label.map((l, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-gray-400 font-medium">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [academicScore, setAcademicScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    const load = async () => {
      try {
        const [userTasks, userSessions, userNotes, userInsight] = await Promise.all([
          getUserTasks(user.uid),
          getUserPomodoroSessions(user.uid),
          getUserNotes(user.uid),
          getAcademicInsight(user.uid),
        ]);
        setTasks(userTasks);
        setSessions(userSessions);
        setNoteCount(userNotes.length);
        setAcademicScore(userInsight?.academicScore ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading Analytics...</p>
        </div>
      </DashboardShell>
    );
  }

  // Computations
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const completedSessions = sessions.filter((s) => s.completed);
  const totalFocusMinutes = completedSessions.reduce((acc, s) => acc + s.duration, 0);
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);
  const criticalTasks = tasks.filter((t) => t.priorityLevel === "Critical" && t.status !== "done").length;

  // Productivity score: weighted metric
  const productivityScore = Math.min(
    100,
    Math.round(
      completionRate * 0.4 +
        Math.min(completedSessions.length * 5, 40) * 0.3 +
        Math.min(noteCount * 3, 30) * 0.3
    )
  );

  // Task completion trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const taskTrend = last7Days.map((day) =>
    tasks.filter((t) => {
      const u = t.updatedAt ? (t.updatedAt as { seconds?: number }).seconds : 0;
      const taskDate = u ? new Date(u * 1000) : null;
      return (
        t.status === "done" &&
        taskDate &&
        taskDate.toDateString() === day.toDateString()
      );
    }).length
  );
  const dayLabels = last7Days.map((d) =>
    d.toLocaleDateString("en", { weekday: "short" }).slice(0, 2)
  );

  // Focus trend (last 7 days in minutes)
  const focusTrend = last7Days.map((day) =>
    completedSessions
      .filter((s) => {
        const sd = s.startedAt?.toDate ? s.startedAt.toDate() : null;
        return sd && sd.toDateString() === day.toDateString();
      })
      .reduce((acc, s) => acc + s.duration, 0)
  );

  // Priority distribution
  const byPriority = {
    Critical: tasks.filter((t) => t.priorityLevel === "Critical").length,
    High: tasks.filter((t) => t.priorityLevel === "High").length,
    Medium: tasks.filter((t) => t.priorityLevel === "Medium").length,
    Low: tasks.filter((t) => t.priorityLevel === "Low").length,
  };

  return (
    <DashboardShell>
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">
          Productivity Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your task completion, focus sessions, and academic progress
        </p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-scale-in">
        <StatCard
          label="Total Tasks"
          value={totalTasks}
          sub={`${doneTasks} completed`}
          icon={<ListChecks className="w-6 h-6 text-primary" />}
          iconBg="bg-primary-100"
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          sub={`${doneTasks}/${totalTasks} tasks done`}
          icon={<CheckSquare className="w-6 h-6 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Total Focus Time"
          value={`${totalFocusHours}h`}
          sub={`${completedSessions.length} sessions`}
          icon={<Clock className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Pomodoro Sessions"
          value={completedSessions.length}
          sub={`${totalFocusMinutes} minutes total`}
          icon={<Flame className="w-6 h-6 text-orange-600" />}
          iconBg="bg-orange-50"
        />
        <StatCard
          label="Productivity Score"
          value={`${productivityScore}%`}
          sub="Based on tasks + focus + notes"
          icon={<Zap className="w-6 h-6 text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Academic Score"
          value={academicScore !== null ? `${academicScore}%` : "—"}
          sub={academicScore !== null ? "From assessment" : "Take assessment first"}
          icon={<Brain className="w-6 h-6 text-purple-600" />}
          iconBg="bg-purple-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-scale-in">
        {/* Task Completion Trend */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-gray-800">Task Completion (7d)</h3>
          </div>
          <MiniBarChart data={taskTrend} label={dayLabels} />
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Tasks completed per day</span>
            <span className="font-semibold text-primary">{doneTasks} total</span>
          </div>
        </div>

        {/* Focus Trend */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-gray-800">Focus Minutes (7d)</h3>
          </div>
          <MiniBarChart data={focusTrend} label={dayLabels} />
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Minutes of focused work per day</span>
            <span className="font-semibold text-orange-500">{totalFocusMinutes}m total</span>
          </div>
        </div>
      </div>

      {/* Lower Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-scale-in">
        {/* Priority Distribution */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-gray-800 text-sm">Priority Distribution</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(byPriority).map(([level, count]) => {
              const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
              const colors: Record<string, string> = {
                Critical: "bg-red-500",
                High: "bg-orange-500",
                Medium: "bg-amber-400",
                Low: "bg-emerald-500",
              };
              return (
                <div key={level}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-600">{level}</span>
                    <span className="font-bold text-gray-700">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${colors[level]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Productivity Score Meter */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-gray-800 text-sm">Productivity Score</h3>
          </div>
          <div className="flex flex-col items-center gap-3 py-4">
            <div
              className="relative w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                background: `conic-gradient(
                  ${productivityScore >= 70 ? "#4F8A6B" : productivityScore >= 40 ? "#f59e0b" : "#ef4444"} 
                  ${(productivityScore / 100) * 360}deg,
                  #e5e7eb 0deg
                )`,
              }}
            >
              <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-[#1F2937]">{productivityScore}</span>
                <span className="text-[9px] text-gray-400 font-medium">/ 100</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 text-center leading-relaxed">
              {productivityScore >= 70
                ? "🏆 Excellent productivity!"
                : productivityScore >= 40
                ? "📈 Keep building momentum"
                : "🌱 Start completing tasks to grow"}
            </p>
          </div>
        </div>

        {/* Achievement Snapshot */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-gray-800 text-sm">Achievements</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Notes Created", value: noteCount, icon: "📝", threshold: 5 },
              { label: "Tasks Done", value: doneTasks, icon: "✅", threshold: 5 },
              { label: "Focus Sessions", value: completedSessions.length, icon: "🔥", threshold: 10 },
              { label: "Critical Pending", value: criticalTasks, icon: "🚨", threshold: 0, inverted: true },
            ].map(({ label, value, icon, threshold, inverted }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 font-medium">{label}</span>
                    <span className={`text-xs font-bold ${
                      inverted
                        ? value === 0 ? "text-emerald-600" : "text-red-600"
                        : value >= threshold ? "text-primary" : "text-gray-400"
                    }`}>{value}</span>
                  </div>
                  {!inverted && (
                    <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((value / Math.max(threshold * 2, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
