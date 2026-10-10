"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, RefreshCw, Timer, Check, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useScreenTime, formatScreenTime } from "@/contexts/ScreenTimeContext";
import { getUserNotes, getUserTasks, getUserPomodoroSessions, getAcademicInsight, type TaskDocument, type PomodoroSession, type NoteDocument, type AcademicInsight } from "@/lib/firestore";
import { focusSeconds, isRecordedFocusSession, isFullFocusSession, formatFocusDuration } from "@/lib/pomodoroSessions";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Dropdown } from "@/components/ui/Dropdown";
import s from "@/components/analytics/analytics.module.css";

type Snapshot = { uid: string; tasks: TaskDocument[] | null; sessions: PomodoroSession[] | null; notes: NoteDocument[] | null; insight: AcademicInsight | null; unavailable: string[] };
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function sessionDate(value: unknown): Date | null {
  if (!value || typeof value !== "object") return null;
  const timestamp = value as { toDate?: () => Date; seconds?: number };
  const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : typeof timestamp.seconds === "number" ? new Date(timestamp.seconds * 1000) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}
function shortDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}j ${minutes % 60}m` : minutes ? `${minutes} menit` : `${Math.floor(seconds)} detik`;
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const { todaySeconds, history } = useScreenTime();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");
  const [metric, setMetric] = useState("focus");
  const [today, setToday] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const requestId = useRef(0);
  const owner = useRef(user?.uid); owner.current = user?.uid;

  const load = useCallback(async () => {
    if (!user) return;
    const uid = user.uid, id = ++requestId.current;
    setLoading(true);
    const result = await Promise.allSettled([getUserTasks(uid), getUserPomodoroSessions(uid), getUserNotes(uid), getAcademicInsight(uid)]);
    if (owner.current !== uid || requestId.current !== id) return;
    const [tasks, sessions, notes, insight] = result;
    const unavailable = result.flatMap((value, index) => value.status === "rejected" ? [["tugas", "sesi fokus", "catatan", "profil belajar"][index]] : []);
    setSnapshot({ uid, tasks: tasks.status === "fulfilled" ? tasks.value : null, sessions: sessions.status === "fulfilled" ? sessions.value : null, notes: notes.status === "fulfilled" ? notes.value : null, insight: insight.status === "fulfilled" ? insight.value : null, unavailable });
    setLoading(false); setToday(new Date());
  }, [user?.uid]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    void load();
    return () => { requestId.current++; };
  }, [user?.uid, authLoading, router, load]);
  useEffect(() => {
    const update = () => setToday(new Date());
    const timer = setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => { clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);

  const data = snapshot?.uid === user?.uid ? snapshot : null;
  const count = Number(period), todayKey = dateKey(today);
  const recorded = useMemo(() => (data?.sessions || []).filter(isRecordedFocusSession).map(session => ({ session, date: sessionDate(session.startedAt), seconds: focusSeconds(session) })).filter(item => item.date && Number.isFinite(item.seconds)), [data?.sessions]);
  const days = useMemo(() => Array.from({ length: count }, (_, index) => {
    const date = new Date(today); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (count - 1 - index));
    const key = dateKey(date);
    const entries = recorded.filter(item => item.date && dateKey(item.date) === key);
    const screen = key === todayKey ? todaySeconds : Math.max(0, history.find(item => item.dateStr === key)?.screenTimeSeconds || 0);
    return { date, key, entries, seconds: entries.reduce((sum, item) => sum + item.seconds, 0), full: entries.filter(item => isFullFocusSession(item.session)).length, screen };
  }), [count, todayKey, recorded, todaySeconds, history]);
  const selected = days.find(day => day.key === selectedDate) || days[days.length - 1];
  const totalSeconds = days.reduce((sum, day) => sum + day.seconds, 0);
  const fullSessions = days.reduce((sum, day) => sum + day.full, 0);
  const focusDays = days.filter(day => day.seconds > 0).length;
  const maximum = Math.max(60, ...days.map(day => metric === "focus" ? day.seconds : day.screen));
  const tasks = data?.tasks;
  const done = tasks?.filter(task => task.status === "done").length ?? 0;
  const doing = tasks?.filter(task => task.status === "doing").length ?? 0;
  const todo = tasks?.filter(task => task.status === "todo").length ?? 0;
  const rate = tasks?.length ? Math.round(done / tasks.length * 100) : 0;
  const notes = data?.notes?.filter(note => !note.isTrashed);
  const activeNotes = notes?.filter(note => !note.isArchived).length ?? 0;
  const archivedNotes = notes?.filter(note => note.isArchived).length ?? 0;
  const focusReady = data?.sessions !== null && !!data;
  const previousSeconds = useMemo(() => {
    const first = new Date(today); first.setHours(0, 0, 0, 0); first.setDate(first.getDate() - (count * 2 - 1));
    const end = new Date(today); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() - (count - 1));
    return recorded.filter(item => item.date && item.date >= first && item.date < end).reduce((sum, item) => sum + item.seconds, 0);
  }, [count, todayKey, recorded]);
  const difference = previousSeconds > 0 ? Math.round((totalSeconds - previousSeconds) / previousSeconds * 100) : null;

  return <DashboardShell><main className={s.page}>
    <header className={s.header}><div><h1>Aktivitas belajar</h1><p>Lihat waktu fokus dan pekerjaan yang sudah kamu jalani.</p></div><div className={s.headerActions}><Dropdown id="analytics-period" label="Periode aktivitas" compact value={period} options={[{ value: "7", label: "7 hari terakhir" }, { value: "30", label: "30 hari terakhir" }]} onChange={value => { setPeriod(value); setSelectedDate(todayKey); }} /><button className={s.iconButton} aria-label="Perbarui data aktivitas" disabled={loading} onClick={() => void load()}><RefreshCw size={17} className={loading ? s.spin : ""} /></button></div></header>
    {authLoading || (!data && loading) ? <LoadingScreen label="Memuat aktivitasmu" /> : data && <>
      {!!data.unavailable.length && <div className={s.notice} role="alert">Data {data.unavailable.join(", ")} belum bisa dimuat. Angkanya belum ditampilkan.<button disabled={loading} onClick={() => void load()}>Coba lagi <RefreshCw size={14} /></button></div>}
      <section className={s.overview} aria-label="Ringkasan aktivitas"><div className={s.focusHero}><span className={s.overline}>Waktu fokus · {count} hari terakhir</span><h2>{focusReady ? shortDuration(totalSeconds) : "—"}</h2><p>{focusReady ? difference !== null ? difference === 0 ? `Sama dengan ${count} hari sebelumnya.` : `${Math.abs(difference)}% ${difference > 0 ? "lebih banyak" : "lebih sedikit"} dari ${count} hari sebelumnya.` : totalSeconds > 0 ? "Ada waktu yang sudah kamu luangkan untuk fokus." : "Sesi fokus pertamamu akan tercatat di sini." : "Riwayat sesi belum bisa dimuat."}</p><Link href="/pomodoro">Mulai sesi fokus <ArrowUpRight size={18} /></Link></div><div className={s.overviewStats}><div><span>Sesi selesai</span><strong>{focusReady ? fullSessions : "—"}</strong><p>Sesi yang durasinya tuntas</p></div><div><span>Hari dengan sesi fokus</span><strong>{focusReady ? focusDays : "—"}<small> / {count}</small></strong><p>Hari dengan waktu fokus tercatat</p></div><div><span>Tugas selesai</span><strong>{tasks ? done : "—"}<small>{tasks ? ` / ${tasks.length}` : ""}</small></strong><p>Seluruh tugas, di luar filter periode</p></div></div></section>
      <div className={s.mainGrid}><section className={s.chartPanel} aria-labelledby="chart-title"><div className={s.sectionHead}><div><h2 id="chart-title">Ritme harian</h2><p>{metric === "focus" ? "Waktu dari sesi fokus yang sudah diakhiri." : "Waktu penggunaan aplikasi, terpisah dari waktu fokus."}</p></div><Dropdown id="analytics-metric" label="Data grafik" compact value={metric} options={[{ value: "focus", label: "Sesi fokus" }, { value: "app", label: "Penggunaan aplikasi" }]} onChange={setMetric} /></div>
        {metric === "focus" && !focusReady ? <p className={s.empty}>Riwayat fokus belum tersedia. Coba muat ulang.</p> : <><div className={s.chartScroll}><div className={s.chart} data-long={count > 7} aria-label={`Grafik ${metric === "focus" ? "waktu fokus" : "penggunaan aplikasi"} ${count} hari`}>{days.map(day => {
          const seconds = metric === "focus" ? day.seconds : day.screen;
          return <button className={s.day} type="button" key={day.key} data-selected={selected.key === day.key} data-today={day.key === todayKey} aria-pressed={selected.key === day.key} aria-label={`${day.date.toLocaleDateString("id-ID", { day: "numeric", month: "long" })}: ${formatFocusDuration(seconds)}`} onClick={() => setSelectedDate(day.key)}><span className={s.barArea}><i className={s.bar} data-empty={seconds === 0} style={{ "--bar-height": `${seconds / maximum * 100}%` } as CSSProperties} /></span><span className={s.dayLabel}>{count === 7 ? day.date.toLocaleDateString("id-ID", { weekday: "short" }) : day.date.getDate()}</span></button>;
        })}</div></div><div className={s.chartFooter}><span>{days[0].date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} — {today.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span><span>Rata-rata {shortDuration(days.reduce((sum, day) => sum + (metric === "focus" ? day.seconds : day.screen), 0) / count)} / hari</span></div></>}
        <div className={s.dayDetail}><div><span>{selected.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</span><strong>{metric === "focus" ? focusReady ? formatFocusDuration(selected.seconds) : "—" : formatScreenTime(selected.screen)}</strong></div><p>{metric === "focus" ? focusReady ? `${selected.full} sesi selesai${selected.entries.some(item => !isFullFocusSession(item.session)) ? " · waktu dari sesi singkat juga tercatat" : ""}` : "Data sesi belum tersedia" : "Tidak dihitung sebagai waktu belajar."}</p></div>
        <p className={s.footnote}>Waktu jeda tidak dihitung. Sesi dikelompokkan menurut tanggal mulai; sesi yang masih berjalan belum masuk ringkasan.</p>
      </section><aside className={s.taskPanel}><div className={s.sectionHead}><div><h2>Keadaan tugasmu</h2><p>Seluruh tugas yang tersimpan.</p></div><Link href="/tasks" aria-label="Buka tugas"><ArrowUpRight size={18} /></Link></div>{tasks ? <><div className={s.taskRate}><strong>{rate}<small>%</small></strong><span>{done} dari {tasks.length} tugas selesai</span></div><div className={s.taskTrack} aria-hidden="true">{tasks.length > 0 && <><i style={{ width: `${done / tasks.length * 100}%` }} /><i style={{ width: `${doing / tasks.length * 100}%` }} /><i style={{ width: `${todo / tasks.length * 100}%` }} /></>}</div><ul className={s.taskLegend}><li><span><i />Selesai</span><strong>{done}</strong></li><li><span><i />Dikerjakan</span><strong>{doing}</strong></li><li><span><i />Belum dimulai</span><strong>{todo}</strong></li></ul><Link href="/tasks" className={s.inlineLink}>{tasks.length ? "Lanjutkan tugasmu" : "Buat tugas pertama"}<ArrowRight size={17} /></Link></> : <p className={s.empty}>Data tugas belum bisa dimuat.</p>}</aside></div>
      <section className={s.lowerGrid}><article className={s.notesPanel}><div className={s.sectionHead}><div><h2>Catatan yang kamu simpan</h2><p>Jumlah saat ini, di luar filter periode.</p></div><BookOpen size={20} /></div><div className={s.noteCount}><strong>{notes ? notes.length : "—"}</strong><span>catatan</span></div><div className={s.noteFacts}><span>{notes ? `${activeNotes} aktif` : "Data belum tersedia"}</span>{notes && <span>{archivedNotes} diarsipkan</span>}</div><Link href="/notes" className={s.inlineLink}>Buka catatan <ArrowRight size={17} /></Link></article>
        <article className={s.profilePanel}><span className={s.overline}>Dari jawaban profil</span><h2>{data.insight?.headline || "Kenali kebiasaan belajarmu"}</h2><p>{data.insight?.recommendation || "Profil membantu mengenali kebiasaan. Hasilnya terpisah dari aktivitas yang tercatat di halaman ini."}</p>{data.insight && <span className={s.profileScore}>Skor kebiasaan {data.insight.academicScore}/100 · bukan nilai ujian</span>}<Link href={data.insight ? "/insight" : "/assessment"} className={s.inlineLink}>{data.insight ? "Lihat pola belajar" : "Isi atau perbarui profil"}<ArrowRight size={17} /></Link></article></section>
      <section className={s.sessions}><div className={s.sectionHead}><div><h2>Sesi terbaru</h2><p>Sesi yang tercatat dalam {count} hari terakhir.</p></div><Link href="/pomodoro">Buka sesi fokus <ArrowUpRight size={17} /></Link></div>{!focusReady ? <p className={s.empty}>Riwayat sesi belum bisa dimuat.</p> : days.flatMap(day => day.entries).length === 0 ? <div className={s.emptySession}><Timer size={23} /><p>Belum ada sesi di periode ini. Mulai dari durasi yang nyaman untukmu.</p><Link href="/pomodoro">Mulai fokus <ArrowRight size={16} /></Link></div> : <ul className={s.sessionList}>{days.flatMap(day => day.entries).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)).slice(0, 5).map(item => <li key={item.session.id}><span className={s.sessionIcon}>{isFullFocusSession(item.session) ? <Check size={17} /> : <Timer size={17} />}</span><div><strong>{item.session.taskTitle || "Fokus mandiri"}</strong><span>{item.date?.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {isFullFocusSession(item.session) ? "Selesai" : item.session.outcome === "reset" ? "Direset" : "Diakhiri lebih awal"}</span></div><span className={s.sessionDuration}>{formatFocusDuration(item.seconds)}</span></li>)}</ul>}</section>
      <details className={s.explanation}><summary>Cara membaca aktivitas ini</summary><p>Waktu fokus berasal dari durasi sesi yang tercatat, termasuk sesi yang diakhiri lebih awal atau direset. Jumlah sesi selesai hanya menghitung sesi yang tuntas. Hari dengan sesi fokus menunjukkan aktivitas dalam periode pilihan, bukan streak.</p><p>Penggunaan aplikasi tidak membuktikan bahwa kamu sedang belajar. Data ini ditampilkan terpisah dan tidak digabungkan menjadi skor produktivitas. Tugas dan catatan menunjukkan keadaan saat ini, bukan jumlah yang selesai atau dibuat dalam periode pilihan.</p></details>
    </>}
  </main></DashboardShell>;
}
