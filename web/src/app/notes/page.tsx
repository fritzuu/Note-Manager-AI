"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  Tag as TagIcon,
  X,
  FileText,
  ChevronDown,
  Star,
  LayoutGrid,
  List as ListIcon,
  Clock,
  Sparkles,
  BookOpen,
  Check,
  Copy,
  ArrowRight,
  GraduationCap,
  Lightbulb,
  Users,
  RotateCcw,
  Archive,
  ArchiveRestore,
  Undo2,
  AlertTriangle,
  FolderKanban,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotes,
  createNote,
  deleteNote,
  updateNote,
  type NoteDocument,
} from "@/lib/firestore";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { WarningModal } from "@/components/ui/WarningModal";
import { ErrorState } from "@/components/ui/ErrorState";
import { useMounted } from "@/hooks/useMounted";

type SortOption = "updated-desc" | "created-desc" | "title-asc" | "title-desc" | "words-desc";
type ViewMode = "grid" | "list";
type PocketType = "active" | "pinned" | "archived" | "trash";

interface NoteTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  title: string;
  tags: string;
  content: string;
}

const TEMPLATES: NoteTemplate[] = [
  {
    id: "blank",
    name: "Catatan Kosong",
    icon: <FileText className="w-3.5 h-3.5" />,
    title: "",
    tags: "",
    content: "",
  },
  {
    id: "lecture",
    name: "Rangkuman Kuliah",
    icon: <GraduationCap className="w-3.5 h-3.5" />,
    title: "Rangkuman Kuliah: [Nama Mata Kuliah]",
    tags: "kuliah, rangkuman, akademik",
    content: "## Topik Pembahasan\n\n\n## Poin-Poin Kunci\n- \n- \n\n## Contoh & Aplikasi\n\n\n## Kesimpulan & Action Items\n- ",
  },
  {
    id: "brainstorm",
    name: "Ide & Konsep",
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    title: "Eksplorasi Ide: [Judul Ide]",
    tags: "ide, konsep, inovasi",
    content: "## Latar Belakang Masalah\n\n\n## Solusi yang Diusulkan\n\n\n## Kelebihan & Tantangan\n- **Kelebihan:** \n- **Tantangan:** \n\n## Langkah Berikutnya\n1. ",
  },
  {
    id: "meeting",
    name: "Notulensi Diskusi",
    icon: <Users className="w-3.5 h-3.5" />,
    title: "Diskusi Kelompok: [Topik]",
    tags: "diskusi, meeting, tugas",
    content: "## Peserta\n- \n\n## Agenda\n1. \n\n## Hasil Diskusi\n\n\n## Pembagian Tugas\n- [Nama]: [Tugas]",
  },
];

function escapeRegExp(string: string) {
  if (!string || typeof string !== "string") return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!text || typeof text !== "string") return null;
  if (!query || !query.trim()) return <>{text}</>;
  try {
    const escaped = escapeRegExp(query);
    if (!escaped) return <>{text}</>;
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-amber-950 px-1 py-0.2 rounded font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

function stripHtml(html: unknown): string {
  if (!html || typeof html !== "string") return "";
  try {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function countWords(text: unknown): number {
  if (!text || typeof text !== "string") return 0;
  const clean = stripHtml(text);
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

function estimateReadingTime(words: number): string {
  if (!words || typeof words !== "number" || words <= 0) return "< 1 mnt";
  const mins = Math.max(1, Math.ceil(words / 180));
  return `${mins} mnt baca`;
}

function formatDateIndo(val: unknown): string {
  if (!val) return "Baru saja";
  try {
    let date: Date | null = null;
    if (val instanceof Date) {
      date = val;
    } else if (typeof (val as { toDate?: () => Date }).toDate === "function") {
      date = (val as { toDate: () => Date }).toDate();
    } else if (typeof (val as { seconds?: number }).seconds === "number") {
      date = new Date((val as { seconds: number }).seconds * 1000);
    } else if (typeof val === "string" || typeof val === "number") {
      date = new Date(val);
    }

    if (!date || isNaN(date.getTime())) return "Baru saja";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `${diffMins} mnt lalu`;
    }
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `Hari ini, ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "Baru saja";
  }
}

function getRemainingTrashDays(trashedAt: unknown, updatedAt: unknown): { text: string; urgent: boolean } {
  try {
    let t = 0;
    if (trashedAt && typeof (trashedAt as { seconds?: number }).seconds === "number") {
      t = (trashedAt as { seconds: number }).seconds * 1000;
    } else if (updatedAt && typeof (updatedAt as { seconds?: number }).seconds === "number") {
      t = (updatedAt as { seconds: number }).seconds * 1000;
    }

    if (!t) return { text: "Sisa 3 hari", urgent: false };

    const elapsedMs = Date.now() - t;
    const remainingMs = Math.max(0, 3 * 24 * 60 * 60 * 1000 - elapsedMs);
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

    if (remainingHours <= 24) {
      return { text: `Sisa ${Math.max(1, remainingHours)} jam`, urgent: true };
    }
    const days = Math.ceil(remainingHours / 24);
    return { text: `Sisa ${days} hari`, urgent: days <= 1 };
  } catch {
    return { text: "Sisa 3 hari", urgent: false };
  }
}

export default function NotesPage() {
  const mounted = useMounted();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pocket Selection (Active, Pinned, Archived, Trash)
  const [activePocket, setActivePocket] = useState<PocketType>("active");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("updated-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NoteDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emptyTrashModalOpen, setEmptyTrashModalOpen] = useState(false);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

  // Create Note Form State
  const [activeTemplate, setActiveTemplate] = useState<string>("blank");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTagsStr, setNewTagsStr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load ViewMode preference from localStorage safely after mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notes_view_mode") as ViewMode | null;
      if (saved === "grid" || saved === "list") {
        setViewMode(saved);
      }
    }
  }, []);

  const handleToggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("notes_view_mode", mode);
    }
  };

  const loadNotes = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserNotes(uid);
      const sanitized = (data || []).map((n) => ({
        ...n,
        title: n.title || "Untitled Note",
        content: n.content || "",
        tags: Array.isArray(n.tags) ? n.tags : [],
        isPinned: Boolean(n.isPinned),
        isArchived: Boolean(n.isArchived),
        isTrashed: Boolean(n.isTrashed),
      }));
      setNotes(sanitized);
    } catch (err) {
      console.error("Failed to load notes:", err);
      setError("Gagal memuat daftar catatan. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    loadNotes(user.uid);
  }, [user, authLoading, router, loadNotes]);

  // ── Actions: Move to Trash (Soft Delete) ──────────────────────────────────
  const handleMoveToTrash = async (e: React.MouseEvent, note: NoteDocument) => {
    e.preventDefault();
    e.stopPropagation();

    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, isTrashed: true } : n))
    );

    try {
      await updateNote(note.id, { isTrashed: true });
    } catch (err) {
      console.error("Failed to move note to trash:", err);
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, isTrashed: false } : n))
      );
    }
  };

  // ── Actions: Restore from Trash / Archive ─────────────────────────────────
  const handleRestoreNote = async (e: React.MouseEvent, note: NoteDocument) => {
    e.preventDefault();
    e.stopPropagation();

    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id ? { ...n, isTrashed: false, isArchived: false } : n
      )
    );

    try {
      await updateNote(note.id, { isTrashed: false, isArchived: false });
    } catch (err) {
      console.error("Failed to restore note:", err);
      loadNotes(user?.uid || "");
    }
  };

  // ── Actions: Toggle Archive ───────────────────────────────────────────────
  const handleToggleArchive = async (e: React.MouseEvent, note: NoteDocument) => {
    e.preventDefault();
    e.stopPropagation();

    const nextArchived = !note.isArchived;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, isArchived: nextArchived } : n))
    );

    try {
      await updateNote(note.id, { isArchived: nextArchived });
    } catch (err) {
      console.error("Failed to toggle archive note:", err);
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, isArchived: note.isArchived } : n))
      );
    }
  };

  // ── Actions: Permanent Deletion ──────────────────────────────────────────
  const handlePermanentDeleteClick = (e: React.MouseEvent, note: NoteDocument) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(note);
  };

  const handleConfirmPermanentDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteNote(deleteTarget.id);
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to permanently delete note:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Actions: Empty Entire Trash ───────────────────────────────────────────
  const handleEmptyTrash = async () => {
    setIsEmptyingTrash(true);
    try {
      const trashedNotes = notes.filter((n) => n.isTrashed);
      await Promise.all(trashedNotes.map((n) => deleteNote(n.id)));
      setNotes((prev) => prev.filter((n) => !n.isTrashed));
      setEmptyTrashModalOpen(false);
    } catch (err) {
      console.error("Failed to empty trash:", err);
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  // ── Actions: Toggle Pin ──────────────────────────────────────────────────
  const handleTogglePin = async (e: React.MouseEvent, noteId: string, currentPin: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    const nextVal = !currentPin;
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isPinned: nextVal } : n))
    );

    try {
      await updateNote(noteId, { isPinned: nextVal });
    } catch (err) {
      console.error("Failed to toggle pin note:", err);
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, isPinned: currentPin } : n))
      );
    }
  };

  // ── Actions: Copy Content ────────────────────────────────────────────────
  const handleCopyNote = async (e: React.MouseEvent, note: NoteDocument) => {
    e.preventDefault();
    e.stopPropagation();

    const cleanText = `${note.title}\n\n${stripHtml(note.content)}`;
    try {
      await navigator.clipboard.writeText(cleanText);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  // ── Actions: Template Selection & Note Creation ──────────────────────────
  const handleSelectTemplate = (tpl: NoteTemplate) => {
    setActiveTemplate(tpl.id);
    setNewTitle(tpl.title);
    setNewTagsStr(tpl.tags);
    setNewContent(tpl.content);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const tags = newTagsStr
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const noteId = await createNote(user.uid, newTitle.trim() || "Untitled Note", newContent, tags);
      setModalOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewTagsStr("");
      setActiveTemplate("blank");
      router.push(`/notes/${noteId}`);
    } catch (err) {
      console.error("Failed to create note:", err);
      setSubmitting(false);
    }
  };

  // ── Pocket Counts ────────────────────────────────────────────────────────
  const pocketCounts = useMemo(() => {
    const active = notes.filter((n) => !n.isArchived && !n.isTrashed).length;
    const pinned = notes.filter((n) => n.isPinned && !n.isArchived && !n.isTrashed).length;
    const archived = notes.filter((n) => n.isArchived && !n.isTrashed).length;
    const trash = notes.filter((n) => n.isTrashed).length;

    return { active, pinned, archived, trash };
  }, [notes]);

  // ── Statistics calculation (Active & Pinned) ──────────────────────────────
  const stats = useMemo(() => {
    const activeNotes = notes.filter((n) => !n.isArchived && !n.isTrashed);
    const total = activeNotes.length;
    const pinned = activeNotes.filter((n) => n.isPinned).length;
    const allTagsSet = new Set<string>();
    let totalWords = 0;

    activeNotes.forEach((n) => {
      (n.tags || []).forEach((t) => {
        if (t) allTagsSet.add(t);
      });
      totalWords += countWords(n.content);
    });

    return {
      total,
      pinned,
      tagsCount: allTagsSet.size,
      totalWords,
      totalReadMins: Math.max(1, Math.ceil(totalWords / 180)),
    };
  }, [notes]);

  // Extract all tags from current pocket notes
  const tagCounts = useMemo(() => {
    let targetNotes = notes;
    if (activePocket === "active") targetNotes = notes.filter((n) => !n.isArchived && !n.isTrashed);
    else if (activePocket === "pinned") targetNotes = notes.filter((n) => n.isPinned && !n.isArchived && !n.isTrashed);
    else if (activePocket === "archived") targetNotes = notes.filter((n) => n.isArchived && !n.isTrashed);
    else if (activePocket === "trash") targetNotes = notes.filter((n) => n.isTrashed);

    const counts: Record<string, number> = {};
    targetNotes.forEach((note) => {
      (note.tags || []).forEach((tag) => {
        if (tag) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [notes, activePocket]);

  // ── Filter & Sort logic per Pocket ───────────────────────────────────────
  const filteredAndSortedNotes = useMemo(() => {
    let result = notes;

    // 1. Filter by Active Pocket
    if (activePocket === "active") {
      result = result.filter((n) => !n.isArchived && !n.isTrashed);
    } else if (activePocket === "pinned") {
      result = result.filter((n) => n.isPinned && !n.isArchived && !n.isTrashed);
    } else if (activePocket === "archived") {
      result = result.filter((n) => n.isArchived && !n.isTrashed);
    } else if (activePocket === "trash") {
      result = result.filter((n) => n.isTrashed);
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (note) =>
          (note.title || "").toLowerCase().includes(query) ||
          (note.content || "").toLowerCase().includes(query) ||
          (note.tags || []).some((tag) => (tag || "").toLowerCase().includes(query))
      );
    }

    // 3. Tag filter
    if (selectedTag) {
      result = result.filter((note) => (note.tags || []).includes(selectedTag));
    }

    // 4. Sorting: Pinned first (in active/pinned), then timestamp/title
    return [...result].sort((a, b) => {
      if (activePocket === "active" || activePocket === "pinned") {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }

      if (sortBy === "updated-desc") {
        const timeA = a.updatedAt ? (a.updatedAt as { seconds?: number }).seconds || 0 : 0;
        const timeB = b.updatedAt ? (b.updatedAt as { seconds?: number }).seconds || 0 : 0;
        return timeB - timeA;
      }
      if (sortBy === "created-desc") {
        const timeA = a.createdAt ? (a.createdAt as { seconds?: number }).seconds || 0 : 0;
        const timeB = b.createdAt ? (b.createdAt as { seconds?: number }).seconds || 0 : 0;
        return timeB - timeA;
      }
      if (sortBy === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "title-desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      if (sortBy === "words-desc") {
        return countWords(b.content) - countWords(a.content);
      }
      return 0;
    });
  }, [notes, activePocket, searchQuery, selectedTag, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedTag(null);
    setSortBy("updated-desc");
  };

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <LoadingScreen label="Memuat Catatan..." subtext="Mengambil koleksi catatan belajarmu..." />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <ErrorState
          title="Gagal Memuat Catatan"
          message={error}
          onRetry={() => user && loadNotes(user.uid)}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6 pb-12" suppressHydrationWarning>
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-up" suppressHydrationWarning>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight" suppressHydrationWarning>
                Catatan & Rangkuman
              </h1>
              <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/20" suppressHydrationWarning>
                {pocketCounts.active} Aktif
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Kelola materi belajar dengan kantong khusus untuk catatan aktif, arsip, dan sampah
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setActiveTemplate("blank");
                setNewTitle("");
                setNewContent("");
                setNewTagsStr("");
                setModalOpen(true);
              }}
              className="shadow-sm shadow-primary/20 cursor-pointer"
            >
              Tambah Catatan
            </Button>
          </div>
        </div>

        {/* ── KANTONG SELECTOR TABS ── */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 rounded-2xl border border-border w-fit max-w-full overflow-x-auto scrollbar-none animate-slide-up">
          {/* Kantong 1: Catatan Aktif */}
          <button
            type="button"
            onClick={() => {
              setActivePocket("active");
              resetFilters();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activePocket === "active"
                ? "bg-white text-primary shadow-xs ring-1 ring-black/5"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Catatan Aktif</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activePocket === "active" ? "bg-primary/10 text-primary" : "bg-gray-200 text-gray-600"
              }`}
            >
              {pocketCounts.active}
            </span>
          </button>

          {/* Kantong 2: Disematkan */}
          <button
            type="button"
            onClick={() => {
              setActivePocket("pinned");
              resetFilters();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activePocket === "pinned"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-gray-600 hover:text-amber-600 hover:bg-gray-200/60"
            }`}
          >
            <Star className={`w-4 h-4 ${activePocket === "pinned" ? "fill-white" : ""}`} />
            <span>Disematkan</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activePocket === "pinned" ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              {pocketCounts.pinned}
            </span>
          </button>

          {/* Kantong 3: Arsip */}
          <button
            type="button"
            onClick={() => {
              setActivePocket("archived");
              resetFilters();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activePocket === "archived"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-600 hover:text-indigo-600 hover:bg-gray-200/60"
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Kantong Arsip</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activePocket === "archived" ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              {pocketCounts.archived}
            </span>
          </button>

          {/* Kantong 4: Sampah / Recently Deleted */}
          <button
            type="button"
            onClick={() => {
              setActivePocket("trash");
              resetFilters();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activePocket === "trash"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-gray-600 hover:text-rose-600 hover:bg-gray-200/60"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Sampah (Deleted)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activePocket === "trash" ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              {pocketCounts.trash}
            </span>
          </button>
        </div>

        {/* ── POCKET BANNER: ARSIP ── */}
        {activePocket === "archived" && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-indigo-50/40 to-white border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-inner shrink-0">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-indigo-950">
                  Kantong Arsip Catatan ({pocketCounts.archived})
                </h3>
                <p className="text-xs text-indigo-800/80 mt-0.5 leading-relaxed">
                  Catatan yang tersimpan rapi untuk referensi mendatang tanpa memenuhi daftar kerja aktif Anda.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── POCKET BANNER: SAMPAH / RECENTLY DELETED ── */}
        {activePocket === "trash" && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-50/90 via-rose-50/40 to-white border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-inner shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-rose-950">
                  Kantong Sampah / Baru Dihapus ({pocketCounts.trash})
                </h3>
                <p className="text-xs text-rose-800/80 mt-0.5 leading-relaxed">
                  Catatan di tempat sampah akan otomatis dihapus permanen oleh sistem setelah 3 hari jika tidak dipulihkan.
                </p>
              </div>
            </div>

            {pocketCounts.trash > 0 && (
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setEmptyTrashModalOpen(true)}
                className="cursor-pointer font-bold shadow-xs whitespace-nowrap"
              >
                Kosongkan Tempat Sampah
              </Button>
            )}
          </div>
        )}

        {/* Stats Bento Strip (Only in Active / Pinned View) */}
        {(activePocket === "active" || activePocket === "pinned") && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 animate-slide-up" suppressHydrationWarning>
            {/* Total Notes */}
            <div className="bg-white rounded-2xl p-4 border border-border shadow-xs hover:border-primary/40 transition-all duration-200" suppressHydrationWarning>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Total Aktif</span>
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5" suppressHydrationWarning>
                <span className="text-xl font-bold text-gray-900">{stats.total}</span>
                <span className="text-xs text-gray-400">dokumen</span>
              </div>
            </div>

            {/* Pinned Notes */}
            <div
              onClick={() => setActivePocket(activePocket === "pinned" ? "active" : "pinned")}
              className={`bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer ${
                activePocket === "pinned"
                  ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/20"
                  : "border-border hover:border-amber-300"
              }`}
              suppressHydrationWarning
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Disematkan</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Star className={`w-4 h-4 ${stats.pinned > 0 ? "fill-amber-500" : ""}`} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5" suppressHydrationWarning>
                <span className="text-xl font-bold text-amber-700">{stats.pinned}</span>
                <span className="text-xs text-gray-400">prioritas</span>
              </div>
            </div>

            {/* Topics & Tags */}
            <div className="bg-white rounded-2xl p-4 border border-border shadow-xs hover:border-indigo-200 transition-all duration-200" suppressHydrationWarning>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Kategori / Tag</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <TagIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5" suppressHydrationWarning>
                <span className="text-xl font-bold text-indigo-950">{stats.tagsCount}</span>
                <span className="text-xs text-gray-400">topik unik</span>
              </div>
            </div>

            {/* Total Words & Read Time */}
            <div className="bg-white rounded-2xl p-4 border border-border shadow-xs hover:border-blue-200 transition-all duration-200" suppressHydrationWarning>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Total Materi</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5" suppressHydrationWarning>
                <span className="text-xl font-bold text-gray-900">
                  {stats.totalWords > 999 ? `${(stats.totalWords / 1000).toFixed(1)}k` : stats.totalWords}
                </span>
                <span className="text-xs text-gray-400">kata (~{stats.totalReadMins}m)</span>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar: Search, Filters & View Mode */}
        <div className="bg-white rounded-2xl border border-border p-4 shadow-xs space-y-3.5 animate-scale-in" suppressHydrationWarning>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Box */}
            <div className="flex-1 relative">
              <Input
                placeholder={`Cari di ${
                  activePocket === "archived"
                    ? "kantong arsip..."
                    : activePocket === "trash"
                    ? "kantong sampah..."
                    : "catatan belajar..."
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
                className="w-full bg-gray-50/60 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Controls: Sorting & View Mode */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-11 pl-3.5 pr-9 rounded-xl border border-border bg-gray-50/60 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer hover:bg-white transition-colors"
                >
                  <option value="updated-desc">Terakhir Diperbarui</option>
                  <option value="created-desc">Tanggal Dibuat</option>
                  <option value="title-asc">Judul (A-Z)</option>
                  <option value="title-desc">Judul (Z-A)</option>
                  <option value="words-desc">Paling Panjang</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-border" suppressHydrationWarning>
                <button
                  type="button"
                  onClick={() => handleToggleViewMode("grid")}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    (mounted ? viewMode : "grid") === "grid"
                      ? "bg-white text-primary shadow-xs font-bold"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleViewMode("list")}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    (mounted ? viewMode : "grid") === "list"
                      ? "bg-white text-primary shadow-xs font-bold"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                  title="List View"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Tag Pills Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs" suppressHydrationWarning>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer ${
                selectedTag === null
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Semua ({filteredAndSortedNotes.length})
            </button>

            {tagCounts.map(([tag, count]) => {
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(isActive ? null : tag)}
                  className={`px-3 py-1.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    isActive
                      ? "bg-primary text-white font-semibold shadow-xs"
                      : "bg-gray-50 border border-border text-gray-600 hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  <span>#{tag}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {(selectedTag !== null || searchQuery.trim()) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-gray-400 hover:text-red-500 font-medium px-2 py-1 flex items-center gap-1 shrink-0 cursor-pointer ml-auto"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Content Section: Empty vs Grid vs List */}
        {filteredAndSortedNotes.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-5 animate-scale-in shadow-xs" suppressHydrationWarning>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/20 flex items-center justify-center mx-auto text-primary">
              {activePocket === "archived" ? (
                <Archive className="w-8 h-8 text-indigo-600" />
              ) : activePocket === "trash" ? (
                <Trash2 className="w-8 h-8 text-rose-600" />
              ) : (
                <Sparkles className="w-8 h-8" />
              )}
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="font-bold text-gray-800 text-lg">
                {searchQuery || selectedTag
                  ? "Tidak Ada Catatan yang Cocok"
                  : activePocket === "archived"
                  ? "Kantong Arsip Masih Kosong"
                  : activePocket === "trash"
                  ? "Tempat Sampah Bersih"
                  : activePocket === "pinned"
                  ? "Belum Ada Catatan Disematkan"
                  : "Belum Ada Catatan"}
              </h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                {searchQuery || selectedTag
                  ? "Tidak menemukan catatan dengan kriteria yang dipilih. Coba sesuaikan kata kunci atau bersihkan filter."
                  : activePocket === "archived"
                  ? "Catatan yang Anda arsipkan akan tersimpan rapi di kantong ini."
                  : activePocket === "trash"
                  ? "Tidak ada catatan yang berada di tempat sampah saat ini."
                  : activePocket === "pinned"
                  ? "Sematkan catatan prioritas Anda dengan ikon bintang agar muncul di sini."
                  : "Mulai tulis rangkuman materi, ringkasan belajar, atau ide pentingmu agar tersimpan rapi dan mudah diakses."}
              </p>
            </div>
            <div>
              {searchQuery || selectedTag ? (
                <Button variant="secondary" size="sm" icon={<RotateCcw className="w-4 h-4" />} onClick={resetFilters}>
                  Bersihkan Filter
                </Button>
              ) : activePocket === "active" ? (
                <Button
                  variant="primary"
                  size="md"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setModalOpen(true)}
                  className="cursor-pointer"
                >
                  Buat Catatan Pertamamu
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActivePocket("active")}
                  className="cursor-pointer"
                >
                  Kembali ke Catatan Aktif
                </Button>
              )}
            </div>
          </div>
        ) : (mounted ? viewMode : "grid") === "grid" ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-scale-in" suppressHydrationWarning>
            {filteredAndSortedNotes.map((note) => {
              const isPinned = !!note.isPinned;
              const isArchived = !!note.isArchived;
              const isTrashed = !!note.isTrashed;
              const words = countWords(note.content);
              const readTime = estimateReadingTime(words);
              const isCopied = copiedId === note.id;

              return (
                <div
                  key={note.id}
                  className={`bg-white rounded-2xl border p-5 transition-all duration-300 h-76 flex flex-col justify-between relative overflow-hidden group ${
                    isTrashed
                      ? "border-rose-200 bg-rose-50/15 hover:border-rose-300 hover:shadow-card-hover"
                      : isArchived
                      ? "border-indigo-200 bg-indigo-50/15 hover:border-indigo-300 hover:shadow-card-hover"
                      : isPinned
                      ? "border-amber-300 bg-gradient-to-b from-amber-50/30 via-white to-white shadow-xs hover:border-amber-400 hover:shadow-card-hover"
                      : "border-border hover:border-primary/50 hover:shadow-card-hover"
                  }`}
                  suppressHydrationWarning
                >
                  {/* Top Accent Strip */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 transition-colors ${
                      isTrashed
                        ? "bg-rose-400"
                        : isArchived
                        ? "bg-indigo-400"
                        : isPinned
                        ? "bg-gradient-to-r from-amber-400 to-yellow-300"
                        : "bg-transparent group-hover:bg-primary/50"
                    }`}
                  />

                  <div>
                    {/* Card Header Info & Quick Actions */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {/* Reading Time or Trash Countdown Badge */}
                      {isTrashed ? (
                        <div
                          className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                            getRemainingTrashDays(note.trashedAt, note.updatedAt).urgent
                              ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{getRemainingTrashDays(note.trashedAt, note.updatedAt).text}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{readTime}</span>
                          <span className="text-gray-300">•</span>
                          <span>{words} kata</span>
                        </div>
                      )}

                      {/* Action Buttons Depending on Pocket */}
                      <div className="flex items-center gap-1 z-10 -mr-1">
                        {/* TRASH POCKET ACTIONS */}
                        {isTrashed ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleRestoreNote(e, note)}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              title="Pulihkan Catatan"
                            >
                              <Undo2 className="w-3 h-3" />
                              <span>Pulihkan</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handlePermanentDeleteClick(e, note)}
                              className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Permanen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : isArchived ? (
                          /* ARCHIVED POCKET ACTIONS */
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleToggleArchive(e, note)}
                              className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              title="Keluarkan dari Arsip"
                            >
                              <ArchiveRestore className="w-3 h-3" />
                              <span>Buka Arsip</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleMoveToTrash(e, note)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Buang ke Sampah"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          /* ACTIVE / PINNED POCKET ACTIONS */
                          <>
                            {/* Copy Snippet */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyNote(e, note)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Salin isi catatan"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Pin Toggle */}
                            <button
                              type="button"
                              onClick={(e) => handleTogglePin(e, note.id, isPinned)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isPinned
                                  ? "text-amber-500 bg-amber-100/90 hover:bg-amber-200"
                                  : "text-gray-400 hover:text-amber-500 hover:bg-amber-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                              }`}
                              title={isPinned ? "Lepas sematan" : "Sematkan ke atas"}
                            >
                              <Star className={`w-3.5 h-3.5 ${isPinned ? "fill-amber-400 text-amber-500" : ""}`} />
                            </button>

                            {/* Archive */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleArchive(e, note)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Pindahkan ke Kantong Arsip"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>

                            {/* Soft Delete to Trash */}
                            <button
                              type="button"
                              onClick={(e) => handleMoveToTrash(e, note)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Buang ke Kantong Sampah"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Note Click Link */}
                    <Link
                      href={isTrashed ? "#" : `/notes/${note.id}`}
                      className={`block focus:outline-none ${isTrashed ? "cursor-default" : ""}`}
                    >
                      {/* Note Title */}
                      <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-primary transition-colors line-clamp-2 mt-1">
                        <Highlight text={note.title || "Untitled Note"} query={searchQuery} />
                      </h3>

                      {/* Note Excerpt */}
                      <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed font-sans">
                        <Highlight
                          text={stripHtml(note.content) || "Belum ada isi catatan..."}
                          query={searchQuery}
                        />
                      </p>
                    </Link>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-gray-100/80 mt-auto flex items-center justify-between gap-2" suppressHydrationWarning>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 items-center max-w-[65%] overflow-hidden">
                      {note.tags && note.tags.length > 0 ? (
                        note.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md truncate max-w-[100px]"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Tanpa tag</span>
                      )}
                      {note.tags && note.tags.length > 2 && (
                        <span className="text-[10px] font-bold text-gray-400">
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Updated Date & Action Link */}
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium shrink-0" suppressHydrationWarning>
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span suppressHydrationWarning>{formatDateIndo(note.updatedAt || note.createdAt)}</span>
                      {!isTrashed && (
                        <Link href={`/notes/${note.id}`} className="text-primary hover:underline">
                          <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white rounded-2xl border border-border shadow-xs divide-y divide-gray-100 overflow-hidden animate-scale-in" suppressHydrationWarning>
            {filteredAndSortedNotes.map((note) => {
              const isPinned = !!note.isPinned;
              const isArchived = !!note.isArchived;
              const isTrashed = !!note.isTrashed;
              const words = countWords(note.content);
              const readTime = estimateReadingTime(words);
              const isCopied = copiedId === note.id;

              return (
                <div
                  key={note.id}
                  className={`group p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:bg-gray-50/80 ${
                    isTrashed ? "bg-rose-50/20" : isArchived ? "bg-indigo-50/20" : isPinned ? "bg-amber-50/20" : ""
                  }`}
                  suppressHydrationWarning
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isPinned && !isTrashed && !isArchived && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Pin
                        </span>
                      )}
                      {isArchived && (
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <Archive className="w-3 h-3" /> Arsip
                        </span>
                      )}
                      {isTrashed && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${
                            getRemainingTrashDays(note.trashedAt, note.updatedAt).urgent
                              ? "bg-rose-200 text-rose-900 border border-rose-300 animate-pulse"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <Trash2 className="w-3 h-3" /> {getRemainingTrashDays(note.trashedAt, note.updatedAt).text}
                        </span>
                      )}
                      <Link
                        href={isTrashed ? "#" : `/notes/${note.id}`}
                        className={`font-bold text-gray-900 text-sm hover:text-primary transition-colors truncate block ${
                          isTrashed ? "cursor-default" : ""
                        }`}
                      >
                        <Highlight text={note.title || "Untitled Note"} query={searchQuery} />
                      </Link>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-1">
                      <Highlight text={stripHtml(note.content) || "Belum ada isi..."} query={searchQuery} />
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 font-medium flex-wrap">
                      <span>{readTime}</span>
                      <span>•</span>
                      <span>{words} kata</span>
                      <span>•</span>
                      <span>Diperbarui {formatDateIndo(note.updatedAt || note.createdAt)}</span>
                      {note.tags && note.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            {note.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    {isTrashed ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Undo2 className="w-3.5 h-3.5" />}
                          onClick={(e) => handleRestoreNote(e, note)}
                        >
                          Pulihkan
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={(e) => handlePermanentDeleteClick(e, note)}
                        >
                          Hapus
                        </Button>
                      </>
                    ) : isArchived ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<ArchiveRestore className="w-3.5 h-3.5" />}
                          onClick={(e) => handleToggleArchive(e, note)}
                        >
                          Buka Arsip
                        </Button>
                        <button
                          type="button"
                          onClick={(e) => handleMoveToTrash(e, note)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Buang ke Sampah"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleCopyNote(e, note)}
                          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                          title="Salin isi catatan"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(e, note.id, isPinned)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            isPinned ? "text-amber-500 bg-amber-50" : "text-gray-400 hover:text-amber-500 hover:bg-gray-100"
                          }`}
                          title={isPinned ? "Lepas sematan" : "Sematkan"}
                        >
                          <Star className={`w-4 h-4 ${isPinned ? "fill-amber-400" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleArchive(e, note)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                          title="Arsipkan"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleMoveToTrash(e, note)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Buang ke Sampah"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Link href={`/notes/${note.id}`}>
                          <Button variant="primary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                            Buka
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE NOTE MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => !submitting && setModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-border animate-scale-in z-10 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Buat Catatan Baru</h3>
                <p className="text-xs text-gray-500 mt-0.5">Pilih format catatan atau mulai dari lembar kosong</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Selector */}
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((tpl) => {
                const isActive = activeTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isActive
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                        : "border-border text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isActive ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"}`}>
                      {tpl.icon}
                    </div>
                    <span className="text-xs font-semibold">{tpl.name}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Judul Catatan</label>
                <Input
                  placeholder="Misal: Rangkuman Struktur Data Pertemuan 3..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Kategori / Tag (Pisahkan koma)</label>
                <Input
                  placeholder="informatika, semester4, uas"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  className="w-full text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submitting}
                  icon={<Plus className="w-4 h-4" />}
                  className="cursor-pointer font-bold shadow-sm"
                >
                  Buka & Mulai Tulis
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PERMANENT DELETE SINGLE NOTE MODAL ── */}
      <WarningModal
        isOpen={!!deleteTarget}
        title="Hapus Catatan Permanen?"
        description={`Catatan "${deleteTarget?.title || "Untitled Note"}" akan dimusnahkan secara permanen dari server dan tidak dapat dipulihkan lagi.`}
        confirmText="Hapus Permanen"
        cancelText="Batalkan"
        onConfirm={handleConfirmPermanentDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* ── EMPTY TRASH MODAL ── */}
      <WarningModal
        isOpen={emptyTrashModalOpen}
        title="Kosongkan Semua Tempat Sampah?"
        description={`Seluruh ${pocketCounts.trash} catatan di kantong sampah akan dimusnahkan secara permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Kosongkan Sampah"
        cancelText="Batalkan"
        onConfirm={handleEmptyTrash}
        onClose={() => setEmptyTrashModalOpen(false)}
      />
    </DashboardShell>
  );
}
