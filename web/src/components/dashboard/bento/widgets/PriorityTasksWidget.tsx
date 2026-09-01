"use client";

import React from "react";
import Link from "next/link";
import { CheckSquare, ArrowUpRight, Plus } from "lucide-react";
import { TaskDocument } from "@/lib/firestore";
import { deadlineToDays } from "@/lib/fuzzyLogic";

interface PriorityTasksWidgetProps {
  tasks: TaskDocument[];
}

const PRIORITY_BADGES: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function PriorityTasksWidget({ tasks }: PriorityTasksWidgetProps) {
  const activeTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    .slice(0, 3);

  return (
    <div className="p-6 flex flex-col justify-between h-full group">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Priority Tasks</h4>
            <p className="text-[10px] text-gray-400">Prioritas Cerdas MindFlow</p>
          </div>
        </div>
        <Link
          href="/tasks"
          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-xl transition-colors"
          title="View All Tasks"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Task List */}
      <div className="space-y-2.5 my-auto py-2">
        {activeTasks.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-gray-400">No pending priority tasks</p>
          </div>
        ) : (
          activeTasks.map((task) => {
            const deadline = task.deadline?.toDate ? task.deadline.toDate() : null;
            const days = deadline ? Math.round(deadlineToDays(deadline)) : null;

            return (
              <div
                key={task.id}
                className="p-2.5 bg-gray-50/80 hover:bg-gray-100/80 rounded-2xl border border-border/60 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-800 truncate flex-1">
                    {task.title}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      PRIORITY_BADGES[task.priorityLevel] || "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    {task.priorityLevel} ({task.priorityScore})
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>Progress: {task.progress || 0}%</span>
                  <span>{days !== null ? `${days}d remaining` : "No deadline"}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${task.progress || 0}%` }}
                    className="h-full bg-primary rounded-full transition-all"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <Link
        href="/tasks/create"
        className="flex items-center justify-between text-xs font-bold text-primary hover:text-primary-700 bg-primary-50/60 hover:bg-primary-100/60 px-3 py-2 rounded-xl transition-colors w-full"
      >
        <span>Add New Task</span>
        <Plus className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
