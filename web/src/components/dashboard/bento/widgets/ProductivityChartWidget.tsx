"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowUpRight,
  Share2,
  Sparkles,
} from "lucide-react";
import { PomodoroSession } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useScreenTime } from "@/contexts/ScreenTimeContext";
import { StreakShareModal } from "@/components/dashboard/streak/StreakShareModal";
import { LivingFlame } from "@/components/dashboard/streak/LivingFlame";

interface ProductivityChartWidgetProps {
  sessions: PomodoroSession[];
}

export function ProductivityChartWidget({ sessions }: ProductivityChartWidgetProps) {
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

  // Real 7-day consecutive streak calculation from Screen Time + Pomodoro sessions
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

  // Dynamic Tier styling for the widget card & chart
  const getWidgetTheme = (days: number) => {
    if (days >= 30) {
      return {
        tierName: "Inferno",
        cardBg: "from-white via-amber-50/30 to-orange-50/20",
        badgeGradient: "from-amber-500 via-orange-500 to-yellow-500",
        badgeShadow: "shadow-amber-500/40",
        iconBg: "bg-amber-100 text-amber-600",
        accentColor: "text-amber-600",
        activeBar: "bg-gradient-to-t from-amber-500 to-yellow-400 shadow-sm",
        flameFill: "text-yellow-100 fill-yellow-200",
        glowEffect: "drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]",
      };
    }
    if (days >= 14) {
      return {
        tierName: "Diamond",
        cardBg: "from-white via-purple-50/30 to-pink-50/20",
        badgeGradient: "from-purple-600 via-pink-600 to-indigo-600",
        badgeShadow: "shadow-purple-500/40",
        iconBg: "bg-purple-100 text-purple-600",
        accentColor: "text-purple-600",
        activeBar: "bg-gradient-to-t from-purple-600 to-pink-500 shadow-sm",
        flameFill: "text-pink-200 fill-purple-200",
        glowEffect: "drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]",
      };
    }
    if (days >= 7) {
      return {
        tierName: "Scholar",
        cardBg: "from-white via-orange-50/30 to-red-50/20",
        badgeGradient: "from-orange-500 to-red-500",
        badgeShadow: "shadow-orange-500/40",
        iconBg: "bg-orange-100 text-orange-600",
        accentColor: "text-orange-600",
        activeBar: "bg-gradient-to-t from-orange-500 to-red-500 shadow-sm",
        flameFill: "text-yellow-200 fill-yellow-300",
        glowEffect: "drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]",
      };
    }
    return {
      tierName: "Spark",
      cardBg: "from-white via-emerald-50/30 to-teal-50/20",
      badgeGradient: "from-emerald-600 to-teal-600",
      badgeShadow: "shadow-emerald-500/40",
      iconBg: "bg-emerald-100 text-emerald-600",
      accentColor: "text-emerald-600",
      activeBar: "bg-gradient-to-t from-emerald-600 to-teal-500 shadow-sm",
      flameFill: "text-emerald-200 fill-emerald-100",
      glowEffect: "drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    };
  };

  const theme = getWidgetTheme(streakDays);

  // Last 7 days chart points (Focus + Screen Time)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    const isoDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayName = d.toLocaleDateString("en-US", { weekday: "narrow" });

    const focusMins = sessions
      .filter((s) => {
        const sd = s.startedAt?.toDate ? s.startedAt.toDate() : null;
        return sd && sd.toDateString() === dayStr && s.completed;
      })
      .reduce((acc, s) => acc + s.duration, 0);

    const stRecord = screenTimeHistory.find((h) => h.dateStr === isoDateStr);
    const stMins = i === 6 ? screenTimeMins : stRecord ? Math.floor(stRecord.screenTimeSeconds / 60) : 0;
    const mins = Math.max(focusMins, stMins);

    return { dayName, mins };
  });

  const maxMins = Math.max(60, ...last7Days.map((d) => d.mins));
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
        className={`p-5 flex flex-col justify-between h-full group bg-gradient-to-br ${theme.cardBg} transition-colors duration-500 relative`}
        suppressHydrationWarning
      >
        {/* Header */}
        <div className="flex items-center justify-between" suppressHydrationWarning>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl ${theme.iconBg} flex items-center justify-center transition-colors duration-300`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">Productivity & Streak</h4>
              <p className="text-[10px] text-gray-400">Weekly Focus Activity</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShareModalOpen(true)}
              className={`p-1.5 ${theme.accentColor} hover:bg-white rounded-xl transition-all cursor-pointer shadow-2xs`}
              title="Share Streak Card"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <Link
              href="/analytics"
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-colors"
              title="View Full Analytics"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Metric & Dynamic Tier Chart Grid */}
        <div className="grid grid-cols-2 gap-4 items-center my-auto py-2">
          {/* Left numbers & Dynamic Animated Streak Pill */}
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {todayMinutes}
              </span>
              <span className="text-xs text-gray-500 font-medium">min today</span>
            </div>

            {/* 🔥 Dynamic Living Animated Streak Pill */}
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              title="Click to view & share your streak card!"
              className={`flex items-center gap-1.5 text-xs font-black text-white bg-gradient-to-r ${theme.badgeGradient} px-3 py-1 rounded-full shadow-md ${theme.badgeShadow} hover:scale-105 transition-all duration-300 cursor-pointer group/streak`}
            >
              <LivingFlame streakDays={streakDays} size="sm" />
              <span>{streakDays} Day Streak</span>
              <Sparkles className="w-3 h-3 text-white/80 group-hover/streak:rotate-45 transition-transform" />
            </button>
          </div>

          {/* Right 7-day mini bar chart with Dynamic Tier Colors */}
          <div className="flex items-end justify-between gap-1.5 h-14 bg-white/70 backdrop-blur-sm p-2 rounded-2xl border border-border/40 shadow-2xs">
            {last7Days.map((item, idx) => {
              const heightPercent = Math.max(12, Math.round((item.mins / maxMins) * 100));
              const isToday = idx === 6;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                  title={`${item.mins} min`}
                >
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-md transition-all duration-500 ${
                      isToday
                        ? theme.activeBar
                        : item.mins > 0
                        ? "bg-gray-400/80"
                        : "bg-gray-200/80"
                    }`}
                  />
                  <span className="text-[9px] font-bold text-gray-400">{item.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-border/50">
          <button
            onClick={() => setShareModalOpen(true)}
            className={`flex items-center gap-1 ${theme.accentColor} font-bold hover:underline cursor-pointer`}
          >
            <Share2 className="w-3 h-3" /> Share Badge ({theme.tierName})
          </button>
          <Link href="/analytics" className="text-gray-400 font-bold hover:text-primary">
            Details →
          </Link>
        </div>
      </div>
    </>
  );
}
