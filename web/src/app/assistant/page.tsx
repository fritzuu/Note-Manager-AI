"use client";

import { useEffect, useMemo, useCallback, Suspense, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Send, BookOpen, Trash2, Plus, Copy, Check, ArrowUpRight, SlidersHorizontal, Loader2, PanelLeftClose, PanelLeftOpen, Search, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserNotes, getUserChatHistory, saveChatHistory, deleteChatHistory, clearAllUserChatHistory, type NoteDocument, type ChatHistory } from "@/lib/firestore";
import { getCustomApiKey, getAiProvider, getOpenRouterModel } from "@/lib/aiConfig";
import { Dropdown } from "@/components/ui/Dropdown";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AiApiKeyModal } from "@/components/modals/AiApiKeyModal";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { WarningModal } from "@/components/ui/WarningModal";
import s from "@/components/assistant/assistant.module.css";

type Message = { id: string; role: "user" | "assistant"; text: string; contextId: string; noteTitle: string };
const starters = [
  { label: "Ringkas materi", hint: "Ambil bagian yang penting", prompt: "Ringkas poin penting dari catatan yang dipilih. Pisahkan topik utama dan penjelasan singkatnya." },
  { label: "Latihan soal", hint: "Coba pemahamanmu", prompt: "Buat tiga soal pilihan ganda dari catatan yang dipilih. Letakkan kunci jawaban dan penjelasan setelah semua soal agar saya bisa mencoba dulu." },
  { label: "Jelaskan sederhana", hint: "Bahas bagian yang rumit", prompt: "Pilih konsep yang rumit dari catatan ini, lalu jelaskan dengan bahasa sederhana dan contoh sehari-hari. Sebutkan konsep yang kamu pilih." },
  { label: "Hubungkan topik", hint: "Lihat kaitan antaride", prompt: "Jelaskan hubungan antartopik di catatan yang dipilih. Bedakan isi catatan dari contoh tambahanmu." },
];
function plainText(content: string) {
  return content.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/(?:p|h[1-6]|li|pre|blockquote|div)>/gi, "\n").replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '\"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function AssistantContent() {
  const { user, loading: authLoading } = useAuth();
  const params = useSearchParams(), router = useRouter();
  const noteParam = params.get("noteId"), questionParam = params.get("question");
  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [notesReady, setNotesReady] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contextId, setContextId] = useState("all");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [statusLabel, setStatusLabel] = useState("Menyiapkan jawaban…");
  const [recent, setRecent] = useState<ChatHistory[]>([]);
  const [activeHistory, setActiveHistory] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const owner = useRef(user?.uid); owner.current = user?.uid;
  const loadId = useRef(0);
  const sendLock = useRef(false), deleteLock = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null), chatBox = useRef<HTMLDivElement>(null);
  const followBottom = useRef(true);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => { setHistoryOpen(window.matchMedia("(min-width: 1050px)").matches); return () => { controller.current?.abort(); if (copyTimer.current) clearTimeout(copyTimer.current); }; }, []);
  const load = useCallback(async (uid: string) => {
    const id = ++loadId.current;
    setLoading(true); setNotice("");
    const [noteResult, chatResult] = await Promise.allSettled([getUserNotes(uid), getUserChatHistory(uid, 25)]);
    if (owner.current !== uid || loadId.current !== id) return;
    const available = noteResult.status === "fulfilled" ? noteResult.value.filter(note => !note.isTrashed).map(note => ({ ...note, title: note.title?.trim() || "Tanpa judul", content: note.content || "", tags: Array.isArray(note.tags) ? note.tags : [] })) : [];
    setNotes(available); setNotesReady(noteResult.status === "fulfilled");
    setRecent(chatResult.status === "fulfilled" ? chatResult.value : []); setHistoryReady(chatResult.status === "fulfilled");
    if (noteResult.status === "rejected" || chatResult.status === "rejected") setNotice(`Belum bisa memuat ${[noteResult.status === "rejected" ? "catatan" : "", chatResult.status === "rejected" ? "riwayat" : ""].filter(Boolean).join(" dan ")}. Coba muat ulang.`);
    setLoading(false);
  }, []);
  useEffect(() => {
    if (authLoading) return;
    controller.current?.abort(); sendLock.current = false;
    setMessages([]); setQuestion(questionParam || ""); setContextId(noteParam || "all"); setActiveHistory(null); setError(""); setFailedQuestion(null); setSending(false); setHistorySearch("");
    if (!user) { router.replace("/login"); return; }
    void load(user.uid);
    return () => { loadId.current++; controller.current?.abort(); };
  }, [user?.uid, authLoading, router, noteParam, questionParam, load]);
  useEffect(() => {
    if (followBottom.current) {
      const box = chatBox.current;
      box?.scrollTo({ top: box.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }, [messages, sending]);
  useEffect(() => {
    const field = input.current;
    if (!field) return;
    field.style.height = "0px";
    field.style.height = `${question ? Math.max(38, Math.min(112, field.scrollHeight)) : 38}px`;
  }, [question]);

  const chosenNote = notes.find(note => note.id === contextId);
  const missingNote = contextId !== "all" && !chosenNote;
  const contextLabel = contextId === "all" ? "Semua catatan" : chosenNote?.title || "Catatan tidak tersedia";
  const chosenNotes = useMemo(() => contextId === "all" ? notes : notes.filter(note => note.id === contextId), [notes, contextId]);
  const contextText = useMemo(() => chosenNotes.map(note => `Judul: ${note.title}\nTag: ${note.tags.join(", ")}\nIsi:\n${plainText(note.content)}`).join("\n\n---\n\n"), [chosenNotes]);
  const words = chosenNotes.reduce((sum, note) => sum + plainText(note.content).split(/\s+/).filter(Boolean).length, 0);
  const canAsk = notesReady && chosenNotes.length > 0 && words > 0 && !missingNote;
  const busy = sending || clearing || !!deleting;
  const filteredHistory = recent.filter(chat => chat.question.toLowerCase().includes(historySearch.toLowerCase()));

  function newConversation() {
    if (busy) return;
    setMessages([]); setQuestion(""); setError(""); setFailedQuestion(null); setActiveHistory(null); followBottom.current = true; input.current?.focus();
  }
  function openHistory(chat: ChatHistory) {
    if (busy) return;
    const noteTitle = chat.noteId && chat.noteId !== "all" ? notes.find(note => note.id === chat.noteId)?.title || "Catatan tidak tersedia" : "Semua catatan";
    const id = chat.noteId || "all";
    setMessages([{ id: `user-${chat.id}`, role: "user", text: chat.question, contextId: id, noteTitle }, { id: `assistant-${chat.id}`, role: "assistant", text: chat.answer, contextId: id, noteTitle }]);
    setContextId(id); setActiveHistory(chat.id); setQuestion(""); setError(""); setFailedQuestion(null); followBottom.current = true;
    if (window.matchMedia("(max-width: 1049px)").matches) setHistoryOpen(false);
  }
  async function deleteOne(chatId: string) {
    if (!user || deleteLock.current || busy) return;
    const uid = user.uid; deleteLock.current = true; setDeleting(chatId);
    try { await deleteChatHistory(chatId); if (owner.current === uid) { setRecent(previous => previous.filter(chat => chat.id !== chatId)); if (activeHistory === chatId) { setMessages([]); setActiveHistory(null); } } }
    catch { if (owner.current === uid) setError("Riwayat belum bisa dihapus. Coba lagi."); }
    finally { deleteLock.current = false; if (owner.current === uid) setDeleting(null); }
  }
  async function clearHistory() {
    if (!user || deleteLock.current || sending) return;
    const uid = user.uid; deleteLock.current = true; setClearing(true);
    try { await clearAllUserChatHistory(uid); if (owner.current === uid) { setRecent([]); setActiveHistory(null); setConfirmClear(false); } }
    catch { if (owner.current === uid) setError("Riwayat belum bisa dihapus. Coba lagi."); }
    finally { deleteLock.current = false; if (owner.current === uid) setClearing(false); }
  }
  async function copy(message: Message) {
    try { await navigator.clipboard.writeText(message.text); setCopied(message.id); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(null), 2000); }
    catch { setError("Jawaban belum bisa disalin. Periksa izin papan salin browser."); }
  }
  async function send(text = question, retry = false) {
    if (!user || !text.trim() || sendLock.current || busy || !canAsk) return;
    const uid = user.uid, selected = contextId, label = contextLabel;
    sendLock.current = true; setSending(true); setStatusLabel("Menyiapkan jawaban…"); setError(""); setFailedQuestion(null); setQuestion(""); followBottom.current = true;
    const request = new AbortController(); controller.current = request;
    const prior = messages.filter(message => message.contextId === selected).slice(-8).map(message => ({ role: message.role, content: message.text }));
    if (!retry) setMessages(previous => [...previous, { id: crypto.randomUUID(), role: "user", text: text.trim(), contextId: selected, noteTitle: label }]);
    try {
      const provider = getAiProvider(), key = getCustomApiKey(provider);
      const headers: Record<string, string> = { "Content-Type": "application/json", "x-ai-provider": provider };
      if (key) headers["x-custom-api-key"] = key;
      if (provider === "openrouter") headers["x-ai-model"] = getOpenRouterModel();
      const response = await fetch("/api/assistant/chat", { method: "POST", headers, signal: request.signal, body: JSON.stringify({ question: text.trim(), context: contextText, history: retry ? prior.slice(0, -1) : prior }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Jawaban belum bisa dimuat. Coba lagi sebentar.");
      if (typeof result.answer !== "string" || !result.answer.trim()) throw new Error("Jawaban belum tersedia. Coba kirim lagi.");
      if (owner.current !== uid || request.signal.aborted) return;
      setMessages(previous => [...previous, { id: crypto.randomUUID(), role: "assistant", text: result.answer, contextId: selected, noteTitle: label }]);
      setStatusLabel("Menyimpan riwayat…");
      try {
        const id = await saveChatHistory(uid, selected, text.trim(), result.answer);
        if (owner.current === uid && !request.signal.aborted) { setRecent(previous => [{ id, userId: uid, noteId: selected, question: text.trim(), answer: result.answer }, ...previous].slice(0, 25)); setActiveHistory(id); }
      } catch { if (owner.current === uid && !request.signal.aborted) setNotice("Jawaban sudah muncul, tetapi belum tersimpan di riwayat. Kamu bisa menyalinnya."); }
    } catch (cause) {
      if (owner.current === uid && !request.signal.aborted) { setError(cause instanceof Error ? cause.message : "Belum bisa mengirim pertanyaan."); setFailedQuestion(text.trim()); }
    } finally { if (controller.current === request) { sendLock.current = false; if (owner.current === uid) { setSending(false); input.current?.focus(); } } }
  }

  return <DashboardShell><main className={s.page}>
    <header className={s.header}><div><h1>Asisten</h1><p>Bahas materi dari catatanmu, satu pertanyaan dulu.</p></div><div className={s.actions}><button className={s.button} onClick={() => setHistoryOpen(value => !value)} aria-expanded={historyOpen} aria-controls="assistant-history">{historyOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}Riwayat</button><button className={s.button} onClick={() => setConnectionOpen(true)}><SlidersHorizontal size={17} />Koneksi asisten</button></div></header>
    {notice && <div className={s.notice} role="status">{notice}{(!notesReady || !historyReady) && <button disabled={loading} onClick={() => user && void load(user.uid)}>Muat ulang</button>}</div>}
    <div className={s.workspace} data-history={historyOpen}>
      <aside id="assistant-history" className={s.history} hidden={!historyOpen}><button className={`${s.button} ${s.newChat}`} disabled={busy} onClick={newConversation}><Plus size={17} />Percakapan baru</button><div className={s.historyHeading}><h2>Pertanyaan tersimpan</h2>{recent.length > 0 && <button className={s.iconButton} disabled={busy || !historyReady} aria-label="Hapus semua riwayat" title="Hapus semua riwayat" onClick={() => { setError(""); setConfirmClear(true); }}><Trash2 size={15} /></button>}</div><label className={s.historySearch}><Search size={15} /><input aria-label="Cari riwayat pertanyaan" placeholder="Cari pertanyaan…" value={historySearch} onChange={event => setHistorySearch(event.target.value)} /></label><div className={s.historyList}>{loading ? <p className={s.smallEmpty}>Memuat riwayat…</p> : !historyReady ? <p className={s.smallEmpty}>Riwayat belum bisa dimuat.</p> : !filteredHistory.length ? <p className={s.smallEmpty}>{historySearch ? "Tidak ada pertanyaan yang cocok." : "Pertanyaan dan jawabanmu akan tersimpan di sini."}</p> : filteredHistory.map(chat => <div className={s.historyItem} key={chat.id} data-active={activeHistory === chat.id}><button className={s.historySelect} disabled={busy} onClick={() => openHistory(chat)}><strong>{chat.question}</strong><span>{!chat.noteId || chat.noteId === "all" ? "Semua catatan" : notes.find(note => note.id === chat.noteId)?.title || "Catatan tidak tersedia"}</span></button><button className={s.delete} disabled={busy} aria-label={`Hapus pertanyaan: ${chat.question}`} onClick={() => void deleteOne(chat.id)}>{deleting === chat.id ? <Loader2 size={14} className={s.spin} /> : <Trash2 size={14} />}</button></div>)}</div><p className={s.historyFoot}>Menampilkan hingga 25 pertanyaan terakhir.</p></aside>
      <section className={s.conversation} aria-label="Percakapan dengan asisten"><div className={s.contextBar}><div className={s.contextHeading}><BookOpen size={19} /><div><span>Bahan belajar</span><p>{loading ? "Memuat catatan…" : missingNote ? "Pilih catatan yang masih tersedia" : `${chosenNotes.length} catatan · ${words.toLocaleString("id-ID")} kata`}</p></div></div><div className={s.contextSelect}><Dropdown label="Catatan untuk percakapan" disabled={loading || !notesReady || busy} value={contextId} onChange={value => { setContextId(value); setError(""); setFailedQuestion(null); }} options={[{ value: "all", label: `Semua catatan (${notes.length})` }, ...(missingNote ? [{ value: contextId, label: "Catatan tidak tersedia" }] : []), ...notes.map(note => ({ value: note.id, label: note.title, detail: note.isArchived ? "Arsip" : undefined }))]} /></div>{chosenNote && <Link href={`/notes/${chosenNote.id}`} className={s.iconButton} aria-label="Buka catatan terpilih" title="Buka catatan"><ArrowUpRight size={18} /></Link>}{messages.length > 0 && <button className={s.iconButton} disabled={busy} onClick={newConversation} aria-label="Percakapan baru" title="Percakapan baru"><Plus size={18} /></button>}</div>
        <div className={s.chat} ref={chatBox} onScroll={event => { const box = event.currentTarget; followBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 90; }} role="log" aria-label="Pesan percakapan" aria-live="polite" aria-busy={sending}>
          {loading && !messages.length ? <div data-delayed-loading className={s.loading}><Loader2 size={24} className={s.spin} /><p>Menyiapkan catatanmu…</p></div> : !messages.length ? <div className={s.welcome}><div className={s.welcomeMark} aria-hidden="true"><BookOpen size={26} /><i /><i /></div><span className={s.overline}>Ruang untuk memahami</span><h2>Apa yang ingin<br />kamu pahami?</h2><p>{!notesReady ? "Catatan belum bisa dimuat. Coba muat ulang untuk memulai." : !notes.length ? "Simpan materi di Catatan, lalu kita bisa membahasnya di sini." : missingNote ? "Catatan dari tautan ini sudah tidak tersedia. Pilih bahan lain untuk memulai." : words === 0 ? "Catatan yang dipilih belum berisi materi. Tulis sesuatu dulu untuk mulai membahasnya." : "Pilih catatan, lalu tanyakan bagian yang ingin kamu bahas."}</p>{notesReady && (!notes.length || words === 0) && <Link href={chosenNote ? `/notes/${chosenNote.id}` : "/notes"} className={s.noteLink}>Buka catatan <ArrowRight size={17} /></Link>}<div className={s.starters}>{starters.map(starter => <button key={starter.label} disabled={!canAsk || busy} onClick={() => void send(starter.prompt)}><div><strong>{starter.label}</strong><span>{starter.hint}</span></div><ArrowUpRight size={17} /></button>)}</div></div> : <div className={s.messages}>{messages.map(message => <article className={`${s.message} ${message.role === "user" ? s.userMessage : s.assistantMessage}`} key={message.id}><span className={s.messageLabel}>{message.role === "user" ? "Kamu" : "Asisten"}</span><MarkdownRenderer content={message.text} isUser={message.role === "user"} className={s.markdown} />{message.role === "assistant" ? <footer className={s.messageFooter}><span>Bahan: {message.noteTitle}</span><button onClick={() => void copy(message)}>{copied === message.id ? <Check size={14} /> : <Copy size={14} />}{copied === message.id ? "Tersalin" : "Salin jawaban"}</button></footer> : <span className={s.userContext}>{message.noteTitle}</span>}</article>)}{sending && <p className={s.typing} role="status"><Loader2 size={17} className={s.spin} />{statusLabel}</p>}</div>}
        </div>
        {error && <div className={s.error} role="alert"><p>{error}</p>{failedQuestion && <button disabled={busy || !canAsk} onClick={() => void send(failedQuestion, true)}>Coba lagi <ArrowRight size={15} /></button>}</div>}
        {messages.length > 0 && !sending && <div className={s.followups}>{starters.map(starter => <button key={starter.label} disabled={!canAsk || busy} onClick={() => void send(starter.prompt)}>{starter.label}<ArrowUpRight size={13} /></button>)}</div>}
        <form className={s.composer} onSubmit={event => { event.preventDefault(); void send(); }}><div className={s.inputWrap}><label className={s.srOnly} htmlFor="assistant-question">Pertanyaan tentang materi</label><textarea id="assistant-question" ref={input} rows={1} maxLength={6000} value={question} placeholder={canAsk ? "Tanyakan bagian yang ingin kamu pahami…" : "Pilih catatan yang berisi materi terlebih dahulu"} disabled={!canAsk || busy || loading} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} /><button type="submit" disabled={!canAsk || !question.trim() || busy || loading} aria-label="Kirim pertanyaan"><Send size={18} /></button></div><div className={s.composerFoot}><span>Enter untuk kirim · Shift + Enter untuk baris baru</span><span>Jawaban bisa memuat pengetahuan tambahan di luar catatan.</span></div></form>
      </section>
    </div>
    <AiApiKeyModal isOpen={connectionOpen} onClose={() => setConnectionOpen(false)} />
    <WarningModal isOpen={confirmClear} onClose={() => { if (!clearing) setConfirmClear(false); }} onConfirm={clearHistory} isLoading={clearing} variant="danger" title="Hapus semua riwayat?" description="Seluruh pertanyaan dan jawaban tersimpan akan dihapus. Catatanmu tetap ada." confirmText="Hapus riwayat" cancelText="Batal">{confirmClear && error && <p role="alert" className={s.error}>{error}</p>}</WarningModal>
  </main></DashboardShell>;
}
export default function AssistantPage() { return <Suspense fallback={<DashboardShell><div data-delayed-loading className={s.loading}>Memuat asisten…</div></DashboardShell>}><AssistantContent /></Suspense>; }
