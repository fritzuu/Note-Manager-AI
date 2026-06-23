"use client";

import React, { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotes,
  createNote,
  deleteNote,
  type NoteDocument,
} from "@/lib/firestore";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type SortOption = "updated-desc" | "created-desc" | "title-asc";

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-150 bg-amber-200 text-amber-950 px-0.5 rounded font-medium">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("updated-desc");

  // Create Note Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTagsStr, setNewTagsStr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const loadNotes = async (uid: string) => {
      try {
        const data = await getUserNotes(uid);
        setNotes(data);
      } catch (err) {
        console.error("Failed to load notes:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNotes(user.uid);
  }, [user, authLoading, router]);

  // Handle Note Deletion
  const handleDelete = async (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  // Handle Note Creation
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const tags = newTagsStr
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const noteId = await createNote(user.uid, newTitle || "Untitled Note", newContent, tags);
      setModalOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewTagsStr("");
      router.push(`/notes/${noteId}`);
    } catch (err) {
      console.error("Failed to create note:", err);
      setSubmitting(false);
    }
  };

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [notes]);

  // Filter & Sort logic
  const filteredAndSortedNotes = useMemo(() => {
    let result = notes;

    // Search query filter (matches title, content, or tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (selectedTag) {
      result = result.filter((note) => note.tags.includes(selectedTag));
    }

    // Sorting
    return [...result].sort((a, b) => {
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
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [notes, searchQuery, selectedTag, sortBy]);

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading Notes...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Header Row */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">Personal Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and query your academic summaries</p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
        >
          Add Note
        </Button>
      </div>

      {/* Filter and Search controls */}
      <div className="space-y-4 animate-scale-in">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* Search box */}
          <div className="flex-1">
            <Input
              placeholder="Search in title, content, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-11 pl-4 pr-10 rounded-xl border border-border bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none cursor-pointer w-full sm:w-48"
            >
              <option value="updated-desc">Recently Updated</option>
              <option value="created-desc">Date Created</option>
              <option value="title-asc">Title A-Z</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Tags horizontal list */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5" />
              Tags:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                selectedTag === null
                  ? "bg-primary text-white font-medium"
                  : "bg-white border border-border text-gray-500 hover:border-primary/50 hover:text-primary"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  tag === selectedTag
                    ? "bg-primary text-white font-medium"
                    : "bg-white border border-border text-gray-500 hover:border-primary/50 hover:text-primary"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      {filteredAndSortedNotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center space-y-4 animate-scale-in">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-400">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-gray-700">No notes found</h3>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery || selectedTag ? "Try adjusting your search criteria." : "Create your first academic note."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-scale-in">
          {filteredAndSortedNotes.map((note) => (
            <Link key={note.id} href={`/notes/${note.id}`} className="block group">
              <div className="bg-white rounded-2xl border border-border p-6 hover:border-primary/55 hover:shadow-card-hover transition-all duration-300 h-64 flex flex-col justify-between relative">
                <div>
                  {/* Delete Note button */}
                  <button
                    onClick={(e) => handleDelete(e, note.id)}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <h3 className="font-bold text-[#1F2937] text-base group-hover:text-primary transition-colors line-clamp-1 pr-6">
                    <Highlight text={note.title || "Untitled Note"} query={searchQuery} />
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated{" "}
                    {note.updatedAt
                      ? new Date((note.updatedAt as { seconds?: number }).seconds! * 1000).toLocaleDateString()
                      : "Recently"}
                  </p>
                  <p className="text-sm text-gray-600 mt-4 line-clamp-4 leading-relaxed font-sans">
                    <Highlight text={note.content ? note.content.replace(/<[^>]+>/g, "").trim() || "Empty content..." : "Empty content..."} query={searchQuery} />
                  </p>
                </div>

                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                      >
                        <Highlight text={tag} query={searchQuery} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Note Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="bg-white rounded-2xl border border-border shadow-float w-full max-w-lg overflow-hidden relative z-10 animate-scale-in">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">Add New Note</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="p-6 space-y-4">
              <Input
                label="Note Title"
                placeholder="Enter title (e.g. CS101 Lecture 1)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#1F2937]">Note Content</label>
                <textarea
                  placeholder="Enter note text..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full h-36 rounded-xl border border-border bg-white p-4 text-sm text-[#1F2937] placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  required
                />
              </div>

              <Input
                label="Tags"
                placeholder="biology, cells, mitosis (comma separated)"
                value={newTagsStr}
                onChange={(e) => setNewTagsStr(e.target.value)}
                hint="Add keywords to categorize your notes"
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={submitting}>
                  Save & Edit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
