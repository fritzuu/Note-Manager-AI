import type { PomodoroSession } from "./firestore";

export const isFullFocusSession = (session: PomodoroSession) => session.completed && (!session.outcome || session.outcome === "full");
export const isRecordedFocusSession = (session: PomodoroSession) => isFullFocusSession(session) || session.outcome === "early" || session.outcome === "reset";
export const focusSeconds = (session: PomodoroSession) => Math.max(0, session.elapsedSeconds ?? Math.round(session.duration * 60));
export const focusMinutes = (sessions: PomodoroSession[]) => Math.floor(sessions.filter(isRecordedFocusSession).reduce((total, session) => total + focusSeconds(session), 0) / 60);
export function formatFocusDuration(seconds: number) {
  const value = Math.max(0, Math.round(seconds));
  if (value < 60) return `${value} detik`;
  const remainder = value % 60;
  return `${Math.floor(value / 60)} menit${remainder ? ` ${remainder} detik` : ""}`;
}
