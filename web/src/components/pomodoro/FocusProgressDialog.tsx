"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { useModalDialog } from "@/components/modals/useModalDialog";
import { formatFocusDuration } from "@/lib/pomodoroSessions";
import s from "./pomodoro.module.css";

/** One progress dialog shared by the dashboard and the focus page. */
export function FocusProgressDialog() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const { loading, showProgressPrompt, setShowProgressPrompt, progressTaskTitle, progressBefore, progressElapsedSeconds, adjustedProgress, setAdjustedProgress, suggestedProgress, taskMarkedDone, setTaskMarkedDone, lastSessionOutcome, isBusy, isUpdatingProgress, saveTaskProgress, error } = usePomodoro();
  const busy = isBusy || isUpdatingProgress;
  const open = mounted && !!user && !authLoading && !loading && showProgressPrompt && !!progressTaskTitle && (pathname === "/dashboard" || pathname === "/pomodoro");
  const close = () => { if (!busy) setShowProgressPrompt(false); };
  const dialogRef = useModalDialog(open, close);
  if (!open) return null;

  return createPortal(<div className={s.backdrop} onPointerDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div ref={dialogRef} className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="focus-progress-title" aria-describedby="focus-progress-description" aria-busy={busy} tabIndex={-1}>
      <button type="button" className={s.close} onClick={close} disabled={busy} aria-label="Tutup"><X size={19} /></button>
      <CheckCircle2 size={28} className={s.dialogIcon} /><h2 id="focus-progress-title">{lastSessionOutcome === "early" ? "Sesi diakhiri" : "Sesi selesai"}</h2><p id="focus-progress-description">Kamu fokus selama {formatFocusDuration(progressElapsedSeconds)}.</p>
      <div className={s.dialogTask}><h3>{progressTaskTitle}</h3><span>Progres terakhir: {progressBefore}%</span></div>
      <label className={s.progressLabel} htmlFor="focus-progress">Progres tugas sekarang<strong>{adjustedProgress}%</strong></label>
      <div className={s.progressInputs}><input id="focus-progress" className={s.range} type="range" min={0} max={99} value={Math.min(99, adjustedProgress)} onChange={event => setAdjustedProgress(Number(event.target.value))} disabled={taskMarkedDone || busy} /><input type="number" aria-label="Progres tugas dalam persen" min={0} max={99} value={taskMarkedDone ? 100 : adjustedProgress} onChange={event => setAdjustedProgress(Number(event.target.value))} disabled={taskMarkedDone || busy} /><span>%</span></div>
      <button type="button" className={s.useEstimate} disabled={busy || taskMarkedDone || suggestedProgress <= progressBefore} onClick={() => setAdjustedProgress(suggestedProgress)}>Gunakan perkiraan ({suggestedProgress}%)</button><p className={s.estimateHint}>Perkiraan dari waktu fokus. Sesuaikan dengan hasil yang kamu kerjakan.</p>
      <label className={s.doneChoice}><input type="checkbox" checked={taskMarkedDone} disabled={busy} onChange={event => setTaskMarkedDone(event.target.checked)} /><span>Tugas sudah selesai</span></label>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.dialogActions}><button type="button" className={s.secondary} disabled={busy} onClick={close}>Nanti saja</button><button type="button" className={s.primary} disabled={busy} onClick={() => void saveTaskProgress()}>{busy ? "Menyimpan…" : "Simpan & istirahat"}</button></div>
    </div>
  </div>, document.body);
}
