"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import type { TaskDocument } from "@/lib/firestore";
import s from "./time-widgets.module.css";
import type { WidgetSize } from "../types";

const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function CalendarBentoWidget({ tasks, size = "2x1" }: { tasks: TaskDocument[]; size?: WidgetSize }) {
  const compact = size === "1x1";
  const taskLimit = size === "2x2" ? 5 : 1;
  const [month, setMonth] = useState<Date | null>(null);
  const [selected, setSelected] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(now); setToday(now);
    const interval = window.setInterval(() => setToday(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);
  const deadlines = tasks.flatMap(task => {
    const date = task.deadline?.toDate?.();
    return task.status !== "done" && date && Number.isFinite(date.getTime()) ? [{ task, date }] : [];
  });
  const year = month?.getFullYear() || 2000;
  const monthIndex = month?.getMonth() || 0;
  const blanks = month ? (month.getDay() + 6) % 7 : 0;
  const days = month ? new Date(year, monthIndex + 1, 0).getDate() : 0;
  const selectedTasks = selected ? deadlines.filter(item => sameDay(item.date, selected)).sort((a, b) => a.date.getTime() - b.date.getTime()) : [];
  const goMonth = (direction: number) => {
    if (!month || !today) return;
    const next = new Date(year, monthIndex + direction, 1);
    setMonth(next);
    setSelected(next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth() ? today : next);
  };
  const goToday = () => {
    const now = new Date(); setToday(now); setSelected(now); setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };
  return <div className={s.calendar} data-calendar-size={size}>
    <header className={s.calendarHeader}><div><p>Kalender</p><h2>{month ? month.toLocaleDateString("id-ID", { month: "long" }) : "Memuat…"}<span>{month?.getFullYear()}</span></h2></div><nav aria-label="Pilih bulan"><button type="button" disabled={!month} onClick={() => goMonth(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={18} /></button><button type="button" disabled={!month} onClick={() => goMonth(1)} aria-label="Bulan berikutnya"><ChevronRight size={18} /></button></nav></header>
    <div className={s.weekdays} aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
    <div className={s.days} aria-label="Tanggal bulan ini">
      {Array.from({ length: blanks }, (_, index) => <span key={`blank-${index}`} />)}
      {Array.from({ length: days }, (_, index) => {
        const date = new Date(year, monthIndex, index + 1);
        const isToday = !!today && sameDay(date, today);
        const count = deadlines.filter(item => sameDay(item.date, date)).length;
        return <button key={index} type="button" className={s.day} data-today={isToday} aria-current={isToday ? "date" : undefined} aria-pressed={!!selected && sameDay(date, selected)} aria-label={`${date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}${count ? `, ${count} deadline tugas` : ""}`} onClick={() => setSelected(date)}><span>{index + 1}</span>{count > 0 && <i aria-hidden="true" />}</button>;
      })}
    </div>
    <div className={s.calendarLegend}><span><i />Ada deadline</span><button type="button" onClick={goToday}>Hari ini</button></div>
    {!compact && <div className={s.agenda}><h3>{selected ? sameDay(selected, today || selected) ? "Hari ini" : selected.toLocaleDateString("id-ID", { day: "numeric", month: "long" }) : "Deadline"}<span>{selectedTasks.length ? `${selectedTasks.length} tugas` : ""}</span></h3>{selectedTasks.length ? <>{selectedTasks.slice(0, taskLimit).map(({ task }) => <Link key={task.id} href={`/tasks/${task.id}/edit`}><span>{task.title}</span><ArrowUpRight size={15} /></Link>)}{selectedTasks.length > taskLimit && <Link href="/tasks">Lihat semua tugas<ArrowUpRight size={15} /></Link>}</> : <p>{month ? "Tidak ada deadline untuk tanggal ini." : "Menyiapkan kalender…"}</p>}</div>}
  </div>;
}
