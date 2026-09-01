"use client";

import React, { useState } from "react";
import { Share2, Zap } from "lucide-react";
import { PomodoroSession } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useScreenTime } from "@/contexts/ScreenTimeContext";
import { StreakShareModal } from "@/components/dashboard/streak/StreakShareModal";
import { LivingFlame } from "@/components/dashboard/streak/LivingFlame";

interface StreakBentoWidgetProps {
  sessions: PomodoroSession[];
}

export function StreakBentoWidget({ sessions }: StreakBentoWidgetProps) {
  const { user, userDoc } = useAuth();
  const { todayMinutes: screenTimeMins, history: screenTimeHistory } = useScreenTime();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const today = new Date();
  const todaySessions = sessions.filter((s) => {
    const d = s.startedAt?.toDate ? s.startedAt.toDate() : null;
    return d && d.toDateString() === today.toDateString() && s.completed;
  });
  const pomodoroMins = todaySessions.reduce((acc, s) => acc + s.duration, 0);
  const todayMinutes = Math.max(pomodoroMins, screenTimeMins);

  // Real 7-day streak calculation from Screen Time + Pomodoro Sessions
  let streakDays = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const isoDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const hasSession = sessions.some((s) => {
      const sd = s.startedAt?.toDate ? s.startedAt.toDate() : null;
      return sd && sd.toDateString() === dayStr && s.completed;
    });

    const hasScreenTime =
      (i === 0 && screenTimeMins > 0) ||
      screenTimeHistory.some((h) => h.dateStr === isoDateStr && h.screenTimeSeconds >= 60);

    if (hasSession || hasScreenTime) streakDays++;
    else if (i > 0) break;
  }

  // Dynamic Tier background gradient & glow
  const getCardTheme = (days: number) => {
    if (days >= 30) {
      return {
        bg: "from-amber-500 via-orange-500 to-yellow-500",
        flameFill: "text-yellow-100 fill-yellow-200",
        glow: "drop-shadow-[0_0_20px_rgba(245,158,11,0.9)]",
        tierTitle: "Inferno",
      };
    }
    if (days >= 14) {
      return {
        bg: "from-purple-600 via-pink-600 to-indigo-600",
        flameFill: "text-pink-200 fill-purple-200",
        glow: "drop-shadow-[0_0_20px_rgba(168,85,247,0.9)]",
        tierTitle: "Diamond",
      };
    }
    if (days >= 7) {
      return {
        bg: "from-orange-500 via-amber-500 to-red-500",
        flameFill: "text-yellow-200 fill-yellow-300",
        glow: "drop-shadow-[0_0_20px_rgba(249,115,22,0.9)]",
        tierTitle: "Scholar",
      };
    }
    return {
      bg: "from-emerald-600 via-teal-600 to-primary",
      flameFill: "text-emerald-100 fill-emerald-200",
      glow: "drop-shadow-[0_0_15px_rgba(16,185,129,0.9)]",
      tierTitle: "Spark",
    };
  };

  const theme = getCardTheme(streakDays);
  const userName = userDoc?.name || user?.displayName || "Scholar";

  return (
    <>
      <StreakShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        streakDays={streakDays}
        todayMinutes={todayMinutes}
        totalSessions={sessions.filter((s) => s.completed).length}
        userName={userName}
      />

      <div
        onClick={() => setShareModalOpen(true)}
        className={`p-5 flex flex-col justify-between h-full group bg-gradient-to-br ${theme.bg} text-white cursor-pointer relative overflow-hidden transition-all duration-500`}
        suppressHydrationWarning
      >
        {/* Floating Sparks */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-4 w-2 h-2 rounded-full bg-yellow-200 animate-sparkle-float" />
          <div className="absolute bottom-4 left-6 w-1.5 h-1.5 rounded-full bg-white animate-sparkle-float delay-500" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between" suppressHydrationWarning>
          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
            <Zap className="w-3 h-3 text-yellow-300" />
            <span>{theme.tierTitle}</span>
          </div>
          <button
            type="button"
            className="p-1 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-lg transition-colors"
            title="Share Streak"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Animated Big Center Living Flame with Fluid Swaying */}
        <div className="flex items-center justify-center gap-3 my-auto py-1">
          <LivingFlame streakDays={streakDays} size="lg" className="scale-110" />
          <div className="space-y-0.5 text-left">
            <p className="text-4xl font-black font-mono tracking-tight leading-none text-white drop-shadow-md">
              {streakDays}
            </p>
            <p className="text-[11px] font-bold text-white/90 uppercase tracking-wide">
              {streakDays === 1 ? "Day Streak" : "Days On Fire"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-white/90 font-semibold pt-1 border-t border-white/20">
          <span>{todayMinutes}m focus today</span>
          <span className="underline font-bold flex items-center gap-0.5">
            Share Card →
          </span>
        </div>
      </div>
    </>
  );
}
