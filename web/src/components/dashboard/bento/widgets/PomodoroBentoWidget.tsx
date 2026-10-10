"use client";

import React from "react";
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
} from "lucide-react";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { Dropdown } from "@/components/ui/Dropdown";
import { priorityLabels } from "@/components/tasks/taskPresentation";
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
    sessionId,
    isBusy,
    showProgressPrompt,
  } = usePomodoro();

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
            <h4 className="text-xs font-bold text-gray-900">Sesi fokus</h4>
            <p className="text-[10px] text-gray-400">
              {fuzzyResult.recommendedMinutes}m fokus · {fuzzyResult.breakMinutes}m istirahat
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

      <div className="mt-2"><Dropdown compact label="Tugas untuk fokus" disabled={isBusy || isRunning || !!sessionId || showProgressPrompt || phase === "break"} value={selectedTaskId} onChange={setSelectedTaskId} options={[{ value: "", label: "Sesi tanpa tugas" }, ...activeTasks.map(task => ({ value: task.id, label: task.title, detail: priorityLabels[task.priorityLevel] }))]} /></div>

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
          onClick={resetTimer} disabled={isBusy}
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          className="h-8 px-2.5 text-xs"
          title="Reset timer"
        >
          Reset
        </Button>

        {(isRunning || sessionId) && (
          <Button
            variant="outline"
            size="sm"
            onClick={endSession} disabled={isBusy}
            icon={<Square className="w-3 h-3 text-red-500" />}
            className="h-8 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
            title="Akhiri sesi dan catat waktu fokus"
          >
            Akhiri
          </Button>
        )}

        {isRunning ? (
          <Button
            variant="primary"
            size="sm"
            onClick={pauseTimer} disabled={isBusy}
            icon={<Pause className="w-3.5 h-3.5" />}
            className="flex-1 h-8 text-xs font-bold"
          >
            Jeda
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={startTimer} disabled={isBusy}
            icon={<Play className="w-3.5 h-3.5" />}
            className="flex-1 h-8 text-xs font-bold"
          >
            {showProgressPrompt ? "Perbarui progres" : phase === "break" ? "Mulai istirahat" : "Mulai fokus"}
          </Button>
        )}
      </div>
    </div>
  );
}
