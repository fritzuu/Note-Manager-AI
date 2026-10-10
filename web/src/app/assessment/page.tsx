"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, SlidersHorizontal, UserRound, BookOpen, Moon, Coffee } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAssessment, saveAssessment, markAssessmentComplete, saveAcademicInsight } from "@/lib/firestore";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AiApiKeyModal } from "@/components/modals/AiApiKeyModal";
import { Dropdown } from "@/components/ui/Dropdown";
import { DEFAULT_PROFILE, PROFILE_FIELDS, PROFILE_LABELS, PROFILE_VERSION, PROFILE_RANGES, draftFromSaved, validateProfile, type ProfileField, type ProfileDraft } from "@/lib/learning/profile";
import s from "@/components/assessment/assessment.module.css";

const steps = [
  { title: "Tentang kamu", description: "Informasi dasar dan lingkungan keluarga.", icon: UserRound, fields: ["age", "gender", "parental_education_level"] },
  { title: "Waktu belajar", description: "Seperti apa rutinitasmu di hari biasa?", icon: BookOpen, fields: ["study_hours_per_day", "attendance_percentage", "part_time_job", "extracurricular_participation"] },
  { title: "Istirahat dan kondisi diri", description: "Belajar juga perlu ruang untuk beristirahat.", icon: Moon, fields: ["sleep_hours", "exercise_frequency", "diet_quality", "mental_health_rating"] },
  { title: "Keseharianmu", description: "Waktu hiburan dan fasilitas yang kamu gunakan.", icon: Coffee, fields: ["social_media_hours", "netflix_hours", "internet_quality"] },
] satisfies { title: string; description: string; icon: typeof UserRound; fields: ProfileField[] }[];
type Errors = Partial<Record<ProfileField | "schemaVersion", string>>;

export default function AssessmentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [draft, setDraft] = useState<ProfileDraft>({ ...DEFAULT_PROFILE });
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [connectionOpen, setConnectionOpen] = useState(false);
  const lock = useRef(false);
  const owner = useRef(user?.uid); owner.current = user?.uid;
  const heading = useRef<HTMLHeadingElement>(null);
  const stepChanged = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    const uid = user.uid;
    let cancelled = false;
    setLoading(true); setLoadFailed(false); setError(""); setErrors({}); setSaved(false);
    setDraft({ ...DEFAULT_PROFILE }); setEditing(false); setLegacy(false); setStep(0);
    void getAssessment(uid).then(profile => {
      if (cancelled || owner.current !== uid) return;
      if (profile) { setDraft(draftFromSaved(profile as unknown as Record<string, unknown>)); setEditing(true); setLegacy(profile.schemaVersion !== PROFILE_VERSION); }
      setLoading(false);
    }).catch(() => {
      if (!cancelled && owner.current === uid) { setError("Jawaban profil belum bisa dimuat. Coba muat ulang supaya jawaban lama tidak tertimpa."); setLoadFailed(true); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [user?.uid, authLoading, router, reload]);

  useEffect(() => { if (stepChanged.current) heading.current?.focus(); }, [step]);
  function go(index: number) { stepChanged.current = true; setStep(index); }
  function change(key: ProfileField, value: number | null) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined })); setSaved(false); setError("");
  }
  function next() {
    const validation = validateProfile({ ...draft, schemaVersion: PROFILE_VERSION });
    const stepErrors: Errors = {};
    if (!validation.ok) for (const field of steps[step].fields) if (validation.errors[field]) stepErrors[field] = validation.errors[field];
    setErrors(stepErrors);
    if (!Object.keys(stepErrors).length) go(step + 1);
  }
  async function save() {
    if (!user || lock.current || loadFailed) return;
    const validation = validateProfile({ ...draft, schemaVersion: PROFILE_VERSION });
    if (!validation.ok) {
      setErrors(validation.errors);
      const firstStep = steps.findIndex(item => item.fields.some(field => validation.errors[field]));
      if (firstStep >= 0) go(firstStep);
      setError("Ada jawaban yang belum lengkap. Periksa bagian yang ditandai."); return;
    }
    const uid = user.uid;
    lock.current = true; setSaving(true); setError("");
    let profileStored = false;
    try {
      await saveAssessment(uid, validation.data);
      profileStored = true;
      await markAssessmentComplete(uid);
      if (owner.current !== uid) return;
      setSaved(true); setLegacy(false);
      const response = await fetch("/api/academic-insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Hasil pola belajar belum bisa diperbarui.");
      if (owner.current !== uid) return;
      await saveAcademicInsight(uid, result);
      if (owner.current === uid) router.push("/insight");
    } catch (err) {
      if (owner.current === uid) setError(`${profileStored ? "Jawabanmu sudah tersimpan, tetapi hasil belum diperbarui. " : ""}${err instanceof Error ? err.message : "Coba lagi sebentar."}`);
    } finally { lock.current = false; if (owner.current === uid) setSaving(false); }
  }
  const disabled = loading || saving || loadFailed;
  const completeCount = PROFILE_FIELDS.filter(field => draft[field] !== null).length;
  const field = (key: ProfileField, hint: string, children: ReactNode) => <div className={s.field} data-invalid={!!errors[key]}><div className={s.fieldCopy}><label htmlFor={`profile-${key}`}>{PROFILE_LABELS[key]}</label><p id={`hint-${key}`}>{hint}</p></div><div className={s.control}>{children}{errors[key] && <p className={s.fieldError} id={`error-${key}`}>{errors[key]}</p>}</div></div>;
  const numeric = (key: ProfileField, hint: string, unit: string, increment = 1, range = true) => {
    const [min, max] = PROFILE_RANGES[key];
    return field(key, hint, <div className={s.numeric}><div className={s.number}><input id={`profile-${key}`} type="number" inputMode={increment < 1 ? "decimal" : "numeric"} value={draft[key] ?? ""} min={min} max={max} step={increment} aria-invalid={!!errors[key]} aria-describedby={`hint-${key}${errors[key] ? ` error-${key}` : ""}`} onChange={event => change(key, event.target.value === "" ? null : Number(event.target.value))} /><span>{unit}</span></div>{range && <input className={s.range} type="range" aria-label={PROFILE_LABELS[key]} value={draft[key] ?? min} min={min} max={max} step={increment} onChange={event => change(key, Number(event.target.value))} style={{ "--range-fill": `${Math.max(0, Math.min(100, ((draft[key] ?? min) - min) / (max - min) * 100))}%` } as import("react").CSSProperties} />}</div>);
  };
  const choose = (key: ProfileField, hint: string, options: { value: number; label: string }[]) => field(key, hint, <Dropdown id={`profile-${key}`} label={PROFILE_LABELS[key]} value={draft[key] === null ? "" : String(draft[key])} options={[{ value: "", label: "Pilih yang sesuai" }, ...options.map(item => ({ value: String(item.value), label: item.label }))]} onChange={value => change(key, value === "" ? null : Number(value))} disabled={disabled} />);
  const yesNo = (key: ProfileField, hint: string) => field(key, hint, <div className={s.choices} role="group" aria-label={PROFILE_LABELS[key]}>{[{ value: 0, label: "Tidak" }, { value: 1, label: "Ya" }].map(item => <button id={item.value === 0 ? `profile-${key}` : undefined} type="button" key={item.value} aria-pressed={draft[key] === item.value} data-selected={draft[key] === item.value} onClick={() => change(key, item.value)}><span>{item.label}</span>{draft[key] === item.value && <Check size={16} />}</button>)}</div>);

  return <DashboardShell><main className={s.page}>
    <header className={s.header}><div><Link href="/insight" className={s.back}><ArrowLeft size={16} />Pola belajar</Link><h1>{editing ? "Ubah profil belajar" : "Profil belajarmu"}</h1><p>Jawab sesuai keseharianmu. Tidak perlu terlihat sempurna.</p></div><span className={s.headerNote}>Bisa diperbarui kapan saja</span></header>
    {error && <div className={s.error} role="alert">{error}{loadFailed && <button onClick={() => setReload(value => value + 1)}>Muat ulang</button>}{saved && <Link href="/insight">Buka pola belajar <ArrowRight size={15} /></Link>}</div>}
    {legacy && <p className={s.notice}>Jawaban lamamu tetap terisi. Pilihan pola makan, internet, dan pendidikan sekarang lebih jelas; pilih kembali yang sesuai sebelum menyimpan.</p>}
    {authLoading || loading ? <div data-delayed-loading className={s.loading} role="status"><Loader2 className={s.spin} size={24} />Memuat jawabanmu…</div> : !loadFailed && <div className={s.layout}>
      <aside className={s.side}><nav aria-label="Bagian profil">{steps.map((item, index) => <button key={item.title} type="button" disabled={saving} onClick={() => go(index)} className={s.step} data-current={step === index} aria-current={step === index ? "step" : undefined}><span className={s.stepIcon}><item.icon size={19} /></span><span><strong>{item.title}</strong><small>{String(index + 1).padStart(2, "0")} / 04</small></span>{step === index && <ArrowRight size={16} />}</button>)}</nav><div className={s.sideNote}><span className={s.noteLine} /><h2>Mulai dari mengenali ritmemu.</h2><p>Jawaban ini membantu menyusun gambaran belajar. Hasilnya bukan nilai ujian atau penilaian tentang dirimu.</p><div className={s.completion}><span>{completeCount} dari {PROFILE_FIELDS.length} jawaban terisi</span><div><i style={{ width: `${completeCount / PROFILE_FIELDS.length * 100}%` }} /></div></div></div></aside>
      <form className={s.form} onSubmit={event => { event.preventDefault(); if (step < steps.length - 1) next(); else void save(); }}>
        <div className={s.formHeader}><span>Bagian {step + 1} dari 4</span><h2 ref={heading} tabIndex={-1}>{steps[step].title}</h2><p>{steps[step].description}</p></div>
        <fieldset className={s.fields} disabled={disabled} key={step}><legend className={s.srOnly}>{steps[step].title}</legend>
          {step === 0 && <>
            {numeric("age", "Usiamu saat ini.", "tahun", 1, false)}
            {choose("gender", "Pilih yang sesuai. Pilihan lainnya tetap bisa disimpan.", [{ value: 1, label: "Laki-laki" }, { value: 0, label: "Perempuan" }, { value: 2, label: "Lainnya / tidak ingin menyebutkan" }])}
            {choose("parental_education_level", "Pendidikan terakhir salah satu orang tua.", [{ value: 4, label: "Di bawah SMA / tidak sekolah formal" }, { value: 0, label: "SMA / SMK atau sederajat" }, { value: 5, label: "Diploma (D1–D4)" }, { value: 1, label: "Sarjana (S1)" }, { value: 2, label: "Magister (S2)" }, { value: 3, label: "Doktor (S3)" }])}
          </>}
          {step === 1 && <>
            {numeric("study_hours_per_day", "Rata-rata belajar mandiri di luar kelas.", "jam / hari", .5)}
            {numeric("attendance_percentage", "Perkiraan kehadiranmu dalam perkuliahan.", "%", 1)}
            {yesNo("part_time_job", "Sedang bekerja, magang, atau mengambil pekerjaan lepas?")}
            {yesNo("extracurricular_participation", "Aktif dalam organisasi, kepanitiaan, atau kegiatan kampus?")}
          </>}
          {step === 2 && <>
            {numeric("sleep_hours", "Rata-rata waktu tidurmu dalam semalam.", "jam / malam", .5)}
            {numeric("exercise_frequency", "Berapa hari kamu berolahraga dalam seminggu?", "hari / minggu")}
            {choose("diet_quality", "Gambaran pola makanmu selama ini.", [{ value: 0, label: "Kurang terjaga" }, { value: 1, label: "Kadang terjaga" }, { value: 2, label: "Cukup terjaga" }, { value: 3, label: "Sangat terjaga" }])}
            {numeric("mental_health_rating", "1 = sedang terasa berat, 10 = sedang terasa baik. Ini bukan pemeriksaan kesehatan.", "/ 10")}
          </>}
          {step === 3 && <>
            {numeric("social_media_hours", "Perkiraan waktu menggunakan media sosial.", "jam / hari", .5)}
            {numeric("netflix_hours", "Waktu untuk menonton atau hiburan lainnya.", "jam / hari", .5)}
            {choose("internet_quality", "Seberapa lancar koneksi yang biasa kamu pakai belajar?", [{ value: 0, label: "Sering terputus / sulit digunakan" }, { value: 1, label: "Cukup lancar" }, { value: 2, label: "Lancar dan stabil" }])}
            <div className={s.connection}><div><SlidersHorizontal size={19} /><div><h3>Koneksi asisten</h3><p>Opsional, untuk percakapan dan rangkuman. Profil tetap bisa disimpan tanpa key pribadi.</p></div></div><button type="button" className={s.textButton} onClick={() => setConnectionOpen(true)}>Atur koneksi <ArrowRight size={16} /></button></div>
          </>}
        </fieldset>
        <footer className={s.footer}><button type="button" disabled={step === 0 || saving} className={s.previous} onClick={() => go(step - 1)}><ArrowLeft size={16} />Kembali</button><button type="submit" disabled={disabled} className={s.submit}>{saving ? <Loader2 size={17} className={s.spin} /> : step === 3 ? <Check size={17} /> : null}{saving ? "Menyimpan dan memperbarui…" : step === 3 ? "Simpan profil" : "Lanjut"}{step < 3 && <ArrowRight size={16} />}</button></footer>
      </form>
    </div>}
    <AiApiKeyModal isOpen={connectionOpen} onClose={() => setConnectionOpen(false)} />
  </main></DashboardShell>;
}
