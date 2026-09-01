"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { Timer, Play, Pause, RotateCcw, X, Maximize2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingPomodoroWidgetProps {
  isRunning: boolean;
  timerSeconds: number;
  phase: "focus" | "break";
  taskTitle?: string;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onExpand: () => void;
  onDismiss: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function FloatingPomodoroWidget({
  isRunning,
  timerSeconds,
  phase,
  taskTitle,
  onStart,
  onPause,
  onReset,
  onExpand,
  onDismiss,
}: FloatingPomodoroWidgetProps) {
  const pathname = usePathname();
  const [isMinimized, setIsMinimized] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const prevTimerRef = useRef(timerSeconds);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      } else {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  // Detect timer completion and send notification
  useEffect(() => {
    if (prevTimerRef.current > 0 && timerSeconds === 0 && isRunning) {
      if (typeof window !== "undefined" && "Notification" in window && notificationPermission === "granted") {
        const title = phase === "focus" ? "Focus Session Complete!" : "Break Time Over!";
        const body =
          phase === "focus"
            ? `Great work on "${taskTitle || "your task"}"! Time for a break.`
            : "Break's over. Ready for another focus session?";

        new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: "pomodoro-timer",
        });
      }
    }
    prevTimerRef.current = timerSeconds;
  }, [timerSeconds, isRunning, phase, taskTitle, notificationPermission]);

  // Don't show on /pomodoro page itself
  if (pathname === "/pomodoro") return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 transition-all duration-300 shadow-2xl",
        isMinimized ? "w-16 h-16 z-[9999]" : "w-80 z-[9999]",
        phase === "focus" ? "border-primary" : "border-blue-500"
      )}
      style={{
        zIndex: 9999, // Force highest z-index
      }}
    >
      <div className={cn(
        "w-full h-full bg-white rounded-2xl border-2",
        phase === "focus" ? "border-primary" : "border-blue-500"
      )}>
      {isMinimized ? (
        // Minimized: Just icon button
        <button
          onClick={() => setIsMinimized(false)}
          className="w-full h-full flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Timer className={cn("w-7 h-7 animate-pulse", phase === "focus" ? "text-primary" : "text-blue-500")} />
        </button>
      ) : (
        // Expanded widget
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className={cn("w-5 h-5", phase === "focus" ? "text-primary" : "text-blue-500")} />
              <span className="text-sm font-bold text-gray-800">
                {phase === "focus" ? "Focus" : "Break"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Minimize"
              >
                <span className="text-xs">−</span>
              </button>
              <button
                onClick={onExpand}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Open full timer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Task title */}
          {taskTitle && (
            <p className="text-xs text-gray-500 truncate">{taskTitle}</p>
          )}

          {/* Timer display */}
          <div className="text-center">
            <p className="text-4xl font-mono font-extrabold text-gray-800">
              {formatTime(timerSeconds)}
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-1000 rounded-full",
                phase === "focus" ? "bg-primary" : "bg-blue-500"
              )}
              style={{ 
                width: `${Math.max(0, Math.min(100, (timerSeconds / (phase === "focus" ? 25 : 5) / 60) * 100))}%` 
              }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onReset}
              className="p-2 rounded-lg border border-border hover:bg-gray-50 text-gray-600 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {isRunning ? (
              <button
                onClick={onPause}
                className={cn(
                  "px-6 py-2 rounded-lg text-white font-semibold transition-colors flex items-center gap-2",
                  phase === "focus" ? "bg-primary hover:bg-primary-600" : "bg-blue-500 hover:bg-blue-600"
                )}
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            ) : (
              <button
                onClick={onStart}
                className={cn(
                  "px-6 py-2 rounded-lg text-white font-semibold transition-colors flex items-center gap-2",
                  phase === "focus" ? "bg-primary hover:bg-primary-600" : "bg-blue-500 hover:bg-blue-600"
                )}
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            )}
          </div>

          {/* Notification status */}
          {notificationPermission === "denied" && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              <Bell className="w-3.5 h-3.5" />
              <span>Enable notifications to get alerts</span>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
