"use client";

import React from "react";
import Link from "next/link";
import { Calendar, ArrowUpRight, Clock } from "lucide-react";
import { TaskDocument } from "@/lib/firestore";
import { deadlineToDays } from "@/lib/fuzzyLogic";

interface UpcomingDeadlinesBentoWidgetProps {
  tasks: TaskDocument[];
}

export function UpcomingDeadlinesBentoWidget({ tasks }: UpcomingDeadlinesBentoWidgetProps) {
  const activeTasks = tasks
    .filter((t) => t.status !== "done")
    .filter((t) => {
      const d = t.deadline?.toDate ? t.deadline.toDate() : null;
      return d && deadlineToDays(d) >= 0;
    })
    .sort((a, b) => {
      const aD = a.deadline?.toDate ? a.deadline.toDate() : new Date(9999, 0);
      const bD = b.deadline?.toDate ? b.deadline.toDate() : new Date(9999, 0);
      return aD.getTime() - bD.getTime();
    })
    .slice(0, 3);

  return (
    <div className="p-5 flex flex-col justify-between h-full group">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Upcoming Deadlines</h4>
            <p className="text-[10px] text-gray-400">Due soon</p>
          </div>
        </div>
        <Link
          href="/tasks"
          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
          title="View All Tasks"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Deadlines List */}
      <div className="space-y-2 my-auto py-2">
        {activeTasks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No upcoming deadlines this week</p>
        ) : (
          activeTasks.map((task) => {
            const deadline = task.deadline?.toDate ? task.deadline.toDate() : null;
            const days = deadline ? Math.round(deadlineToDays(deadline)) : null;

            return (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 p-2 bg-gray-50/80 rounded-xl border border-border/50 text-xs"
              >
                <span className="font-bold text-gray-800 truncate flex-1">{task.title}</span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    days !== null && days <= 2
                      ? "bg-red-100 text-red-700"
                      : days !== null && days <= 5
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {days !== null ? `${days}d left` : "No date"}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-border/50">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-500" /> {activeTasks.length} pending
        </span>
        <Link href="/tasks" className="text-primary font-bold hover:underline">
          Manage →
        </Link>
      </div>
    </div>
  );
}
