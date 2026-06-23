"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Send,
  BookOpen,
  History,
  Brain,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotes,
  getUserChatHistory,
  saveChatHistory,
  type NoteDocument,
  type ChatHistory,
} from "@/lib/firestore";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp?: Date;
  noteTitle?: string;
}

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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const loadData = async (uid: string) => {
      try {
        const [userNotes, chats] = await Promise.all([
          getUserNotes(uid),
          getUserChatHistory(uid, 15),
        ]);
        setNotes(userNotes);
        setRecentChats(chats);

        // Pre-fill parameters if arriving from suggested questions
        if (initialNoteId && userNotes.some((n) => n.id === initialNoteId)) {
          setSelectedContext(initialNoteId);
        }
        if (initialQuestion) {
          setQuestion(decodeURIComponent(initialQuestion));
        }
      } catch (err) {
        console.error("Failed to load assistant data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData(user.uid);
  }, [user, authLoading, router, initialNoteId, initialQuestion]);

  // Handle clicking a recent conversation to reload it into the thread
  const handleSelectRecent = (chat: ChatHistory) => {
    const noteDoc = notes.find((n) => n.id === chat.noteId);
    const contextLabel = noteDoc ? noteDoc.title : "All Notes";

    setMessages([
      { role: "user", text: chat.question, noteTitle: contextLabel },
      { role: "assistant", text: chat.answer, noteTitle: contextLabel },
    ]);
    setSelectedContext(chat.noteId);
  };

  // Compile context content based on selection
  const compileContextText = useMemo(() => {
    if (selectedContext === "all") {
      return notes
        .map((n) => `Note Title: ${n.title}\nTags: ${n.tags.join(", ")}\nContent: ${n.content}`)
        .join("\n\n---\n\n");
    }
    const note = notes.find((n) => n.id === selectedContext);
    return note ? `Note Title: ${note.title}\nTags: ${note.tags.join(", ")}\nContent: ${note.content}` : "";
  }, [notes, selectedContext]);

  // Send message to Gemini
  const handleSendMessage = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const activeQuestion = customQuestion || question;
    if (!activeQuestion.trim() || !user || sending) return;

    const currentContext = selectedContext;
    const noteDoc = notes.find((n) => n.id === currentContext);
    const contextLabel = noteDoc ? noteDoc.title : "All Notes";

    // Append user message immediately
    const userMsg: Message = { role: "user", text: activeQuestion, noteTitle: contextLabel };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setSending(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: activeQuestion,
          context: compileContextText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to get AI response");
      }

      const { answer } = await res.json();

      // Append assistant response
      const assistantMsg: Message = { role: "assistant", text: answer, noteTitle: contextLabel };
      setMessages((prev) => [...prev, assistantMsg]);

      // Save Q&A to Firestore Chat History
      await saveChatHistory(user.uid, currentContext, activeQuestion, answer);

      // Refresh recent conversation history sidebar
      const freshHistory = await getUserChatHistory(user.uid, 15);
      setRecentChats(freshHistory);
    } catch (err) {
      console.error("AI assistant send error:", err);
      const errMsg: Message = {
        role: "assistant",
        text: "Error: Failed to fetch answer. Please make sure your Gemini API key is configured.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const selectedNoteTitle = useMemo(() => {
    if (selectedContext === "all") return "All Notes";
    return notes.find((n) => n.id === selectedContext)?.title || "Selected Note";
  }, [notes, selectedContext]);

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading Assistant...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Page Header */}
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">AI Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">Ask questions strictly tied to your personal knowledge base</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch min-h-[500px]">
        {/* Left pane: Recent Chats Sidebar (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-border shadow-card p-5 flex flex-col justify-between max-h-[600px] overflow-y-auto animate-scale-in">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-border/60">
              <History className="w-4 h-4" />
              Recent Conversations
            </h3>

            {recentChats.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">
                No past conversations.
              </div>
            ) : (
              <div className="space-y-2">
                {recentChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectRecent(chat)}
                    className="w-full text-left text-xs bg-gray-50 hover:bg-primary-50/20 border border-border hover:border-primary/40 rounded-xl p-3 transition-all cursor-pointer group flex flex-col justify-between gap-1"
                  >
                    <p className="font-semibold text-gray-800 line-clamp-1 group-hover:text-primary">
                      {chat.question}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      Context: {notes.find((n) => n.id === chat.noteId)?.title || "All Notes"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Chat Area (9 cols) */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-border shadow-card flex flex-col justify-between max-h-[600px] animate-scale-in overflow-hidden">
          {/* Top context selector header */}
          <div className="px-6 py-4 border-b border-border bg-gray-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-gray-700">Chat Context:</span>
            </div>

            {notes.length === 0 ? (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1">
                No notes found. Create a note first!
              </span>
            ) : (
              <select
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                className="h-10 pl-3 pr-8 rounded-xl border border-border bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer w-full sm:w-64"
              >
                <option value="all">📚 All Notes combined</option>
                {notes.map((note) => (
                  <option key={note.id} value={note.id}>
                    📄 {note.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Messages list */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-[300px]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                  <Brain className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-700 text-sm">Ask about your notes</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    AI relies solely on the selected notes. If not found inside, it will state that it cannot find the answer.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    {/* Context Indicator */}
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                      Context: {msg.noteTitle}
                    </span>
                  </div>
                ))}
                {sending && (
                  <div className="flex flex-col items-start">
                    <div className="bg-gray-100 rounded-2xl px-5 py-3 text-sm flex items-center gap-2.5 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                      Analyzing knowledge base...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input control box */}
          <form
            onSubmit={(e) => handleSendMessage(e)}
            className="p-4 border-t border-border bg-gray-50/50 flex items-center gap-3"
          >
            <input
              type="text"
              placeholder={`Ask a question about "${selectedNoteTitle}"...`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={notes.length === 0 || sending}
              className="flex-1 h-11 px-4 rounded-xl border border-border bg-white text-sm text-[#1F2937] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={notes.length === 0 || !question.trim() || sending}
              className="h-11 w-11 p-0 flex items-center justify-center shrink-0"
            >
              <Send className="w-4.5 h-4.5" />
            </Button>
          </form>
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
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Loading Assistant Page...</p>
          </div>
        </div>
      }
    >
      <AssistantChatContent />
    </Suspense>
  );
}
