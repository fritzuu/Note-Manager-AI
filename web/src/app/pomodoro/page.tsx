"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Timer, Play, Pause, RotateCcw, CheckCircle2, Coffee, Check, Plus, ArrowUpRight, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { Dropdown } from "@/components/ui/Dropdown";
import { isFullFocusSession, isRecordedFocusSession, focusMinutes, focusSeconds, formatFocusDuration } from "@/lib/pomodoroSessions";
import { priorityLabels } from "@/components/tasks/taskPresentation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import s from "@/components/pomodoro/pomodoro.module.css";

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
    totalFocusToday,
    totalSessions,
    showProgressPrompt,
    startTimer,
    pauseTimer,
    resetTimer,
    endSession,
    setSelectedTaskId,
    setFocusMinutes,
    recommendedFocusMinutes,
    lastSessionOutcome,
    isBusy,
    error: contextError,
  } = usePomodoro();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const actionLock = useRef(false);
  const runAction = async (action: () => void | Promise<void>) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setActionError("");
    try { await action(); } catch { setActionError("Perubahan belum tersimpan. Coba lagi."); }
    finally { actionLock.current = false; setBusy(false); }
  };

  const appliedTaskRef = useRef<string | null>(null);
  // Apply a task link once, allowing the dropdown to select another task afterwards.
  useEffect(() => {
    if (initialTaskId && appliedTaskRef.current !== initialTaskId && !isRunning && !sessionId && phase === "focus" && !showProgressPrompt) {
      if (tasks.some((t) => t.id === initialTaskId)) {
        setSelectedTaskId(initialTaskId);
        appliedTaskRef.current = initialTaskId;
      }
    }
  }, [initialTaskId, selectedTaskId, tasks, isRunning, sessionId, phase, showProgressPrompt, setSelectedTaskId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  if (!mounted || authLoading || pomodoroLoading) {
    return (
      <LoadingScreen label="Menyiapkan sesi fokus…" />
    );
  }

  const completedTaskSessions = sessions.filter(
    (s) => s.taskId === selectedTaskId && isFullFocusSession(s)
  ).length;

  const estimatedTotalSessions =
    selectedTask && fuzzyResult.recommendedMinutes > 0
      ? Math.ceil(selectedTask.estimatedTotalMinutes / fuzzyResult.recommendedMinutes)
      : 0;

  const targetSessions =
    selectedTask && selectedTask.estimatedTotalMinutes > 0
      ? Math.max(1, estimatedTotalSessions)
      : 0;

  const totalSecs = (phase === "focus" ? fuzzyResult.recommendedMinutes : fuzzyResult.breakMinutes) * 60;
  const fraction = Math.max(0, Math.min(1, totalSecs > 0 ? timerSeconds / totalSecs : 0));
  const radius = 142;
  const circumference = 2 * Math.PI * radius;
  const started = !!sessionId || timerSeconds < totalSecs;
  const completed = sessions.filter(isRecordedFocusSession).sort((a, b) => (b.startedAt?.toDate?.().getTime() || 0) - (a.startedAt?.toDate?.().getTime() || 0));
  const focusLabel = ({ Micro: "Singkat", Short: "Singkat", Medium: "Sedang", Long: "Panjang" } as Record<string, string>)[fuzzyResult.label];

  return <div className={s.page}>
    <header className={s.header}><div><h1>Sesi fokus</h1><p>Waktu untuk satu tugas.</p></div><Link href="/tasks" className={s.textLink}>Lihat tugas<ArrowUpRight size={16} /></Link></header>
    {(actionError || contextError) && <p className={s.error} role="alert">{actionError || contextError}</p>}
    <div className={s.workspace}>
      <section className={s.timerPanel} data-phase={phase} aria-label="Timer sesi">
        <div className={s.phase}>{phase === "focus" ? <Timer size={18} /> : <Coffee size={18} />}<span>{phase === "focus" ? "Fokus" : "Istirahat"}</span><span className={s.duration}>{phase === "focus" ? fuzzyResult.recommendedMinutes : fuzzyResult.breakMinutes} menit</span></div>
        <div className={s.clock}>
          <svg viewBox="0 0 320 320" aria-hidden="true"><circle cx="160" cy="160" r={radius} className={s.track} /><circle cx="160" cy="160" r={radius} className={s.arc} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - fraction)} /></svg>
          <div className={s.clockFace}><span role="timer" aria-label={`Sisa waktu ${formatTime(timerSeconds)}`} className={s.digits}>{formatTime(timerSeconds)}</span><span className={s.timerState}>{isRunning ? "Sedang berjalan" : started && !sessionCompleted ? "Dijeda" : phase === "break" ? "Siap istirahat" : "Siap mulai"}</span></div>
        </div>
        <p className={s.currentTask}>{phase === "break" ? "Jeda sebelum sesi berikutnya" : selectedTask?.title || "Sesi tanpa tugas"}</p>
        <div className={s.controls}><button type="button" className={s.reset} disabled={busy || isBusy} onClick={() => runAction(resetTimer)} aria-label="Reset timer" title="Reset timer"><RotateCcw size={19} /></button><button type="button" className={s.start} disabled={busy || isBusy} onClick={() => runAction(isRunning ? pauseTimer : startTimer)}>{isRunning ? <Pause size={18} /> : <Play size={18} />}{busy ? "Sebentar…" : isRunning ? "Jeda" : started && !sessionCompleted ? "Lanjutkan" : phase === "break" ? "Mulai istirahat" : "Mulai fokus"}</button></div>
        {(isRunning || started) && !sessionCompleted && <button type="button" className={s.end} disabled={busy || isBusy} onClick={() => runAction(endSession)}><Check size={15} />Akhiri sesi</button>}
        {sessionCompleted && <p className={s.completed} role="status"><CheckCircle2 size={16} />{lastSessionOutcome === "early" ? "Sesi diakhiri lebih awal." : "Sesi fokus selesai."}</p>}
      </section>
      <aside className={s.taskPanel} aria-label="Tugas dan durasi fokus">
        <div className={s.sectionHeading}><h2>Tugas yang dikerjakan</h2>{selectedTask && <Link href={`/tasks/${selectedTask.id}/edit`} aria-label="Edit tugas"><ArrowUpRight size={18} /></Link>}</div>
        {tasks.length ? <Dropdown label="Pilih tugas untuk fokus" value={selectedTaskId || ""} onChange={setSelectedTaskId} disabled={isRunning || busy || isBusy || !!sessionId || showProgressPrompt || phase === "break"} options={[{ value: "", label: "Sesi tanpa tugas" }, ...tasks.map(task => ({ value: task.id, label: task.title, detail: priorityLabels[task.priorityLevel] }))]} /> : <div className={s.emptyTask}><p>Belum ada tugas aktif. Kamu tetap bisa mulai sesi fokus.</p><Link href="/tasks/create" className={s.textLink}>Tambah tugas<Plus size={15} /></Link></div>}
        {selectedTask && <>
          <div className={s.taskSummary}><span className={s.priority} data-priority={selectedTask.priorityLevel}>{priorityLabels[selectedTask.priorityLevel]}</span><h3>{selectedTask.title}</h3><span className={s.muted}>{selectedTask.workspace || selectedTask.course || "Umum"}</span></div>
          <div className={s.taskProgress}><div><span>Progres tugas</span><strong>{selectedTask.progress}%</strong></div><div className={s.progressTrack}><span style={{ width: `${Math.max(0, Math.min(100, selectedTask.progress))}%` }} /></div></div>
          {targetSessions > 0 && <div className={s.sessionProgress}><span>{completedTaskSessions} sesi selesai untuk tugas ini</span><span>Perkiraan {targetSessions} sesi lagi</span><div className={s.sessionDots} aria-hidden="true">{Array.from({ length: Math.min(10, Math.max(targetSessions, completedTaskSessions)) }, (_, index) => <i key={index} data-complete={index < completedTaskSessions} />)}</div></div>}
        </>}
        <section className={s.recommendation}><h2>Durasi sesi</h2><div className={s.durationControls}><Dropdown compact label="Durasi fokus" value={String(fuzzyResult.recommendedMinutes)} disabled={isRunning || isBusy || !!sessionId || showProgressPrompt || phase !== "focus"} onChange={value => setFocusMinutes(Number(value))} options={[...new Set([fuzzyResult.recommendedMinutes, 15, 25, 40, 50])].sort((a, b) => a - b).map(minutes => ({ value: String(minutes), label: `${minutes} menit` }))} /><label>Menit<input type="number" min={1} max={120} aria-label="Durasi fokus dalam menit" value={fuzzyResult.recommendedMinutes} disabled={isRunning || isBusy || !!sessionId || showProgressPrompt || phase !== "focus"} onChange={event => setFocusMinutes(Number(event.target.value))} /></label></div>{fuzzyResult.recommendedMinutes !== recommendedFocusMinutes && <button type="button" className={s.useEstimate} disabled={isRunning || isBusy || !!sessionId || showProgressPrompt || phase !== "focus"} onClick={() => setFocusMinutes(null)}>Gunakan durasi yang disarankan</button>}<dl><div><dt>Fokus</dt><dd>{fuzzyResult.recommendedMinutes} menit</dd></div><div><dt>Istirahat</dt><dd>{fuzzyResult.breakMinutes} menit</dd></div></dl><p>{selectedTask ? "Durasi menyesuaikan prioritas dan kesulitan tugas yang kamu pilih." : "Durasi ini bisa dipakai untuk sesi tanpa tugas."}</p><details><summary>Lihat rincian<ChevronDown size={15} /></summary><dl><div><dt>Jenis sesi</dt><dd>{focusLabel}</dd></div><div><dt>Prioritas</dt><dd>{priorityLabels[selectedTask?.priorityLevel || "Medium"]}</dd></div><div><dt>Kesulitan</dt><dd>{selectedTask?.difficulty || 5} / 10</dd></div>{selectedTask && <><div><dt>Nilai prioritas</dt><dd>{selectedTask.priorityScore} / 100</dd></div><div><dt>Perkiraan sisa waktu</dt><dd>{selectedTask.estimatedTotalMinutes} menit</dd></div></>}</dl></details></section>
      </aside>
    </div>
    <section className={s.activity} aria-label="Aktivitas sesi fokus"><div className={s.activityHeading}><h2>Hari ini</h2><Link href="/analytics" className={s.textLink}>Lihat aktivitas<ArrowUpRight size={15} /></Link></div><div className={s.activityNumbers}><div><strong>{totalFocusToday}</strong><span>menit fokus</span></div><div><strong>{todaySessions.length}</strong><span>sesi selesai</span></div><div className={s.allTime}><span>Total sejauh ini</span><p>{totalSessions} sesi · {focusMinutes(completed)} menit</p></div></div></section>
    <section className={s.history}><div className={s.sectionHeading}><h2>Sesi terakhir</h2><span>5 sesi terbaru</span></div>{completed.length ? <div>{completed.slice(0, 5).map(session => <div className={s.historyRow} key={session.id}><CheckCircle2 size={18} aria-hidden="true" /><div><h3>{session.taskTitle === "Focus Session" ? "Sesi tanpa tugas" : session.taskTitle || "Sesi tanpa tugas"}</h3><span>{session.startedAt?.toDate?.().toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · {session.outcome === "early" ? "Diakhiri lebih awal" : session.outcome === "reset" ? "Direset" : "Sesi penuh"}</span></div><span>{formatFocusDuration(focusSeconds(session))}</span></div>)}</div> : <p className={s.emptyHistory}>Sesi yang selesai akan muncul di sini.</p>}</section>


  </div>;
}

export default function PomodoroPage() {
  return <DashboardShell><Suspense fallback={<LoadingScreen label="Menyiapkan sesi fokus…" />}><PomodoroContentImpl /></Suspense></DashboardShell>;
}
