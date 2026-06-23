"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  MessageSquare,
  Plus,
  ArrowRight,
  Brain,
  Calendar,
  CheckSquare,
  Flame,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Timer,
  Bell,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotes,
  getUserSummariesCount,
  getUserChatHistory,
  getAcademicInsight,
  getUserTasks,
  getUserPomodoroSessions,
  getUserNotifications,
  markAllNotificationsRead,
  type NoteDocument,
  type ChatHistory,
  type AcademicInsight,
  type TaskDocument,
  type PomodoroSession,
  type NotificationDocument,
} from "@/lib/firestore";
import { deadlineToDays } from "@/lib/fuzzyLogic";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";

const PRIORITY_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function formatDeadlineDays(task: TaskDocument): string {
  const deadline = task.deadline?.toDate ? task.deadline.toDate() : null;
  if (!deadline) return "";
  const days = Math.round(deadlineToDays(deadline));
  if (days < 0) return `Overdue ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}

export default function DashboardPage() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [summariesCount, setSummariesCount] = useState(0);
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [insight, setInsight] = useState<AcademicInsight | null>(null);
  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [notifications, setNotifications] = useState<NotificationDocument[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  const firstName = userDoc?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || "Student";

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }

    const loadData = async () => {
      try {
        const [userNotes, count, userChats, userInsight, userTasks, userSessions, userNotifs] =
          await Promise.all([
            getUserNotes(user.uid),
            getUserSummariesCount(user.uid),
            getUserChatHistory(user.uid, 5),
            getAcademicInsight(user.uid),
            getUserTasks(user.uid),
            getUserPomodoroSessions(user.uid),
            getUserNotifications(user.uid),
          ]);
        setNotes(userNotes);
        setSummariesCount(count);
        setChats(userChats);
        setInsight(userInsight);
        setTasks(userTasks);
        setSessions(userSessions);
        setNotifications(userNotifs);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading Dashboard...</p>
        </div>
      </DashboardShell>
    );
  }

  const recentNotes = notes.slice(0, 3);

  // Task analytics
  const activeTasks = tasks.filter((t) => t.status !== "done");
  const priorityTasks = activeTasks
    .filter((t) => t.priorityLevel === "Critical" || t.priorityLevel === "High")
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);

  const upcomingDeadlines = [...activeTasks]
    .filter((t) => {
      const d = t.deadline?.toDate ? t.deadline.toDate() : null;
      return d && deadlineToDays(d) >= 0;
    })
    .sort((a, b) => {
      const aD = a.deadline?.toDate ? a.deadline.toDate() : new Date(9999, 0);
      const bD = b.deadline?.toDate ? b.deadline.toDate() : new Date(9999, 0);
      return aD.getTime() - bD.getTime();
    })
    .slice(0, 3);

  const riskAlerts = activeTasks.filter(
    (t) => t.riskLevel === "Critical" || t.riskLevel === "High"
  ).slice(0, 3);

  // Today's pomodoro
  const today = new Date();
  const todaySessions = sessions.filter((s) => {
    const d = s.startedAt?.toDate ? s.startedAt.toDate() : null;
    return d && d.toDateString() === today.toDateString() && s.completed;
  });
  const todayFocusMinutes = todaySessions.reduce((acc, s) => acc + s.duration, 0);

  // Unread notifications
  const unreadNotifs = notifications.filter((n) => !n.isRead);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <DashboardShell>
      {/* Welcome Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},{" "}
            {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here&apos;s your productivity overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl border border-border bg-white text-gray-500 hover:text-primary hover:bg-primary-50 hover:border-primary/30 transition-all"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-2xl border border-border shadow-float overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-bold text-gray-800">Notifications</span>
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.slice(0, 8).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No notifications</p>
                  ) : (
                    notifications.slice(0, 8).map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 border-b border-border/60 last:border-0 ${!notif.isRead ? "bg-primary-50/40" : ""}`}
                      >
                        <p className="text-xs font-semibold text-gray-800">{notif.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link href="/notes">
            <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
              New Note
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-scale-in">
        <div className="bg-white rounded-2xl border border-border shadow-card p-5 flex items-center justify-between hover:shadow-card-hover transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Notes</p>
            <p className="text-3xl font-extrabold text-[#1F2937]">{notes.length}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-card p-5 flex items-center justify-between hover:shadow-card-hover transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Summaries</p>
            <p className="text-3xl font-extrabold text-[#1F2937]">{summariesCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-card p-5 flex items-center justify-between hover:shadow-card-hover transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Tasks</p>
            <p className="text-3xl font-extrabold text-[#1F2937]">{activeTasks.length}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        <Link href="/insight" className="block">
          <div className="bg-white rounded-2xl border border-border shadow-card p-5 flex items-center justify-between hover:shadow-card-hover transition-all h-full">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Academic</p>
              <p className="text-xl font-bold text-primary truncate max-w-[110px]">
                {insight ? insight.prediction : "Assess now"}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Brain className="w-5 h-5" />
            </div>
          </div>
        </Link>
      </div>

      {/* Productivity Widgets Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-scale-in">
        {/* Today Focus */}
        <div className="bg-gradient-to-br from-primary to-primary-600 rounded-2xl p-5 text-white shadow-float">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-5 h-5 text-white/80" />
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Today&apos;s Focus</span>
          </div>
          <p className="text-3xl font-extrabold">{todayFocusMinutes}m</p>
          <p className="text-xs text-white/70 mt-1">{todaySessions.length} sessions completed</p>
          <Link href="/pomodoro" className="mt-3 block">
            <button className="text-xs bg-white/20 hover:bg-white/30 text-white font-semibold px-3 py-1.5 rounded-lg transition-all">
              Start Session →
            </button>
          </Link>
        </div>

        {/* Risk Alerts */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span className="text-sm font-bold text-gray-800">Risk Alerts</span>
            {riskAlerts.length > 0 && (
              <span className="ml-auto text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                {riskAlerts.length}
              </span>
            )}
          </div>
          {riskAlerts.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No high-risk tasks. Great!</p>
          ) : (
            <div className="space-y-2">
              {riskAlerts.slice(0, 2).map((t) => (
                <div key={t.id} className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <p className="text-[11px] font-semibold text-red-700 truncate">{t.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversations */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-5 flex items-center justify-between hover:shadow-card-hover transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversations</p>
            <p className="text-3xl font-extrabold text-[#1F2937]">{chats.length}</p>
            <p className="text-xs text-gray-400">with AI assistant</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Pomodoro Sessions */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-5 flex items-center justify-between hover:shadow-card-hover transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Sessions</p>
            <p className="text-3xl font-extrabold text-[#1F2937]">{sessions.filter((s) => s.completed).length}</p>
            <p className="text-xs text-gray-400">pomodoro completed</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Priority Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Priority Tasks
            </h2>
            <Link href="/tasks" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {priorityTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-6 text-center space-y-3">
              <CheckSquare className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500">No high-priority tasks.</p>
              <Link href="/tasks/create">
                <Button variant="outline" size="sm">Create Task</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {priorityTasks.map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}/edit`}>
                  <div className="bg-white rounded-xl border border-border p-4 hover:border-primary/40 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-1">{task.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${PRIORITY_BADGE[task.priorityLevel]}`}>
                        {task.priorityLevel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDeadlineDays(task)}
                      </span>
                      <span>Progress: {task.progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Upcoming Deadlines
            </h2>
            <Link href="/tasks" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-6 text-center">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No upcoming deadlines</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((task) => {
                const deadline = task.deadline?.toDate ? task.deadline.toDate() : null;
                const days = deadline ? Math.round(deadlineToDays(deadline)) : null;
                return (
                  <div key={task.id} className="bg-white rounded-xl border border-border p-4 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{task.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {deadline ? deadline.toLocaleDateString("en", { month: "short", day: "numeric" }) : "No date"}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                          days !== null && days <= 2 ? "bg-red-100 text-red-700" :
                          days !== null && days <= 5 ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {formatDeadlineDays(task)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Notes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Recent Notes</h2>
            <Link href="/notes" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentNotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-6 text-center space-y-3">
              <FileText className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500">No notes yet.</p>
              <Link href="/notes">
                <Button variant="outline" size="sm">Create a Note</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((note) => (
                <Link key={note.id} href={`/notes/${note.id}`} className="block">
                  <div className="bg-white rounded-xl border border-border p-4 hover:border-primary/55 hover:shadow-sm transition-all">
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{note.title || "Untitled"}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {note.updatedAt
                        ? new Date((note.updatedAt as { seconds?: number }).seconds! * 1000).toLocaleDateString()
                        : "Recently"}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                      {note.content ? note.content.replace(/<[^>]+>/g, "").trim() || "Empty..." : "Empty..."}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
