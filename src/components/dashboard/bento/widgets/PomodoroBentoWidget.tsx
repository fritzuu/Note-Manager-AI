"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Square,
  ArrowUpRight,
  Flame,
  Coffee,
  CheckSquare,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { Button } from "@/components/ui/Button";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function PomodoroBentoWidget() {
  const {
    tasks,
    selectedTaskId,
    selectedTask,
    setSelectedTaskId,
    timerSeconds,
    isRunning,
    phase,
    fuzzyResult,
    startTimer,
    pauseTimer,
    resetTimer,
    endSession,
  } = usePomodoro();

  const [showTaskDropdown, setShowTaskDropdown] = useState(false);

  const activeTasks = tasks.filter((t) => t.status !== "done");

  const totalSecs =
    (phase === "focus" ? fuzzyResult.recommendedMinutes : fuzzyResult.breakMinutes) * 60;
  const progress = totalSecs > 0 ? timerSeconds / totalSecs : 0;
  const circumference = 2 * Math.PI * 48;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="p-5 flex flex-col justify-between h-full group bg-gradient-to-br from-white via-primary-50/15 to-transparent relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Pomodoro Focus</h4>
            <p className="text-[10px] text-gray-400">
              {fuzzyResult.recommendedMinutes}m focus • {fuzzyResult.breakMinutes}m break
            </p>
          </div>
        </div>
        <Link
          href="/pomodoro"
          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-xl transition-colors"
          title="Open Full Pomodoro Page"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Task Selector Dropdown Trigger */}
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => setShowTaskDropdown(!showTaskDropdown)}
          className="w-full flex items-center justify-between gap-2 p-2 px-3 bg-white/90 hover:bg-white rounded-xl border border-border/80 shadow-xs text-left transition-all cursor-pointer group/btn"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-bold text-gray-800 truncate">
              {selectedTask ? selectedTask.title : "Select Task to Focus..."}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover/btn:text-gray-700 shrink-0" />
        </button>

        {/* Task Selection Dropdown Menu */}
        {showTaskDropdown && (
          <div className="absolute left-0 right-0 top-11 z-50 bg-white rounded-2xl border border-border shadow-xl overflow-hidden animate-scale-in max-h-48 overflow-y-auto p-1.5 space-y-1">
            <button
              type="button"
              onClick={() => {
                setSelectedTaskId("");
                setShowTaskDropdown(false);
              }}
              className={`w-full text-left p-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                !selectedTaskId ? "bg-primary-50 text-primary font-bold" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>General Focus Session</span>
              <span className="text-[10px] text-gray-400">25m default</span>
            </button>

            {activeTasks.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-2">No active tasks found</p>
            ) : (
              activeTasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTaskId(t.id);
                    setShowTaskDropdown(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                    selectedTaskId === t.id
                      ? "bg-primary-50 text-primary font-bold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate pr-2">{t.title}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold shrink-0">
                    {t.priorityLevel || "Med"}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Main Timer Display */}
      <div className="flex flex-col items-center justify-center my-auto py-1">
        <div className="relative flex items-center justify-center">
          <svg width="124" height="124" viewBox="0 0 124 124">
            {/* Background circle */}
            <circle
              cx="62"
              cy="62"
              r="48"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="7"
            />
            {/* Progress circle */}
            <circle
              cx="62"
              cy="62"
              r="48"
              fill="none"
              stroke="var(--color-primary, #4F8A6B)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 62 62)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>

          {/* Time & Phase Text inside */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-mono font-extrabold text-gray-900 tracking-tight">
              {formatTime(timerSeconds)}
            </span>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 mt-0.5">
              {phase === "focus" ? (
                <Flame className="w-3 h-3 text-primary" />
              ) : (
                <Coffee className="w-3 h-3 text-blue-500" />
              )}
              <span>{phase === "focus" ? "Focus" : "Break"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center gap-1.5 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={resetTimer}
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          className="h-8 px-2.5 text-xs"
          title="Reset timer"
        >
          Reset
        </Button>

        {isRunning && (
          <Button
            variant="outline"
            size="sm"
            onClick={endSession}
            icon={<Square className="w-3 h-3 text-red-500" />}
            className="h-8 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
            title="End session early & save progress"
          >
            End
          </Button>
        )}

        {isRunning ? (
          <Button
            variant="primary"
            size="sm"
            onClick={pauseTimer}
            icon={<Pause className="w-3.5 h-3.5" />}
            className="flex-1 h-8 text-xs font-bold"
          >
            Pause
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={startTimer}
            icon={<Play className="w-3.5 h-3.5" />}
            className="flex-1 h-8 text-xs font-bold"
          >
            Start Focus
          </Button>
        )}
      </div>
    </div>
  );
}
