"use client";

import { useState, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import type { PomodoroSession } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useLearningProgress } from "@/components/dashboard/streak/useLearningProgress";
import { getStreakStage } from "@/components/dashboard/streak/streakStages";
import { StreakShareModal } from "@/components/dashboard/streak/StreakShareModal";
import s from "@/components/dashboard/streak/streak-widget.module.css";

export function StreakBentoWidget({ sessions }: { sessions: PomodoroSession[] }) {
  const { user, userDoc } = useAuth();
  const { streakDays, activityMinutes, completedSessions } = useLearningProgress(sessions);
  const { stage, next, progress } = getStreakStage(streakDays);
  const [sharing, setSharing] = useState(false);
  const theme = { "--stage-bg": stage.background, "--stage-fg": stage.foreground, "--stage-accent": stage.accent, "--stage-muted": stage.muted } as CSSProperties;
  return <>
    <StreakShareModal isOpen={sharing} onClose={() => setSharing(false)} streakDays={streakDays} todayMinutes={activityMinutes} totalSessions={completedSessions} userName={userDoc?.name || user?.displayName || "Kamu"} />
    <div className={s.card} style={theme} data-streak-card>
      <div className={s.art} aria-hidden="true">{Array.from({ length: stage.orbit }, (_, index) => <i key={index} style={{ inset: index * 13 }} />)}<span /></div>
      <h2 className={s.heading}>Konsistensi belajar</h2>
      <p className={s.stage}>{stage.name}</p>
      <div className={s.count} data-streak-count><strong>{streakDays}</strong><span>hari berturut-turut</span></div>
      <div className={s.milestone}>
        <div className={s.track} role="progressbar" aria-label={next ? `Menuju ${next.name}` : stage.name} aria-valuemin={next ? stage.minDays : 0} aria-valuemax={next?.minDays || 30} aria-valuenow={Math.min(streakDays, next?.minDays || 30)}><span style={{ width: `${progress * 100}%` }} /></div>
        <p>{next ? `${next.minDays - streakDays} hari lagi menuju “${next.name}”` : "Teruskan ritmemu, satu hari lagi."}</p>
      </div>
      <footer className={s.footer}><span>{activityMinutes} menit hari ini</span><button type="button" onClick={() => setSharing(true)}>Bagikan progres<ArrowUpRight size={16} /></button></footer>
    </div>
  </>;
}
