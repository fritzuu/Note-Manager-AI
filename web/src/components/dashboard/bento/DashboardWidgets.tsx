"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Search, FileText, Share2, CheckSquare, Calendar, BarChart3, BookOpen, Compass, type LucideIcon } from "lucide-react";
import { isRecordedFocusSession, isFullFocusSession, focusMinutes } from "@/lib/pomodoroSessions";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLearningProgress } from "@/components/dashboard/streak/useLearningProgress";
import { StreakShareModal } from "@/components/dashboard/streak/StreakShareModal";
import type { NoteDocument, TaskDocument, AcademicInsight, PomodoroSession } from "@/lib/firestore";
import s from "./workspace.module.css";

const activeTasks = (tasks: TaskDocument[]) => tasks.filter(t => t.status !== "done").sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
const dateOf = (task: TaskDocument) => task.deadline?.toDate?.();
const deadline = (task: TaskDocument) => {
  const date = dateOf(task);
  if (!date) return "Tanpa tenggat";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};
const progress = (task: TaskDocument) => Math.min(100, Math.max(0, task.progress || 0));
const notePreview = (note: NoteDocument) => note.content?.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() || "Catatan kosong";
const timestamp = (value: unknown) => {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  return value instanceof Date ? value.getTime() : 0;
};

export function QuickNoteSearch({ notes }: { notes: NoteDocument[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = notes.filter(n => !n.isTrashed && !n.isArchived && (n.title || "").toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  return <div className={s.search} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <Search size={17} aria-hidden="true" />
    <input aria-label="Cari catatan di dashboard" placeholder="Cari catatanmu…" value={query} onFocus={() => setOpen(true)} onChange={e => { setQuery(e.target.value); setOpen(true); }} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }} />
    {open && query.trim() && <div className={s.searchResults}>
      {matches.length ? matches.map(note => <Link key={note.id} href={`/notes/${note.id}`}><FileText size={16} /><span>{note.title || "Tanpa judul"}</span><ArrowUpRight size={15} /></Link>) : <p>Catatan tidak ditemukan.</p>}
    </div>}
  </div>;
}

export function DailyFocus({ tasks }: { tasks: TaskDocument[] }) {
  const task = activeTasks(tasks)[0];
  const { setSelectedTaskId, isRunning, selectedTask } = usePomodoro();
  const displayed = isRunning ? selectedTask : task;
  return <div className={s.focus}>
    <div className={s.focusOrbit} aria-hidden="true" />
    <div className={s.focusTop}><span>{isRunning ? "Sesi fokus sedang berjalan" : "Fokus hari ini"}</span><span>{displayed?.course || ""}</span></div>
    <h2>{displayed?.title || (isRunning ? "Sesi fokus berjalan" : "Mulai sesi belajarmu")}</h2>
    <p>{displayed ? "Kerjakan tugas ini dalam sesi fokus." : "Pilih tugas atau mulai timer untuk belajar."}</p>
    <div className={s.focusActions}>
      <Link href="/pomodoro" className={s.focusButton} onClick={() => { if (!isRunning && task) setSelectedTaskId(task.id); }}>{isRunning ? "Lanjutkan sesi" : "Buka sesi fokus"}<ArrowUpRight size={18} /></Link>
      <Link href={displayed ? `/tasks/${displayed.id}/edit` : "/tasks/create"} className={s.focusSecondary}>{displayed ? "Lihat tugas" : "Tambah tugas"}<ArrowRight size={16} /></Link>
    </div>
    {displayed && <div className={s.focusMeta}><span>Deadline {deadline(displayed)}</span><span>{progress(displayed)}% selesai</span></div>}
  </div>;
}

export function OpenNotes({ notes }: { notes: NoteDocument[] }) {
  const recent = notes.filter(n => !n.isArchived && !n.isTrashed).sort((a, b) => timestamp(b.updatedAt || b.createdAt) - timestamp(a.updatedAt || a.createdAt));
  return <div className={s.sectionContent}>
    <WidgetHeading title="Catatan terbaru" href="/notes" icon={FileText} />
    {!recent.length ? <EmptyText text="Belum ada catatan tersimpan." href="/notes" label="Buat catatan" /> : <div className={s.noteList}>{recent.slice(0, 6).map(note => <Link key={note.id} href={`/notes/${note.id}`} className={s.noteRow}><span className={s.noteIcon}><FileText size={18} strokeWidth={1.5} /></span><div><h3>{!note.title || note.title === "Untitled Note" ? "Tanpa judul" : note.title}</h3><p>{notePreview(note)}</p></div><ArrowUpRight size={16} /></Link>)}</div>}
    {!!recent.length && <Link className={s.inlineLink} href="/notes">Buka semua catatan<ArrowRight size={16} /></Link>}
  </div>;
}

export function OpenTasks({ tasks, upcoming = false }: { tasks: TaskDocument[]; upcoming?: boolean }) {
  const list = upcoming ? tasks.filter(t => t.status !== "done" && dateOf(t)).sort((a, b) => dateOf(a)!.getTime() - dateOf(b)!.getTime()) : activeTasks(tasks);
  return <div className={s.sectionContent}>
    <WidgetHeading title={upcoming ? "Deadline terdekat" : "Tugas berikutnya"} href="/tasks" icon={upcoming ? Calendar : CheckSquare} />
    {!list.length ? <EmptyText text={upcoming ? "Belum ada tugas dengan tenggat." : "Belum ada tugas aktif."} href="/tasks/create" label="Tambah tugas" /> : <div className={s.taskList}>{list.slice(0, 6).map(task => {
      const date = dateOf(task);
      return <Link key={task.id} href={`/tasks/${task.id}/edit`} className={s.taskRow}>
        {upcoming && date ? <div className={s.deadlineRow}>
          <time className={s.dateTile} dateTime={date.toISOString()}><strong>{date.getDate()}</strong><span>{date.toLocaleDateString("id-ID", { month: "short" })}</span></time>
          <div className={s.deadlineContent}><h3>{task.title}</h3><p>{date.toLocaleDateString("id-ID", { weekday: "long", year: "numeric" })}{task.course ? ` · ${task.course}` : ""}</p></div>
          <ArrowUpRight size={16} aria-hidden="true" />
        </div> : <>
          <div className={s.taskTitle}><CheckSquare size={18} className={s.taskMarker} data-urgent={task.priorityLevel === "Critical" || task.priorityLevel === "High"} aria-hidden="true" /><h3>{task.title}</h3><ArrowUpRight size={15} aria-hidden="true" /></div>
          <div className={s.taskDetails}>{task.course && <span>{task.course}</span>}<span>{deadline(task)} · {progress(task)}%</span></div>
          <div className={s.taskProgress}><span style={{ width: `${progress(task)}%` }} /></div>
        </>}
      </Link>;
    })}</div>}
    {!!list.length && <Link className={s.inlineLink} href="/tasks">Lihat semua tugas<ArrowRight size={16} /></Link>}
  </div>;
}

export function StudyRhythm({ sessions }: { sessions: PomodoroSession[] }) {
  const [sharing, setSharing] = useState(false);
  const { user, userDoc } = useAuth();
  const { streakDays, activityMinutes, completedSessions } = useLearningProgress(sessions);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(date.getDate() - 6 + index); date.setHours(0, 0, 0, 0); return date; });
  const totals = days.map(day => focusMinutes(sessions.filter(session => isRecordedFocusSession(session) && session.startedAt?.toDate?.().toDateString() === day.toDateString())));
  const weekSessions = sessions.filter(session => isFullFocusSession(session) && session.startedAt?.toDate?.().getTime() >= days[0].getTime());
  const minutes = totals.reduce((a, b) => a + b, 0);
  const max = Math.max(...totals, 1);
  return <><StreakShareModal isOpen={sharing} onClose={() => setSharing(false)} streakDays={streakDays} todayMinutes={activityMinutes} totalSessions={completedSessions} userName={userDoc?.name || user?.displayName || "Kamu"} /><div className={s.sectionContent}>
    <WidgetHeading title="Ritme belajar" href="/analytics" icon={BarChart3} />
    <div className={s.rhythmNumbers}><div><strong>{minutes}</strong><span>menit fokus · 7 hari</span></div><div><strong>{weekSessions.length}</strong><span>sesi selesai</span></div></div>
    <div className={s.chart} role="img" aria-label={days.map((date, i) => `${date.toLocaleDateString("id-ID", { weekday: "long" })}: ${totals[i]} menit`).join(", ")}>{days.map((date, index) => <div className={s.chartColumn} key={date.toISOString()}><div className={s.chartTrack}><span data-today={index === 6} style={{ height: `${totals[index] ? Math.max(8, totals[index] / max * 100) : 3}%` }} /></div><span>{date.toLocaleDateString("id-ID", { weekday: "short" })}</span></div>)}</div>
    <button className={s.shareProgress} onClick={() => setSharing(true)}><Share2 size={15} />Bagikan progres</button>
    {!minutes && <p className={s.muted}>Sesi fokus pertamamu akan muncul di sini.</p>}
  </div></>;
}

export function QuietInsight({ insight }: { insight: AcademicInsight | null }) {
  return <div className={s.insight}>
    <WidgetHeading title="Pola belajar" href={insight ? "/insight" : "/assessment"} icon={Compass} />
    {insight ? <><div className={s.insightScore}><strong>{insight.academicScore}</strong><span>/ 100 · skor kebiasaan</span></div><p className={s.insightText}>{insight.recommendation || insight.strengths?.[0] || "Lihat profil untuk memahami kebiasaan belajarmu."}</p><Link href="/insight" className={s.inlineLink}>Lihat pola belajar<ArrowUpRight size={16} /></Link></> : <><h3>Kenali cara belajarmu</h3><p className={s.insightText}>Isi profil untuk mengenali kebiasaan belajarmu.</p><Link href="/assessment" className={s.inlineLink}>Isi profil<ArrowUpRight size={16} /></Link></>}
  </div>;
}

export function QuietStat({ value, title, href, description }: { value: number; title: string; href: string; description: string }) {
  const Icon = href === "/notes" ? FileText : BookOpen;
  return <div className={s.stat}><div className={s.statHeading}><Icon size={18} strokeWidth={1.6} aria-hidden="true" /><span>{title}</span></div><strong>{value}</strong><Link href={href}>{description}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>;
}
function WidgetHeading({ title, href, icon: Icon }: { title: string; href: string; icon: LucideIcon }) {
  return <div className={s.widgetHeading}><div className={s.headingTitle}><Icon size={19} strokeWidth={1.6} aria-hidden="true" /><h2>{title}</h2></div><Link href={href} aria-label={`Buka ${title.toLowerCase()}`}><ArrowUpRight size={18} /></Link></div>;
}
function EmptyText({ text, href, label }: { text: string; href: string; label: string }) {
  return <div className={s.emptyText}><p>{text}</p><Link className={s.inlineLink} href={href}>{label}<ArrowRight size={16} /></Link></div>;
}
