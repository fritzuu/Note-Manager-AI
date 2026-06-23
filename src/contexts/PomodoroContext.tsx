"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getUserTasks,
  getUserPomodoroSessions,
  createPomodoroSession,
  completePomodoroSession,
  type TaskDocument,
  type PomodoroSession,
} from "@/lib/firestore";
import { computePomodoroFocus, type PomodoroFuzzyResult } from "@/lib/pomodoroFuzzy";

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
  streakDays: number;
  totalFocusToday: number;
  startTimer: () => Promise<void>;
  pauseTimer: () => void;
  resetTimer: () => void;
  setSelectedTaskId: (id: string) => void;
  refreshData: () => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskIdState] = useState<string>("");

  // Timer states
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(5 * 60);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Compute fuzzy recommendation
  // Note: we scale difficulty down by dividing by 10 (since tasks store difficulty as 0-100, and pomodoroFuzzy uses 1-10)
  const fuzzyResult = selectedTask
    ? computePomodoroFocus(selectedTask.priorityScore, selectedTask.difficulty / 10)
    : computePomodoroFocus(30, 5);

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

      // Handle default selected task
      if (activeTasks.length > 0) {
        setSelectedTaskIdState((prev) => {
          if (prev && activeTasks.some((t) => t.id === prev)) return prev;
          return activeTasks[0].id;
        });
      } else {
        setSelectedTaskIdState("");
      }
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

  // Reset timer when selected task changes and not currently running
  useEffect(() => {
    if (!isRunning && !sessionCompleted && phase === "focus") {
      setTimerSeconds(fuzzyResult.recommendedMinutes * 60);
      setBreakSeconds(fuzzyResult.breakMinutes * 60);
    }
  }, [selectedTaskId, fuzzyResult.recommendedMinutes, fuzzyResult.breakMinutes, isRunning, sessionCompleted, phase]);

  const handleComplete = useCallback(async () => {
    const curSessionId = sessionIdRef.current;
    if (curSessionId && user) {
      try {
        await completePomodoroSession(curSessionId);
        // Refresh sessions to update list/stats
        const updated = await getUserPomodoroSessions(user.uid);
        setSessions(updated);
      } catch (e) {
        console.error("Failed to complete Pomodoro session:", e);
      }
    }
    setSessionCompleted(true);
    setIsRunning(false);
  }, [user]);

  // Global interval ticks
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            // Timer finished
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (phase === "focus") {
              handleComplete();
              // Transition to break
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

  const startTimer = async () => {
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
        console.error("Failed to start Pomodoro session:", e);
      }
    }
    setIsRunning(true);
    setSessionCompleted(false);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setPhase("focus");
    setTimerSeconds(fuzzyResult.recommendedMinutes * 60);
    setSessionId(null);
    sessionIdRef.current = null;
    setSessionCompleted(false);
  };

  const setSelectedTaskId = (id: string) => {
    if (isRunning) return; // Prevent changing task while timer is running
    setSelectedTaskIdState(id);
    setSessionId(null);
    sessionIdRef.current = null;
    setSessionCompleted(false);
    setPhase("focus");
  };

  // Stats derived from session documents
  const todaySessions = sessions.filter((s) => {
    const d = s.startedAt?.toDate ? s.startedAt.toDate() : null;
    if (!d) return false;
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const totalFocusToday = todaySessions
    .filter((s) => s.completed)
    .reduce((acc, s) => acc + s.duration, 0);

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
        streakDays,
        totalFocusToday,
        startTimer,
        pauseTimer,
        resetTimer,
        setSelectedTaskId,
        refreshData,
      }}
    >
      {children}
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
