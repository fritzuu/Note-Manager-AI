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
  deletePomodoroSession,
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
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTaskId, setSelectedTaskIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pomodoro_selected_task_id") || "";
    }
    return "";
  });

  // Persistent timer states using localStorage
  const [timerSeconds, setTimerSeconds] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pomodoro_timer_seconds");
      return saved ? parseInt(saved) : 25 * 60;
    }
    return 25 * 60;
  });
  
  const [isRunning, setIsRunning] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pomodoro_is_running") === "true";
    }
    return false;
  });
  
  const [phase, setPhase] = useState<"focus" | "break">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pomodoro_phase");
      return (saved as "focus" | "break") || "focus";
    }
    return "focus";
  });
  
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pomodoro_session_id");
    }
    return null;
  });
  
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(5 * 60);
  const [showFloatingWidget, setShowFloatingWidget] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pomodoro_show_widget") === "true";
    }
    return false;
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(sessionId);
  const lastTickRef = useRef<number>(Date.now());

  // Sync sessionIdRef when sessionId changes
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Compute fuzzy recommendation
  // Note: we scale difficulty down by dividing by 10 (since tasks store difficulty as 0-100, and pomodoroFuzzy uses 1-10)
  const fuzzyResult = selectedTask
    ? computePomodoroFocus(selectedTask.priorityScore, selectedTask.difficulty / 10, selectedTask.estimatedTotalMinutes)
    : computePomodoroFocus(30, 5);

  const refreshData = useCallback(async () => {
    if (!user) return;
    
    // DON'T refresh if timer is running - prevents reset
    if (isRunning) {
      console.log("Skipping refresh - timer is running");
      return;
    }
    
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
  }, [user, isRunning]);

  // Persist timer state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
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
    }
  }, [timerSeconds, isRunning, phase, sessionId, showFloatingWidget, selectedTaskId]);

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
    // ONLY reset if not running AND not just loaded from localStorage
    if (!isRunning && !sessionCompleted && phase === "focus") {
      // Check if we have a saved running state - if so, don't reset
      if (typeof window !== "undefined") {
        const savedRunning = localStorage.getItem("pomodoro_is_running");
        if (savedRunning === "true") return; // Skip reset if timer was running
      }
      
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

  // Global interval ticks with drift correction
  useEffect(() => {
    if (isRunning) {
      lastTickRef.current = Date.now();
      
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastTickRef.current) / 1000);
        lastTickRef.current = now;

        setTimerSeconds((prev) => {
          const next = Math.max(0, prev - elapsed);
          
          if (next <= 0) {
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
          return next;
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
    setShowFloatingWidget(true); // Show widget when timer starts
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = async () => {
    // Delete incomplete session
    const currentSessionId = sessionIdRef.current;
    if (currentSessionId && user) {
      try {
        await deletePomodoroSession(currentSessionId);
        console.log("Deleted incomplete session:", currentSessionId);
      } catch (e) {
        console.error("Failed to delete session:", e);
      }
    }
    
    setIsRunning(false);
    setPhase("focus");
    setTimerSeconds(fuzzyResult.recommendedMinutes * 60);
    setSessionId(null);
    sessionIdRef.current = null;
    setSessionCompleted(false);
    setShowFloatingWidget(false);
    
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("pomodoro_session_id");
      localStorage.setItem("pomodoro_is_running", "false");
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
    
    if (typeof window !== "undefined") {
      localStorage.setItem("pomodoro_selected_task_id", id);
    }
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
      
      {/* Floating Pomodoro Widget - shows on all pages except /pomodoro */}
      {showFloatingWidget && selectedTask && (
        <FloatingPomodoroWidget
          isRunning={isRunning}
          timerSeconds={timerSeconds}
          phase={phase}
          taskTitle={selectedTask.title}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={resetTimer}
          onExpand={() => router.push("/pomodoro")}
          onDismiss={() => setShowFloatingWidget(false)}
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
