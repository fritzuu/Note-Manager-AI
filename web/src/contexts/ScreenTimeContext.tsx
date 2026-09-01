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
  saveDailyScreenTime,
  getUserScreenTimes,
  type DailyScreenTime,
} from "@/lib/firestore";

interface ScreenTimeContextValue {
  todaySeconds: number;
  todayMinutes: number;
  formattedTodayTime: string;
  history: DailyScreenTime[];
  isUserActive: boolean;
  refreshHistory: () => Promise<void>;
}

const ScreenTimeContext = createContext<ScreenTimeContextValue | null>(null);

// Inactivity threshold: If no mouse/keyboard/scroll interaction for 60 seconds, pause tracking
const IDLE_TIMEOUT_MS = 60_000;

function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatScreenTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

export function ScreenTimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [todaySeconds, setTodaySeconds] = useState<number>(0);
  const [history, setHistory] = useState<DailyScreenTime[]>([]);
  const [isUserActive, setIsUserActive] = useState<boolean>(true);

  const secondsRef = useRef<number>(0);
  const lastSyncRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());
  const activeUserIdRef = useRef<string | null>(null);

  // Helper for user-isolated storage key
  const getUserKey = useCallback((uid: string, dateStr: string) => {
    return `screentime_${uid}_${dateStr}`;
  }, []);

  const getHeartbeatKey = useCallback((uid: string, dateStr: string) => {
    return `screentime_heartbeat_${uid}_${dateStr}`;
  }, []);

  // Sync / Refresh when user changes or is loaded
  const refreshHistory = useCallback(async () => {
    if (!user) {
      setTodaySeconds(0);
      setHistory([]);
      secondsRef.current = 0;
      activeUserIdRef.current = null;
      return;
    }

    const currentUid = user.uid;
    activeUserIdRef.current = currentUid;
    const todayStr = getTodayDateStr();
    const userStorageKey = getUserKey(currentUid, todayStr);

    // Initial load from user-specific local storage cache
    const cachedLocal = parseInt(localStorage.getItem(userStorageKey) || "0", 10);
    secondsRef.current = cachedLocal;
    setTodaySeconds(cachedLocal);

    try {
      const list = await getUserScreenTimes(currentUid);
      // Double check active user hasn't switched during network request
      if (activeUserIdRef.current !== currentUid) return;

      setHistory(list);
      const serverToday = list.find((d) => d.dateStr === todayStr);

      if (serverToday) {
        const higherSec = Math.max(serverToday.screenTimeSeconds, cachedLocal);
        secondsRef.current = higherSec;
        setTodaySeconds(higherSec);
        localStorage.setItem(userStorageKey, higherSec.toString());
      } else if (cachedLocal > 0) {
        saveDailyScreenTime(currentUid, todayStr, cachedLocal).catch(() => {});
      } else {
        secondsRef.current = 0;
        setTodaySeconds(0);
        localStorage.setItem(userStorageKey, "0");
      }
    } catch (e) {
      console.warn("Screen time sync: using user-isolated local cache:", e);
    }
  }, [user, getUserKey]);

  useEffect(() => {
    // Clean up legacy global keys if any
    try {
      const todayStr = getTodayDateStr();
      localStorage.removeItem(`screentime_${todayStr}`);
      localStorage.removeItem(`screentime_heartbeat_${todayStr}`);
    } catch {
      // ignore
    }

    refreshHistory();
  }, [user, refreshHistory]);

  // Active Focus & Activity Tracking Loop
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    const currentUid = user.uid;
    let isVisible = !document.hidden && document.hasFocus();

    const flushSave = () => {
      const todayStr = getTodayDateStr();
      const userKey = getUserKey(currentUid, todayStr);
      if (secondsRef.current > 0) {
        localStorage.setItem(userKey, secondsRef.current.toString());
        saveDailyScreenTime(currentUid, todayStr, secondsRef.current).catch(() => {});
      }
    };

    // User Interaction Listener (Throttled update of lastActivity timestamp)
    let lastThrottledCall = 0;
    const recordUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottledCall > 500) {
        lastThrottledCall = now;
        lastActivityRef.current = now;
        setIsUserActive(true);
      }
    };

    const handleVisibility = () => {
      isVisible = !document.hidden && document.hasFocus();
      if (isVisible) {
        lastActivityRef.current = Date.now();
        setIsUserActive(true);
      } else {
        setIsUserActive(false);
        flushSave();
      }
    };

    const handleFocus = () => {
      isVisible = true;
      lastActivityRef.current = Date.now();
      setIsUserActive(true);
    };

    const handleBlur = () => {
      isVisible = false;
      setIsUserActive(false);
      flushSave();
    };

    // Listen to all primary user interaction events
    const interactionEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
    ];

    interactionEvents.forEach((evt) => {
      window.addEventListener(evt, recordUserActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", flushSave);
    window.addEventListener("pagehide", flushSave);

    // Tick loop every 1 second
    const interval = setInterval(() => {
      if (activeUserIdRef.current !== currentUid) return;

      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      const isCurrentlyActive = isVisible && timeSinceLastActivity <= IDLE_TIMEOUT_MS;

      setIsUserActive(isCurrentlyActive);

      // Only count time if user is genuinely active and focused on this tab
      if (!isCurrentlyActive) return;

      // Multi-tab coordination: Leader tab heartbeat in localStorage per user
      const todayStr = getTodayDateStr();
      const heartbeatKey = getHeartbeatKey(currentUid, todayStr);
      const userStorageKey = getUserKey(currentUid, todayStr);
      const currentHeartbeat = localStorage.getItem(heartbeatKey);

      // If another tab of the same user ticked in the exact same second, avoid double-counting
      if (currentHeartbeat && parseInt(currentHeartbeat, 10) === Math.floor(now / 1000)) {
        // Sync local seconds from storage in case another tab updated it
        const currentStored = parseInt(localStorage.getItem(userStorageKey) || "0", 10);
        if (currentStored > secondsRef.current) {
          secondsRef.current = currentStored;
          setTodaySeconds(currentStored);
        }
        return;
      }

      // Mark this second as claimed by active session
      localStorage.setItem(heartbeatKey, Math.floor(now / 1000).toString());

      secondsRef.current += 1;
      setTodaySeconds(secondsRef.current);

      // Save to localStorage every 5 seconds
      if (secondsRef.current % 5 === 0) {
        localStorage.setItem(userStorageKey, secondsRef.current.toString());
      }

      // Sync to Firestore every 20 seconds
      if (now - lastSyncRef.current > 20000) {
        lastSyncRef.current = now;
        saveDailyScreenTime(currentUid, todayStr, secondsRef.current).catch(() => {});
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      flushSave();
      interactionEvents.forEach((evt) => {
        window.removeEventListener(evt, recordUserActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", flushSave);
      window.removeEventListener("pagehide", flushSave);
    };
  }, [user, getUserKey, getHeartbeatKey]);

  const todayMinutes = Math.floor(todaySeconds / 60);
  const formattedTodayTime = formatScreenTime(todaySeconds);

  return (
    <ScreenTimeContext.Provider
      value={{
        todaySeconds,
        todayMinutes,
        formattedTodayTime,
        history,
        isUserActive,
        refreshHistory,
      }}
    >
      {children}
    </ScreenTimeContext.Provider>
  );
}

export function useScreenTime() {
  const context = useContext(ScreenTimeContext);
  if (!context) {
    return {
      todaySeconds: 0,
      todayMinutes: 0,
      formattedTodayTime: "0m",
      history: [],
      isUserActive: false,
      refreshHistory: async () => {},
    };
  }
  return context;
}
