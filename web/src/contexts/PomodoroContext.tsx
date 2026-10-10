"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { getUserTasks, getTask, getUserPomodoroSessions, createPomodoroSession, updatePomodoroSession, deletePomodoroSession, updateTask, type TaskDocument, type PomodoroSession } from "@/lib/firestore";
import { computePriorityDetailed, deadlineToDays } from "@/lib/fuzzyLogic";
import { computePomodoroFocus, type PomodoroFuzzyResult } from "@/lib/pomodoroFuzzy";
import { isFullFocusSession, isRecordedFocusSession, focusMinutes } from "@/lib/pomodoroSessions";
import { useLearningProgress } from "@/components/dashboard/streak/useLearningProgress";
import { FocusProgressDialog } from "@/components/pomodoro/FocusProgressDialog";
import { FloatingPomodoroWidget } from "@/components/pomodoro/FloatingPomodoroWidget";

type Outcome = "full" | "early" | "reset";
interface CheckIn { taskId: string; title: string; before: number; suggested: number; adjusted: number; done: boolean; elapsed: number; outcome: Outcome }
interface TimerState {
  selected: string; seconds: number; running: boolean; phase: "focus" | "break";
  session: string | null; planned: number; breakMinutes: number; customMinutes: number | null;
  target: number | null; finished: boolean; outcome: Outcome | null; floating: boolean;
  prompt: CheckIn | null;
}
const initialState: TimerState = { selected: "", seconds: 1500, running: false, phase: "focus", session: null, planned: 1500, breakMinutes: 5, customMinutes: null, target: null, finished: false, outcome: null, floating: false, prompt: null };
interface PomodoroContextValue {
  tasks: TaskDocument[]; sessions: PomodoroSession[]; loading: boolean; selectedTaskId: string; selectedTask: TaskDocument | null;
  timerSeconds: number; isRunning: boolean; phase: "focus" | "break"; sessionId: string | null; sessionCompleted: boolean;
  breakSeconds: number; fuzzyResult: PomodoroFuzzyResult; todaySessions: PomodoroSession[]; streakDays: number; totalFocusToday: number; totalSessions: number;
  showProgressPrompt: boolean; setShowProgressPrompt: (show: boolean) => void; progressIncrement: number; suggestedProgress: number;
  adjustedProgress: number; setAdjustedProgress: (progress: number) => void; isUpdatingProgress: boolean;
  progressBefore: number; progressTaskTitle: string; progressElapsedSeconds: number; taskMarkedDone: boolean; setTaskMarkedDone: (done: boolean) => void;
  lastSessionOutcome: Outcome | null; isBusy: boolean; error: string;
  recommendedFocusMinutes: number;
  setFocusMinutes: (minutes: number | null) => void;
  saveTaskProgress: () => Promise<void>; startTimer: () => Promise<void>; pauseTimer: () => void;
  resetTimer: () => Promise<void>; endSession: () => Promise<void>; setSelectedTaskId: (id: string) => void; refreshData: () => Promise<void>;
}
const PomodoroContext = createContext<PomodoroContextValue | null>(null);
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, Number.isFinite(value) ? value : low));
const remaining = (state: TimerState) => state.running && state.target ? Math.max(0, Math.ceil((state.target - Date.now()) / 1000)) : state.seconds;

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<TimerState>(initialState);
  const stateRef = useRef(state);
  const tasksRef = useRef(tasks); tasksRef.current = tasks;
  const ownerRef = useRef<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const dataReadyRef = useRef(false);
  const [isUpdatingProgress, setUpdatingProgress] = useState(false);
  const [error, setError] = useState("");
  const [widgetDismissed, setWidgetDismissed] = useState(false);
  const { streakDays } = useLearningProgress(sessions);
  const commit = useCallback((patch: Partial<TimerState>) => {
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next; setState(next);
    if (ownerRef.current) { try { localStorage.setItem(`cogniva_pomodoro_v2:${ownerRef.current}`, JSON.stringify(next)); } catch {} }
  }, []);
  const perform = async (action: (uid: string) => Promise<void>) => {
    if (!user || loading || busyRef.current) return;
    if (!dataReadyRef.current) { setError("Data sesi belum tersedia. Muat ulang halaman sebelum mulai."); return; }
    const uid = user.uid;
    busyRef.current = true; setBusy(true); setError("");
    try { await action(uid); }
    catch (cause) { if (ownerRef.current === uid) setError(cause instanceof Error ? cause.message : "Perubahan belum tersimpan. Coba lagi."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const refreshData = useCallback(async () => {
    if (!user) return;
    const [nextTasks, nextSessions] = await Promise.all([getUserTasks(user.uid), getUserPomodoroSessions(user.uid)]);
    if (ownerRef.current !== user.uid) return;
    setTasks(nextTasks.filter(task => task.status !== "done")); setSessions(nextSessions);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    ownerRef.current = user?.uid || null;
    dataReadyRef.current = false;
    stateRef.current = initialState; setState(initialState); setTasks([]); setSessions([]); setError("");
    if (!user) { setLoading(false); return; }
    setLoading(true);
    void Promise.all([getUserTasks(user.uid), getUserPomodoroSessions(user.uid)]).then(([nextTasks, nextSessions]) => {
      if (!active) return;
      dataReadyRef.current = true;
      const activeTasks = nextTasks.filter(task => task.status !== "done");
      setTasks(activeTasks); tasksRef.current = activeTasks; setSessions(nextSessions);
      let restored: TimerState | null = null;
      try {
        const raw = localStorage.getItem(`cogniva_pomodoro_v2:${user.uid}`);
        if (raw) {
          const value = JSON.parse(raw);
          if (typeof value.selected === "string" && Number.isFinite(value.seconds) && Number.isFinite(value.planned) && value.planned > 0 && ["focus", "break"].includes(value.phase)) {
            restored = { ...initialState, ...value, seconds: clamp(value.seconds, 0, 7200), planned: clamp(value.planned, 60, 7200), breakMinutes: clamp(value.breakMinutes, 1, 60) };
          }
        } else {
          // Recover a previous timer only when its session belongs to this account.
          const legacy = nextSessions.find(session => session.id === localStorage.getItem("pomodoro_session_id") && !isRecordedFocusSession(session));
          if (legacy) restored = { ...initialState, selected: legacy.taskId === "general" ? "" : legacy.taskId, session: legacy.id, planned: legacy.duration * 60, seconds: Number(localStorage.getItem("pomodoro_timer_seconds")) || legacy.duration * 60, running: localStorage.getItem("pomodoro_is_running") === "true", target: Number(localStorage.getItem("pomodoro_target_end_time")) || null, floating: true };
        }
      } catch {}
      if (restored?.session) {
        const owned = nextSessions.find(session => session.id === restored?.session && !isRecordedFocusSession(session));
        if (!owned) restored = null;
      }
      if (restored) {
        if (restored.running && !restored.target) restored.running = false;
        restored.seconds = remaining(restored);
        commit(restored);
      } else {
        const task = activeTasks[0];
        const recommendation = task ? computePomodoroFocus(task.priorityScore, task.difficulty, task.estimatedTotalMinutes) : computePomodoroFocus(30, 5);
        commit({ ...initialState, selected: task?.id || "", seconds: recommendation.recommendedMinutes * 60, planned: recommendation.recommendedMinutes * 60, breakMinutes: recommendation.breakMinutes });
      }
    }).catch(() => { if (active) setError("Tugas dan sesi belum bisa dimuat. Coba muat ulang halaman."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.uid, authLoading, commit]);

  const selectedTask = tasks.find(task => task.id === state.selected) || null;
  const base = selectedTask ? computePomodoroFocus(selectedTask.priorityScore, selectedTask.difficulty, selectedTask.estimatedTotalMinutes) : computePomodoroFocus(30, 5);
  const fuzzyResult: PomodoroFuzzyResult = { ...base, recommendedMinutes: state.session || state.phase === "break" ? state.planned / 60 : state.customMinutes ?? base.recommendedMinutes, breakMinutes: state.session || state.phase === "break" ? state.breakMinutes : base.breakMinutes };
  useEffect(() => {
    if (loading || state.running || state.session || state.phase !== "focus" || state.prompt) return;
    const seconds = (state.customMinutes ?? base.recommendedMinutes) * 60;
    if (state.seconds !== seconds || state.breakMinutes !== base.breakMinutes) commit({ seconds, planned: seconds, breakMinutes: base.breakMinutes });
  }, [loading, state.running, state.session, state.phase, state.prompt, state.customMinutes, base.recommendedMinutes, base.breakMinutes, commit]);

  const finish = async (outcome: Outcome) => perform(async uid => {
    const current = stateRef.current;
    const left = remaining(current);
    commit({ running: false, seconds: left, target: null });
    if (current.phase === "break") { commit({ phase: "focus", seconds: current.planned, finished: false, floating: false }); return; }
    const elapsed = current.session ? clamp(current.planned - left, 0, current.planned) : 0;
    const kind: Outcome = elapsed >= current.planned ? "full" : outcome;
    if (current.session) {
      if (elapsed === 0) await deletePomodoroSession(current.session);
      else await updatePomodoroSession(current.session, { completed: kind === "full", outcome: kind, elapsedSeconds: elapsed, plannedMinutes: current.planned / 60, duration: Math.round(elapsed / 60 * 100) / 100 });
      if (ownerRef.current !== uid) return;
      const previousSession = sessions.find(session => session.id === current.session);
      window.dispatchEvent(new CustomEvent("cogniva-focus-session-updated", { detail: { userId: uid, sessionId: current.session, session: elapsed > 0 && previousSession ? { ...previousSession, completed: kind === "full", outcome: kind, elapsedSeconds: elapsed, plannedMinutes: current.planned / 60, duration: Math.round(elapsed / 60 * 100) / 100, endedAt: Timestamp.now() } : null } }));
      setSessions(previous => elapsed === 0 ? previous.filter(session => session.id !== current.session) : previous.map(session => session.id === current.session ? { ...session, completed: kind === "full", outcome: kind, elapsedSeconds: elapsed, plannedMinutes: current.planned / 60, duration: Math.round(elapsed / 60 * 100) / 100, endedAt: Timestamp.now() } : session));
    }
    const task = tasksRef.current.find(item => item.id === current.selected);
    let prompt: CheckIn | null = null;
    if (task && elapsed > 0 && kind !== "reset" && task.progress < 100) {
      const before = clamp(task.progress, 0, 99);
      const estimate = task.estimatedTotalMinutes > 0 ? Math.round((elapsed / 60 / task.estimatedTotalMinutes) * (100 - before)) : 0;
      prompt = { taskId: task.id, title: task.title, before, suggested: clamp(before + estimate, before, 99), adjusted: before, done: false, elapsed, outcome: kind };
    }
    commit({ session: null, running: false, target: null, phase: kind === "reset" ? "focus" : "break", seconds: kind === "reset" ? current.planned : current.breakMinutes * 60, finished: kind !== "reset" && elapsed > 0, outcome: kind, prompt, floating: kind !== "reset" });
    void getUserPomodoroSessions(uid).then(next => { if (ownerRef.current === uid) setSessions(next); }).catch(() => {});
  });
  const finishRef = useRef(finish); finishRef.current = finish;
  useEffect(() => {
    if (loading || !state.running) return;
    const tick = () => {
      const current = stateRef.current;
      if (!current.running) return;
      const seconds = remaining(current);
      if (seconds !== current.seconds) commit({ seconds });
      if (seconds === 0) void finishRef.current("full");
    };
    tick();
    const interval = setInterval(tick, 1000);
    const visible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", visible); };
  }, [loading, state.running, state.phase, commit]);

  const startTimer = async () => {
    if (stateRef.current.prompt) { if (pathname !== "/dashboard" && pathname !== "/pomodoro") router.push("/pomodoro"); return; }
    if (stateRef.current.session && remaining(stateRef.current) === 0) { await finish("full"); return; }
    await perform(async uid => {
    const current = stateRef.current;
    if (current.running || current.prompt) return;
    const task = tasksRef.current.find(item => item.id === current.selected);
    let id = current.session;
    const planned = current.session ? current.planned : current.phase === "focus" ? (current.customMinutes ?? (task ? computePomodoroFocus(task.priorityScore, task.difficulty, task.estimatedTotalMinutes).recommendedMinutes : base.recommendedMinutes)) * 60 : current.planned;
    const seconds = current.seconds > 0 && !current.finished ? current.seconds : current.phase === "break" ? current.breakMinutes * 60 : planned;
    if (!id && current.phase === "focus") {
      if (task?.status === "todo") {
        await updateTask(task.id, { status: "doing" });
        if (ownerRef.current !== uid) return;
        setTasks(previous => previous.map(item => item.id === task.id ? { ...item, status: "doing" } : item));
      }
      id = await createPomodoroSession(uid, task?.id || "general", task?.title || "Sesi tanpa tugas", planned / 60);
      if (ownerRef.current !== uid) return;
      setSessions(previous => [{ id: id!, userId: uid, taskId: task?.id || "general", taskTitle: task?.title || "Sesi tanpa tugas", duration: planned / 60, completed: false, startedAt: Timestamp.now() }, ...previous]);
    }
    commit({ session: id, planned, seconds, running: true, target: Date.now() + seconds * 1000, finished: false, floating: true });
    setWidgetDismissed(false);
    });
  };
  const pauseTimer = () => { if (busyRef.current) return; commit({ seconds: remaining(stateRef.current), running: false, target: null }); };
  const resetTimer = async () => { if (stateRef.current.prompt) { if (pathname !== "/dashboard" && pathname !== "/pomodoro") router.push("/pomodoro"); return; } await finish("reset"); };
  const endSession = async () => finish("early");
  const setSelectedTaskId = (id: string) => {
    const current = stateRef.current;
    if (current.running || current.session || current.prompt || current.phase === "break" || busyRef.current) { setError("Akhiri sesi sebelumnya sebelum mengganti tugas."); return; }
    const task = tasksRef.current.find(item => item.id === id);
    const recommendation = task ? computePomodoroFocus(task.priorityScore, task.difficulty, task.estimatedTotalMinutes) : computePomodoroFocus(30, 5);
    commit({ selected: id, customMinutes: null, seconds: recommendation.recommendedMinutes * 60, planned: recommendation.recommendedMinutes * 60, breakMinutes: recommendation.breakMinutes, phase: "focus", finished: false, floating: false });
    setError("");
  };
  const setFocusMinutes = (minutes: number | null) => {
    const current = stateRef.current;
    if (current.running || current.session || current.prompt || current.phase !== "focus" || busyRef.current) return;
    const duration = minutes === null ? base.recommendedMinutes : Math.round(clamp(minutes, 1, 120));
    commit({ customMinutes: minutes === null ? null : duration, seconds: duration * 60, planned: duration * 60 });
  };
  const setShowProgressPrompt = (show: boolean) => { if (!show && !busyRef.current) commit({ prompt: null }); };
  const setAdjustedProgress = (progress: number) => { const prompt = stateRef.current.prompt; if (prompt) commit({ prompt: { ...prompt, adjusted: clamp(Math.round(progress), 0, 99), done: false } }); };
  const setTaskMarkedDone = (done: boolean) => { const prompt = stateRef.current.prompt; if (prompt) commit({ prompt: { ...prompt, done, adjusted: done ? 100 : prompt.before } }); };
  const saveTaskProgress = async () => perform(async uid => {
    const prompt = stateRef.current.prompt;
    if (!prompt) return;
    setUpdatingProgress(true);
    try {
      const latest = await getTask(prompt.taskId);
      if (ownerRef.current !== uid) return;
      if (!latest || latest.userId !== uid) throw new Error("Tugas ini tidak lagi tersedia.");
      if (latest.status === "done") {
        if (ownerRef.current !== uid) return;
        setTasks(previous => previous.filter(task => task.id !== latest.id));
        window.dispatchEvent(new CustomEvent("cogniva-focus-task-updated", { detail: { userId: uid, task: latest } }));
        const seconds = stateRef.current.breakMinutes * 60;
        commit({ selected: "", prompt: null, phase: "break", seconds, running: true, target: Date.now() + seconds * 1000, finished: false, floating: true });
        return;
      }
      if (latest.progress !== prompt.before) {
        commit({ prompt: { ...prompt, before: latest.progress, adjusted: latest.progress, done: latest.status === "done" } });
        throw new Error("Progres tugas berubah. Nilai terbaru sudah ditampilkan; periksa sebelum menyimpan.");
      }
      const progress = prompt.done ? 100 : clamp(prompt.adjusted, 0, 99);
      const result = computePriorityDetailed({ deadlineDays: latest.deadline?.toDate ? deadlineToDays(latest.deadline.toDate()) : 7, importance: latest.importance, difficulty: latest.difficulty, progress, academicRisk: latest.academicRisk ?? 40 });
      const changes = { progress, status: prompt.done ? "done" as const : "doing" as const, priorityScore: result.priorityScore, priorityLevel: result.priorityLevel, riskLevel: result.riskLevel, estimatedTotalMinutes: result.estimatedTotalMinutes, reasoning: result.reasoning };
      await updateTask(latest.id, changes);
      if (ownerRef.current !== uid) return;
      setTasks(previous => previous.flatMap(task => task.id !== latest.id ? [task] : prompt.done ? [] : [{ ...task, ...changes }]));
      window.dispatchEvent(new CustomEvent("cogniva-focus-task-updated", { detail: { userId: uid, task: { ...latest, ...changes } } }));
      const current = stateRef.current;
      const seconds = current.breakMinutes * 60;
      commit({ selected: prompt.done ? "" : current.selected, prompt: null, phase: "break", seconds, running: true, target: Date.now() + seconds * 1000, finished: false, floating: true });
      setWidgetDismissed(false);
    } finally { setUpdatingProgress(false); }
  });
  const today = new Date().toDateString();
  const recordedToday = sessions.filter(session => isRecordedFocusSession(session) && session.startedAt?.toDate?.().toDateString() === today);
  const todaySessions = recordedToday.filter(isFullFocusSession);
  return <PomodoroContext.Provider value={{ tasks, sessions, loading, selectedTaskId: state.selected, selectedTask, timerSeconds: state.seconds, isRunning: state.running, phase: state.phase, sessionId: state.session, sessionCompleted: state.finished, breakSeconds: state.breakMinutes * 60, fuzzyResult, todaySessions, streakDays, totalFocusToday: focusMinutes(recordedToday), totalSessions: sessions.filter(isFullFocusSession).length, showProgressPrompt: !!state.prompt, setShowProgressPrompt, progressIncrement: state.prompt ? state.prompt.suggested - state.prompt.before : 0, suggestedProgress: state.prompt?.suggested || 0, adjustedProgress: state.prompt?.adjusted || 0, setAdjustedProgress, isUpdatingProgress, progressBefore: state.prompt?.before || 0, progressTaskTitle: state.prompt?.title || "", progressElapsedSeconds: state.prompt?.elapsed || 0, taskMarkedDone: state.prompt?.done || false, setTaskMarkedDone, lastSessionOutcome: state.outcome, isBusy, error, recommendedFocusMinutes: base.recommendedMinutes, setFocusMinutes, saveTaskProgress, startTimer, pauseTimer, resetTimer, endSession, setSelectedTaskId, refreshData }}>
    {children}
    <FocusProgressDialog />
    {error && pathname !== "/pomodoro" && !(state.prompt && pathname === "/dashboard") && <div role="alert" className="fixed top-5 right-5 z-[10001] max-w-sm rounded-xl border border-[#dfc6b3] bg-[#f5eadf] px-4 py-3 text-sm text-[#946044]">{error}</div>}
    {user && !widgetDismissed && !(state.prompt && (pathname === "/dashboard" || pathname === "/pomodoro")) && (state.running || state.floating) && <FloatingPomodoroWidget isRunning={state.running} timerSeconds={state.seconds} phase={state.phase} taskTitle={selectedTask?.title || "Sesi tanpa tugas"} onStart={startTimer} onPause={pauseTimer} onReset={resetTimer} onExpand={() => router.push("/pomodoro")} onDismiss={() => { setWidgetDismissed(true); commit({ floating: false }); }} />}
  </PomodoroContext.Provider>;
}
export function usePomodoro() { const context = useContext(PomodoroContext); if (!context) throw new Error("usePomodoro must be used within a PomodoroProvider"); return context; }
