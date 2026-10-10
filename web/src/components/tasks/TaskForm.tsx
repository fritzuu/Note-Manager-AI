"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Timer, ChevronDown } from "lucide-react";
import type { FuzzyDetailedResult } from "@/lib/fuzzyLogic";
import type { PomodoroFuzzyResult } from "@/lib/pomodoroFuzzy";
import { describeConditions, priorityLabels, priorityReason, riskLabels, statusLabels } from "./taskPresentation";
import s from "./tasks.module.css";

export interface TaskFormValue {
  title: string; workspace: string; description: string; deadline: string;
  importance: number; difficulty: number; progress: number; status?: "todo" | "doing" | "done";
}
interface Props {
  value: TaskFormValue; onChange: (patch: Partial<TaskFormValue>) => void;
  onSubmit: (event: FormEvent) => void; saving: boolean; error: string;
  workspaces: string[]; loadingWorkspaces?: boolean; result: FuzzyDetailedResult;
  pomodoro: PomodoroFuzzyResult; deadlineDays: number; academicRisk: number;
  prediction: string; academicScore?: number | null; taskId?: string;
}
const importanceChoices = [{ value: 2, label: "Bisa menunggu" }, { value: 5, label: "Biasa" }, { value: 8, label: "Penting" }, { value: 10, label: "Wajib selesai" }];
const difficultyChoices = [{ value: 2, label: "Mudah" }, { value: 5, label: "Sedang" }, { value: 8, label: "Sulit" }];

export function TaskForm({ value, onChange, onSubmit, saving, error, workspaces, loadingWorkspaces, result, pomodoro, deadlineDays, academicRisk, prediction, academicScore, taskId }: Props) {
  const id = useId();
  const [showProgress, setShowProgress] = useState(!!taskId);
  const ready = !!value.title.trim() && !!value.deadline;
  const profileLabel = ({ "Moderate Performance": "Hasil belajar sedang", "High Academic Performance": "Hasil belajar baik", "Needs Academic Support": "Perlu dukungan belajar" } as Record<string, string>)[prediction] || (prediction === "—" ? "Belum tersedia" : prediction);
  const sessions = pomodoro.label === "Micro" ? 1 : Math.max(1, Math.round(result.estimatedTotalMinutes / pomodoro.recommendedMinutes));
  const numeric = (field: "importance" | "difficulty" | "progress", raw: string) => onChange({ [field]: Math.max(field === "progress" ? 0 : 1, Math.min(field === "progress" ? 100 : 10, Number(raw) || 0)) });
  return <div className={s.formPage}>
    <Link href="/tasks" className={s.back}><ArrowLeft size={17} />Tugas</Link>
    <header className={s.formHeader}><h1>{taskId ? "Edit tugas" : "Tambah tugas"}</h1>{taskId && <Link className={s.textLink} href={`/pomodoro?taskId=${taskId}`}>Mulai fokus<ArrowUpRight size={16} /></Link>}</header>
    <div className={s.formLayout}>
      <form onSubmit={onSubmit} className={s.form}>
        {error && <p role="alert" className={s.error}>{error}</p>}
        <div className={s.field}><label htmlFor={`${id}-title`}>Nama tugas</label><input id={`${id}-title`} required autoFocus={!taskId} className={s.titleInput} value={value.title} onChange={event => onChange({ title: event.target.value })} placeholder="Apa yang perlu dikerjakan?" /></div>
        {value.status && <fieldset className={s.fieldset}><legend>Status</legend><div className={s.choices}>{(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map(status => <button key={status} type="button" aria-pressed={value.status === status} onClick={() => onChange({ status })}>{statusLabels[status]}</button>)}</div></fieldset>}
        <div className={s.field}><label htmlFor={`${id}-workspace`}>Workspace <span>Opsional</span></label>
          <input id={`${id}-workspace`} list={`${id}-workspaces`} value={value.workspace} onChange={event => onChange({ workspace: event.target.value })} placeholder="Pilih atau ketik nama workspace" />
          <datalist id={`${id}-workspaces`}>{workspaces.map(name => <option key={name} value={name} />)}</datalist>
          {loadingWorkspaces ? <p className={s.hint}>Memuat workspace…</p> : <div className={s.workspaceChoices}>{workspaces.map(name => <button type="button" key={name} aria-pressed={value.workspace.toLowerCase() === name.toLowerCase()} onClick={() => onChange({ workspace: value.workspace.toLowerCase() === name.toLowerCase() ? "" : name })}>{name}</button>)}</div>}
        </div>
        <div className={s.field}><label htmlFor={`${id}-description`}>Catatan tambahan <span>Opsional</span></label><textarea id={`${id}-description`} rows={4} value={value.description} onChange={event => onChange({ description: event.target.value })} placeholder="Instruksi, referensi, atau hal yang perlu diingat" /></div>
        <div className={s.field}><label htmlFor={`${id}-deadline`}>Tenggat</label><input id={`${id}-deadline`} type="date" required value={value.deadline} onChange={event => onChange({ deadline: event.target.value })} />{value.deadline && <p className={s.hint}>{deadlineDays < 0 ? `Lewat ${Math.abs(Math.round(deadlineDays))} hari` : deadlineDays < 1 ? "Tenggat hari ini" : `${Math.round(deadlineDays)} hari lagi`}</p>}</div>
        <div className={s.ratings}>{([{ field: "importance" as const, label: "Seberapa penting?", choices: importanceChoices }, { field: "difficulty" as const, label: "Kesulitan", choices: difficultyChoices }]).map(({ field, label, choices }) => <fieldset key={field} className={s.fieldset}><legend>{label}</legend><div className={s.choices}>{choices.map(choice => <button key={choice.value} type="button" aria-pressed={value[field] === choice.value} onClick={() => onChange({ [field]: choice.value })}>{choice.label}</button>)}</div><div className={s.rangeRow}><input aria-label={label} type="range" min={1} max={10} value={value[field]} onChange={event => numeric(field, event.target.value)} /><input aria-label={`${label}, nilai dari 1 sampai 10`} type="number" min={1} max={10} value={value[field]} onChange={event => numeric(field, event.target.value)} /><span>/ 10</span></div></fieldset>)}</div>
        <div className={s.progressField}><button type="button" className={s.disclosure} aria-expanded={showProgress} aria-controls={`${id}-progress`} onClick={() => setShowProgress(open => !open)}>Progres pengerjaan <span>{value.progress}%</span><ChevronDown size={16} data-open={showProgress} /></button>{showProgress && <div id={`${id}-progress`} className={s.rangeRow}><input aria-label="Progres pengerjaan" type="range" min={0} max={100} step={5} value={value.progress} onChange={event => numeric("progress", event.target.value)} /><input aria-label="Progres dalam persen" type="number" min={0} max={100} value={value.progress} onChange={event => numeric("progress", event.target.value)} /><span>%</span></div>}</div>
        <footer className={s.formActions}><Link href="/tasks" className={s.secondary}>Batal</Link><button type="submit" className={s.primary} disabled={saving}>{saving ? "Menyimpan…" : taskId ? "Simpan perubahan" : "Simpan tugas"}</button></footer>
      </form>
      <aside className={s.priorityAside} aria-label="Prioritas otomatis">
        <h2>Prioritas otomatis</h2>
        {!ready ? <p className={s.hint}>Lengkapi nama dan tenggat untuk melihat prioritasnya.</p> : <>
          <span className={s.priorityBadge} data-priority={result.priorityLevel}>{value.status === "done" ? "Selesai" : priorityLabels[result.priorityLevel]}</span>
          <p className={s.reason}>{value.status === "done" ? "Tugas ini sudah ditandai selesai." : priorityReason(result, deadlineDays, value.progress)}</p>
          {result.estimatedTotalMinutes > 0 && <div className={s.focusSuggestion}><Timer size={20} aria-hidden="true" /><div><h3>{pomodoro.recommendedMinutes} menit per sesi</h3><p>{pomodoro.breakMinutes} menit istirahat · {sessions} sesi</p></div></div>}
          <div className={s.estimate}><span>Perkiraan sisa waktu</span><strong>{result.estimatedTotalMinutes} menit</strong></div>
          <details className={s.resultDetails}><summary>Lihat pertimbangan<ChevronDown size={16} /></summary><dl><div><dt>Nilai prioritas</dt><dd>{result.priorityScore} / 100</dd></div><div><dt>Perlu perhatian</dt><dd>{riskLabels[result.riskLevel]}</dd></div><div><dt>Penilaian belajar</dt><dd>{profileLabel}</dd></div>{academicScore != null && <div><dt>Nilai penilaian</dt><dd>{academicScore} / 100</dd></div>}<div><dt>Risiko dari profil belajar</dt><dd>{academicRisk} / 100</dd></div></dl><h3>Dasar pertimbangan</h3><p className={s.hint}>{result.activatedRules.length} pertimbangan sesuai dengan informasi tugas.</p>{result.activatedRules.slice(0, 4).map(rule => <div className={s.rule} key={rule.id}><p>{describeConditions(rule.conditions)}.</p><span>{priorityLabels[rule.outputLevel]} · kecocokan {Math.round(rule.strength * 100)}%</span></div>)}</details>
        </>}
      </aside>
    </div>
  </div>;
}
