"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ArrowRight, RefreshCw, Edit3, Check, Copy, RotateCcw, Send, BookOpen, Moon, Activity, Smile, Smartphone, GraduationCap, Loader2, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAssessment, getAcademicInsight, saveAcademicInsight, type AcademicAssessmentData, type AcademicInsight } from "@/lib/firestore";
import { deriveAcademicRiskFromInsight } from "@/lib/fuzzyLogic";
import { getAiProvider, getCustomApiKey, getOpenRouterModel } from "@/lib/aiConfig";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { WarningModal } from "@/components/ui/WarningModal";
import { insightCopy } from "@/components/insight/presentation";
import styles from "@/components/insight/insight.module.css";

type Message = { id: string; role: "user" | "assistant"; content: string };
const welcome: Message = { id: "welcome", role: "assistant", content: "Mau mulai dari mana? Kita bisa menyusun jadwal, membahas kebiasaan yang sulit dijaga, atau menyiapkan sesi fokus dari jawaban profil belajarmu." };
const prompts = [
  { label: "Langkah pertama", prompt: "Dari profil belajar saya, bantu pilih satu perubahan kecil yang realistis untuk dicoba minggu ini. Jelaskan alasannya tanpa menjanjikan kenaikan nilai." },
  { label: "Jadwal mingguan", prompt: "Bantu susun jadwal belajar mingguan berdasarkan jawaban profil saya. Sertakan waktu istirahat dan tanyakan jadwal kuliah jika belum diketahui." },
  { label: "Atasi hambatan", prompt: "Bantu saya mengatasi kebiasaan yang perlu diperhatikan pada profil ini. Berikan langkah sederhana yang bisa saya coba." },
  { label: "Durasi fokus", prompt: "Bantu memilih durasi fokus dan istirahat sebagai titik awal sesuai profil saya. Jelaskan cara menyesuaikannya setelah dicoba." },
];

export default function AcademicInsightPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [insight, setInsight] = useState<AcademicInsight | null>(null);
  const [assessment, setAssessment] = useState<AcademicAssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const owner = useRef(user?.uid);
  owner.current = user?.uid;
  const generationOwner = useRef<string | null>(null);
  const chatBusy = useRef(false);
  const chatBox = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generate = useCallback(async (uid: string) => {
    if (generationOwner.current === uid) return;
    generationOwner.current = uid;
    setGenerating(true); setError("");
    try {
      const profile = await getAssessment(uid);
      if (owner.current !== uid) return;
      if (!profile) throw new Error("Isi profil belajarmu dulu supaya ada bahan untuk dibahas.");
      setAssessment(profile);
      const fields = { ...profile } as Partial<AcademicAssessmentData>;
      delete fields.userId; delete fields.createdAt;
      const response = await fetch("/api/academic-insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Hasil belum bisa diperbarui. Coba lagi sebentar.");
      if (!Number.isFinite(result.academicScore) || typeof result.prediction !== "string" || typeof result.recommendation !== "string" || !Array.isArray(result.strengths) || !Array.isArray(result.weaknesses) || ![...result.strengths, ...result.weaknesses].every(item => typeof item === "string")) throw new Error("Hasil belum lengkap. Coba perbarui lagi.");
      if (owner.current !== uid) return;
      await saveAcademicInsight(uid, result);
      if (owner.current === uid) { setInsight({ ...result, userId: uid }); setMessages([welcome]); }
    } catch (err) {
      if (owner.current === uid) setError(err instanceof Error ? err.message : "Hasil belum bisa dimuat.");
    } finally {
      if (generationOwner.current === uid) generationOwner.current = null;
      if (owner.current === uid) { setGenerating(false); setLoading(false); }
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    let cancelled = false;
    const uid = user.uid;
    setLoading(true); setInsight(null); setAssessment(null); setError(""); setMessages([welcome]); setQuestion(""); setAsking(false); chatBusy.current = false;
    void (async () => {
      try {
        const [saved, profile] = await Promise.all([getAcademicInsight(uid), getAssessment(uid)]);
        if (cancelled || owner.current !== uid) return;
        setAssessment(saved?.profileSnapshot ? { ...saved.profileSnapshot, userId: uid } : profile);
        if (saved) { setInsight(saved); setLoading(false); }
        else await generate(uid);
      } catch {
        if (!cancelled && owner.current === uid) { setError("Profil belajar belum bisa dimuat. Coba lagi sebentar."); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, authLoading, router, generate]);

  useEffect(() => { return () => { if (copyTimer.current) clearTimeout(copyTimer.current); }; }, []);
  useEffect(() => {
    const box = chatBox.current;
    box?.scrollTo({ top: box.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, asking]);

  async function ask(text = question) {
    const uid = user?.uid;
    if (!uid || !insight || !text.trim() || chatBusy.current || generating) return;
    chatBusy.current = true; setAsking(true); setQuestion("");
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: text.trim() }]);
    try {
      const provider = getAiProvider();
      const key = getCustomApiKey(provider);
      const headers: Record<string, string> = { "Content-Type": "application/json", "x-ai-provider": provider };
      if (key) headers["x-custom-api-key"] = key;
      if (provider === "openrouter") headers["x-ai-model"] = getOpenRouterModel();
      const response = await fetch("/api/academic-insight/chat", { method: "POST", headers, body: JSON.stringify({ question: text.trim(), insight, assessment, history: messages.filter(m => m.id !== "welcome").map(m => ({ role: m.role, content: m.content })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Jawaban belum bisa dimuat.");
      if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("Jawaban belum tersedia. Coba lagi.");
      if (owner.current === uid) setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: data.answer }]);
    } catch (err) {
      if (owner.current === uid) setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: err instanceof Error ? err.message : "Belum bisa mengirim pertanyaan. Coba lagi sebentar." }]);
    } finally { if (owner.current === uid) { chatBusy.current = false; setAsking(false); } }
  }

  async function copy(message: Message) {
    try {
      await navigator.clipboard.writeText(message.content); setCopied(message.id);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 2000);
    } catch { setError("Jawaban belum bisa disalin. Izinkan akses papan salin lalu coba lagi."); }
  }

  const score = insight && Number.isFinite(insight.academicScore) ? Math.max(0, Math.min(100, insight.academicScore)) : null;
  const risk = insight ? deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction) : 0;
  const riskLabel = risk < 25 ? "Rendah" : risk < 55 ? "Sedang" : "Tinggi";
  const source = insight?.source;
  const confidence = insight && typeof insight.confidence === "number" && Number.isFinite(insight.confidence) ? Math.max(0, Math.min(100, insight.confidence)) : null;
  const profileFacts = assessment ? [
    { icon: BookOpen, label: "Belajar", value: `${assessment.study_hours_per_day} jam`, unit: "per hari" },
    { icon: Moon, label: "Tidur", value: `${assessment.sleep_hours} jam`, unit: "per malam" },
    { icon: GraduationCap, label: "Kehadiran", value: `${assessment.attendance_percentage}%`, unit: "dari jawabanmu" },
    { icon: Smile, label: "Kondisi diri", value: `${assessment.mental_health_rating}/10`, unit: "dari jawabanmu" },
    { icon: Smartphone, label: "Hiburan", value: `${assessment.social_media_hours + assessment.netflix_hours} jam`, unit: "per hari" },
    { icon: Activity, label: "Olahraga", value: `${assessment.exercise_frequency} kali`, unit: "per minggu" },
  ] : [];

  return <DashboardShell><main className={styles.page}>
    <header className={styles.header}>
      <div><h1>Pola belajar</h1><p>Kenali kebiasaanmu, lalu pilih langkah berikutnya.</p></div>
      <div className={styles.actions}><Link href="/assessment" className={styles.button}><Edit3 size={16} /> Ubah profil</Link><button className={`${styles.button} ${styles.primary}`} disabled={loading || generating || asking} onClick={() => user && void generate(user.uid)}><RefreshCw size={16} className={generating ? styles.spin : ""} />{generating ? "Memperbarui…" : "Perbarui hasil"}</button></div>
    </header>
    {error && <div className={styles.error} role="alert">{error}{!insight && <Link href="/assessment">Isi profil belajar <ArrowRight size={16} /></Link>}</div>}
    {(authLoading || loading) && <div data-delayed-loading className={styles.loading} role="status"><div className={styles.loadingOrbit}><Loader2 size={28} className={styles.spin} /></div><h2>{generating ? "Membaca profil belajarmu…" : "Memuat pola belajar…"}</h2><p>Hasil disusun dari jawaban yang kamu simpan.</p></div>}
    {!loading && insight && <>
      <section className={styles.overview} aria-labelledby="overview-title">
        <div className={styles.overviewCopy}><span className={styles.eyebrow}>Dari profil belajarmu</span><h2 id="overview-title">{insight.headline || insightCopy(insight.prediction)}</h2><p>{insightCopy(insight.recommendation)}</p><div className={styles.heroLinks}><Link href="/pomodoro">Mulai sesi fokus <ArrowUpRight size={18} /></Link><Link href="/tasks">Atur tugas <ArrowUpRight size={18} /></Link></div></div>
        <div className={styles.score}><span>Skor gambaran belajar</span><div><strong>{score ?? "—"}</strong><span>/100</span></div><div className={styles.scoreTrack}><i style={{ width: `${score ?? 0}%` }} /></div><p>Ringkasan perhitungan dari profil, bukan nilai ujian.</p></div>
      </section>
      <details className={styles.details}><summary>Tentang hasil ini <span>{source === "heuristic_fallback" ? "Perhitungan sederhana" : source === "machine_learning" ? "Hasil model" : "Hasil tersimpan"}</span></summary><div className={styles.detailBody}><p>{source === "heuristic_fallback" ? "Ringkasan ini memakai aturan kebiasaan yang sama dengan hasil model. Kategori dihitung dari skor ringkasan; keyakinan model tidak tersedia." : source === "machine_learning" ? "Model memperkirakan kelompok hasil belajar. Skor ringkasan dan catatan kebiasaan dihitung terpisah dengan aturan yang sama pada setiap hasil. Skor bukan nilai ujian, dan catatan bukan penjelasan penyebab prediksi model." : "Sumber perhitungan belum tercatat pada hasil lama ini. Perbarui hasil untuk melihat sumbernya."}</p><dl><div><dt>Kelompok hasil</dt><dd>{insightCopy(insight.prediction)}</dd></div><div><dt>Keyakinan model</dt><dd>{source === "machine_learning" && confidence !== null ? `${Math.round(confidence)}% — bukan tingkat akurasi` : "Tidak tersedia untuk hasil ini"}</dd></div><div><dt>Indeks risiko</dt><dd>{risk}/100 · {riskLabel.toLowerCase()}</dd></div></dl><p>Pertimbangan risiko diturunkan dari skor kebiasaan dengan pengaruh terbatas, bukan pengukuran risiko terpisah. Hasil mengikuti profil yang terakhir dianalisis; perbarui setelah mengubah jawaban.</p></div></details>
      <section className={styles.habits} aria-label="Catatan kebiasaan belajar">
        <article className={`${styles.habit} ${styles.strength}`}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>Teruskan</span><h2>Yang sudah mendukungmu</h2></div><span className={styles.count}>{insight.strengths?.length ?? 0}</span></div><ul>{(insight.strengths || []).map((item, index) => <li key={`${index}-${item}`}><Check size={17} /><p>{insightCopy(item)}</p></li>)}</ul></article>
        <article className={`${styles.habit} ${styles.growth}`}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>Pelan-pelan perbaiki</span><h2>Yang perlu diperhatikan</h2></div><span className={styles.count}>{insight.weaknesses?.length ?? 0}</span></div><ul>{(insight.weaknesses || []).map((item, index) => <li key={`${index}-${item}`}><span className={styles.dot} /><div><p>{insightCopy(item)}</p><button disabled={asking || generating} onClick={() => void ask(`Bantu saya memahami dan memperbaiki kebiasaan ini: ${insightCopy(item)}. Berikan langkah kecil yang realistis.`)}>Bahas langkahnya <ArrowRight size={15} /></button></div></li>)}</ul></article>
      </section>
      {assessment && <section className={styles.profile}><div className={styles.sectionHead}><div><h2>Jawaban profilmu</h2><p>Data yang kamu isi, terpisah dari catatan aktivitas harian.</p></div><Link href="/assessment">Ubah <ArrowUpRight size={17} /></Link></div><div className={styles.facts}>{profileFacts.map(fact => <div key={fact.label}><span><fact.icon size={17} />{fact.label}</span><strong>{fact.value}</strong><small>{fact.unit}</small></div>)}</div></section>}
      <section className={styles.advisor} id="ai-advisor" aria-labelledby="advisor-title"><div className={styles.sectionHead}><div className={styles.advisorTitle}><MessageCircle size={24} /><div><h2 id="advisor-title">Bicarakan langkahmu</h2><p>Susun rencana yang cocok dengan keseharianmu, bersama asisten.</p></div></div>{messages.length > 1 && <button className={styles.iconButton} title="Hapus percakapan" aria-label="Hapus percakapan" disabled={asking} onClick={() => setClearOpen(true)}><RotateCcw size={18} /></button>}</div>
        <div className={styles.prompts}>{prompts.map(prompt => <button key={prompt.label} disabled={asking || generating} onClick={() => void ask(prompt.prompt)}>{prompt.label}<ArrowUpRight size={15} /></button>)}<button disabled={asking || generating} onClick={() => void ask("Bantu susun rencana belajar tujuh hari berdasarkan profil saya. Mulai dari perubahan kecil dan tanyakan jadwal kuliah jika belum diketahui.")}>Rencana 7 hari<ArrowUpRight size={15} /></button></div>
        <div className={styles.chat} ref={chatBox} role="log" aria-label="Percakapan belajar" aria-live="polite" aria-busy={asking}>{messages.map(message => <article key={message.id} className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}><span className={styles.messageLabel}>{message.role === "user" ? "Kamu" : "Asisten"}</span><MarkdownRenderer content={message.content} isUser={message.role === "user"} />{message.role === "assistant" && <button className={styles.copy} onClick={() => void copy(message)}>{copied === message.id ? <Check size={14} /> : <Copy size={14} />}{copied === message.id ? "Tersalin" : "Salin jawaban"}</button>}</article>)}{asking && <p className={styles.typing} role="status"><Loader2 size={16} className={styles.spin} />Menyiapkan jawaban…</p>}</div>
        <form className={styles.composer} onSubmit={event => { event.preventDefault(); void ask(); }}><label className={styles.srOnly} htmlFor="learning-question">Pertanyaan tentang belajar</label><input id="learning-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Apa yang ingin kamu bahas?" disabled={asking || generating} /><button type="submit" className={`${styles.button} ${styles.primary}`} disabled={asking || generating || !question.trim()}><Send size={17} /><span>Kirim</span></button></form>
      </section>
    </>}
    <WarningModal isOpen={clearOpen} onClose={() => setClearOpen(false)} onConfirm={() => { setMessages([welcome]); setClearOpen(false); }} title="Hapus percakapan?" description="Pesan di halaman ini akan dihapus. Hasil pola belajarmu tetap tersimpan." confirmText="Hapus percakapan" cancelText="Batal" />
  </main></DashboardShell>;
}
