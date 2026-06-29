"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  CheckSquare,
  AlertTriangle,
  Clock,
  Flame,
  Loader2,
  Pencil,
  Trash2,
  GripVertical,
  Timer,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserTasks,
  updateTask,
  deleteTask,
  createNotification,
  getAcademicInsight,
  type TaskDocument,
} from "@/lib/firestore";
import { deadlineToDays, computePriorityDetailed, deriveAcademicRiskFromInsight } from "@/lib/fuzzyLogic";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";

type KanbanColumn = "todo" | "doing" | "done";

const COLUMNS: { id: KanbanColumn; label: string; color: string; bg: string }[] = [
  { id: "todo", label: "To Do", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
  { id: "doing", label: "In Progress", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { id: "done", label: "Done", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
];

const PRIORITY_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border border-red-200",
  High: "bg-orange-100 text-orange-700 border border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border border-amber-200",
  Low: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

const RISK_ICON: Record<string, React.ReactNode> = {
  Critical: <ShieldAlert className="w-3.5 h-3.5 text-red-500" />,
  High: <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />,
  Medium: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  Low: null,
};

function formatDeadline(task: TaskDocument): string {
  const deadline = task.deadline?.toDate ? task.deadline.toDate() : null;
  if (!deadline) return "No deadline";
  const days = Math.round(deadlineToDays(deadline));
  if (days < 0) return `Overdue ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days}d left`;
}

function deadlineColor(task: TaskDocument): string {
  const deadline = task.deadline?.toDate ? task.deadline.toDate() : null;
  if (!deadline) return "text-gray-400";
  const days = deadlineToDays(deadline);
  if (days < 0) return "text-red-600 font-bold";
  if (days < 1) return "text-red-500 font-semibold";
  if (days < 3) return "text-orange-500 font-semibold";
  if (days < 7) return "text-amber-500";
  return "text-gray-400";
}

interface TaskCardProps {
  task: TaskDocument;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, task: TaskDocument) => void;
}

function TaskCard({ task, onDelete, onDragStart }: TaskCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing group"
    >
      {/* Header row */}
      <div className="flex items-start gap-2 mb-3">
        <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 shrink-0 group-hover:text-gray-400 transition-colors" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1F2937] line-clamp-2 leading-snug">
            {task.title}
          </p>
        </div>
      </div>

      {/* Priority Badge */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[task.priorityLevel]}`}>
          {task.priorityLevel}
        </span>
        {task.riskLevel !== "Low" && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
            {RISK_ICON[task.riskLevel]}
            {task.riskLevel} Risk
          </span>
        )}
        <span className="text-[10px] font-semibold text-primary bg-primary-50 px-2 py-0.5 rounded-full ml-auto">
          {task.priorityScore}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400 font-medium">Progress</span>
          <span className="text-[10px] font-semibold text-gray-600">{task.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${task.progress}%`,
              background: task.progress >= 80 ? "#10b981" : task.progress >= 40 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-300" />
          <span className={`text-[10px] font-medium ${deadlineColor(task)}`}>
            {formatDeadline(task)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Timer className="w-3 h-3" />
            {task.estimatedTotalMinutes}m
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3">
        <Link href={`/tasks/${task.id}/edit`} className="flex-1">
          <button className="w-full h-7 flex items-center justify-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-primary bg-gray-50 hover:bg-primary-50 rounded-lg border border-border hover:border-primary/30 transition-all">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </Link>
        <Link href={`/pomodoro?taskId=${task.id}`} className="flex-1">
          <button className="w-full h-7 flex items-center justify-center gap-1 text-[10px] font-semibold text-primary hover:text-white bg-primary-50 hover:bg-primary rounded-lg border border-primary/20 hover:border-primary transition-all">
            <Flame className="w-3 h-3" /> Focus
          </button>
        </Link>
        {confirmDelete ? (
          <button
            onClick={() => onDelete(task.id)}
            className="w-7 h-7 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-all"
          >
            <CheckSquare className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            onBlur={() => setTimeout(() => setConfirmDelete(false), 2000)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-border hover:border-red-200 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<TaskDocument | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanColumn | null>(null);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      const [data, insight] = await Promise.all([
        getUserTasks(user.uid),
        getAcademicInsight(user.uid),
      ]);

      const latestAcademicRisk = insight
        ? deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction)
        : 40;

      // Recalculate priority scores on the fly using latest academic risk and current date
      const updatedTasks = data.map((task) => {
        if (task.status === "done") {
          return {
            ...task,
            priorityScore: 0,
            priorityLevel: "Low",
          };
        }

        const deadline = task.deadline?.toDate ? task.deadline.toDate() : new Date();
        const deadlineDays = deadlineToDays(deadline);
        const result = computePriorityDetailed({
          deadlineDays,
          importance: task.importance,
          difficulty: task.difficulty,
          progress: task.progress,
          academicRisk: latestAcademicRisk,
        });

        return {
          ...task,
          academicRisk: latestAcademicRisk,
          priorityScore: result.priorityScore,
          priorityLevel: result.priorityLevel,
          riskLevel: result.riskLevel,
          estimatedTotalMinutes: result.estimatedTotalMinutes,
        };
      });

      setTasks(updatedTasks);

      // Run reminder agent on load
      const now = new Date();
      for (const task of updatedTasks) {
        if (task.status === "done") continue;
        const deadline = task.deadline?.toDate ? task.deadline.toDate() : null;
        const deadlineDays = deadline ? deadlineToDays(deadline) : 999;

        // Rule 1: Deadline < 3 days AND progress < 30% → High Risk
        if (deadlineDays < 3 && deadlineDays >= 0 && task.progress < 30) {
          await createNotification(user.uid, {
            title: "⚠️ High Risk Task",
            message: `"${task.title}" is due in ${Math.round(deadlineDays)}d with only ${task.progress}% progress.`,
            type: "high_risk",
          });
        }
        // Rule 2: Deadline < 1 day AND progress < 50% → Critical Alert
        if (deadlineDays >= 0 && deadlineDays < 1 && task.progress < 50) {
          await createNotification(user.uid, {
            title: "🚨 Critical Alert",
            message: `"${task.title}" is due TODAY with ${task.progress}% progress. Act now!`,
            type: "critical_alert",
          });
        }
        // Rule 3: Priority Score > 80 AND progress < 40% → Immediate Reminder
        if (task.priorityScore > 80 && task.progress < 40) {
          await createNotification(user.uid, {
            title: "🔥 Immediate Action Required",
            message: `"${task.title}" has Critical priority (score: ${task.priorityScore}) but only ${task.progress}% done.`,
            type: "immediate",
          });
        }
        // Rule 4: Overdue → Overdue Notification
        if (deadlineDays < 0) {
          await createNotification(user.uid, {
            title: "❌ Task Overdue",
            message: `"${task.title}" was due ${Math.abs(Math.round(deadlineDays))} days ago and is not complete.`,
            type: "overdue",
          });
        }
        void now; // suppress unused
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    const t = setTimeout(() => {
      loadTasks();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, loadTasks]);

  const handleDragStart = (e: React.DragEvent, task: TaskDocument) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, col: KanbanColumn) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === col) {
      setDraggedTask(null);
      setDragOverCol(null);
      return;
    }
    try {
      await updateTask(draggedTask.id, { status: col });
      setTasks((prev) =>
        prev.map((t) => (t.id === draggedTask.id ? { ...t, status: col } : t))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setDraggedTask(null);
      setDragOverCol(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
    }
  };

  const columnTasks = (col: KanbanColumn) =>
    tasks
      .filter((t) => t.status === col)
      .sort((a, b) => b.priorityScore - a.priorityScore);

  if (authLoading || loading) {
    return (
      <DashboardShell fullWidth>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell fullWidth>
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-primary" />
              Task Board
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Drag tasks between columns · Fuzzy Logic auto-ranks by priority
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/analytics">
              <Button variant="outline" size="sm" icon={<ChevronRight className="w-4 h-4" />}>
                Analytics
              </Button>
            </Link>
            <Link href="/tasks/create">
              <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
                New Task
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 animate-scale-in">
          {[
            { label: "Total", value: tasks.length, color: "text-gray-700" },
            { label: "To Do", value: columnTasks("todo").length, color: "text-gray-600" },
            { label: "In Progress", value: columnTasks("doing").length, color: "text-blue-600" },
            { label: "Done", value: columnTasks("done").length, color: "text-emerald-600" },
            {
              label: "Critical",
              value: tasks.filter((t) => t.priorityLevel === "Critical" && t.status !== "done").length,
              color: "text-red-600",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-border px-4 py-3 text-center shadow-sm">
              <p className={`text-xl font-extrabold ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-2xl border p-4 min-h-[500px] flex flex-col gap-3 transition-all duration-200 ${col.bg} ${
                dragOverCol === col.id ? "ring-2 ring-primary/40 scale-[1.01]" : ""
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${col.color}`}>{col.label}</span>
                  <span className="text-xs font-semibold bg-white border border-border text-gray-500 px-2 py-0.5 rounded-full">
                    {columnTasks(col.id).length}
                  </span>
                </div>
                {col.id === "todo" && (
                  <Link href="/tasks/create">
                    <button className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-border text-gray-400 hover:text-primary hover:border-primary/40 transition-all">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                )}
              </div>

              {/* Cards */}
              {columnTasks(col.id).length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-gray-400 font-medium text-center">
                    {col.id === "todo" ? "No tasks yet. Create one!" : `No ${col.label.toLowerCase()} tasks`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {columnTasks(col.id).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
