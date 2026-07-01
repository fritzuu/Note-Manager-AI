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
  ShieldAlert,
  Folder,
  FolderPlus,
  MoreVertical,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserTasks,
  updateTask,
  deleteTask,
  createNotification,
  getAcademicInsight,
  getUserWorkspaces,
  createWorkspace,
  deleteWorkspace,
  updateWorkspace,
  type TaskDocument,
  type WorkspaceDocument,
} from "@/lib/firestore";
import { deadlineToDays, computePriorityDetailed, deriveAcademicRiskFromInsight } from "@/lib/fuzzyLogic";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type KanbanColumn = "todo" | "doing" | "done";

const COLUMNS: { id: KanbanColumn; label: string; bg: string }[] = [
  { id: "todo", label: "To Do", bg: "bg-gray-50/10" },
  { id: "doing", label: "In Progress", bg: "bg-blue-50/10" },
  { id: "done", label: "Done", bg: "bg-emerald-50/10" },
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
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="bg-white rounded-xl border border-[#EAEAEA]/80 p-5 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-200 ease-out cursor-grab active:cursor-grabbing group"
    >
      {/* Header row */}
      <div className="flex items-start gap-2 mb-3">
        <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 shrink-0 group-hover:text-gray-400 transition-colors" />
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-bold text-gray-900 tracking-tight line-clamp-2 leading-snug select-none">
            {task.title}
          </p>
        </div>
      </div>

      {/* Priority / Risk Badges */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${PRIORITY_BADGE[task.priorityLevel]}`}>
          {task.priorityLevel}
        </span>
        {task.riskLevel !== "Low" && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400">
            {RISK_ICON[task.riskLevel]}
            {task.riskLevel} Risk
          </span>
        )}
        <div className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 bg-indigo-50/70 border border-indigo-100/60 px-2 py-0.5 rounded-md ml-auto select-none">
          <Sparkles className="w-2.5 h-2.5 shrink-0 animate-pulse" />
          <span>AI Score: {task.priorityScore}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between text-[11px] font-medium text-gray-400">
          <span>Progress</span>
          <span className="font-semibold text-gray-600">{task.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${task.progress}%`,
              background: task.progress >= 80 ? "#10b981" : task.progress >= 40 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Footer (Deadline & Time) */}
      <div className="flex items-center justify-between pt-0.5 mb-4.5">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-300" />
          <span className={`text-[11px] font-medium ${deadlineColor(task)}`}>
            {formatDeadline(task)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
            <Timer className="w-3.5 h-3.5" />
            {task.estimatedTotalMinutes}m
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 items-center">
        <Link href={`/tasks/${task.id}/edit`} className="flex-1">
          <button className="w-full h-8.5 flex items-center justify-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-[#EAEAEA] transition-all">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </Link>
        <Link href={`/pomodoro?taskId=${task.id}`} className="flex-[1.8]">
          <button className="w-full h-8.5 flex items-center justify-center gap-1.5 text-xs font-extrabold text-white bg-primary hover:bg-primary-600 rounded-lg shadow-sm hover:shadow transition-all">
            <Flame className="w-3.5 h-3.5" /> Focus
          </button>
        </Link>
        
        {/* Three-dot overflow menu for Delete */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            onBlur={() => setTimeout(() => setShowMenu(false), 200)}
            className="w-8.5 h-8.5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg border border-[#EAEAEA] transition-all"
            title="Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-1 w-24 bg-white border border-[#EAEAEA] rounded-xl shadow-lg z-10 py-1 animate-scale-in">
              {confirmDelete ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Confirm
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceDocument[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<TaskDocument | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanColumn | null>(null);
  const [workspaceModal, setWorkspaceModal] = useState<{
    isOpen: boolean;
    mode: "create" | "rename";
    wsId?: string;
    wsName: string;
    inputValue: string;
  }>({
    isOpen: false,
    mode: "create",
    wsName: "",
    inputValue: "",
  });

  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      // Load workspaces
      let wsList = await getUserWorkspaces(user.uid);
      if (wsList.length === 0) {
        const defaultWsId = await createWorkspace(user.uid, "Personal Workspace");
        wsList = [{ id: defaultWsId, userId: user.uid, name: "Personal Workspace" }];
      }
      setWorkspaces(wsList);
      setActiveWorkspaceId((prev) => {
        if (prev && wsList.some((w) => w.id === prev)) return prev;
        return wsList[0]?.id || "";
      });

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

  const handleCreateWorkspace = () => {
    setWorkspaceModal({
      isOpen: true,
      mode: "create",
      wsName: "",
      inputValue: "",
    });
  };

  const handleRenameWorkspace = (wsId: string, currentName: string) => {
    setWorkspaceModal({
      isOpen: true,
      mode: "rename",
      wsId,
      wsName: currentName,
      inputValue: currentName,
    });
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const name = workspaceModal.inputValue.trim();
    if (!name) return;
    try {
      setLoading(true);
      if (workspaceModal.mode === "create") {
        const wsId = await createWorkspace(user.uid, name);
        const newWs = { id: wsId, userId: user.uid, name };
        setWorkspaces((prev) => [...prev, newWs]);
        setActiveWorkspaceId(wsId);
      } else if (workspaceModal.mode === "rename" && workspaceModal.wsId) {
        await updateWorkspace(workspaceModal.wsId, name);
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === workspaceModal.wsId ? { ...w, name } : w))
        );
      }
      setWorkspaceModal({ isOpen: false, mode: "create", wsName: "", inputValue: "" });
    } catch (err) {
      console.error(err);
      alert(`Failed to ${workspaceModal.mode} workspace.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkspace = async (wsId: string, name: string) => {
    if (workspaces.length <= 1) {
      alert("You must keep at least one workspace.");
      return;
    }
    const confirmText = `Are you sure you want to delete workspace "${name}"?\nThis will permanently delete all tasks associated with this workspace!`;
    if (!confirm(confirmText)) return;
    try {
      setLoading(true);
      await deleteWorkspace(wsId);
      const remaining = workspaces.filter((w) => w.id !== wsId);
      setWorkspaces(remaining);
      setTasks((prev) => prev.filter((t) => t.workspaceId !== wsId));
      if (activeWorkspaceId === wsId) {
        setActiveWorkspaceId(remaining[0]?.id || "");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete workspace.");
    } finally {
      setLoading(false);
    }
  };

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

  const defaultWorkspaceId = workspaces[0]?.id || "";

  const columnTasks = (col: KanbanColumn) =>
    tasks
      .filter((t) => {
        if (t.status !== col) return false;
        if (t.workspaceId) {
          return t.workspaceId === activeWorkspaceId;
        }
        return activeWorkspaceId === defaultWorkspaceId;
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);

  const activeWorkspaceTasks = tasks.filter((t) => {
    if (t.workspaceId) {
      return t.workspaceId === activeWorkspaceId;
    }
    return activeWorkspaceId === defaultWorkspaceId;
  });

  const recommendedTask = activeWorkspaceTasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => b.priorityScore - a.priorityScore)[0];

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
            <h1 className="text-3xl font-extrabold text-[#1F2937] tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-7 h-7 text-primary" />
              Task Board
            </h1>
            <p className="text-sm text-gray-400 mt-1.5 font-medium">
              Manage and prioritize your tasks using AI-powered fuzzy ranking.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/tasks/create?workspaceId=${activeWorkspaceId}`}>
              <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
                New Task
              </Button>
            </Link>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_40px_-10px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-scale-in">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm font-bold text-gray-700">Workspace:</span>
          </div>
          <div className="flex-1 w-full flex flex-wrap items-center gap-2">
            {workspaces.map((ws, index) => {
              const isActive = ws.id === activeWorkspaceId;
              const isDefault = index === 0; // oldest is default
              return (
                <div
                  key={ws.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 hover:scale-[1.02] transform group ${
                    isActive
                      ? "bg-primary-50 text-primary shadow-[0_2px_8px_rgba(79,138,107,0.08)] ring-1 ring-primary/10"
                      : "bg-transparent text-gray-500 hover:bg-gray-100/70 hover:text-gray-800"
                  }`}
                >
                  <button
                    onClick={() => setActiveWorkspaceId(ws.id)}
                    className="focus:outline-none"
                  >
                    {ws.name}
                  </button>
                  
                  {/* Actions for custom workspaces */}
                  {!isDefault && (
                    <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRenameWorkspace(ws.id, ws.name)}
                        className="p-0.5 text-gray-400 hover:text-primary transition-colors"
                        title="Rename Workspace"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkspace(ws.id, ws.name)}
                        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete Workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={handleCreateWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-primary hover:bg-primary-50/30 transition-all duration-200"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              New Workspace
            </button>
          </div>
        </div>

        {/* AI Recommendation Widget */}
        {recommendedTask && (
          <div className="bg-white rounded-2xl p-5.5 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_40px_-10px_rgba(0,0,0,0.03)] animate-scale-in flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 border border-primary-100/10">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Recommendation</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <h2 className="text-sm font-bold text-gray-900 leading-tight">
                  Focus: <span className="text-primary font-extrabold">{recommendedTask.title}</span>
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 pt-0.5 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    Priority Score: <span className="text-gray-600 font-semibold">{recommendedTask.priorityScore}</span>
                  </span>
                  {recommendedTask.riskLevel !== "Low" && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      Risk Level: <span className="text-gray-600 font-semibold">{recommendedTask.riskLevel}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    Est. Session: <span className="text-gray-600 font-semibold">{recommendedTask.estimatedTotalMinutes} mins</span>
                  </span>
                </div>
              </div>
            </div>
            <Link href={`/pomodoro?taskId=${recommendedTask.id}`} className="w-full md:w-auto shrink-0">
              <Button variant="primary" size="sm" icon={<Flame className="w-3.5 h-3.5" />}>
                Start Focus Session
              </Button>
            </Link>
          </div>
        )}

        {/* Stats Summary */}
        <div key={`stats-${activeWorkspaceId}`} className="grid grid-cols-3 sm:grid-cols-5 gap-3.5 animate-scale-in">
          {[
            { label: "Total", value: activeWorkspaceTasks.length, color: "text-gray-700" },
            { label: "To Do", value: columnTasks("todo").length, color: "text-gray-600" },
            { label: "In Progress", value: columnTasks("doing").length, color: "text-blue-600" },
            { label: "Done", value: columnTasks("done").length, color: "text-emerald-600" },
            {
              label: "Critical",
              value: activeWorkspaceTasks.filter((t) => t.priorityLevel === "Critical" && t.status !== "done").length,
              color: "text-red-600",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl px-4 py-3.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.01),0_10px_40px_-10px_rgba(0,0,0,0.03)]">
              <p className={`text-xl font-extrabold ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Kanban Columns */}
        <div key={`columns-${activeWorkspaceId}`} className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-scale-in">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-2xl p-4.5 min-h-[540px] flex flex-col gap-4.5 transition-all duration-200 ${col.bg} ${
                dragOverCol === col.id ? "bg-primary-50/5 ring-1 ring-primary/10 scale-[1.005]" : ""
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-1 select-none">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    col.id === "todo" ? "bg-gray-400" : col.id === "doing" ? "bg-blue-500" : "bg-emerald-500"
                  }`} />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">{col.label}</span>
                  <span className="text-[10px] font-bold bg-white text-gray-400 border border-[#EAEAEA]/80 px-1.5 py-0.5 rounded-md">
                    {columnTasks(col.id).length}
                  </span>
                </div>
                {col.id === "todo" && (
                  <Link href={`/tasks/create?workspaceId=${activeWorkspaceId}`}>
                    <button className="w-5.5 h-5.5 flex items-center justify-center rounded-md bg-white border border-[#EAEAEA]/80 text-gray-400 hover:text-primary hover:border-primary/40 transition-all">
                      <Plus className="w-3 h-3" />
                    </button>
                  </Link>
                )}
              </div>
 
              {/* Cards */}
              {columnTasks(col.id).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                  {col.id === "todo" ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-gray-100/50 flex items-center justify-center mb-2.5">
                        <Folder className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-xs font-bold text-gray-700">No tasks to do</p>
                      <p className="text-[10px] text-gray-400 max-w-[180px] mt-1 font-medium leading-relaxed">
                        Click the <span className="font-semibold text-gray-500">+</span> button above to create a task.
                      </p>
                    </>
                  ) : col.id === "doing" ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-blue-50/50 flex items-center justify-center mb-2.5">
                        <Timer className="w-5 h-5 text-blue-400" />
                      </div>
                      <p className="text-xs font-bold text-gray-750">No tasks in progress</p>
                      <p className="text-[10px] text-gray-400 max-w-[180px] mt-1 font-medium leading-relaxed">
                        Drag a task from <span className="font-semibold text-gray-500">To Do</span> here to start working.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-emerald-50/50 flex items-center justify-center mb-2.5">
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      </div>
                      <p className="text-xs font-bold text-gray-750">No completed tasks</p>
                      <p className="text-[10px] text-gray-400 max-w-[180px] mt-1 font-medium leading-relaxed">
                        Finish your focus sessions to complete tasks.
                      </p>
                    </>
                  )}
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

      {/* Workspace Modal */}
      {workspaceModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#EAEAEA] p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-[#1F2937] mb-4">
              {workspaceModal.mode === "create" ? "Create New Workspace" : `Rename "${workspaceModal.wsName}"`}
            </h3>
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <Input
                label="Workspace Name"
                placeholder="e.g. University, Personal, Work"
                value={workspaceModal.inputValue}
                onChange={(e) =>
                  setWorkspaceModal((prev) => ({ ...prev, inputValue: e.target.value }))
                }
                autoFocus
                required
              />
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() =>
                    setWorkspaceModal((prev) => ({ ...prev, isOpen: false }))
                  }
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md">
                  {workspaceModal.mode === "create" ? "Create" : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
