"use client";

import React, { useState, useEffect } from "react";
import { Clock, Globe, Compass, Sun, Moon } from "lucide-react";

export function ClockBentoWidget() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <div className="p-5 flex items-center justify-center h-full">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");
  const isNight = hours < 6 || hours >= 18;
  const timeStr = `${hours.toString().padStart(2, "0")}:${minutes}`;
  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Day progress percentage
  const totalMinutesInDay = hours * 60 + time.getMinutes();
  const dayProgress = Math.round((totalMinutesInDay / 1440) * 100);

  return (
    <div className="p-5 flex flex-col justify-between h-full group bg-gradient-to-br from-white via-gray-50/50 to-primary-50/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Local Time</h4>
            <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{tzName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {isNight ? <Moon className="w-3 h-3 text-indigo-500" /> : <Sun className="w-3 h-3 text-amber-500" />}
          <span>{isNight ? "Night" : "Day"}</span>
        </div>
      </div>

      {/* Main Digital Clock Display */}
      <div className="space-y-1 my-auto py-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold font-mono text-gray-900 tracking-tight">
            {timeStr}
          </span>
          <span className="text-sm font-mono font-bold text-primary">
            :{seconds}
          </span>
        </div>
        <p className="text-xs font-semibold text-gray-500">{dateStr}</p>
      </div>

      {/* Footer: Day Progress */}
      <div className="space-y-1 pt-1 border-t border-border/50">
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold">
          <span>Day Progress</span>
          <span className="text-primary font-bold">{dayProgress}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            style={{ width: `${dayProgress}%` }}
            className="h-full bg-primary rounded-full transition-all"
          />
        </div>
      </div>
    </div>
  );
}
