"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  ChevronRight,
  Brain,
  ListPlus,
  RefreshCw,
  Tag,
  Star,
  Archive,
  Trash2,
  Copy,
  Download,
  Upload,
  X,
  FileText,
  Loader2,
  Plus,
  Search,
  Menu,
  ChevronLeft,
  FileDown,
  Paperclip,
  Bookmark,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNote,
  updateNote,
  getNoteSummary,
  saveNoteSummary,
  getUserNotes,
  createNote,
  deleteNote,
  duplicateNote,
  type NoteDocument,
  type NoteAttachment,
} from "@/lib/firestore";
import { getCustomApiKey, getAiProvider, getOpenRouterModel } from "@/lib/aiConfig";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { WarningModal } from "@/components/ui/WarningModal";
import { TiptapEditor } from "@/components/notes/TiptapEditor";
// Firebase Storage imports removed - local upload endpoint is used instead

interface ParsedSummary {
  keyConcepts: string[];
  importantPoints: string[];
  summaryText: string;
  conclusionText: string;
  suggestedQuestions: string[];
}

export default function NoteDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const routeParams = useParams();
  const noteId = (routeParams?.id as string) || "";

  const [noteError, setNoteError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ParsedSummary | null>(null);

  // Note Document state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isTrashed, setIsTrashed] = useState(false);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);

  // List of all user notes (sidebar list)
  const [allNotes, setAllNotes] = useState<NoteDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<"all" | "pinned" | "archived" | "trashed">("all");

  // Layout states
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [permanentDeleteModalOpen, setPermanentDeleteModalOpen] = useState(false);
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreMenuOpen]);

  // Adjust default sidebar visibility based on screen width on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setLeftSidebarOpen(false);
    }
  }, []);

  // Loaders & Save statuses
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [summarizing, setSummarizing] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Statistics
  const [stats, setStats] = useState({ words: 0, characters: 0, readingTime: 1 });

  // Floating notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Hidden Markdown input
  const mdInputRef = useRef<HTMLInputElement>(null);

  // Debounced auto-save timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Load workspace & note details
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const loadWorkspace = async (nId: string) => {
      setLoading(true);
      setNoteError(null);
      try {
        // Fetch active note
        const noteDoc = await getNote(nId);
        if (!noteDoc) {
          setNoteError("Catatan ini tidak dapat ditemukan atau telah dihapus.");
          return;
        }

        setTitle(noteDoc.title || "Untitled Note");
        setContent(noteDoc.content || "");
        setTagsStr(Array.isArray(noteDoc.tags) ? noteDoc.tags.join(", ") : "");
        setIsPinned(Boolean(noteDoc.isPinned));
        setIsArchived(Boolean(noteDoc.isArchived));
        setIsTrashed(Boolean(noteDoc.isTrashed));
        setAttachments(Array.isArray(noteDoc.attachments) ? noteDoc.attachments : []);

        // Load summaries
        const summaryDoc = await getNoteSummary(nId).catch(() => null);
        if (summaryDoc) {
          try {
            const parsed = JSON.parse(summaryDoc.summary);
            setSummary(parsed);
          } catch {
            setSummary({
              keyConcepts: [],
              importantPoints: [],
              summaryText: summaryDoc.summary,
              conclusionText: "",
              suggestedQuestions: [],
            });
          }
        } else {
          setSummary(null);
        }

        // Fetch sidebar notes safely
        const notesList = await getUserNotes(user.uid).catch(() => []);
        const sanitizedList = (notesList || []).map((n) => ({
          ...n,
          title: n.title || "Untitled Note",
          content: n.content || "",
          tags: Array.isArray(n.tags) ? n.tags : [],
          isPinned: Boolean(n.isPinned),
          isArchived: Boolean(n.isArchived),
          isTrashed: Boolean(n.isTrashed),
        }));
        setAllNotes(sanitizedList);
      } catch (err) {
        console.error("Failed to load note detail workspace:", err);
        setNoteError("Terjadi kesalahan saat memuat catatan. Periksa koneksi internet Anda.");
      } finally {
        setLoading(false);
      }
    };

    if (noteId) {
      loadWorkspace(noteId);
    }
  }, [user, authLoading, noteId, router]);

  // Handle Note Save updates
  const handleSave = async (
    updatedTitle = title,
    updatedContent = content,
    updatedTagsStr = tagsStr
  ) => {
    if (!noteId) return;
    setSaveStatus("saving");
    try {
      const tags = updatedTagsStr
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const cleanTitle = updatedTitle.trim().slice(0, 199) || "Untitled Note";

      await updateNote(noteId, {
        title: cleanTitle,
        content: updatedContent,
        tags: tags,
      });

      // Local state updates for sidebar sync
      setAllNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? {
                ...n,
                title: cleanTitle,
                content: updatedContent,
                tags: tags,
                updatedAt: { seconds: Date.now() / 1000 },
              }
            : n
        )
      );

      setSaveStatus("saved");
    } catch (err) {
      console.error("Failed to save note update:", err);
      setSaveStatus("unsaved");
      showToast("Auto-save failed", "error");
    }
  };

  // Input changes with debounce auto-save
  const triggerInputChange = (field: "title" | "tags", value: string) => {
    setSaveStatus("unsaved");
    let currentTitle = title;
    let currentTagsStr = tagsStr;

    if (field === "title") {
      setTitle(value);
      currentTitle = value;
    } else if (field === "tags") {
      setTagsStr(value);
      currentTagsStr = value;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      handleSave(currentTitle, content, currentTagsStr);
    }, 2000);
  };

  // Editor content updates (called by Tiptap)
  const handleEditorChange = (newHtml: string) => {
    setContent(newHtml);
    setSaveStatus("unsaved");

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      handleSave(title, newHtml, tagsStr);
    }, 2000);
  };

  // Quick create note from Sidebar
  const handleCreateNoteFromSidebar = async () => {
    if (!user) return;
    try {
      const newId = await createNote(user.uid, "Untitled Note", "", []);
      showToast("New note created");
      router.push(`/notes/${newId}`);
    } catch (err) {
      console.error("Failed to create note:", err);
      showToast("Create failed", "error");
    }
  };

  // Pin toggle
  const handleTogglePin = async () => {
    if (!noteId) return;
    const nextVal = !isPinned;
    setIsPinned(nextVal);
    setAllNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, isPinned: nextVal } : n)));
    await updateNote(noteId, { isPinned: nextVal });
    showToast(nextVal ? "Added to pinned favorites" : "Removed from pinned favorites");
  };

  // Archive toggle
  const handleToggleArchive = async () => {
    if (!noteId) return;
    const nextVal = !isArchived;
    setIsArchived(nextVal);
    setAllNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, isArchived: nextVal } : n)));
    await updateNote(noteId, { isArchived: nextVal });
    showToast(nextVal ? "Note archived" : "Note unarchived");
  };

  // Trash toggle
  const handleToggleTrash = async () => {
    if (!noteId) return;
    const nextVal = !isTrashed;
    setIsTrashed(nextVal);
    setAllNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, isTrashed: nextVal } : n)));
    await updateNote(noteId, { isTrashed: nextVal });
    showToast(nextVal ? "Note moved to Trash" : "Note restored from Trash");
    if (nextVal) {
      router.push("/notes");
    }
  };

  // Permanent delete note
  const handlePermanentDelete = () => {
    setPermanentDeleteModalOpen(true);
  };

  const handleConfirmPermanentDelete = async () => {
    if (!noteId) return;
    setIsPermanentlyDeleting(true);
    try {
      await deleteNote(noteId);
      showToast("Catatan berhasil dihapus permanen");
      router.push("/notes");
    } catch (err) {
      console.error("Delete note error:", err);
      showToast("Gagal menghapus catatan", "error");
    } finally {
      setIsPermanentlyDeleting(false);
      setPermanentDeleteModalOpen(false);
    }
  };

  // Duplicate active note
  const handleDuplicateNote = async () => {
    if (!noteId || !user) return;
    try {
      const activeDoc: NoteDocument = {
        id: noteId,
        userId: user.uid,
        title,
        content,
        tags: tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isPinned,
        isArchived,
        isTrashed,
        attachments,
      };

      const newId = await duplicateNote(activeDoc);
      showToast("Note duplicated successfully");
      router.push(`/notes/${newId}`);
    } catch (err) {
      console.error("Duplicate note error:", err);
      showToast("Duplication failed", "error");
    }
  };

  // File Upload Attachment Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !noteId) return;

    setFileUploading(true);
    setUploadProgress(20);
    try {
      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(50);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Local upload failed");
      }

      setUploadProgress(90);
      const data = await res.json();
      const newAttachment: NoteAttachment = {
        name: file.name,
        url: data.url,
        size: file.size,
        type: file.type || "application/octet-stream",
      };

      const updatedList = [...attachments, newAttachment];
      setAttachments(updatedList);
      await updateNote(noteId, { attachments: updatedList });
      setUploadProgress(100);
      showToast("Attachment uploaded");
    } catch (err) {
      console.warn("Local upload failed, converting attachment to local Base64 URL:", err);
      // Fallback: Read file as Base64 data URL and save as attachment
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Url = event.target?.result as string;
        if (base64Url) {
          const newAttachment: NoteAttachment = {
            name: file.name,
            url: base64Url,
            size: file.size,
            type: file.type || "application/octet-stream",
          };

          const updatedList = [...attachments, newAttachment];
          setAttachments(updatedList);
          await updateNote(noteId, { attachments: updatedList });
          showToast("Saved locally (Base64)");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setFileUploading(false);
      e.target.value = "";
    }
  };

  // Delete File Attachment
  const handleDeleteAttachment = async (idx: number) => {
    if (!noteId) return;
    try {
      const updatedList = attachments.filter((_, i) => i !== idx);
      setAttachments(updatedList);
      await updateNote(noteId, { attachments: updatedList });
      showToast("Attachment deleted");
    } catch (err) {
      console.error("Delete attachment error:", err);
      showToast("Failed to delete attachment", "error");
    }
  };

  // AI Summary Generation
  const handleGenerateSummary = async () => {
    if (!noteId || !user) return;
    if (!content.trim()) {
      showToast("Note content is empty", "error");
      return;
    }

    setSummarizing(true);
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

      const res = await fetch("/api/notes/summarize", {
        method: "POST",
        headers,
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        throw new Error("Failed to summarize");
      }

      const parsed = await res.json();
      setSummary(parsed);

      await saveNoteSummary(noteId, user.uid, JSON.stringify(parsed));
      showToast("AI Summary generated");
    } catch (err) {
      console.error("Generate summary error:", err);
      showToast("Failed to generate summary", "error");
    } finally {
      setSummarizing(false);
    }
  };

  // Note Exports
  const handleExportPdf = () => {
    window.print();
  };

  const handleExportMarkdown = () => {
    let md = `# ${title || "Untitled Note"}\n\n`;
    if (tagsStr) {
      md += `Tags: ${tagsStr}\n\n`;
    }

    // Rough conversion of HTML paragraphs/headings/lists to Markdown
    let mdBody = content;
    mdBody = mdBody.replace(/<h1>(.*?)<\/h1>/gi, "# $1\n\n");
    mdBody = mdBody.replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n");
    mdBody = mdBody.replace(/<h3>(.*?)<\/h3>/gi, "### $1\n\n");
    mdBody = mdBody.replace(/<ul>(.*?)<\/ul>/gi, "$1\n");
    mdBody = mdBody.replace(/<ol>(.*?)<\/ol>/gi, "$1\n");
    mdBody = mdBody.replace(/<li>(.*?)<\/li>/gi, "- $1\n");
    mdBody = mdBody.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
    mdBody = mdBody.replace(/<em>(.*?)<\/em>/gi, "*$1*");
    mdBody = mdBody.replace(/<code>(.*?)<\/code>/gi, "`$1`");
    mdBody = mdBody.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```\n\n");

    const cleanText = mdBody.replace(/<[^>]+>/g, "").trim();
    md += cleanText;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${(title || "untitled").toLowerCase().replace(/\s+/g, "-")}.md`;
    link.click();
    showToast("Markdown downloaded");
  };

  const handleExportDoc = () => {
    const htmlDoc = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${title || "Untitled Note"}</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; padding: 20px; }
          h1 { color: #059669; }
          h2 { color: #10b981; }
          blockquote { border-left: 4px solid #059669; padding-left: 10px; color: #555; font-style: italic; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          table td, table th { border: 1px solid #ddd; padding: 8px; }
          table th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${title || "Untitled Note"}</h1>
        ${content}
      </body>
      </html>
    `;

    const blob = new Blob([htmlDoc], { type: "application/msword" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${(title || "untitled").toLowerCase().replace(/\s+/g, "-")}.doc`;
    link.click();
    showToast("Word document exported");
  };

  // Import Markdown
  const handleImportMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      // Basic Markdown -> HTML converter
      const lines = text.split("\n");
      const htmlLines = lines.map((line) => {
        let clean = line.trim();
        if (clean.startsWith("# ")) {
          return `<h1>${clean.replace("# ", "")}</h1>`;
        }
        if (clean.startsWith("## ")) {
          return `<h2>${clean.replace("## ", "")}</h2>`;
        }
        if (clean.startsWith("### ")) {
          return `<h3>${clean.replace("### ", "")}</h3>`;
        }
        if (clean.startsWith("- ") || clean.startsWith("* ")) {
          return `<li>${clean.replace(/^[-*]\s+/, "")}</li>`;
        }
        if (clean === "") return "<p></p>";

        clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        clean = clean.replace(/\*(.*?)\*/g, "<em>$1</em>");
        clean = clean.replace(/`(.*?)`/g, "<code>$1</code>");
        return `<p>${clean}</p>`;
      });

      const importedHtml = htmlLines.join("");
      setContent(importedHtml);
      handleSave(title, importedHtml, tagsStr);
      showToast("Markdown imported successfully!");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Format File Size helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Filter sidebar list
  const filteredSidebarNotes = useMemo(() => {
    let list = allNotes;

    // Filter statuses
    if (sidebarFilter === "pinned") {
      list = list.filter((n) => n.isPinned && !n.isTrashed);
    } else if (sidebarFilter === "archived") {
      list = list.filter((n) => n.isArchived && !n.isTrashed);
    } else if (sidebarFilter === "trashed") {
      list = list.filter((n) => n.isTrashed);
    } else {
      list = list.filter((n) => !n.isTrashed && !n.isArchived);
    }

    // Filter search text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allNotes, sidebarFilter, searchQuery]);

  if (authLoading || loading || !noteId) {
    return (
      <DashboardShell fullWidth={true}>
        <LoadingScreen
          label="Membuka Ruang Catatan..."
          subtext="Memuat konten catatan dan asisten AI"
          fullHeight
        />
      </DashboardShell>
    );
  }

  if (noteError) {
    return (
      <DashboardShell fullWidth={true}>
        <ErrorState
          title="Catatan Tidak Ditemukan"
          message={noteError}
          showHomeButton
          fullHeight
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell fullWidth={true}>
      {/* Note Workspace Split Container */}
      <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] border border-border bg-white rounded-2xl overflow-hidden shadow-card relative">
        {/* Left Sidebar: Note list */}
        <div
          className={`flex flex-col bg-gray-50/50 border-r border-border h-full transition-all duration-300 overflow-hidden shrink-0 ${
            leftSidebarOpen ? "w-64 lg:w-72" : "w-0 border-r-0"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border space-y-3.5 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-gray-800 text-sm tracking-tight">Note Library</h2>
              <button
                onClick={handleCreateNoteFromSidebar}
                className="p-1.5 bg-primary/5 hover:bg-primary/15 text-primary rounded-lg transition-all cursor-pointer"
                title="Add New Note"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-gray-700"
              />
            </div>

            {/* Segmented Filter Controls */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl">
              {(["all", "pinned", "archived", "trashed"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSidebarFilter(filter)}
                  className={`text-[10px] font-bold py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                    sidebarFilter === filter
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Scrollable Note List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredSidebarNotes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-8 h-8 mx-auto opacity-40 mb-2" />
                <p className="text-xs font-medium">No notes found</p>
              </div>
            ) : (
              filteredSidebarNotes.map((note) => {
                const isActive = note.id === noteId;
                return (
                  <Link
                    key={note.id}
                    href={`/notes/${note.id}`}
                    className={`block p-3.5 rounded-xl border transition-all relative group ${
                      isActive
                        ? "bg-primary border-primary text-white shadow-sm"
                        : "bg-white border-border hover:border-primary/40 hover:shadow-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4
                        className={`text-xs font-bold truncate flex-1 ${
                          isActive ? "text-white" : "text-gray-800 group-hover:text-primary"
                        }`}
                      >
                        {note.title || "Untitled Note"}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        {note.isPinned && (
                          <Star className={`w-3 h-3 fill-current ${isActive ? "text-white" : "text-amber-400"}`} />
                        )}
                        {note.isArchived && (
                          <Archive className={`w-3 h-3 ${isActive ? "text-white" : "text-blue-400"}`} />
                        )}
                      </div>
                    </div>

                    <p
                      className={`text-[10px] mt-1.5 line-clamp-2 leading-normal ${
                        isActive ? "text-white/80" : "text-gray-500"
                      }`}
                    >
                      {note.content?.replace(/<[^>]+>/g, "").trim() || "Empty note content..."}
                    </p>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Center Panel: Focused Rich-Text Editor */}
        <div id="print-editor-area" className="flex-1 flex flex-col h-full bg-white overflow-hidden">
          {/* Note Status / Warning Banners */}
          {isTrashed && (
            <div className="bg-red-50 border-b border-red-100 px-6 py-3 flex items-center justify-between text-xs text-red-800 font-semibold select-none animate-slide-down print:hidden">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>This note is in the Trash. Editing is disabled.</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleToggleTrash}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
                >
                  Restore Note
                </button>
                <button
                  onClick={handlePermanentDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          )}

          {isArchived && !isTrashed && (
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex items-center justify-between text-xs text-blue-800 font-semibold select-none animate-slide-down print:hidden">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-blue-600" />
                <span>This note is archived.</span>
              </div>
              <button
                onClick={handleToggleArchive}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer"
              >
                Unarchive Note
              </button>
            </div>
          )}

          {/* Workspace Controls Header */}
          <div className="flex items-center justify-between px-3 md:px-5 h-14 border-b border-border bg-white print:hidden gap-2 min-w-0 shrink-0">
            {/* Sidebar toggle & Back button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className="p-2 text-gray-500 hover:text-primary hover:bg-gray-50 border border-border rounded-xl transition-all cursor-pointer"
                title={leftSidebarOpen ? "Tutup Catatan" : "Buka Catatan"}
              >
                {leftSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              <Link
                href="/notes"
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-gray-600 hover:text-primary hover:bg-primary-50 rounded-xl transition-colors shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">All Notes</span>
              </Link>
            </div>

            {/* Note Settings Action Row */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Star Favorite */}
              <button
                onClick={handleTogglePin}
                className={`p-2 border rounded-xl transition-all cursor-pointer ${
                  isPinned
                    ? "bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100"
                    : "border-border text-gray-400 hover:text-amber-500 hover:bg-gray-50"
                }`}
                title={isPinned ? "Unstar Note" : "Favorite / Pin Note"}
              >
                <Star className={`w-4 h-4 ${isPinned ? "fill-current" : ""}`} />
              </button>

              {/* Archive Toggle */}
              <button
                onClick={handleToggleArchive}
                className={`p-2 border rounded-xl transition-all cursor-pointer ${
                  isArchived
                    ? "bg-blue-50 border-blue-200 text-blue-500 hover:bg-blue-100"
                    : "border-border text-gray-400 hover:text-blue-500 hover:bg-gray-50"
                }`}
                title={isArchived ? "Unarchive Note" : "Archive Note"}
              >
                <Archive className="w-4 h-4" />
              </button>

              {/* More Options Dropdown (Duplicate, Export, Import, Trash) */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`p-2 border rounded-xl transition-all cursor-pointer ${
                    moreMenuOpen
                      ? "bg-gray-100 border-gray-300 text-gray-900"
                      : "border-border text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                  title="Opsi & Ekspor Catatan"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {moreMenuOpen && (
                  <div className="absolute right-0 top-11 bg-white border border-border shadow-float rounded-2xl py-1.5 w-52 z-50 animate-scale-in">
                    <button
                      type="button"
                      onClick={() => {
                        handleDuplicateNote();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-50 hover:text-primary font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      Duplikasi Catatan
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      type="button"
                      onClick={() => {
                        handleExportPdf();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-50 hover:text-primary font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      Ekspor PDF / Cetak
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleExportMarkdown();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-50 hover:text-primary font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                      Ekspor Markdown (.md)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleExportDoc();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-50 hover:text-primary font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                      Ekspor MS Word (.doc)
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      type="button"
                      onClick={() => {
                        mdInputRef.current?.click();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-primary-50 hover:text-primary font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-gray-400" />
                      Impor File (.md)
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      type="button"
                      onClick={() => {
                        handleToggleTrash();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      Pindahkan ke Sampah
                    </button>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={mdInputRef}
                onChange={handleImportMarkdown}
                accept=".md,text/markdown"
                className="hidden"
              />

              <div className="w-[1px] h-5 bg-border mx-0.5" />

              {/* AI Assistant Toggle Button in Header */}
              <button
                type="button"
                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                  rightSidebarOpen
                    ? "bg-primary text-white shadow-xs"
                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30"
                }`}
                title={rightSidebarOpen ? "Tutup AI Assistant" : "Buka AI Assistant"}
              >
                <Brain className="w-3.5 h-3.5 animate-pulse" />
                <span>AI Assistant</span>
              </button>
            </div>
          </div>

          {/* Core Writing Layout Area */}
          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 space-y-6">
            {/* Title borderless input */}
            <input
              type="text"
              value={title}
              disabled={isTrashed}
              onChange={(e) => triggerInputChange("title", e.target.value)}
              className="w-full text-3xl md:text-4xl font-extrabold text-[#1F2937] placeholder:text-gray-300 focus:outline-none bg-transparent"
              placeholder="Untitled Note"
            />

            {/* Tag Badges & inline tag editor */}
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-border/40 print:hidden">
              <Tag className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-1.5 flex-1">
                {tagsStr
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1 border border-border"
                    >
                      {tag}
                      {!isTrashed && (
                        <button
                          onClick={() => {
                            const newTagsList = tagsStr
                              .split(",")
                              .map((t) => t.trim())
                              .filter((t, i) => i !== idx);
                            triggerInputChange("tags", newTagsList.join(", "));
                          }}
                          className="hover:text-red-500 text-gray-400 font-extrabold text-[8px] cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                {!isTrashed && (
                  <input
                    type="text"
                    placeholder="Add tags... (separated by comma)"
                    value={tagsStr}
                    onChange={(e) => triggerInputChange("tags", e.target.value)}
                    className="text-xs font-semibold text-gray-500 placeholder:text-gray-300 focus:outline-none bg-transparent flex-1 min-w-[150px]"
                  />
                )}
              </div>
            </div>

            {/* Note text editor component */}
            <div className={isTrashed ? "pointer-events-none opacity-85 select-none" : ""}>
              <TiptapEditor
                content={content}
                onChange={handleEditorChange}
                userId={user?.uid || ""}
                onStatsChange={setStats}
              />
            </div>

            {/* File Attachments section */}
            <div className="pt-6 border-t border-border/60 print:hidden">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-3.5">
                <Paperclip className="w-3.5 h-3.5" />
                Attachments ({attachments.length})
              </h3>

              {/* File list */}
              <div className="space-y-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-gray-50/50 hover:bg-white hover:shadow-card transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-700 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
                        title="Download Attachment"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      {!isTrashed && (
                        <button
                          onClick={() => handleDeleteAttachment(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
                          title="Delete Attachment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Upload Button Progress */}
                {!isTrashed && (
                  <div className="flex items-center gap-3 mt-4">
                    <label className="flex items-center gap-2 px-4 py-2 border border-border border-dashed hover:border-primary/50 text-xs font-bold text-gray-500 hover:text-primary rounded-xl cursor-pointer transition-all hover:bg-primary-50/10 shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                      Add Attachment
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={fileUploading}
                        className="hidden"
                      />
                    </label>
                    {fileUploading && (
                      <div className="flex items-center gap-2.5 text-xs text-gray-400 font-semibold animate-fade-in flex-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                        <span className="truncate">Uploading ({uploadProgress}%)</span>
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Status & Stats */}
          <div className="border-t border-border px-6 py-2.5 bg-gray-50 flex items-center justify-between text-xs text-gray-400 font-semibold print:hidden">
            {/* Left: Save status dot */}
            <div className="flex items-center gap-2 select-none">
              <span
                className={`w-2 h-2 rounded-full ${
                  saveStatus === "saving"
                    ? "bg-amber-400 animate-pulse"
                    : saveStatus === "saved"
                    ? "bg-emerald-500"
                    : "bg-gray-300"
                }`}
              />
              <span>
                {saveStatus === "saving" && "Saving Note Draft..."}
                {saveStatus === "saved" && "Changes saved to Firestore"}
                {saveStatus === "unsaved" && "Unsaved changes"}
              </span>
            </div>

            {/* Right: Word count, character counts, reading time */}
            <div className="flex items-center gap-4">
              <span>{stats.words} words</span>
              <span>{stats.characters} characters</span>
              <span>~{stats.readingTime} min read</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Collapsible AI Academic Summary Assistance */}
        <div
          className={`flex flex-col bg-gray-50/50 border-l border-border h-full transition-all duration-300 overflow-hidden print:hidden shrink-0 ${
            rightSidebarOpen ? "w-72 lg:w-80 xl:w-96" : "w-0 border-l-0"
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-600 px-4 h-14 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
              <h3 className="font-extrabold text-xs sm:text-sm tracking-tight truncate">AI Academic Assistant</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {summary && (
                <button
                  onClick={handleGenerateSummary}
                  disabled={summarizing}
                  title="Regenerate summary"
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${summarizing ? "animate-spin" : ""}`} />
                </button>
              )}
              <button
                onClick={() => setRightSidebarOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
                title="Collapse Assistant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AI Content Viewport */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {!summary && !summarizing ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto text-primary">
                  <Brain className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-700 text-sm">Ringkasan & Wawasan AI</h4>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                    Biarkan MindFlow AI menganalisis poin penting, definisi konsep, dan pertanyaan latihan dari catatan ini.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateSummary}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Analisis Catatan
                </Button>
              </div>
            ) : summarizing ? (
              <div className="text-center py-20 space-y-4">
                <div className="relative inline-block">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-float">
                    <Brain className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 animate-ping" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-700 text-xs animate-pulse">MindFlow AI Menganalisis...</h4>
                  <p className="text-[10px] text-gray-400 mt-1">Menyusun poin penting dan rangkuman materi</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-xs leading-relaxed animate-fade-in">
                {/* Key Concepts */}
                {summary?.keyConcepts && summary.keyConcepts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" />
                      Key Definitions
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.keyConcepts.map((concept) => (
                        <span
                          key={concept}
                          className="text-[10px] font-bold bg-primary-50 text-primary-700 px-2.5 py-1 rounded-lg border border-primary-100"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Points */}
                {summary?.importantPoints && summary.importantPoints.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ListPlus className="w-3.5 h-3.5" />
                      Summary Points
                    </h4>
                    <ul className="list-disc pl-4 space-y-1.5 text-gray-600 font-medium">
                      {summary.importantPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Summary text */}
                {summary?.summaryText && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider">
                      Ringkasan Catatan
                    </h4>
                    <div className="bg-white p-3.5 rounded-2xl border border-border">
                      <MarkdownRenderer content={summary.summaryText} />
                    </div>
                  </div>
                )}

                {/* Conclusion */}
                {summary?.conclusionText && (
                  <div className="border-l-4 border-primary bg-primary-50/40 p-3.5 rounded-r-2xl">
                    <h4 className="font-bold text-[10px] text-primary uppercase tracking-wider mb-1">
                      Kesimpulan Penting
                    </h4>
                    <div className="text-gray-700 italic font-medium">
                      <MarkdownRenderer content={summary.conclusionText} />
                    </div>
                  </div>
                )}

                {/* Suggested Questions */}
                {summary?.suggestedQuestions && summary.suggestedQuestions.length > 0 && (
                  <div className="pt-4 border-t border-border/60 space-y-3">
                    <h4 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Suggested Ask Topics
                    </h4>
                    <div className="space-y-2">
                      {summary.suggestedQuestions.map((q, idx) => (
                        <Link
                          key={idx}
                          href={`/assistant?noteId=${noteId}&question=${encodeURIComponent(q)}`}
                          className="flex items-center justify-between text-[11px] text-gray-600 bg-white border border-border rounded-xl px-3 py-2.5 hover:border-primary/50 hover:bg-primary-50/10 transition-all cursor-pointer text-left group"
                        >
                          <span className="font-semibold flex-1 pr-2 leading-relaxed">{q}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Permanent Delete Warning Modal */}
      <WarningModal
        isOpen={permanentDeleteModalOpen}
        onClose={() => setPermanentDeleteModalOpen(false)}
        onConfirm={handleConfirmPermanentDelete}
        isLoading={isPermanentlyDeleting}
        variant="danger"
        title="Hapus Catatan Permanen?"
        description="Apakah Anda yakin ingin menghapus catatan ini secara permanen dari server? Tindakan ini tidak dapat dibatalkan dan seluruh konten catatan akan hilang selamanya."
        confirmText="Ya, Hapus Permanen"
        cancelText="Batal"
      />

      {/* Pop Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-950/90 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-float flex items-center gap-2 animate-slide-up border border-white/10 backdrop-blur-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              toast.type === "success" ? "bg-emerald-400" : "bg-red-400"
            } animate-pulse`}
          />
          <span>{toast.message}</span>
        </div>
      )}
    </DashboardShell>
  );
}
