"use client";

import { useEffect, useRef, useState, type MouseEvent, type KeyboardEvent, type RefObject } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Timestamp } from "firebase/firestore";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bell, ChevronLeft, ChevronRight, BookOpen, Brain, Check, CheckSquare, ChevronDown, Coffee, FileText, Flame, GripVertical, LayoutDashboard,  MessageSquare, MousePointer2, Pause, Play, RotateCcw, Search, Send, SlidersHorizontal, Sparkles, Star, Timer } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { computePriorityDetailed } from "@/lib/fuzzy/inference";
import { computePomodoroFocus } from "@/lib/pomodoroFuzzy";
import type { AcademicInsight, NoteDocument, TaskDocument } from "@/lib/firestore";
import { OpenNotes, OpenTasks, QuietInsight, QuietStat } from "@/components/dashboard/bento/DashboardWidgets";
import { ClockBentoWidget } from "@/components/dashboard/bento/widgets/ClockBentoWidget";
import n from "./native-preview.module.css";

const TiptapEditor = dynamic(() => import("@/components/notes/TiptapEditor").then((module) => module.TiptapEditor), { ssr: false, loading: () => <div className={n.editorFallback} aria-hidden="true" /> });

export type FeatureId = "notes" | "tasks" | "focus" | "insight" | "assistant" | "dashboard";
const NAV: { id: FeatureId; label: string; icon: typeof Brain }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { id: "notes", label: "Catatan", icon: FileText }, { id: "tasks", label: "Tugas", icon: CheckSquare },
  { id: "focus", label: "Sesi fokus", icon: Timer }, { id: "assistant", label: "Asisten", icon: MessageSquare }, { id: "insight", label: "Pola belajar", icon: Brain },
];
const NOTE_HTML = "<h2>Korelasi &amp; kausalitas</h2><p>Korelasi menggambarkan hubungan antara dua variabel. Saat satu variabel berubah, variabel lain dapat ikut berubah.</p><p><strong>Hubungan ini belum tentu berarti sebab-akibat.</strong> Ada kemungkinan variabel ketiga memengaruhi keduanya.</p><blockquote><p>Contoh: penjualan es krim dan penggunaan kipas sama-sama meningkat saat cuaca panas.</p></blockquote>";
const NOTES: NoteDocument[] = [
  { id: "demo-statistika", userId: "demo", title: "Korelasi & kausalitas", content: NOTE_HTML, tags: ["statistika", "konsep"], isPinned: true },
  { id: "demo-praktikum", userId: "demo", title: "Catatan praktikum", content: "<p>Metode penelitian dan rancangan eksperimen.</p>", tags: ["praktikum"] },
  { id: "demo-presentasi", userId: "demo", title: "Outline presentasi", content: "<p>Pengantar, studi kasus, dan kesimpulan.</p>", tags: ["presentasi"] },
];
const INSIGHT: AcademicInsight = { userId: "demo", academicScore: 74, prediction: "Good", confidence: null, headline: "Bangun ritme belajar mandiri", recommendation: "Siapkan satu sesi fokus untuk mengulang materi sebelum kelas berikutnya.", strengths: ["Kehadiran kuliah terjaga"], weaknesses: ["Jadwal belajar mandiri belum rutin"] };

function useDemoTasks() {
  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  useEffect(() => {
    setTasks([{ title: "Laporan praktikum", days: 1, difficulty: 8, importance: 8, progress: 20 }, { title: "Review materi statistika", days: 5, difficulty: 5, importance: 6, progress: 35 }, { title: "Revisi presentasi", days: 10, difficulty: 3, importance: 4, progress: 60 }].map((seed, index) => {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + seed.days);
      return { id: `demo-task-${index}`, userId: "demo", title: seed.title, description: "Susun materi dan selesaikan tugas perkuliahan.", deadline: Timestamp.fromDate(date), importance: seed.importance, difficulty: seed.difficulty, progress: seed.progress, academicRisk: 40, course: "Statistika", workspace: "Kuliah", status: "todo" as const, ...computePriorityDetailed({ deadlineDays: seed.days, difficulty: seed.difficulty, importance: seed.importance, progress: seed.progress, academicRisk: 40 }) };
    }));
  }, []);
  return tasks;
}

// Playback runs only on a visible preview. Pointer/keyboard interaction gives control to the visitor.
function usePlayback(ref: RefObject<HTMLDivElement | null>, length: number, duration = 2400) {
  const inView = useInView(ref, { amount: 0.2 });
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [step, setStep] = useState(0);
  const [version, setVersion] = useState(0);
  const playing = enabled && inView && documentVisible && !reduced;
  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden);
    update(); document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => setStep((value) => (value + 1) % length), duration);
    return () => clearInterval(interval);
  }, [playing, length, duration]);
  return { step, version, playing, enabled, reduced, stop: () => setEnabled(false), replay: () => { setStep(0); setVersion((value) => value + 1); setEnabled(true); } };
}

function PlaybackControls({ playback }: { playback: ReturnType<typeof usePlayback> }) {
  return <div className={n.playbackControls}><button aria-label="Ulangi demo" onClick={playback.replay}><RotateCcw size={14} /></button></div>;
}

function PreviewPointer({ step, playing }: { step: number; playing: boolean }) {
  if (!playing) return null;
  const locations = [{ left: "37%", top: "26%" }, { left: "73%", top: "37%" }, { left: "54%", top: "69%" }, { left: "78%", top: "80%" }];
  return <motion.div aria-hidden="true" className={n.demoPointer} animate={locations[step % locations.length]} transition={{ type: "spring", stiffness: 80, damping: 18 }}><MousePointer2 size={22} fill="#24543e" /><motion.i key={step} initial={{ scale: 0.4, opacity: 0.6 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.9 }} /></motion.div>;
}

function NativeFocus({ compact = false, step = 0, playing = false }: { compact?: boolean; step?: number; playing?: boolean }) {
  const [difficulty, setDifficulty] = useState(8);
  const [seconds, setSeconds] = useState(3000);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const anchor = useRef(0);
  const reduced = useReducedMotion();
  const focus = computePomodoroFocus(98, difficulty);
  const total = (phase === "focus" ? focus.recommendedMinutes : focus.breakMinutes) * 60;
  useEffect(() => { setRunning(false); setPhase("focus"); setSeconds(focus.recommendedMinutes * 60); }, [difficulty, focus.recommendedMinutes]);
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => { const remaining = Math.max(0, Math.ceil((anchor.current - Date.now()) / 1000)); setSeconds(remaining); if (!remaining) setRunning(false); }, 250);
    const pause = () => { if (document.hidden) setRunning(false); };
    document.addEventListener("visibilitychange", pause);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", pause); };
  }, [running]);
  function toggle() { if (running) setRunning(false); else { const remaining = seconds || total; setSeconds(remaining); anchor.current = Date.now() + remaining * 1000; setRunning(true); } }
  const displaySeconds = playing && !running ? Math.round(total * (1 - step * 0.1)) : seconds;
  const time = `${Math.floor(displaySeconds / 60).toString().padStart(2, "0")}:${(displaySeconds % 60).toString().padStart(2, "0")}`;
  return <div className={`${n.nativeFocus} ${compact ? n.focusCompact : ""}`}><div className={n.nativeWidgetHeader}><span className={n.timerIcon}><Timer size={16} /></span><div><p>Sesi fokus</p><span>{focus.recommendedMinutes} menit fokus · {focus.breakMinutes} menit jeda</span></div><span className={n.modeBadge}>{phase === "focus" ? <Flame size={13} /> : <Coffee size={13} />}{phase === "focus" ? "Fokus" : "Istirahat"}</span></div><div className={n.taskSelect}><Dropdown compact label="Pilih tugas contoh untuk fokus" value={String(difficulty)} onChange={value => setDifficulty(Number(value))} options={[{ value: "8", label: "Laporan praktikum", detail: "Segera kerjakan" }, { value: "4", label: "Review materi", detail: "Utamakan" }]} /></div><div className={n.nativeRing}><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="86" fill="none" stroke="#e5e7eb" strokeWidth="10" /><motion.circle cx="100" cy="100" r="86" fill="none" stroke={compact ? "#b9d092" : phase === "focus" ? "#658552" : "#bd9874"} strokeWidth="10" strokeLinecap="round" strokeDasharray="540.35" strokeDashoffset={0} initial={reduced ? false : { strokeDashoffset: 540.35 }} animate={{ strokeDashoffset: 540.35 * (1 - displaySeconds / total) }} transition={{ duration: reduced ? 0 : 0.8 }} transform="rotate(-90 100 100)" /></svg><div><strong role="timer" aria-label={`Timer contoh ${time}`}>{time}</strong><span>{playing ? "Waktu demo dipercepat" : running ? "Sedang berjalan" : seconds === 0 ? "Sesi selesai" : "Siap fokus"}</span></div></div><div className={n.focusButtons}><Button variant="outline" size="sm" onClick={() => { setSeconds(total); setRunning(false); }} icon={<RotateCcw size={14} />}>Reset</Button><Button size="sm" onClick={toggle} icon={running ? <Pause size={14} /> : <Play size={14} />}>{running ? "Jeda" : "Mulai fokus"}</Button></div>{!compact && <button className={n.phaseLink} onClick={() => { const next = phase === "focus" ? "break" : "focus"; setPhase(next); setSeconds((next === "focus" ? focus.recommendedMinutes : focus.breakMinutes) * 60); setRunning(false); }}>{phase === "focus" ? "Coba waktu istirahat" : "Kembali ke sesi fokus"}<ArrowRight size={13} /></button>}</div>;
}

function NativeDashboard({ step, playing, stop, compact = false }: { step: number; playing: boolean; stop: () => void; compact?: boolean }) {
  const tasks = useDemoTasks();
  const [manualLayout, setManualLayout] = useState(false);
  const reduced = useReducedMotion();
  const reordered = playing ? step === 2 : manualLayout;
  const ids = reordered ? ["clock", "stat", "notes", "focus", "priority"] : ["notes", "clock", "stat", "priority", "focus"];
  return <div className={n.nativeDashboard}><div className={n.nativeGreeting}><div><p>Selamat pagi, Naya</p><span>Apa yang ingin kamu tuntaskan hari ini?</span></div><span className={n.notification}><Bell size={17} /></span></div><div className={n.bentoControls}><div><p>Ruang belajar</p></div><button className={n.demoOutline} onClick={() => { stop(); setManualLayout(!manualLayout); }}><SlidersHorizontal size={13} />{manualLayout ? "Kembalikan susunan" : "Atur dashboard"}</button></div><div className={n.dashboardGrid}>{ids.map(id => <motion.div key={id} layout transition={{ layout: { duration: reduced ? 0 : .3 } }} data-widget={id} className={`${n.nativeWidget} ${id === "clock" ? n.clockWidget : ""} ${id === "focus" ? n.focusWidget : ""}`}>
    {id === "notes" ? <OpenNotes notes={NOTES.slice(0, compact ? 1 : 2)} /> : id === "clock" ? <ClockBentoWidget /> : id === "stat" ? <QuietStat value={NOTES.length} title="Catatan tersimpan" href="/notes" description="Buka catatanmu" /> : id === "priority" ? <OpenTasks tasks={tasks.slice(0, 2)} /> : <NativeFocus compact step={step} playing={playing} />}
  </motion.div>)}</div></div>;
}

function NativeNotes({ step, playing, compact = false, stop }: { step: number; playing: boolean; compact?: boolean; stop: () => void }) {
  const [content, setContent] = useState(NOTE_HTML);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [pinned, setPinned] = useState(true);
  const reduced = useReducedMotion();
  const editorRef = useRef<HTMLDivElement>(null);
  const editorVisible = useInView(editorRef, { once: true });
  const showSummary = summaryOpen || (playing && step >= 1);
  const summary = [
    { concepts: ["Korelasi", "Kausalitas", "Variabel ketiga"], points: ["Korelasi menunjukkan hubungan antarvariabel.", "Hubungan bukan bukti sebab-akibat.", "Periksa faktor lain sebelum menarik kesimpulan."], question: "Faktor lain apa yang bisa memengaruhi hubungan dua variabel?" },
    { concepts: ["Metode penelitian", "Eksperimen"], points: ["Pilih metode sesuai pertanyaan penelitian.", "Jelaskan rancangan eksperimen sebelum pengamatan."], question: "Variabel apa yang akan diukur dalam eksperimenmu?" },
    { concepts: ["Pengantar", "Studi kasus", "Kesimpulan"], points: ["Kenalkan topik di bagian pengantar.", "Gunakan studi kasus sebelum menarik kesimpulan."], question: "Apa satu pesan utama yang ingin disampaikan?" },
  ][selected];
  function selectNote(index: number) { stop(); setSelected(index); setContent(NOTES[index].content); setSummaryOpen(false); }
  return <div className={`${n.notesWorkspace} ${compact ? n.notesCompact : ""}`}><aside className={n.notesSidebar}><div><p><FileText size={15} /> Catatan <span>03</span></p><span className={n.fakeSearch}><Search size={13} />Cari catatan…</span><div className={n.noteFilters}><span>Semua</span><span>Disematkan</span><span>Arsip</span></div></div>{NOTES.map((note, index) => <button key={note.id} onClick={() => selectNote(index)} className={selected === index ? n.selectedNote : ""}><strong>{note.title}{index === 0 && <Star size={11} fill="currentColor" />}</strong><span>{note.content.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").slice(0, 75)}…</span><span>{note.tags.map((tag) => <i key={tag}>{tag}</i>)}</span></button>)}</aside><div className={n.noteMain}><div className={n.editorActions}><span><ArrowLeft size={14} />Semua catatan</span><div><button aria-label={pinned ? "Lepas pin catatan contoh" : "Pin catatan contoh"} aria-pressed={pinned} onClick={() => { stop(); setPinned(!pinned); }}><Star size={14} fill={pinned ? "#bccd9a" : "none"} color={pinned ? "#7e975e" : "#9ca3af"} /></button><button aria-label="Tampilkan ringkasan contoh" aria-pressed={showSummary} onClick={() => { stop(); setSummaryOpen(!showSummary); }}><Sparkles size={14} />Rangkuman</button></div></div><div ref={editorRef} className={n.editorPaper}><div className={n.noteTitleRow}><p>{NOTES[selected].title}</p></div><div className={n.noteTags}>{NOTES[selected].tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>{compact ? <div className={n.compactEditor}><div className={n.compactToolbar} aria-hidden="true"><RotateCcw size={13} /><span>Inter</span><span>Normal</span><strong>B</strong><i>I</i><span>H₂</span><BookOpen size={14} /></div><div className={n.readonlyNote}><p>{selected === 0 ? "Korelasi menggambarkan hubungan antara dua variabel. Saat satu variabel berubah, variabel lain dapat ikut berubah." : NOTES[selected].content.replace(/<[^>]+>/g, " ")}</p>{selected === 0 && <><motion.mark initial={false} animate={{ backgroundColor: playing && step >= 1 ? "#e5edcd" : "#fffef8" }} transition={{ duration: reduced ? 0 : 0.5 }}>Hubungan ini belum tentu berarti sebab-akibat.</motion.mark><blockquote>Contoh: penjualan es krim dan penggunaan kipas sama-sama meningkat saat cuaca panas.</blockquote></>}</div></div> : editorVisible ? <TiptapEditor content={content} onChange={setContent} userId="" /> : <div className={n.editorFallback}>Editor catatan dan toolbar asli Cogniva</div>}</div></div><aside className={`${n.aiSummary} ${showSummary ? n.summaryActive : ""}`}><div><Sparkles size={15} /><span>Rangkuman catatan</span></div><div className={n.summaryBody}>{showSummary ? <motion.div initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.4 }}><p>Konsep Utama</p><div className={n.conceptTags}>{summary.concepts.map((concept, index) => <motion.span key={concept} initial={reduced ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduced ? 0 : index * 0.12 }}>{concept}</motion.span>)}</div><p>Poin Penting</p><ul>{summary.points.map((point, index) => <motion.li key={point} initial={reduced ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduced ? 0 : 0.15 + index * 0.15 }}>{point}</motion.li>)}</ul><div className={n.practiceQuestion}><span>Pertanyaan latihan</span><p>{summary.question}</p></div></motion.div> : <div className={n.summaryEmpty}><span><Brain size={25} /></span><p>Pahami isi catatan</p><span>Lihat konsep, poin penting, dan pertanyaan latihan dari catatan ini.</span><Button size="sm" onClick={() => { stop(); setSummaryOpen(true); }} icon={<Sparkles size={14} />}>Buat rangkuman</Button></div>}</div></aside></div>;
}

function NativeTasks({ step, stop, compact = false }: { step: number; stop: () => void; compact?: boolean }) {
  const reduced = useReducedMotion();
  const [manualStep, setManualStep] = useState<number | null>(null);
  const state = manualStep ?? step;
  const location = state === 0 ? 0 : state < 3 ? 1 : 2;
  const progress = [20, 40, 70, 100][state];
  const task = computePriorityDetailed({ deadlineDays: 1, importance: 8, difficulty: 8, progress, academicRisk: 40 });
  return <div className={`${n.nativeTasks} ${compact ? n.tasksCompact : ""}`}><div className={n.nativePageHeading}><div><span className={n.pageIcon}><CheckSquare size={20} /></span><div><p>Tugas</p><span>Kelola tugas, deadline, dan prioritas akademik.</span></div></div><div className={n.workspacePicker}><Dropdown compact label="Ruang tugas contoh" value="kuliah" options={[{ value: "kuliah", label: "Kuliah" }]} onChange={() => {}} /></div></div><div className={n.taskBoard}>{["Belum mulai", "Dikerjakan", "Selesai"].map((label, column) => <div key={label} className={`${n.boardColumn} ${column === 1 ? n.doingColumn : column === 2 ? n.doneColumn : ""}`}><div className={n.columnHeading}><span>{column === 2 ? <Check size={14} /> : <span className={n.columnDot} />}{label}</span><span>{column === location ? "1" : "0"}</span></div>{column === location && <motion.div layoutId={`practical-card-${compact ? "hero" : "feature"}`} transition={{ duration: reduced ? 0 : 0.65, type: "spring", bounce: 0.12 }} className={n.nativeTaskCard}><div><span className={`${n.nativePriority} ${location === 2 ? n.priorityDone : ""}`}>{location === 2 ? "Selesai" : ({ Critical: "Segera kerjakan", High: "Utamakan", Medium: "Berikutnya", Low: "Bisa nanti" }[task.priorityLevel])}</span><GripVertical size={15} /></div><p>Laporan praktikum</p><span>Susun metode, hasil pengamatan, dan pembahasan.</span><div className={n.taskProgress}><div><span>Progres</span><strong>{progress}%</strong></div><div><motion.span initial={false} animate={{ width: `${progress}%` }} transition={{ duration: reduced ? 0 : 0.55 }} /></div></div><div className={n.cardDeadline}><span><Timer size={12} />Besok</span><button onClick={() => { stop(); setManualStep((state + 1) % 4); }} aria-label="Lanjutkan progres tugas contoh">{location === 2 ? "Ulangi demo" : "Lanjutkan"}<ArrowRight size={12} /></button></div></motion.div>}{column !== location && <div className={n.boardEmpty}>{column === 2 ? "Tugas selesai muncul di sini" : "Belum ada tugas"}</div>}</div>)}</div><div className={n.taskHint}><Button variant="outline" size="sm" onClick={() => { stop(); setManualStep(0); }} icon={<RotateCcw size={13} />}>Ulangi demo</Button></div></div>;
}

function NativeInsight({ step }: { step: number }) {
  const reduced = useReducedMotion();
  return <div className={n.nativeInsight}><div className={n.nativePageHeading}><div><div><p>Pola belajar</p><span>Kenali kebiasaanmu, lalu pilih satu langkah berikutnya.</span></div></div></div><div className={n.insightHero}><span>Dari profil contoh</span><h2>Bangun ritme belajar mandiri</h2><p>{INSIGHT.recommendation}</p></div><div className={n.insightStrengths}>{[{ title: "Yang sudah terjaga", body: INSIGHT.strengths[0], icon: Check }, { title: "Yang bisa diperbaiki", body: INSIGHT.weaknesses[0], icon: SlidersHorizontal }].map(({ title, body, icon: Icon }, index) => <motion.div key={title} initial={false} animate={{ opacity: !reduced && step === index ? .85 : 1 }}><Icon size={19} color="#80976c" /><p>{title}</p><span>{body}</span></motion.div>)}</div><div className={n.originalInsightWidget}><QuietInsight insight={INSIGHT} /></div></div>;
}

function NativeAssistant({ step, playing, stop }: { step: number; playing: boolean; stop: () => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const current = choice ?? (step >= 2 ? 1 : 0);
  const question = current === 0 ? "Jelaskan korelasi dengan contoh sehari-hari." : "Bantu aku menguji pemahaman tentang kausalitas.";
  const answer = current === 0 ? "Penjualan es krim dan penggunaan kipas bisa sama-sama meningkat saat cuaca panas. Keduanya berkorelasi, tetapi membeli es krim tidak menyebabkan kipas menyala. Cuaca adalah faktor lain yang perlu diperhatikan." : "Jika mahasiswa yang lebih sering ke perpustakaan punya nilai lebih tinggi, apakah perpustakaan pasti penyebabnya? Pertimbangkan kebiasaan belajar atau motivasi sebagai faktor lain yang mungkin memengaruhi keduanya.";
  const revealed = !playing || step >= 1 || choice !== null;
  return <div className={n.nativeAssistant}><div className={n.nativePageHeading}><div><span className={n.pageIcon}><BookOpen size={20} /></span><div><p>Asisten</p><span>Tanya jawab dengan konteks catatan belajarmu.</span></div></div></div><div className={n.assistantLayout}><aside><p><BookOpen size={15} />Konteks catatan</p><div className={n.contextCard}><FileText size={16} /><strong>Korelasi & kausalitas</strong><span>Statistika · Pertemuan 04</span></div><p>Pertanyaan cepat</p>{["Jelaskan konsep tersulit", "Buat pertanyaan latihan"].map((prompt, index) => <button key={prompt} className={index === 0 ? n.purplePrompt : n.bluePrompt} onClick={() => { stop(); setChoice(index); }}><Sparkles size={14} />{prompt}<ArrowUpRight size={12} /></button>)}</aside><div className={n.chatPanel}><div className={n.assistantContext}><BookOpen size={16} /><span>Bahan belajar</span><Dropdown compact label="Bahan belajar demo" value="statistika" options={[{ value: "statistika", label: "Korelasi & kausalitas" }]} onChange={() => {}} /></div><div className={n.chatMessages}><motion.div key={question} className={n.userMessage} initial={reduced ? false : { opacity: 0, scale: 0.92, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}>{question}</motion.div><AnimatePresence>{revealed && <motion.div key={answer} className={n.aiMessage} initial={reduced ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.45 }}><p>{answer}</p></motion.div>}</AnimatePresence></div><div className={n.chatComposer}><span>Pilih pertanyaan contoh di samping</span><span><Send size={15} /></span></div></div></div></div>;
}

function NativeScreen({ id, step, playing, stop, compact = false }: { id: FeatureId; step: number; playing: boolean; stop: () => void; compact?: boolean }) {
  if (id === "dashboard") return <NativeDashboard step={step} playing={playing} stop={stop} compact={compact} />;
  if (id === "notes") return <NativeNotes step={step} playing={playing} compact={compact} stop={stop} />;
  if (id === "tasks") return <NativeTasks step={step} stop={stop} compact={compact} />;
  if (id === "focus") return <div className={n.focusPage}><div className={n.nativePageHeading}><div><span className={n.pageIcon}><Timer size={20} /></span><div><p>Sesi fokus</p><span>Satu tugas, satu sesi fokus.</span></div></div></div><NativeFocus compact={compact} step={step} playing={playing} /></div>;
  if (id === "insight") return <NativeInsight step={step} />;
  return <NativeAssistant step={step} playing={playing} stop={stop} />;
}

function NativeShell({ id, onNavigate, step, playing, stop, compact = false }: { id: FeatureId; onNavigate: (id: FeatureId) => void; step: number; playing: boolean; stop: () => void; compact?: boolean }) {
  const reduced = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);
  function handleLinks(event: MouseEvent<HTMLDivElement>) {
    const target = (event.target as HTMLElement).closest("a");
    const href = target?.getAttribute("href");
    if (!href?.startsWith("/")) return;
    event.preventDefault(); event.stopPropagation(); stop();
    onNavigate(href.startsWith("/notes") ? "notes" : href.startsWith("/tasks") ? "tasks" : href.startsWith("/pomodoro") ? "focus" : (href.startsWith("/insight") || href.startsWith("/assessment")) ? "insight" : "dashboard");
  }
  return <div className={`${n.nativeShell} ${compact ? n.compactShell : ""}`} data-collapsed={collapsed} onClickCapture={handleLinks}><aside className={n.appSidebar}><div className={n.appBrand}><span className={n.cognivaMark}><Image src="/brand/cogniva/cogniva-symbol-color.svg" alt="Cogniva" width={22} height={22} /></span><Image className={n.fullBrand} src="/brand/cogniva/cogniva-horizontal-color.svg" alt="Cogniva" width={145} height={41} /></div><button type="button" className={n.collapseDemo} aria-label={collapsed ? "Buka sidebar demo" : "Ringkas sidebar demo"} aria-expanded={!collapsed} onClick={() => { stop(); setCollapsed(value => !value); }}>{collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}</button><nav aria-label="Navigasi demo aplikasi"><p className={n.navGroupLabel}>Ruangmu</p>{NAV.filter(({ id: target }) => !compact || ["dashboard", "notes", "tasks", "focus"].includes(target)).map(({ id: target, label, icon: Icon }) => <button key={target} title={label} onClick={() => { stop(); onNavigate(target); }} className={id === target ? n.activeNav : ""} aria-label={`Lihat demo ${label}`} aria-current={id === target ? "page" : undefined}><Icon size={17} /><span>{label}</span></button>)}</nav><div className={n.demoProfile}><span>N</span><div><strong>Naya</strong><span>Akun contoh</span></div><ChevronDown size={13} /></div></aside><div className={n.screenViewport}><AnimatePresence mode="wait" initial={false}><motion.div key={id} initial={{ opacity: .9 }} animate={{ opacity: 1 }} exit={{ opacity: .9 }} transition={{ duration: reduced ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}><NativeScreen id={id} step={step} playing={playing} stop={stop} compact={compact} /></motion.div></AnimatePresence></div></div>;
}

export function FeaturePreview({ id, onNavigate }: { id: FeatureId; onNavigate?: (id: FeatureId) => void }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const playback = usePlayback(previewRef, 4);
  return <div ref={previewRef} className={n.nativeFrame} data-playing={playback.playing}><div className={n.frameBar}><span className={n.previewTitle}>Demo interaktif</span><PlaybackControls playback={playback} /></div><div className={n.screenStage} onPointerDownCapture={playback.stop} onKeyDownCapture={playback.stop}><NativeShell key={playback.version} id={id} onNavigate={(next) => onNavigate?.(next)} step={playback.step} playing={playback.playing} stop={playback.stop} /><PreviewPointer step={playback.step} playing={playback.playing} /></div></div>;
}

export function HeroWorkspace() {
  const pages: FeatureId[] = ["dashboard", "notes", "tasks", "focus"];
  const previewRef = useRef<HTMLDivElement>(null);
  const playback = usePlayback(previewRef, 4, 5500);
  const [manualPage, setManualPage] = useState<FeatureId | null>(null);
  const [detailStep, setDetailStep] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = playback.enabled && !playback.reduced ? pages[playback.step] : manualPage ?? "dashboard";
  useEffect(() => {
    if (!playback.playing) return;
    setDetailStep(0);
    const timers = [1600, 3100, 4400].map((delay, index) => setTimeout(() => setDetailStep(index + 1), delay));
    return () => timers.forEach(clearTimeout);
  }, [playback.step, playback.playing]);
  function select(page: FeatureId) { setManualPage(page); playback.stop(); }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % pages.length : event.key === "ArrowLeft" ? (index + pages.length - 1) % pages.length : event.key === "Home" ? 0 : event.key === "End" ? pages.length - 1 : null;
    if (next !== null) { event.preventDefault(); select(pages[next]); tabRefs.current[next]?.focus(); }
  }
  return <div ref={previewRef} className={`${n.nativeFrame} ${n.heroFrame}`} data-playing={playback.playing}><div className={n.frameBar}><span className={n.frameBrand}><Image src="/brand/cogniva/cogniva-horizontal-color.svg" alt="Cogniva" width={112} height={32} /></span><PlaybackControls playback={{ ...playback, replay: () => { setManualPage(null); playback.replay(); } }} /></div><div className={n.heroTabs} role="tablist" aria-label="Preview workspace">{pages.map((page, index) => <button key={page} ref={(node) => { tabRefs.current[index] = node; }} role="tab" id={`hero-tab-${page}`} aria-controls="hero-preview-panel" aria-selected={id === page} tabIndex={id === page ? 0 : -1} onClick={() => select(page)} onKeyDown={(event) => keyboard(event, index)}>{["Dashboard", "Catatan", "Tugas", "Fokus"][index]}{id === page && <motion.span layoutId="workspace-tab" transition={{ type: "spring", bounce: 0.1, duration: playback.reduced ? 0 : 0.35 }} />}</button>)}</div><div className={n.heroStage} id="hero-preview-panel" role="tabpanel" aria-labelledby={`hero-tab-${id}`} tabIndex={0} onPointerDownCapture={() => select(id)} onKeyDownCapture={() => select(id)}><NativeShell key={playback.version} compact id={id} onNavigate={select} step={detailStep} playing={playback.playing} stop={() => select(id)} /><PreviewPointer step={detailStep} playing={playback.playing} /></div></div>;
}
