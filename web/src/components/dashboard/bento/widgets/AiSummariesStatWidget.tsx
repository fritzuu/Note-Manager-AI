"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, MessageSquare, ArrowUpRight } from "lucide-react";

interface AiSummariesStatWidgetProps {
  summariesCount: number;
}

export function AiSummariesStatWidget({ summariesCount }: AiSummariesStatWidgetProps) {
  return (
    <div className="p-5 flex flex-col justify-between h-full group">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center ring-4 ring-indigo-50/50 group-hover:scale-105 transition-transform">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <Link
          href="/assistant"
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
          title="Open AI Assistant"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-1 my-auto py-2">
        <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {summariesCount}
        </p>
        <p className="text-xs font-semibold text-gray-500">AI Summaries & Chats</p>
      </div>

      <Link
        href="/assistant"
        className="flex items-center justify-between text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/60 px-3 py-2 rounded-xl transition-colors w-full"
      >
        <span>Ask AI Assistant</span>
        <MessageSquare className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
