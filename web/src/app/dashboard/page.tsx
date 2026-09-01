"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotes,
  getUserSummariesCount,
  getAcademicInsight,
  getUserTasks,
  getUserPomodoroSessions,
  getUserNotifications,
  markAllNotificationsRead,
  type NoteDocument,
  type AcademicInsight,
  type TaskDocument,
  type PomodoroSession,
  type NotificationDocument,
} from "@/lib/firestore";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { BentoGrid } from "@/components/dashboard/bento/BentoGrid";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";

function DashboardContentImpl() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [summariesCount, setSummariesCount] = useState(0);
  const [insight, setInsight] = useState<AcademicInsight | null>(null);
  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [notifications, setNotifications] = useState<NotificationDocument[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firstName = userDoc?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || "Student";

  const loadData = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [
        userNotes,
        count,
        userInsight,
        userTasks,
        userSessions,
        userNotifs,
      ] = await Promise.all([
        getUserNotes(user.uid),
        getUserSummariesCount(user.uid),
        getAcademicInsight(user.uid).catch(() => null),
        getUserTasks(user.uid),
        getUserPomodoroSessions(user.uid),
        getUserNotifications(user.uid),
      ]);
      setNotes(userNotes);
      setSummariesCount(count);
      setInsight(userInsight);
      setTasks(userTasks);
      setSessions(userSessions);
      setNotifications(userNotifs);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Gagal memuat data dashboard. Periksa koneksi internet Anda.");
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

  if (authLoading || loading) {
    return (
      <LoadingScreen label="Memuat Dashboard..." subtext="Menyiapkan ringkasan belajar & data terkini" />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Gagal Memuat Dashboard"
        message={error}
        onRetry={loadData}
      />
    );
  }

  // Unread notifications
  const unreadNotifs = notifications.filter((n) => !n.isRead);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="space-y-6 animate-fade-in" suppressHydrationWarning>
      {/* Header Greeting & Actions */}
      <div className="relative z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight" suppressHydrationWarning>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},{" "}
            {firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Personalized modular dashboard & study command center
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-2xl border border-border bg-white text-gray-500 hover:text-primary hover:bg-primary-50 hover:border-primary/30 transition-all cursor-pointer shadow-sm"
              title="Notifications"
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
              <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-3xl border border-border shadow-float overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-bold text-gray-800">Notifications</span>
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary font-semibold hover:underline cursor-pointer"
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
                        className={`px-4 py-3 border-b border-border/60 last:border-0 ${
                          !notif.isRead ? "bg-primary-50/40" : ""
                        }`}
                      >
                        <p className="text-xs font-semibold text-gray-800">{notif.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            href="/notes"
            icon={<Plus className="w-4 h-4" />}
            className="rounded-2xl shadow-sm font-bold"
          >
            New Note
          </Button>
        </div>
      </div>

      {/* 🧩 Modular Bento Grid Component */}
      <BentoGrid
        notes={notes}
        summariesCount={summariesCount}
        insight={insight}
        tasks={tasks}
        sessions={sessions}
      />
    </div>
  );
}

export default function DashboardPage() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <DashboardShell>
      {!mounted ? (
        <LoadingScreen label="Memuat Dashboard..." subtext="Menyiapkan ringkasan belajar & data terkini" />
      ) : (
        <Suspense
          fallback={
            <LoadingScreen label="Memuat Dashboard..." subtext="Menyiapkan ringkasan belajar & data terkini" />
          }
        >
          <DashboardContentImpl />
        </Suspense>
      )}
    </DashboardShell>
  );
}
