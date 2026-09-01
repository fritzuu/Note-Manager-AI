"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Send,
  BookOpen,
  History,
  Brain,
  Trash2,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Lightbulb,
  HelpCircle,
  Layers,
  ArrowUpRight,
  Key,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotes,
  getUserChatHistory,
  saveChatHistory,
  deleteChatHistory,
  clearAllUserChatHistory,
  type NoteDocument,
  type ChatHistory,
} from "@/lib/firestore";
import { getCustomApiKey, getAiProvider, getOpenRouterModel } from "@/lib/aiConfig";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { AiApiKeyModal } from "@/components/modals/AiApiKeyModal";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { WarningModal } from "@/components/ui/WarningModal";
import { cn } from "@/lib/utils";

let msgCounter = 0;
function createMessageId(prefix: string): string {
  msgCounter += 1;
  return `${prefix}-${msgCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  noteTitle?: string;
}

const QUICK_STARTERS = [
  {
    icon: Sparkles,
    label: "Rangkum Poin Kunci",
    prompt: "Rangkumkan poin-poin paling penting dan esensial dari catatan ini dalam format bullet points yang ringkas dan padat.",
    color: "text-amber-600 bg-amber-50 border-amber-200/80 hover:bg-amber-100/70",
  },
  {
    icon: HelpCircle,
    label: "Buat Soal Latihan & Kuis",
    prompt: "Buatkan 3 pertanyaan pilihan ganda beserta kunci jawaban dan penjelasannya berdasarkan materi catatan ini untuk menguji pemahamanku.",
    color: "text-blue-600 bg-blue-50 border-blue-200/80 hover:bg-blue-100/70",
  },
  {
    icon: Lightbulb,
    label: "Jelaskan Konsep Tersulit",
    prompt: "Identifikasi konsep yang paling kompleks dalam catatan ini, dan jelaskan secara sederhana dengan analogi sehari-hari yang mudah dipahami.",
    color: "text-purple-600 bg-purple-50 border-purple-200/80 hover:bg-purple-100/70",
  },
  {
    icon: Layers,
    label: "Hubungan Antar Topik",
    prompt: "Jelaskan bagaimana konsep-konsep dalam catatan ini saling berhubungan dan apa implikasi praktisnya dalam studi nyata.",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100/70",
  },
];

function AssistantChatContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Query parameter inputs
  const initialNoteId = searchParams.get("noteId");
  const initialQuestion = searchParams.get("question");

  // State
  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContext, setSelectedContext] = useState<string>("all"); // "all" or specific noteId
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [recentChats, setRecentChats] = useState<ChatHistory[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const loadData = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [userNotes, chats] = await Promise.all([
        getUserNotes(uid).catch(() => []),
        getUserChatHistory(uid, 25).catch(() => []),
      ]);
      const sanitizedNotes = (userNotes || []).map((n) => ({
        ...n,
        title: n.title || "Untitled Note",
        content: n.content || "",
        tags: Array.isArray(n.tags) ? n.tags : [],
      }));
      setNotes(sanitizedNotes);
      setRecentChats(chats || []);

      // Pre-fill parameters if arriving from suggested questions
      if (initialNoteId && sanitizedNotes.some((n) => n.id === initialNoteId)) {
        setSelectedContext(initialNoteId);
      }
      if (initialQuestion) {
        setQuestion(decodeURIComponent(initialQuestion));
      }
    } catch (err) {
      console.error("Failed to load assistant data:", err);
      setError("Gagal memuat asisten AI. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }, [initialNoteId, initialQuestion]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    loadData(user.uid);
  }, [user, authLoading, router, loadData]);

  // Handle clicking a recent conversation to reload it into the thread
  const handleSelectRecent = (chat: ChatHistory) => {
    const noteDoc = notes.find((n) => n.id === chat.noteId);
    const contextLabel = noteDoc ? noteDoc.title : "Semua Catatan";

    setMessages([
      {
        id: `user-${chat.id}`,
        role: "user",
        text: chat.question,
        noteTitle: contextLabel,
        timestamp: new Date(),
      },
      {
        id: `assistant-${chat.id}`,
        role: "assistant",
        text: chat.answer,
        noteTitle: contextLabel,
        timestamp: new Date(),
      },
    ]);
    setSelectedContext(chat.noteId || "all");
  };

  // Delete individual chat item
  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!user || deletingId) return;

    setDeletingId(chatId);
    try {
      await deleteChatHistory(chatId);
      setRecentChats((prev) => prev.filter((c) => c.id !== chatId));
    } catch (err) {
      console.error("Failed to delete chat:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Clear all past chat history
  const handleClearAllHistory = async () => {
    if (!user || clearingAll) return;
    setClearingAll(true);
    try {
      await clearAllUserChatHistory(user.uid);
      setRecentChats([]);
      setConfirmClearAll(false);
    } catch (err) {
      console.error("Failed to clear chat history:", err);
    } finally {
      setClearingAll(false);
    }
  };

  // Clear current active chat thread
  const handleClearCurrentThread = () => {
    setMessages([]);
    setQuestion("");
    inputRef.current?.focus();
  };

  // Copy message to clipboard
  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Compile context content based on selection
  const compileContextText = useMemo(() => {
    if (selectedContext === "all") {
      return notes
        .map((n) => `Judul Dokumen: ${n.title}\nLabel/Tags: ${(n.tags || []).join(", ")}\nIsi Catatan: ${n.content}`)
        .join("\n\n---\n\n");
    }
    const note = notes.find((n) => n.id === selectedContext);
    return note
      ? `Judul Dokumen: ${note.title}\nLabel/Tags: ${(note.tags || []).join(", ")}\nIsi Catatan: ${note.content}`
      : "";
  }, [notes, selectedContext]);

  // Context metadata stats
  const contextStats = useMemo(() => {
    if (selectedContext === "all") {
      const count = notes.length;
      const totalWords = notes.reduce(
        (acc, n) => acc + (n.content ? n.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length : 0),
        0
      );
      return `${count} Catatan Terindeks · ~${totalWords.toLocaleString()} kata`;
    }
    const note = notes.find((n) => n.id === selectedContext);
    if (!note) return "Tidak ada dokumen";
    const words = note.content ? note.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length : 0;
    return `Dokumen Aktif · ~${words.toLocaleString()} kata`;
  }, [notes, selectedContext]);

  // Send message to Gemini
  const handleSendMessage = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const activeQuestion = customQuestion || question;
    if (!activeQuestion.trim() || !user || sending) return;

    const currentContext = selectedContext;
    const noteDoc = notes.find((n) => n.id === currentContext);
    const contextLabel = noteDoc ? noteDoc.title : "Semua Catatan";

    const userMsgId = createMessageId("u");
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      text: activeQuestion.trim(),
      noteTitle: contextLabel,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setSending(true);

    try {
      const customKey = getCustomApiKey();
      const provider = getAiProvider();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-ai-provider": provider,
      };
      if (customKey) {
        headers["x-custom-api-key"] = customKey;
      }
      if (provider === "openrouter") {
        headers["x-ai-model"] = getOpenRouterModel();
      }

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          question: activeQuestion.trim(),
          context: compileContextText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal mendapatkan respons AI.");
      }

      const { answer } = await res.json();

      const assistantMsgId = createMessageId("a");
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        text: answer,
        noteTitle: contextLabel,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Save Q&A to Firestore Chat History silently
      saveChatHistory(user.uid, currentContext, activeQuestion.trim(), answer)
        .then(async () => {
          const freshHistory = await getUserChatHistory(user.uid, 25);
          setRecentChats(freshHistory);
        })
        .catch((err) => console.warn("Failed to persist chat history:", err));
    } catch (err: unknown) {
      console.error("AI assistant send error:", err);
      const errMsg: Message = {
        id: createMessageId("err"),
        role: "assistant",
        text: "Maaf, terjadi kendala saat memproses jawaban. Pastikan koneksi internet stabil dan kuota API Gemini masih tersedia.",
        noteTitle: contextLabel,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const selectedNoteTitle = useMemo(() => {
    if (selectedContext === "all") return "Semua Catatan (All Notes)";
    return notes.find((n) => n.id === selectedContext)?.title || "Catatan Terpilih";
  }, [notes, selectedContext]);

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <LoadingScreen label="Memuat Asisten AI..." subtext="Menyiapkan konteks catatan & model bahasa" />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <ErrorState
          title="Gagal Memuat Asisten AI"
          message={error}
          onRetry={() => user && loadData(user.uid)}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <AiApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />

      <WarningModal
        isOpen={confirmClearAll}
        onClose={() => setConfirmClearAll(false)}
        onConfirm={handleClearAllHistory}
        isLoading={clearingAll}
        variant="danger"
        title="Hapus Semua Riwayat Percakapan?"
        description="Apakah Anda yakin ingin menghapus seluruh riwayat percakapan dengan MindFlow AI Assistant? Tindakan ini bersifat permanen dan tidak dapat dibatalkan."
        confirmText="Ya, Hapus Semua"
        cancelText="Batal"
      />

      <div className="space-y-6 animate-fade-in pb-8">
        {/* ════════════════════════════════════════════
            1. PAGE HEADER & QUICK ACTIONS
        ════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white shadow-md">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#1F2937] tracking-tight flex items-center gap-2.5">
                AI Assistant
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  RAG Powered
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Tanya jawab pintar yang berfokus langsung pada isi catatan & dokumen belajarmu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* New Conversation Button */}
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCurrentThread}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="rounded-xl text-xs font-bold"
              >
                Percakapan Baru
              </Button>
            )}

            {/* Custom API Key Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApiKeyModalOpen(true)}
              icon={<Key className="w-3.5 h-3.5 text-primary" />}
              className="rounded-xl text-xs font-bold border-primary/30 hover:border-primary text-gray-700 hover:text-primary"
            >
              Setup API Key
            </Button>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            2. MAIN WORKSPACE GRID (4 COLS + 8 COLS)
        ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[640px] animate-scale-in">
          
          {/* ════════════════════════════════════════════
              LEFT PANE: History & Quick Starters (4 Cols)
          ════════════════════════════════════════════ */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-border shadow-card p-5 flex flex-col justify-between max-h-[720px] overflow-hidden space-y-4">
            
            {/* Riwayat Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Riwayat Percakapan ({recentChats.length})
                </h3>
              </div>

              {recentChats.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="text-[11px] font-bold text-gray-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Hapus Semua
                </button>
              )}
            </div>

            {/* List of Recent Chats */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {recentChats.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-400 space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
                    <History className="w-5 h-5" />
                  </div>
                  <p className="font-medium">Belum ada riwayat percakapan.</p>
                  <p className="text-[11px] text-gray-400">Pertanyaan yang kamu ajukan akan otomatis tercatat di sini.</p>
                </div>
              ) : (
                recentChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectRecent(chat)}
                    className="group relative w-full text-left text-xs bg-gray-50/80 hover:bg-primary-50/40 border border-border/70 hover:border-primary/40 rounded-2xl p-3.5 transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate group-hover:text-primary transition-colors">
                        {chat.question}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate mt-1 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-gray-400" />
                        {notes.find((n) => n.id === chat.noteId)?.title || "Semua Catatan"}
                      </p>
                    </div>

                    {/* Delete Individual Chat Button */}
                    <button
                      type="button"
                      title="Hapus percakapan ini"
                      disabled={deletingId === chat.id}
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Starter Templates Box */}
            <div className="pt-3 border-t border-border/70 space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Template Pertanyaan Cepat
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {QUICK_STARTERS.slice(0, 2).map((starter, i) => {
                  const Icon = starter.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(undefined, starter.prompt)}
                      disabled={notes.length === 0 || sending}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${starter.color}`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {starter.label}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════
              RIGHT PANE: Active Chat Thread (8 Cols)
          ════════════════════════════════════════════ */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-border shadow-card flex flex-col justify-between max-h-[720px] overflow-hidden">
            
            {/* Top Context & Document Filter Header */}
            <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Konteks Dokumen RAG</h4>
                  <p className="text-[11px] text-gray-400 font-medium">{contextStats}</p>
                </div>
              </div>

              {notes.length === 0 ? (
                <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 font-semibold">
                  Belum ada catatan. Buat catatan terlebih dahulu!
                </span>
              ) : (
                <div className="w-full sm:w-72">
                  <select
                    value={selectedContext}
                    onChange={(e) => setSelectedContext(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-border bg-white text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
                  >
                    <option value="all">Semua Catatan ({notes.length} Dokumen)</option>
                    {notes.map((note) => (
                      <option key={note.id} value={note.id}>
                        {note.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Chat Messages Timeline */}
            <div className="flex-1 p-6 overflow-y-auto space-y-5 min-h-[380px] custom-scrollbar bg-gradient-to-b from-gray-50/20 to-white">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm animate-pulse">
                    <Brain className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="font-extrabold text-gray-800 text-lg tracking-tight">
                      Tanyakan apa saja seputar materi belajarmu
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 leading-relaxed font-medium">
                      AI hanya akan menjawab berdasarkan isi dokumen yang kamu pilih. Aman dari halusinasi dan terfokus pada ujian & perkuliahanmu.
                    </p>
                  </div>

                  {/* 4 Clickable Quick Starter Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg pt-2 text-left">
                    {QUICK_STARTERS.map((starter, i) => {
                      const Icon = starter.icon;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(undefined, starter.prompt)}
                          disabled={notes.length === 0 || sending}
                          className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${starter.color} shadow-2xs hover:scale-[1.01]`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{starter.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col gap-1.5",
                        msg.role === "user" ? "items-end" : "items-start"
                      )}
                    >
                      {/* Message Bubble Container */}
                      <div
                        className={cn(
                          "max-w-[88%] rounded-3xl px-5 py-4 text-sm leading-relaxed shadow-sm transition-all relative group",
                          msg.role === "user"
                            ? "bg-primary text-white font-medium rounded-br-xs"
                            : "bg-white text-gray-800 border border-border rounded-bl-xs shadow-card"
                        )}
                      >
                        <MarkdownRenderer content={msg.text} isUser={msg.role === "user"} />

                        {/* Copy Button for Assistant responses */}
                        {msg.role === "assistant" && (
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs">
                            <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-primary" />
                              Sumber: {msg.noteTitle}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.id, msg.text)}
                              className="text-[11px] font-bold text-gray-400 hover:text-primary transition-colors flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-gray-100 cursor-pointer"
                              title="Salin jawaban"
                            >
                              {copiedMsgId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* User timestamp indicator */}
                      {msg.role === "user" && (
                        <span className="text-[10px] text-gray-400 font-semibold px-2">
                          Konteks: {msg.noteTitle}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Typing / Thinking Indicator */}
                  {sending && (
                    <div className="flex flex-col items-start animate-fade-in">
                      <div className="bg-white rounded-3xl rounded-bl-xs px-5 py-4 text-xs font-semibold text-gray-600 border border-border shadow-card flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                        </div>
                        Membaca dokumen & menyusun jawaban ilmiah...
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Input Control Bar */}
            <form
              onSubmit={(e) => handleSendMessage(e)}
              className="p-4 border-t border-border bg-white flex items-center gap-3"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Ajukan pertanyaan tentang "${selectedNoteTitle}"...`}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={notes.length === 0 || sending}
                  className="w-full h-12 pl-4 pr-12 rounded-2xl border border-border bg-gray-50/60 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
                />
              </div>

              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={notes.length === 0 || !question.trim() || sending}
                className="h-12 w-12 p-0 flex items-center justify-center shrink-0 rounded-2xl shadow-sm font-bold"
                title="Kirim Pertanyaan"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <LoadingScreen label="Memuat Halaman Asisten..." subtext="Menyiapkan antarmuka tanya jawab AI" />
        </div>
      }
    >
      <AssistantChatContent />
    </Suspense>
  );
}
