"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import {
  getUserTasks,
  getUserPomodoroSessions,
  createPomodoroSession,
  completePomodoroSession,
  updatePomodoroSession,
  deletePomodoroSession,
  updateTask,
  type TaskDocument,
  type PomodoroSession,
} from "@/lib/firestore";
import { computePomodoroFocus, type PomodoroFuzzyResult } from "@/lib/pomodoroFuzzy";
import { FloatingPomodoroWidget } from "@/components/pomodoro/FloatingPomodoroWidget";

interface PomodoroContextValue {
  tasks: TaskDocument[];
  sessions: PomodoroSession[];
  loading: boolean;
  selectedTaskId: string;
  selectedTask: TaskDocument | null;
  timerSeconds: number;
  isRunning: boolean;
  phase: "focus" | "break";
  sessionId: string | null;
  sessionCompleted: boolean;
  breakSeconds: number;
  fuzzyResult: PomodoroFuzzyResult;
  todaySessions: PomodoroSession[];
  streakDays: number;
  totalFocusToday: number;
  totalSessions: number;
  showProgressPrompt: boolean;
  setShowProgressPrompt: (show: boolean) => void;
  progressIncrement: number;
  suggestedProgress: number;
  adjustedProgress: number;
  setAdjustedProgress: (progress: number) => void;
  isUpdatingProgress: boolean;
  saveTaskProgress: () => Promise<void>;
  startTimer: () => Promise<void>;
  pauseTimer: () => void;
  resetTimer: () => Promise<void>;
  endSession: () => Promise<void>;
  setSelectedTaskId: (id: string) => void;
  refreshData: () => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [selectedTaskId, setSelectedTaskIdState] = useState<string>("");
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(5 * 60);
  const [showFloatingWidget, setShowFloatingWidget] = useState(false);
  const [widgetDismissed, setWidgetDismissed] = useState(false);

  // Progress check-in states upon focus session completion
  const [showProgressPrompt, setShowProgressPrompt] = useState(false);
  const [progressIncrement, setProgressIncrement] = useState(0);
  const [suggestedProgress, setSuggestedProgress] = useState(0);
  const [adjustedProgress, setAdjustedProgress] = useState(0);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(sessionId);
  const targetEndTimeRef = useRef<number | null>(null);

  // Sync ref
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Compute fuzzy recommendation
  const fuzzyResult = selectedTask
    ? computePomodoroFocus(
        selectedTask.priorityScore,
        selectedTask.difficulty / 10,
        selectedTask.estimatedTotalMinutes
      )
    : computePomodoroFocus(30, 5);

  // Load / refresh tasks & sessions
  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const [userTasks, userSessions] = await Promise.all([
        getUserTasks(user.uid),
        getUserPomodoroSessions(user.uid),
      ]);
      const activeTasks = userTasks.filter((t) => t.status !== "done");
      setTasks(activeTasks);
      setSessions(userSessions);

      // Select first active task if none selected or current selection no longer active
      setSelectedTaskIdState((prev) => {
        if (prev && activeTasks.some((t) => t.id === prev)) return prev;
        return activeTasks.length > 0 ? activeTasks[0].id : "";
      });
    } catch (e) {
      console.error("Failed to load Pomodoro tasks/sessions:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data on user state change
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      refreshData();
    } else {
      setTasks([]);
      setSessions([]);
      setLoading(false);
    }
  }, [user, authLoading, refreshData]);

  // Complete session handler
  const handleComplete = useCallback(async () => {
    const curSessionId = sessionIdRef.current;
    if (curSessionId && user) {
      try {
        await completePomodoroSession(curSessionId);
        const updated = await getUserPomodoroSessions(user.uid);
        setSessions(updated);

        // Calculate progress increment for the selected task
        if (selectedTask) {
          const completedCount = updated.filter(
            (s) => s.taskId === selectedTask.id && s.completed
          ).length;
          
          const estimatedTotalSessions = fuzzyResult.recommendedMinutes > 0
            ? Math.round(selectedTask.estimatedTotalMinutes / fuzzyResult.recommendedMinutes)
            : 0;
          const targetSessions = selectedTask.estimatedTotalMinutes > 0
            ? Math.max(1, estimatedTotalSessions)
            : 0;

          const currentProgress = selectedTask.progress || 0;
          if (currentProgress < 100) {
            const remaining = selectedTask.estimatedTotalMinutes || fuzzyResult.recommendedMinutes;
            const factor = (100 - currentProgress) / 100;
            const baseTotalTime = factor > 0 ? remaining / factor : remaining;
            const focusMinutes = fuzzyResult.recommendedMinutes;
            const increment = baseTotalTime > 0
              ? Math.max(1, Math.round((focusMinutes / baseTotalTime) * 100))
              : 10;
            
            // If sessions target reached or exceeded, set progress to 100%
            const reachesTarget = targetSessions > 0 && completedCount >= targetSessions;
            const nextProgress = reachesTarget ? 100 : Math.min(100, currentProgress + increment);

            setProgressIncrement(reachesTarget ? (100 - currentProgress) : increment);
            setSuggestedProgress(nextProgress);
            setAdjustedProgress(nextProgress);
            setShowProgressPrompt(true);
          }
        }
      } catch (e) {
        console.error("Failed to complete Pomodoro session:", e);
      }
    }

    setSessionCompleted(true);
    setIsRunning(false);
    targetEndTimeRef.current = null;
    if (typeof window !== "undefined") {
      localStorage.setItem("pomodoro_is_running", "false");
      localStorage.removeItem("pomodoro_target_end_time");
      localStorage.removeItem("pomodoro_session_id");
    }
  }, [user, selectedTask, fuzzyResult.recommendedMinutes]);

  // Hydrate from localStorage once mounted on client
  useEffect(() => {
    setMounted(true);
    try {
      const savedTaskId = localStorage.getItem("pomodoro_selected_task_id");
      const savedPhase = (localStorage.getItem("pomodoro_phase") as "focus" | "break") || "focus";
      const savedSessionId = localStorage.getItem("pomodoro_session_id");
      const savedWidget = localStorage.getItem("pomodoro_show_widget") === "true";
      const savedRunning = localStorage.getItem("pomodoro_is_running") === "true";
      const savedTargetEndTimeStr = localStorage.getItem("pomodoro_target_end_time");

      if (savedTaskId) setSelectedTaskIdState(savedTaskId);
      if (savedPhase) setPhase(savedPhase);
      if (savedSessionId) setSessionId(savedSessionId);
      if (savedWidget) setShowFloatingWidget(savedWidget);

      if (savedRunning && savedTargetEndTimeStr) {
        const targetEnd = parseInt(savedTargetEndTimeStr, 10);
        const remaining = Math.ceil((targetEnd - Date.now()) / 1000);

        if (remaining > 0) {
          targetEndTimeRef.current = targetEnd;
          setTimerSeconds(remaining);
          setIsRunning(true);
        } else {
          // Finished while away
          setTimerSeconds(0);
          setIsRunning(false);
          targetEndTimeRef.current = null;
          handleComplete();
        }
      } else {
        const savedSeconds = localStorage.getItem("pomodoro_timer_seconds");
        if (savedSeconds) {
          setTimerSeconds(parseInt(savedSeconds, 10));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [handleComplete]);

  // Keep targetEndTime accurate with setInterval and visibilitychange
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const checkTimer = () => {
      if (!targetEndTimeRef.current) return;
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
      setTimerSeconds(remaining);

      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (phase === "focus") {
          handleComplete();
          // Switch to break phase
          setTimeout(() => {
            const bSecs = fuzzyResult.breakMinutes * 60;
            setPhase("break");
            setBreakSeconds(bSecs);
            setTimerSeconds(bSecs);
            setIsRunning(false);
            if (typeof window !== "undefined") {
              localStorage.setItem("pomodoro_phase", "break");
              localStorage.setItem("pomodoro_timer_seconds", bSecs.toString());
              localStorage.setItem("pomodoro_is_running", "false");
              localStorage.removeItem("pomodoro_target_end_time");
            }
          }, 300);
        } else {
          // Break finished -> switch back to focus
          const fSecs = fuzzyResult.recommendedMinutes * 60;
          setPhase("focus");
          setIsRunning(false);
          setTimerSeconds(fSecs);
          if (typeof window !== "undefined") {
            localStorage.setItem("pomodoro_phase", "focus");
            localStorage.setItem("pomodoro_timer_seconds", fSecs.toString());
            localStorage.setItem("pomodoro_is_running", "false");
            localStorage.removeItem("pomodoro_target_end_time");
          }
        }
      }
    };

    intervalRef.current = setInterval(checkTimer, 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isRunning, phase, fuzzyResult.breakMinutes, fuzzyResult.recommendedMinutes, handleComplete]);

  // Sync state to localStorage
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      localStorage.setItem("pomodoro_timer_seconds", timerSeconds.toString());
      localStorage.setItem("pomodoro_is_running", isRunning.toString());
      localStorage.setItem("pomodoro_phase", phase);
      localStorage.setItem("pomodoro_show_widget", showFloatingWidget.toString());
      localStorage.setItem("pomodoro_selected_task_id", selectedTaskId);
      if (sessionId) {
        localStorage.setItem("pomodoro_session_id", sessionId);
      } else {
        localStorage.removeItem("pomodoro_session_id");
      }
    } catch {
      // Ignore
    }
  }, [mounted, timerSeconds, isRunning, phase, sessionId, showFloatingWidget, selectedTaskId]);

  // Adjust default timer when selected task changes and not currently running
  useEffect(() => {
    if (!isRunning && !sessionId) {
      if (phase === "focus") {
        setTimerSeconds(fuzzyResult.recommendedMinutes * 60);
      } else {
        setTimerSeconds(fuzzyResult.breakMinutes * 60);
      }
      setBreakSeconds(fuzzyResult.breakMinutes * 60);
    }
  }, [selectedTaskId, fuzzyResult.recommendedMinutes, fuzzyResult.breakMinutes, isRunning, phase, sessionId]);

  const startTimer = async () => {
    if (!user) return;
    let curSessionId = sessionId;

    const expectedDuration =
      phase === "focus"
        ? fuzzyResult.recommendedMinutes * 60
        : fuzzyResult.breakMinutes * 60;

    let currentSecs = timerSeconds;
    // If timer reached zero or previous session was completed, restart from clean full duration
    if (currentSecs <= 0 || sessionCompleted) {
      currentSecs = expectedDuration;
      setTimerSeconds(expectedDuration);
    }

    if (!curSessionId && phase === "focus") {
      try {
        const taskId = selectedTask ? selectedTask.id : "general";
        const taskTitle = selectedTask ? selectedTask.title : "Focus Session";
        curSessionId = await createPomodoroSession(
          user.uid,
          taskId,
          taskTitle,
          fuzzyResult.recommendedMinutes
        );
        setSessionId(curSessionId);
        sessionIdRef.current = curSessionId;
        if (typeof window !== "undefined") {
          localStorage.setItem("pomodoro_session_id", curSessionId);
          localStorage.setItem(
            "pomodoro_initial_seconds",
            (fuzzyResult.recommendedMinutes * 60).toString()
          );
        }
      } catch (e) {
        console.error("Failed to start Pomodoro session:", e);
      }
    }

    const targetEnd = Date.now() + currentSecs * 1000;
    targetEndTimeRef.current = targetEnd;
    if (typeof window !== "undefined") {
      localStorage.setItem("pomodoro_target_end_time", targetEnd.toString());
      localStorage.setItem("pomodoro_timer_seconds", currentSecs.toString());
      localStorage.setItem("pomodoro_is_running", "true");
      localStorage.setItem("pomodoro_show_widget", "true");
    }

    setIsRunning(true);
    setSessionCompleted(false);
    setShowFloatingWidget(true);
    setWidgetDismissed(false);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    if (typeof window !== "undefined") {
      localStorage.setItem("pomodoro_is_running", "false");
      localStorage.removeItem("pomodoro_target_end_time");
      localStorage.setItem("pomodoro_timer_seconds", timerSeconds.toString());
    }
  };

  const resetTimer = async () => {
    const curSessionId = sessionIdRef.current;
    const initialSecs =
      (typeof window !== "undefined"
        ? parseInt(localStorage.getItem("pomodoro_initial_seconds") || "0", 10)
        : 0) || (fuzzyResult.recommendedMinutes * 60);

    const elapsedSeconds = Math.max(0, initialSecs - timerSeconds);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    if (curSessionId && user && phase === "focus") {
      try {
        if (elapsedMinutes >= 1) {
          // If user focused for at least 1 minute before reset, preserve the study duration in stats!
          await updatePomodoroSession(curSessionId, {
            duration: elapsedMinutes,
            completed: true,
          });
          const updated = await getUserPomodoroSessions(user.uid);
          setSessions(updated);
        } else {
          // Under 1 minute - clean up empty session
          await deletePomodoroSession(curSessionId);
        }
      } catch (e) {
        console.error("Failed to update/delete session on reset:", e);
      }
    }

    const defaultSeconds = fuzzyResult.recommendedMinutes * 60;
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setPhase("focus");
    setTimerSeconds(defaultSeconds);
    setBreakSeconds(fuzzyResult.breakMinutes * 60);
    setSessionId(null);
    sessionIdRef.current = null;
    setSessionCompleted(false);
    setShowFloatingWidget(false);

    if (typeof window !== "undefined") {
      localStorage.removeItem("pomodoro_session_id");
      localStorage.removeItem("pomodoro_target_end_time");
      localStorage.removeItem("pomodoro_initial_seconds");
      localStorage.setItem("pomodoro_is_running", "false");
      localStorage.setItem("pomodoro_phase", "focus");
      localStorage.setItem("pomodoro_show_widget", "false");
      localStorage.setItem("pomodoro_timer_seconds", defaultSeconds.toString());
    }
  };

  const endSession = async () => {
    const curSessionId = sessionIdRef.current;
    const initialSecs =
      (typeof window !== "undefined"
        ? parseInt(localStorage.getItem("pomodoro_initial_seconds") || "0", 10)
        : 0) || (fuzzyResult.recommendedMinutes * 60);

    const elapsedSeconds = Math.max(0, initialSecs - timerSeconds);
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    if (curSessionId && user && phase === "focus") {
      try {
        await updatePomodoroSession(curSessionId, {
          duration: elapsedMinutes,
          completed: true,
        });
        const updated = await getUserPomodoroSessions(user.uid);
        setSessions(updated);

        // Calculate progress increment for the selected task
        if (selectedTask) {
          const completedCount = updated.filter(
            (s) => s.taskId === selectedTask.id && s.completed
          ).length;

          const estimatedTotalSessions = fuzzyResult.recommendedMinutes > 0
            ? Math.round(selectedTask.estimatedTotalMinutes / fuzzyResult.recommendedMinutes)
            : 0;
          const targetSessions = selectedTask.estimatedTotalMinutes > 0
            ? Math.max(1, estimatedTotalSessions)
            : 0;

          const currentProgress = selectedTask.progress || 0;
          if (currentProgress < 100) {
            const remaining = selectedTask.estimatedTotalMinutes || fuzzyResult.recommendedMinutes;
            const factor = (100 - currentProgress) / 100;
            const baseTotalTime = factor > 0 ? remaining / factor : remaining;
            const focusMinutes = elapsedMinutes;
            const increment = baseTotalTime > 0
              ? Math.max(1, Math.round((focusMinutes / baseTotalTime) * 100))
              : 10;

            const reachesTarget = targetSessions > 0 && completedCount >= targetSessions;
            const nextProgress = reachesTarget ? 100 : Math.min(100, currentProgress + increment);

            setProgressIncrement(reachesTarget ? (100 - currentProgress) : increment);
            setSuggestedProgress(nextProgress);
            setAdjustedProgress(nextProgress);
            setShowProgressPrompt(true);
          }
        }
      } catch (e) {
        console.error("Failed to end Pomodoro session:", e);
      }
    }

    const resetSecs = fuzzyResult.recommendedMinutes * 60;
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setSessionCompleted(true);
    setPhase("focus");
    setTimerSeconds(resetSecs);
    setBreakSeconds(fuzzyResult.breakMinutes * 60);
    setSessionId(null);
    sessionIdRef.current = null;
    setShowFloatingWidget(false);

    if (typeof window !== "undefined") {
      localStorage.setItem("pomodoro_is_running", "false");
      localStorage.setItem("pomodoro_phase", "focus");
      localStorage.setItem("pomodoro_timer_seconds", resetSecs.toString());
      localStorage.removeItem("pomodoro_target_end_time");
      localStorage.removeItem("pomodoro_session_id");
      localStorage.removeItem("pomodoro_initial_seconds");
      localStorage.setItem("pomodoro_show_widget", "false");
    }
  };

  const setSelectedTaskId = (id: string) => {
    if (isRunning) return; // Prevent changing task while timer is running
    setSelectedTaskIdState(id);
    setSessionId(null);
    sessionIdRef.current = null;
    setSessionCompleted(false);
    setPhase("focus");

    const newTask = tasks.find((t) => t.id === id) || null;
    const newFuzzy = newTask
      ? computePomodoroFocus(
          newTask.priorityScore,
          newTask.difficulty / 10,
          newTask.estimatedTotalMinutes
        )
      : computePomodoroFocus(30, 5);

    const newSecs = newFuzzy.recommendedMinutes * 60;
    setTimerSeconds(newSecs);
    setBreakSeconds(newFuzzy.breakMinutes * 60);

    if (typeof window !== "undefined") {
      localStorage.setItem("pomodoro_selected_task_id", id);
      localStorage.setItem("pomodoro_timer_seconds", newSecs.toString());
      localStorage.setItem("pomodoro_phase", "focus");
      localStorage.setItem("pomodoro_is_running", "false");
      localStorage.removeItem("pomodoro_session_id");
      localStorage.removeItem("pomodoro_target_end_time");
      localStorage.removeItem("pomodoro_initial_seconds");
    }
  };

  const saveTaskProgress = async () => {
    if (!selectedTask || !user) return;
    setIsUpdatingProgress(true);
    try {
      const isDone = adjustedProgress >= 100;
      await updateTask(selectedTask.id, {
        progress: adjustedProgress,
        status: isDone ? "done" : selectedTask.status,
      });
      const userTasks = await getUserTasks(user.uid);
      const activeTasks = userTasks.filter((t) => t.status !== "done");
      setTasks(activeTasks);
      setShowProgressPrompt(false);
    } catch (e) {
      console.error("Failed to update task progress:", e);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Stats derived from session documents
  const today = new Date();
  const todaySessions = sessions.filter((s) => {
    const d = s.startedAt?.toDate ? s.startedAt.toDate() : null;
    return d && d.toDateString() === today.toDateString() && s.completed;
  });

  const totalFocusToday = todaySessions.reduce((acc, s) => acc + s.duration, 0);
  const totalSessions = sessions.filter((s) => s.completed).length;

  // Streak calculation
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

  return (
    <PomodoroContext.Provider
      value={{
        tasks,
        sessions,
        loading,
        selectedTaskId,
        selectedTask,
        timerSeconds,
        isRunning,
        phase,
        sessionId,
        sessionCompleted,
        breakSeconds,
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
        refreshData,
      }}
    >
      {children}

      {/* Floating Pomodoro Widget - shown on all pages except /pomodoro */}
      {mounted && user && !widgetDismissed && (isRunning || showFloatingWidget) && (
        <FloatingPomodoroWidget
          isRunning={isRunning}
          timerSeconds={timerSeconds}
          phase={phase}
          taskTitle={selectedTask?.title || "Focus Session"}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={resetTimer}
          onExpand={() => router.push("/pomodoro")}
          onDismiss={() => {
            setWidgetDismissed(true);
            setShowFloatingWidget(false);
            if (typeof window !== "undefined") {
              localStorage.setItem("pomodoro_show_widget", "false");
            }
          }}
        />
      )}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error("usePomodoro must be used within a PomodoroProvider");
  }
  return context;
}
