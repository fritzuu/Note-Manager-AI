"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { computePriorityDetailed } from "@/lib/fuzzy/inference";
import { computePomodoroFocus } from "@/lib/pomodoroFuzzy";
import { Slider } from "@/components/ui/Slider";
import { Button } from "@/components/ui/Button";
import s from "@/app/landing/landing.module.css";

function AnimatedScore({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const animation = animate(previous.current, value, { duration: reduced ? 0 : 0.35, onUpdate: (latest) => setDisplay(Math.round(latest)) });
    previous.current = value;
    return () => animation.stop();
  }, [value, reduced]);
  return <span aria-hidden="true">{display}</span>;
}

const LEVELS = { Low: "Bisa nanti", Medium: "Berikutnya", High: "Utamakan", Critical: "Segera kerjakan" };
const DEFAULTS = { deadline: 3, difficulty: 7 };

export function PriorityDemo() {
  const reduced = useReducedMotion();
  const [deadline, setDeadline] = useState(DEFAULTS.deadline);
  const [difficulty, setDifficulty] = useState(DEFAULTS.difficulty);
  const result = useMemo(() => computePriorityDetailed({ deadlineDays: deadline, difficulty, importance: 8, progress: 20, academicRisk: 40 }), [deadline, difficulty]);
  const focus = useMemo(() => computePomodoroFocus(result.priorityScore, difficulty, result.estimatedTotalMinutes), [result.priorityScore, difficulty, result.estimatedTotalMinutes]);
  const [seconds, setSeconds] = useState(focus.recommendedMinutes * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const timerAnchor = useRef({ end: 0 });
  const total = (phase === "focus" ? focus.recommendedMinutes : focus.breakMinutes) * 60;

  useEffect(() => {
    setSeconds(focus.recommendedMinutes * 60); setRunning(false); setPhase("focus");
  }, [deadline, difficulty, focus.recommendedMinutes]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((timerAnchor.current.end - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) setRunning(false);
    };
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) setRunning(false); };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  function startPause() {
    if (running) { setSeconds(Math.max(0, Math.ceil((timerAnchor.current.end - Date.now()) / 1000))); setRunning(false); return; }
    const remaining = seconds || total;
    setSeconds(remaining); timerAnchor.current.end = Date.now() + remaining * 1000; setRunning(true);
  }
  function resetTimer() { setSeconds(total); setRunning(false); }
  function switchPhase() {
    const next = phase === "focus" ? "break" : "focus";
    setPhase(next); setSeconds((next === "focus" ? focus.recommendedMinutes : focus.breakMinutes) * 60); setRunning(false);
  }
  const time = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  return <div className={s.priorityDemo}>
    <div className={s.demoControls}><div className={s.demoTopline}><span>Demo interaktif</span><button onClick={() => { setDeadline(DEFAULTS.deadline); setDifficulty(DEFAULTS.difficulty); resetTimer(); setPhase("focus"); setSeconds(focus.recommendedMinutes * 60); }}><RotateCcw size={14} /> Reset demo</button></div><h3>Laporan praktikum</h3><p>Ubah dua hal ini.<br />Lihat langkah berikutnya menjadi lebih jelas.</p>
      <div className={s.nativeSlider}><Slider id="demo-deadline" label="Sisa waktu menuju deadline" min={0} max={14} value={deadline} onChange={setDeadline} displayValue={(value) => value === 0 ? "Hari ini" : `${value} hari`} /></div>
      <div className={s.nativeSlider}><Slider id="demo-difficulty" label="Kesulitan tugas" min={1} max={10} value={difficulty} onChange={setDifficulty} displayValue={(value) => `${value} / 10`} /></div>
      <div className={s.fixedInputs}><p>Kepentingan <strong>8/10</strong><span>·</span>Progres <strong>20%</strong></p></div>
    </div>

    <div className={s.demoResults}>
      <div className={s.scoreRow}><div><p>Prioritas tugas</p><div className={s.scoreValue} aria-label={`Skor prioritas ${result.priorityScore} dari 100`}><AnimatedScore value={result.priorityScore} /><span>/100</span></div></div><motion.span className={s.resultLevel} key={result.priorityLevel} data-level={result.priorityLevel} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduced ? 0 : 0.2 }}>{LEVELS[result.priorityLevel]} <ArrowUpRight size={14} /></motion.span></div>
      <div className={s.scoreTrack}><motion.span animate={{ width: `${result.priorityScore}%` }} transition={{ duration: reduced ? 0 : 0.35 }} /></div>
      <div className={s.scoreLabels}><span>Bisa nanti</span><span>Berikutnya</span><span>Utamakan</span><span>Segera</span></div>
      <p className={s.reasoning}>{result.reasoning}</p>
      <div className={s.focusRecommendation}><Timer size={18} /><div><p><strong>{focus.recommendedMinutes} menit fokus</strong><ArrowRight size={15} />{focus.breakMinutes} menit jeda</p></div></div>
      <div className={s.timerDemo}><div className={s.timerDial}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="5" /><motion.circle cx="50" cy="50" r="44" fill="none" stroke="#4f8a6b" strokeWidth="5" strokeLinecap="round" strokeDasharray="276.46" strokeDashoffset={0} initial={false} animate={{ strokeDashoffset: 276.46 * (1 - seconds / total) }} transition={{ duration: reduced ? 0 : 0.2 }} transform="rotate(-90 50 50)" /></svg><div><span>{phase === "focus" ? "FOKUS" : "JEDA"}</span><strong role="timer" aria-label={`Sisa waktu ${time}`}>{time}</strong></div></div>
        <div className={s.timerActions}><p>{seconds === 0 ? "Sesi selesai. Siap langkah berikutnya?" : running ? "Satu tugas. Satu sesi. Mulai dari sini." : "Coba ritme fokusnya langsung."}</p><div><Button className={s.timerStart} size="sm" onClick={startPause}>{running ? <Pause size={15} /> : seconds === 0 ? <RotateCcw size={15} /> : <Play size={15} fill="currentColor" />}{running ? "Jeda timer" : seconds === 0 ? "Mulai ulang" : "Mulai timer"}</Button><Button variant="outline" size="sm" className={s.timerReset} aria-label="Reset timer" onClick={resetTimer}><RotateCcw size={16} /></Button></div><button className={s.switchPhase} onClick={switchPhase}>{phase === "focus" ? "Coba waktu jeda" : "Kembali ke fokus"}<ArrowRight size={13} /></button></div>
      </div>
    </div>
  </div>;
}
