"use client";

import React from "react";
import Link from "next/link";
import { FileText, Plus, ArrowUpRight } from "lucide-react";

interface NotesStatWidgetProps {
  totalNotes: number;
}

export function NotesStatWidget({ totalNotes }: NotesStatWidgetProps) {
  return (
    <div className="p-5 flex flex-col justify-between h-full group">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-50/50 group-hover:scale-105 transition-transform">
          <FileText className="w-5 h-5" />
        </div>
        <Link
          href="/notes"
          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
          title="Go to Notes"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-1 my-auto py-2">
        <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {totalNotes}
        </p>
        <p className="text-xs font-semibold text-gray-500">Total Notes Saved</p>
      </div>

      <Link
        href="/notes"
        className="flex items-center justify-between text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/60 px-3 py-2 rounded-xl transition-colors w-full"
      >
        <span>Create New</span>
        <Plus className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
