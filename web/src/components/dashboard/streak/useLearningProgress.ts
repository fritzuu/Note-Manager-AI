"use client";

import { useScreenTime } from "@/contexts/ScreenTimeContext";
import type { PomodoroSession } from "@/lib/firestore";

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function useLearningProgress(sessions: PomodoroSession[]) {
  const { todayMinutes: screenMinutes, history } = useScreenTime();
  const now = new Date();
  const today = dayKey(now);
  const activeDays = new Set(history.filter(item => item.screenTimeSeconds >= 60).map(item => item.dateStr));
  let completedSessions = 0;
  for (const session of sessions) {
    if (!session.completed) continue;
    const date = session.startedAt?.toDate?.();
    if (!date || !Number.isFinite(date.getTime())) continue;
    completedSessions++;
  }
  const activityMinutes = screenMinutes;
  if (activityMinutes > 0) activeDays.add(today);
  const cursor = new Date(now); cursor.setHours(12, 0, 0, 0);
  if (!activeDays.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streakDays = 0;
  while (activeDays.has(dayKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streakDays, activityMinutes, completedSessions };
}
