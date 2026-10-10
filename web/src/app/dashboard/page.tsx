"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
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
import { QuickNoteSearch } from "@/components/dashboard/bento/DashboardWidgets";
import s from "@/components/dashboard/bento/workspace.module.css";

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
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const [failedData, setFailedData] = useState<string[]>([]);
  const [partialError, setPartialError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firstName = userDoc?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || "Student";

  const loadData = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setPartialError(null);
    setFailedData([]);
    try {
      const [
        userNotes,
        count,
        userInsight,
        userTasks,
        userSessions,
        userNotifs,
      ] = await Promise.allSettled([
        getUserNotes(user.uid),
        getUserSummariesCount(user.uid),
        getAcademicInsight(user.uid),
        getUserTasks(user.uid),
        getUserPomodoroSessions(user.uid),
        getUserNotifications(user.uid),
      ]);
      const results = [userNotes, count, userInsight, userTasks, userSessions, userNotifs];
      if (results.every(result => result.status === "rejected")) throw new Error("Dashboard unavailable");
      setNotes(userNotes.status === "fulfilled" ? userNotes.value : []);
      setSummariesCount(count.status === "fulfilled" ? count.value : 0);
      setInsight(userInsight.status === "fulfilled" ? userInsight.value : null);
      setTasks(userTasks.status === "fulfilled" ? userTasks.value : []);
      setSessions(userSessions.status === "fulfilled" ? userSessions.value : []);
      setNotifications(userNotifs.status === "fulfilled" ? userNotifs.value : []);
      const labels = ["catatan", "ringkasan", "insight", "tugas", "sesi fokus", "notifikasi"];
      const keys = ["notes", "summaries", "insight", "tasks", "sessions", "notifications"];
      setFailedData(results.flatMap((result, index) => result.status === "rejected" ? [keys[index]] : []));
      const failed = results.flatMap((result, index) => result.status === "rejected" ? [labels[index]] : []);
      if (failed.length) setPartialError(`Belum bisa memuat ${failed.join(", ")}. Data pada bagian tersebut belum tersedia.`);
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

  useEffect(() => {
    if (!user) return;
    const taskUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; task: TaskDocument }>).detail;
      if (detail?.userId !== user.uid || detail.task.userId !== user.uid) return;
      setTasks(previous => previous.some(task => task.id === detail.task.id)
        ? previous.map(task => task.id === detail.task.id ? detail.task : task)
        : [...previous, detail.task]);
    };
    const sessionUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; sessionId: string; session: PomodoroSession | null }>).detail;
      if (detail?.userId !== user.uid) return;
      const session = detail.session;
      if (session && session.userId !== user.uid) return;
      setSessions(previous => !session ? previous.filter(item => item.id !== detail.sessionId)
        : previous.some(item => item.id === session.id) ? previous.map(item => item.id === session.id ? session : item) : [session, ...previous]);
    };
    window.addEventListener("cogniva-focus-task-updated", taskUpdated);
    window.addEventListener("cogniva-focus-session-updated", sessionUpdated);
    return () => {
      window.removeEventListener("cogniva-focus-task-updated", taskUpdated);
      window.removeEventListener("cogniva-focus-session-updated", sessionUpdated);
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!showNotifications) return;
    const dismiss = (event: PointerEvent) => { if (!notificationsRef.current?.contains(event.target as Node)) setShowNotifications(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setShowNotifications(false); notificationButtonRef.current?.focus(); } };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [showNotifications]);

  if (authLoading || loading) {
    return (
      <LoadingScreen label="Menyiapkan ruang belajarmu" subtext="Menyiapkan ringkasan belajar & data terkini" />
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
    <div className={s.page} suppressHydrationWarning>
      {/* Header Greeting & Actions */}
      <div className={s.header}>
        <div className={s.greeting}>
          <h1 suppressHydrationWarning>
            Selamat {new Date().getHours() < 11 ? "pagi" : new Date().getHours() < 15 ? "siang" : new Date().getHours() < 18 ? "sore" : "malam"},{" "}
            {firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Apa yang ingin kamu tuntaskan hari ini?
          </p>
        </div>

        <div className={s.headerActions}>
          <QuickNoteSearch notes={notes} />
          {/* Notification Bell */}
          <div className="relative" ref={notificationsRef}>
            <button
              ref={notificationButtonRef}
              aria-label="Notifikasi"
              aria-expanded={showNotifications}
              aria-controls="dashboard-notifications"
              onClick={() => setShowNotifications(!showNotifications)}
              className={s.bellButton}
              title="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#527243] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div id="dashboard-notifications" className={s.notifications}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-bold text-gray-800">Notifikasi</span>
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      Tandai dibaca
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.slice(0, 8).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Belum ada notifikasi</p>
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
            className={s.primaryButton}
          >
            Catatan baru
          </Button>
        </div>
      </div>

      {partialError && <div className={s.saveError} role="alert">{partialError}<button onClick={loadData}>Coba lagi</button></div>}
      {/* Customizable workspace */}
      <BentoGrid
        notes={notes}
        summariesCount={summariesCount}
        insight={insight}
        tasks={tasks}
        sessions={sessions}
        unavailable={failedData}
        onRetry={loadData}
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
        <LoadingScreen label="Menyiapkan ruang belajarmu" subtext="Menyiapkan ringkasan belajar & data terkini" />
      ) : (
        <Suspense
          fallback={
            <LoadingScreen label="Menyiapkan ruang belajarmu" subtext="Menyiapkan ringkasan belajar & data terkini" />
          }
        >
          <DashboardContentImpl />
        </Suspense>
      )}
    </DashboardShell>
  );
}
