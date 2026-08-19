"use client";

import React from "react";
import Link from "next/link";
import { FileText, ArrowUpRight, Plus, Calendar } from "lucide-react";
import { NoteDocument } from "@/lib/firestore";

interface RecentNotesBentoWidgetProps {
  notes: NoteDocument[];
}

export function RecentNotesBentoWidget({ notes }: RecentNotesBentoWidgetProps) {
  const recentList = notes.slice(0, 3);

  return (
    <div className="p-5 flex flex-col justify-between h-full group">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Recent Notes</h4>
            <p className="text-[10px] text-gray-400">Quick Access</p>
          </div>
        </div>
        <Link
          href="/notes"
          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
          title="Go to Notes"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Notes List */}
      <div className="space-y-2 my-auto py-2">
        {recentList.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No notes created yet</p>
        ) : (
          recentList.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="block p-2 rounded-xl bg-gray-50/80 hover:bg-emerald-50/50 border border-border/50 hover:border-emerald-200 transition-colors"
            >
              <p className="text-xs font-bold text-gray-800 truncate">{note.title || "Untitled"}</p>
              <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                {note.content ? note.content.replace(/<[^>]+>/g, "").trim() || "Empty..." : "Empty..."}
              </p>
            </Link>
          ))
        )}
      </div>

      {/* Footer */}
      <Link
        href="/notes"
        className="flex items-center justify-between text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/60 px-3 py-2 rounded-xl transition-colors w-full"
      >
        <span>New Note</span>
        <Plus className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
