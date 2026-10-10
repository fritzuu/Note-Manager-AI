"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Trash2, X, FileText, Star, LayoutGrid, List as ListIcon, Check, Copy, ArrowRight, Archive, Undo2, MoreHorizontal, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotes,
  createNote,
  deleteNote,
  updateNote,
  type NoteDocument,
} from "@/lib/firestore";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { WarningModal } from "@/components/ui/WarningModal";
import { ErrorState } from "@/components/ui/ErrorState";
import { useMounted } from "@/hooks/useMounted";
import { Dropdown } from "@/components/ui/Dropdown";
import ns from "@/components/notes/notes-collection.module.css";

type SortOption = "updated-desc" | "created-desc" | "title-asc" | "title-desc" | "words-desc";
type ViewMode = "grid" | "list";
type PocketType = "active" | "pinned" | "archived" | "trash";

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
  const [deleteTarget, setDeleteTarget] = useState<NoteDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emptyTrashModalOpen, setEmptyTrashModalOpen] = useState(false);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const creatingRef = useRef(false);
  const collectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      for (const menu of collectionRef.current?.querySelectorAll<HTMLDetailsElement>("details[open]") || []) {
        if (!menu.contains(event.target as Node)) menu.open = false;
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const menu = collectionRef.current?.querySelector<HTMLDetailsElement>("details[open]");
      if (menu) { menu.open = false; menu.querySelector<HTMLElement>("summary")?.focus(); }
    };
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeMenus); document.removeEventListener("keydown", escape); };
  }, []);

  // Load ViewMode preference from localStorage safely after mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("notes_view_mode") as ViewMode | null;
        if (saved === "grid" || saved === "list") setViewMode(saved);
      } catch { /* Default view remains available. */ }
    }
  }, []);

  const handleToggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      try { localStorage.setItem("notes_view_mode", mode); } catch { /* The current view still changes. */ }
    }
  };

  const loadNotes = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserNotes(uid);
      const sanitized = (data || []).map((n) => ({
        ...n,
        title: n.title || "Tanpa judul",
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
  const handleCreateNote = async () => {
    if (!user || creatingRef.current) return;
    creatingRef.current = true; setSubmitting(true); setCreateError("");
    try {
      const noteId = await createNote(user.uid, "", "", []);
      router.push(`/notes/${noteId}`);
    } catch {
      setCreateError("Catatan belum bisa dibuat. Coba lagi.");
      creatingRef.current = false; setSubmitting(false);
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

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "updated-desc", label: "Terakhir diperbarui" }, { value: "created-desc", label: "Terbaru dibuat" },
    { value: "title-asc", label: "Judul A–Z" }, { value: "title-desc", label: "Judul Z–A" }, { value: "words-desc", label: "Isi terpanjang" },
  ];
  const action = (event: React.MouseEvent<HTMLButtonElement>, callback: () => void) => {
    const details = event.currentTarget.closest("details");
    callback(); if (details) details.open = false;
  };
  const emptyLabel = searchQuery || selectedTag ? "Catatan tidak ditemukan" : activePocket === "archived" ? "Belum ada catatan di arsip" : activePocket === "trash" ? "Sampah kosong" : activePocket === "pinned" ? "Belum ada catatan disematkan" : "Belum ada catatan";
  const mode = mounted ? viewMode : "grid";

  return <DashboardShell>
    <div ref={collectionRef} className={ns.collection}>
      <header className={ns.header}><div><h1>Catatan</h1><p>{pocketCounts.active} catatan tersimpan</p></div><button type="button" className={ns.create} disabled={submitting} onClick={handleCreateNote}>{submitting ? <Loader2 size={17} className="animate-spin" /> : <Plus size={18} />}{submitting ? "Membuka…" : "Catatan baru"}</button></header>
      {createError && <p className={ns.error} role="alert">{createError}<button type="button" onClick={handleCreateNote}>Coba lagi</button></p>}
      <nav className={ns.tabs} aria-label="Koleksi catatan">{([
        ["active", "Semua", pocketCounts.active], ["pinned", "Disematkan", pocketCounts.pinned], ["archived", "Arsip", pocketCounts.archived], ["trash", "Sampah", pocketCounts.trash],
      ] as const).map(([pocket, label, count]) => <button key={pocket} type="button" aria-pressed={activePocket === pocket} onClick={() => { setActivePocket(pocket); resetFilters(); }}>{label}<span>{count}</span></button>)}</nav>
      <div className={ns.tools}>
        <label className={ns.search}><Search size={18} /><input aria-label="Cari catatan" placeholder="Cari judul atau isi catatan…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />{searchQuery && <button type="button" aria-label="Hapus pencarian" onClick={() => setSearchQuery("")}><X size={16} /></button>}</label>
        <div className={ns.controls}><Dropdown label="Urutkan catatan" value={sortBy} options={sortOptions} onChange={value => setSortBy(value as SortOption)} /><div className={ns.view} aria-label="Tampilan koleksi"><button type="button" title="Tampilan kartu" aria-label="Tampilan kartu" aria-pressed={mode === "grid"} onClick={() => handleToggleViewMode("grid")}><LayoutGrid size={18} /></button><button type="button" title="Tampilan daftar" aria-label="Tampilan daftar" aria-pressed={mode === "list"} onClick={() => handleToggleViewMode("list")}><ListIcon size={18} /></button></div></div>
      </div>
      {!!tagCounts.length && <div className={ns.tags} aria-label="Filter tag"><button type="button" aria-pressed={!selectedTag} onClick={() => setSelectedTag(null)}>Semua tag</button>{tagCounts.map(([tag, count]) => <button key={tag} type="button" aria-pressed={selectedTag === tag} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}>{tag}<span>{count}</span></button>)}</div>}
      {activePocket === "trash" && pocketCounts.trash > 0 && <div className={ns.trashNotice}><p>Catatan di sampah akan dihapus permanen setelah 3 hari.</p><button type="button" onClick={() => setEmptyTrashModalOpen(true)}>Kosongkan sampah</button></div>}
      {(searchQuery || selectedTag) && <div className={ns.results}><span>{filteredAndSortedNotes.length} catatan ditemukan</span><button type="button" onClick={resetFilters}>Hapus filter<X size={13} /></button></div>}
      {copiedId && <p className={ns.srOnly} role="status">Isi catatan disalin.</p>}
      {filteredAndSortedNotes.length ? <div className={ns.notes} data-view={mode}>{filteredAndSortedNotes.map(note => {
        const words = countWords(note.content);
        const name = !note.title || note.title === "Untitled Note" ? "Tanpa judul" : note.title;
        return <article key={note.id} className={ns.card} data-pinned={!!note.isPinned}>
          <details className={ns.noteMenu}><summary aria-label={`Tindakan untuk ${name}`} title="Tindakan catatan"><MoreHorizontal size={19} /></summary><div className={ns.noteActions}>
            {note.isTrashed ? <><button type="button" onClick={event => action(event, () => void handleRestoreNote(event, note))}><Undo2 size={16} />Pulihkan</button><button type="button" className={ns.danger} onClick={event => action(event, () => handlePermanentDeleteClick(event, note))}><Trash2 size={16} />Hapus permanen</button></> : <>
              <button type="button" onClick={event => action(event, () => void handleCopyNote(event, note))}>{copiedId === note.id ? <Check size={16} /> : <Copy size={16} />}Salin isi</button>
              {!note.isArchived && <button type="button" onClick={event => action(event, () => void handleTogglePin(event, note.id, !!note.isPinned))}><Star size={16} />{note.isPinned ? "Lepas sematan" : "Sematkan"}</button>}
              <button type="button" onClick={event => action(event, () => void handleToggleArchive(event, note))}><Archive size={16} />{note.isArchived ? "Keluarkan dari arsip" : "Arsipkan"}</button>
              <button type="button" className={ns.danger} onClick={event => action(event, () => void handleMoveToTrash(event, note))}><Trash2 size={16} />Pindahkan ke sampah</button>
            </>}
          </div></details>
          <Link href={`/notes/${note.id}`} className={ns.noteBody}><h2>{note.isPinned && !note.isTrashed && <Star size={14} className={ns.pin} aria-label="Disematkan" />}<Highlight text={name} query={searchQuery} /></h2><p className={ns.preview} data-empty={!words}><Highlight text={stripHtml(note.content) || "Catatan kosong"} query={searchQuery} /></p></Link>
          {!!note.tags.length && <div className={ns.noteTags}>{note.tags.slice(0, 2).map(tag => <button type="button" key={tag} onClick={() => setSelectedTag(tag)}>{tag}</button>)}{note.tags.length > 2 && <span>+{note.tags.length - 2}</span>}</div>}
          <footer className={ns.noteFooter}><span>{note.isTrashed ? getRemainingTrashDays(note.trashedAt, note.updatedAt).text : formatDateIndo(note.updatedAt || note.createdAt)}</span>{words > 0 && <span>{words.toLocaleString("id-ID")} kata</span>}<Link href={`/notes/${note.id}`} aria-label={`Buka ${name}`}><ArrowRight size={16} /></Link></footer>
        </article>;
      })}</div> : <div className={ns.empty}><FileText size={32} strokeWidth={1.3} /><h2>{emptyLabel}</h2>{searchQuery || selectedTag ? <button type="button" className={ns.secondary} onClick={resetFilters}>Hapus filter</button> : activePocket === "active" ? <button type="button" className={ns.create} disabled={submitting} onClick={handleCreateNote}><Plus size={17} />Catatan baru</button> : <button type="button" className={ns.secondary} onClick={() => { setActivePocket("active"); resetFilters(); }}>Buka semua catatan</button>}</div>}
    </div>
    <WarningModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleConfirmPermanentDelete} isLoading={isDeleting} title="Hapus catatan permanen?" description="Isi catatan akan dihapus dan tidak bisa dipulihkan." confirmText="Hapus permanen" cancelText="Batal" variant="danger" />
    <WarningModal isOpen={emptyTrashModalOpen} onClose={() => setEmptyTrashModalOpen(false)} onConfirm={handleEmptyTrash} isLoading={isEmptyingTrash} title="Kosongkan sampah?" description="Semua catatan di sampah akan dihapus permanen dan tidak bisa dipulihkan." confirmText="Kosongkan sampah" cancelText="Batal" variant="danger" />
  </DashboardShell>;
}
