"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  CheckSquare,
  Flame,
  Pencil,
  Trash2,
  GripVertical,
  Timer,
  ShieldAlert,
  Search,
  Filter,
  CircleDot,
  PlayCircle,
  CheckCircle2,
  Calendar,
  Layers,
  BookOpen,
  Briefcase,
  FolderPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserTasks,
  updateTask,
  deleteTask,
  createNotification,
  getAcademicInsight,
  getEffectiveWorkspaces,
  type TaskDocument,
} from "@/lib/firestore";
import { deadlineToDays, computePriorityDetailed, deriveAcademicRiskFromInsight } from "@/lib/fuzzyLogic";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { WarningModal } from "@/components/ui/WarningModal";

type KanbanColumn = "todo" | "doing" | "done";

const COLUMNS: {
  id: KanbanColumn;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeBg: string;
  columnBg: string;
  borderCol: string;
}[] = [
  {
    id: "todo",
    label: "To Do",
    sub: "Tugas yang akan dikerjakan",
    icon: CircleDot,
    color: "text-gray-700",
    badgeBg: "bg-gray-100 text-gray-700 border-gray-200",
    columnBg: "bg-slate-50/70",
    borderCol: "border-slate-200/80",
  },
  {
    id: "doing",
    label: "Sedang Dikerjakan",
    sub: "Fokus aktif saat ini",
    icon: PlayCircle,
    color: "text-blue-700",
    badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
    columnBg: "bg-blue-50/30",
    borderCol: "border-blue-200/60",
  },
  {
    id: "done",
    label: "Selesai",
    sub: "Target yang telah tuntas",
    icon: CheckCircle2,
    color: "text-emerald-700",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    columnBg: "bg-emerald-50/30",
    borderCol: "border-emerald-200/60",
  },
];

const PRIORITY_BADGE_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Critical: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  High: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  Medium: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  Low: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
};

const WORKSPACE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Kecerdasan Buatan": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Basis Data": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Pemrograman Web": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  "Jaringan Komputer": { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  "Proyek Akhir": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Organisasi": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Personal": { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  "Umum": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

function getWorkspaceBadgeStyle(name: string) {
  return (
    WORKSPACE_COLORS[name] || {
      bg: "bg-primary/5",
      text: "text-primary",
      border: "border-primary/20",
    }
  );
}

function formatDeadlineIndo(task: TaskDocument): { text: string; isUrgent: boolean; isOverdue: boolean } {
  const deadline = task.deadline?.toDate ? task.deadline.toDate() : null;
  if (!deadline) return { text: "Tanpa batas waktu", isUrgent: false, isOverdue: false };
  const days = Math.round(deadlineToDays(deadline));
  if (days < 0) return { text: `Terlambat ${Math.abs(days)} hr`, isUrgent: true, isOverdue: true };
  if (days === 0) return { text: "Hari ini", isUrgent: true, isOverdue: false };
  if (days === 1) return { text: "Besok", isUrgent: true, isOverdue: false };
  return { text: `${days} hari lagi`, isUrgent: days <= 3, isOverdue: false };
}

interface TaskCardProps {
  task: TaskDocument;
  onDeleteRequest: (task: TaskDocument) => void;
  onDragStart: (e: React.DragEvent, task: TaskDocument) => void;
}

function TaskCard({ task, onDeleteRequest, onDragStart }: TaskCardProps) {
  const deadlineInfo = formatDeadlineIndo(task);
  const priorityStyle = PRIORITY_BADGE_STYLE[task.priorityLevel] || PRIORITY_BADGE_STYLE.Medium;
  const workspaceName = task.workspace || task.course || "Umum";
  const wsStyle = getWorkspaceBadgeStyle(workspaceName);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="bg-white rounded-2xl border border-border p-4 shadow-xs hover:shadow-card-hover hover:border-primary/40 transition-all duration-300 cursor-grab active:cursor-grabbing group relative flex flex-col justify-between gap-3"
    >
      {/* Top Details */}
      <div className="space-y-2.5">
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority Badge */}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
              {task.priorityLevel} ({task.priorityScore})
            </span>

            {/* Workspace Badge */}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${wsStyle.bg} ${wsStyle.text} ${wsStyle.border}`}
            >
              <Briefcase className="w-3 h-3" />
              {workspaceName}
            </span>

            {/* Academic Risk if any */}
            {task.riskLevel && task.riskLevel !== "Low" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                <ShieldAlert className="w-3 h-3" />
                Risiko {task.riskLevel}
              </span>
            )}
          </div>

          <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" />
        </div>

        {/* Task Title */}
        <h4 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {task.title}
        </h4>

        {/* Task Description snippet if available */}
        {task.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Middle Progress Bar */}
      <div className="space-y-1.5 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500 font-medium">Progres Pengerjaan</span>
          <span className="font-bold text-gray-800 font-mono">{task.progress || 0}%</span>
        </div>
        <div className="h-2 bg-gray-200/80 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${task.progress || 0}%`,
              background:
                task.progress >= 80
                  ? "linear-gradient(90deg, #10b981, #059669)"
                  : task.progress >= 40
                  ? "linear-gradient(90deg, #f59e0b, #d97706)"
                  : "linear-gradient(90deg, #ef4444, #dc2626)",
            }}
          />
        </div>
      </div>

      {/* Footer Info & Deadline */}
      <div className="flex items-center justify-between text-[11px] pt-1 text-gray-500 font-medium">
        {/* Deadline */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
            deadlineInfo.isOverdue
              ? "bg-rose-50 text-rose-600 border border-rose-200"
              : deadlineInfo.isUrgent
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "text-gray-500"
          }`}
        >
          <Calendar className="w-3 h-3" />
          <span>{deadlineInfo.text}</span>
        </div>

        {/* Estimated Duration */}
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Timer className="w-3 h-3" />
          <span>{task.estimatedTotalMinutes || 25}m</span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-border/60">
        {/* Quick Focus Button */}
        <Link
          href={`/pomodoro?taskId=${task.id}`}
          className="flex-1 h-8 flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:text-white bg-primary-50 hover:bg-primary rounded-xl border border-primary/20 hover:border-primary transition-all cursor-pointer shadow-2xs"
          title="Mulai Fokus Belajar dengan Pomodoro"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Fokus</span>
        </Link>

        {/* Edit Button */}
        <Link
          href={`/tasks/${task.id}/edit`}
          className="h-8 px-2.5 flex items-center justify-center gap-1 text-xs font-semibold text-gray-600 hover:text-primary bg-gray-50 hover:bg-primary-50 rounded-xl border border-border hover:border-primary/30 transition-all cursor-pointer"
          title="Edit Tugas"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Link>

        {/* Delete Button (Triggers WarningModal) */}
        <button
          type="button"
          onClick={() => onDeleteRequest(task)}
          className="h-8 px-2.5 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-border hover:border-rose-200 transition-all cursor-pointer"
          title="Hapus Tugas"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");

  // Warning Modal State for Task Deletion
  const [deleteTarget, setDeleteTarget] = useState<TaskDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Workspace Deletion State
  const [workspaceToDelete, setWorkspaceToDelete] = useState<{ name: string; taskCount: number } | null>(null);
  const [workspaceDeleteAction, setWorkspaceDeleteAction] = useState<"relocate" | "delete_all">("relocate");
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const [hiddenWorkspaces, setHiddenWorkspaces] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mindflow_hidden_workspaces");
      if (saved) {
        setHiddenWorkspaces(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [data, insight] = await Promise.all([
        getUserTasks(user.uid),
        getAcademicInsight(user.uid).catch(() => null),
      ]);

      const latestAcademicRisk = insight
        ? deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction)
        : 40;

      // Recalculate priority scores on the fly using latest academic risk and current date
      const updatedTasks = (data || []).map((task) => {
        if (task.status === "done") {
          return {
            ...task,
            priorityScore: 0,
            priorityLevel: "Low" as const,
          };
        }

        const deadline = task.deadline?.toDate
          ? task.deadline.toDate()
          : (task.deadline as { seconds?: number })?.seconds
          ? new Date((task.deadline as { seconds: number }).seconds * 1000)
          : (task.deadline ? new Date(task.deadline as unknown as string) : new Date());

        const deadlineDays = deadlineToDays(isNaN(deadline.getTime()) ? new Date() : deadline);
        const result = computePriorityDetailed({
          deadlineDays,
          importance: typeof task.importance === "number" ? task.importance : 5,
          difficulty: typeof task.difficulty === "number" ? task.difficulty : 5,
          progress: typeof task.progress === "number" ? task.progress : 0,
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

      // Run reminder agent on load silently
      try {
        for (const task of updatedTasks) {
          if (task.status === "done") continue;
          const deadline = task.deadline?.toDate
            ? task.deadline.toDate()
            : (task.deadline as { seconds?: number })?.seconds
            ? new Date((task.deadline as { seconds: number }).seconds * 1000)
            : null;
          const deadlineDays = deadline && !isNaN(deadline.getTime()) ? deadlineToDays(deadline) : 999;

          if (deadlineDays < 3 && deadlineDays >= 0 && (task.progress || 0) < 30) {
            await createNotification(user.uid, {
              title: "High Risk Task",
              message: `"${task.title}" is due in ${Math.round(deadlineDays)}d with only ${task.progress || 0}% progress.`,
              type: "high_risk",
            });
          }
          if (deadlineDays >= 0 && deadlineDays < 1 && (task.progress || 0) < 50) {
            await createNotification(user.uid, {
              title: "Critical Alert",
              message: `"${task.title}" is due TODAY with ${task.progress || 0}% progress. Act now!`,
              type: "critical_alert",
            });
          }
        }
      } catch (notifErr) {
        console.warn("Silent notification check failed:", notifErr);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setError("Gagal memuat daftar tugas. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const t = setTimeout(() => {
      loadTasks();
    }, 0);
    return () => clearTimeout(t);
  }, [user, authLoading, loadTasks, router]);

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

  const confirmDeleteTask = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTask(deleteTarget.id);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteWorkspace = async () => {
    if (!workspaceToDelete || !user) return;
    setIsDeletingWorkspace(true);
    try {
      const { deleteWorkspaceTasks } = await import("@/lib/firestore");
      await deleteWorkspaceTasks(user.uid, workspaceToDelete.name, workspaceDeleteAction);

      // Save to hidden workspaces
      const newHidden = Array.from(new Set([...hiddenWorkspaces, workspaceToDelete.name]));
      setHiddenWorkspaces(newHidden);
      try {
        localStorage.setItem("mindflow_hidden_workspaces", JSON.stringify(newHidden));
      } catch {
        // ignore
      }

      if (selectedWorkspace.toLowerCase() === workspaceToDelete.name.toLowerCase()) {
        setSelectedWorkspace("all");
      }

      setWorkspaceToDelete(null);
      await loadTasks();
    } catch (err) {
      console.error("Failed to delete workspace:", err);
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  // Distinct list of Workspaces derived from tasks + defaults
  const workspacesList = useMemo(() => {
    return getEffectiveWorkspaces(tasks, hiddenWorkspaces);
  }, [tasks, hiddenWorkspaces]);

  // Filtered tasks per workspace, search, and priority
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskWs = task.workspace || task.course || "Umum";
      const matchesWorkspace =
        selectedWorkspace === "all" || taskWs.toLowerCase() === selectedWorkspace.toLowerCase();

      const matchesSearch =
        searchQuery.trim() === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        taskWs.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority =
        selectedPriority === "all" || task.priorityLevel.toLowerCase() === selectedPriority.toLowerCase();

      return matchesWorkspace && matchesSearch && matchesPriority;
    });
  }, [tasks, selectedWorkspace, searchQuery, selectedPriority]);

  const columnTasks = (col: KanbanColumn) =>
    filteredTasks
      .filter((t) => t.status === col)
      .sort((a, b) => b.priorityScore - a.priorityScore);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const todo = filteredTasks.filter((t) => t.status === "todo").length;
    const doing = filteredTasks.filter((t) => t.status === "doing").length;
    const done = filteredTasks.filter((t) => t.status === "done").length;
    const critical = filteredTasks.filter((t) => t.priorityLevel === "Critical" && t.status !== "done").length;
    return { total, todo, doing, done, critical };
  }, [filteredTasks]);

  if (authLoading || loading) {
    return (
      <DashboardShell fullWidth>
        <LoadingScreen label="Memuat Task Board..." subtext="Mengalkulasi prioritas & deadline tugas per workspace" />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell fullWidth>
        <ErrorState
          title="Gagal Memuat Task Board"
          message={error}
          onRetry={loadTasks}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell fullWidth>
      {/* Warning Modal for Task Deletion */}
      <WarningModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteTask}
        title="Hapus Tugas Akademik"
        description={`Apakah Anda yakin ingin menghapus tugas "${deleteTarget?.title}"? Tindakan ini akan menghapus data progres dan fuzzy score secara permanen.`}
        confirmText="Ya, Hapus Tugas"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Warning Modal for Workspace Deletion */}
      {workspaceToDelete && (
        <WarningModal
          isOpen={!!workspaceToDelete}
          onClose={() => setWorkspaceToDelete(null)}
          onConfirm={confirmDeleteWorkspace}
          title={`Hapus Workspace "${workspaceToDelete.name}"`}
          description={
            workspaceToDelete.taskCount > 0
              ? `Workspace ini memiliki ${workspaceToDelete.taskCount} tugas aktif. Pilih tindakan yang ingin Anda lakukan terhadap tugas-tugas di dalamnya:`
              : `Apakah Anda yakin ingin menghapus workspace "${workspaceToDelete.name}" dari daftar?`
          }
          confirmText={
            workspaceToDelete.taskCount > 0 && workspaceDeleteAction === "delete_all"
              ? "Hapus Workspace & Seluruh Tugas"
              : "Hapus Workspace"
          }
          cancelText="Batal"
          variant="danger"
          isLoading={isDeletingWorkspace}
        >
          {workspaceToDelete.taskCount > 0 && (
            <div className="mt-4 space-y-2 text-left">
              <label
                onClick={() => setWorkspaceDeleteAction("relocate")}
                className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                  workspaceDeleteAction === "relocate"
                    ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                    : "border-border bg-white text-gray-700 hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="ws_action"
                  checked={workspaceDeleteAction === "relocate"}
                  onChange={() => setWorkspaceDeleteAction("relocate")}
                  className="mt-0.5 accent-primary"
                />
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Pindahkan semua tugas ke Workspace "Umum" (Aman)</p>
                  <p className="text-[11px] text-gray-500 font-normal mt-0.5">
                    Tugas tetap tersimpan dan tidak akan terhapus, hanya kategori workspace-nya yang diubah.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setWorkspaceDeleteAction("delete_all")}
                className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                  workspaceDeleteAction === "delete_all"
                    ? "border-rose-500 bg-rose-50/50 text-rose-700 font-bold shadow-xs"
                    : "border-border bg-white text-gray-700 hover:border-rose-300"
                }`}
              >
                <input
                  type="radio"
                  name="ws_action"
                  checked={workspaceDeleteAction === "delete_all"}
                  onChange={() => setWorkspaceDeleteAction("delete_all")}
                  className="mt-0.5 accent-rose-600"
                />
                <div className="text-xs">
                  <p className="font-bold text-rose-900">Hapus seluruh {workspaceToDelete.taskCount} tugas secara permanen</p>
                  <p className="text-[11px] text-rose-600/80 font-normal mt-0.5">
                    Semua tugas di workspace ini akan dihapus secara total dari database.
                  </p>
                </div>
              </label>
            </div>
          )}
        </WarningModal>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1F2937] tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
                <CheckSquare className="w-5 h-5" />
              </div>
              Papan Tugas Akademik
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Kelola tugas per workspace & mata kuliah · Diurutkan otomatis menggunakan Fuzzy Priority AI
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              href={selectedWorkspace === "all" ? "/tasks/create" : `/tasks/create?workspace=${encodeURIComponent(selectedWorkspace)}`}
              icon={<Plus className="w-4 h-4" />}
              className="font-bold shadow-sm cursor-pointer"
            >
              Tambah Tugas
            </Button>
          </div>
        </div>

        {/* ── WORKSPACE SELECTOR TABS ── */}
        <div className="bg-white rounded-3xl border border-border p-4 shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                Workspace / Mata Kuliah
              </h3>
            </div>
            <span className="text-[11px] text-gray-400 font-semibold">
              {workspacesList.length} Workspace Aktif
            </span>
          </div>

          {/* Horizontal Scrollable Workspace Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
            {/* All Workspaces Tab */}
            <button
              type="button"
              onClick={() => setSelectedWorkspace("all")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                selectedWorkspace === "all"
                  ? "bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20"
                  : "bg-gray-50 text-gray-600 border-border hover:bg-gray-100 hover:border-gray-300"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Workspace</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedWorkspace === "all" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {tasks.length}
              </span>
            </button>

            {/* Individual Workspace Pills with Delete Button */}
            {workspacesList.map((ws) => {
              const isSelected = selectedWorkspace.toLowerCase() === ws.toLowerCase();
              const wsTasks = tasks.filter(
                (t) => (t.workspace || t.course || "Umum").toLowerCase() === ws.toLowerCase()
              );
              const wsActiveCount = wsTasks.filter((t) => t.status !== "done").length;

              return (
                <div
                  key={ws}
                  className={`group flex items-center gap-1 pl-3.5 pr-2 py-1.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20"
                      : "bg-white text-gray-700 border-border hover:border-primary/40 hover:bg-primary-50/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedWorkspace(isSelected ? "all" : ws)}
                    className="flex items-center gap-2 cursor-pointer focus:outline-none"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{ws}</span>
                    {wsTasks.length > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : wsActiveCount > 0
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {wsTasks.length}
                      </span>
                    )}
                  </button>

                  {/* Delete Workspace Button */}
                  {ws !== "Umum" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkspaceDeleteAction("relocate");
                        setWorkspaceToDelete({ name: ws, taskCount: wsTasks.length });
                      }}
                      className={`ml-1 p-1 rounded-lg transition-all cursor-pointer opacity-70 group-hover:opacity-100 ${
                        isSelected
                          ? "hover:bg-white/20 text-white"
                          : "hover:bg-rose-50 text-gray-400 hover:text-rose-600"
                      }`}
                      title={`Hapus Workspace ${ws}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Create Task in New Workspace */}
            <Link
              href="/tasks/create"
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold text-gray-500 hover:text-primary bg-gray-50 hover:bg-primary-50 border border-dashed border-gray-300 hover:border-primary/40 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Workspace Baru</span>
            </Link>
          </div>
        </div>

        {/* 5 Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 animate-scale-in">
          <div className="bg-white rounded-2xl border border-border p-3.5 text-center shadow-xs">
            <p className="text-xl font-black text-gray-800 font-mono">{stats.total}</p>
            <p className="text-[11px] text-gray-400 font-bold mt-0.5">Total Tugas</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-3.5 text-center shadow-xs">
            <p className="text-xl font-black text-gray-700 font-mono">{stats.todo}</p>
            <p className="text-[11px] text-gray-400 font-bold mt-0.5">To Do</p>
          </div>
          <div className="bg-white rounded-2xl border border-blue-100 bg-blue-50/30 p-3.5 text-center shadow-xs">
            <p className="text-xl font-black text-blue-600 font-mono">{stats.doing}</p>
            <p className="text-[11px] text-blue-600/80 font-bold mt-0.5">Sedang Dikerjakan</p>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-100 bg-emerald-50/30 p-3.5 text-center shadow-xs">
            <p className="text-xl font-black text-emerald-600 font-mono">{stats.done}</p>
            <p className="text-[11px] text-emerald-600/80 font-bold mt-0.5">Selesai</p>
          </div>
          <div className="bg-white rounded-2xl border border-rose-100 bg-rose-50/30 p-3.5 text-center shadow-xs col-span-2 sm:col-span-1">
            <p className="text-xl font-black text-rose-600 font-mono">{stats.critical}</p>
            <p className="text-[11px] text-rose-600/80 font-bold mt-0.5">Prioritas Kritis</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-border shadow-xs animate-scale-in">
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Cari tugas, catatan, atau workspace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Priority Quick Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1 pl-1">
              <Filter className="w-3.5 h-3.5" />
              Prioritas:
            </span>
            {["all", "Critical", "High", "Medium", "Low"].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedPriority(lvl)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedPriority === lvl
                    ? "bg-primary text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-border"
                }`}
              >
                {lvl === "all" ? "Semua" : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Kanban Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-scale-in">
          {COLUMNS.map((col) => {
            const ColumnIcon = col.icon;
            const tasksInCol = columnTasks(col.id);

            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col.id);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`rounded-3xl border p-4 sm:p-5 min-h-[560px] flex flex-col gap-4 transition-all duration-300 ${
                  col.columnBg
                } ${col.borderCol} ${
                  dragOverCol === col.id
                    ? "ring-2 ring-primary ring-offset-2 scale-[1.01] bg-primary-50/30"
                    : "shadow-xs"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-xl bg-white border border-border shadow-2xs ${col.color}`}>
                      <ColumnIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold tracking-tight ${col.color}`}>{col.label}</h3>
                      <p className="text-[10px] text-gray-400 font-semibold">{col.sub}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${col.badgeBg}`}>
                      {tasksInCol.length}
                    </span>

                    {col.id === "todo" && (
                      <Link
                        href={selectedWorkspace === "all" ? "/tasks/create" : `/tasks/create?workspace=${encodeURIComponent(selectedWorkspace)}`}
                        className="w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-border text-gray-500 hover:text-primary hover:border-primary/40 transition-all cursor-pointer shadow-2xs hover:scale-105"
                        title="Tambah Tugas Baru"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Task Cards List */}
                {tasksInCol.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-gray-200/80 rounded-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-gray-300 mb-2 border border-border/80 shadow-2xs">
                      <Layers className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-gray-600">
                      {col.id === "todo"
                        ? "Belum ada tugas di To Do"
                        : col.id === "doing"
                        ? "Tidak ada tugas aktif"
                        : "Belum ada tugas selesai"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {selectedWorkspace !== "all"
                        ? `Tidak ada tugas untuk workspace "${selectedWorkspace}"`
                        : "Tarik kartu tugas ke sini untuk memindahkan status."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                    {tasksInCol.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDeleteRequest={(t) => setDeleteTarget(t)}
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}

