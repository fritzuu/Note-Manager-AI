"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, GripVertical, Timer, Search, CheckCircle2, Circle, Calendar, FolderPlus, List, Columns3, MoreHorizontal, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserTasks, updateTask, deleteTask, createNotification, getAcademicInsight, getEffectiveWorkspaces, type TaskDocument } from "@/lib/firestore";
import { deadlineToDays, computePriorityDetailed, deriveAcademicRiskFromInsight } from "@/lib/fuzzyLogic";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { Dropdown } from "@/components/ui/Dropdown";
import { WarningModal } from "@/components/ui/WarningModal";
import { priorityLabels, riskLabels } from "@/components/tasks/taskPresentation";
import s from "@/components/tasks/tasks.module.css";

type KanbanColumn = "todo" | "doing" | "done";
const COLUMNS: { id: KanbanColumn; label: string }[] = [{ id: "todo", label: "Belum mulai" }, { id: "doing", label: "Dikerjakan" }, { id: "done", label: "Selesai" }];
function formatDeadlineIndo(task: TaskDocument) {
  const date = task.deadline?.toDate?.();
  if (!date) return { text: "Tanpa tenggat", isUrgent: false, isOverdue: false };
  const days = Math.round(deadlineToDays(date));
  return { text: days < 0 ? `Lewat ${Math.abs(days)} hari` : days === 0 ? "Hari ini" : days === 1 ? "Besok" : date.toLocaleDateString("id-ID", { day: "numeric", month: "short" }), isUrgent: days <= 3, isOverdue: days < 0 };
}
function TaskCard({ task, pending, onStatus, onDeleteRequest, onDragStart, onDragEnd }: { task: TaskDocument; pending: boolean; onStatus: (status: KanbanColumn) => void; onDeleteRequest: (task: TaskDocument) => void; onDragStart: (event: React.DragEvent, task: TaskDocument) => void; onDragEnd: () => void }) {
  const due = formatDeadlineIndo(task);
  const progress = Math.max(0, Math.min(100, task.progress || 0));
  return <article className={s.taskRow} data-done={task.status === "done"} draggable={!pending} onDragStart={event => onDragStart(event, task)} onDragEnd={onDragEnd}>
    <button type="button" className={s.checkButton} disabled={pending} aria-label={task.status === "done" ? `Buka kembali ${task.title}` : `Tandai ${task.title} selesai`} onClick={() => onStatus(task.status === "done" ? "todo" : "done")}>{task.status === "done" ? <CheckCircle2 size={21} /> : <Circle size={21} />}</button>
    <div className={s.taskMain}><Link href={`/tasks/${task.id}/edit`} className={s.taskTitle}>{task.title}</Link>{task.description && <p className={s.taskDescription}>{task.description}</p>}<div className={s.taskMeta}><span>{task.workspace || task.course || "Umum"}</span><span data-urgent={due.isUrgent && task.status !== "done"}><Calendar size={13} />{due.text}</span>{task.estimatedTotalMinutes > 0 && <span><Timer size={13} />{task.estimatedTotalMinutes} menit</span>}{task.status !== "done" && <span className={s.priorityBadge} data-priority={task.priorityLevel}>{priorityLabels[task.priorityLevel]} · {task.priorityScore}/100</span>}</div></div>
    <div className={s.taskControls}><div className={s.progressSmall}><span>{progress}%</span><div><i style={{ width: `${progress}%` }} /></div></div><Link href={`/pomodoro?taskId=${task.id}`} className={s.focusLink} aria-label={`Mulai fokus untuk ${task.title}`}><Timer size={16} /><span>Fokus</span></Link><details className={s.taskMenu}><summary aria-label={`Tindakan untuk ${task.title}`}><MoreHorizontal size={19} /></summary><div>{task.riskLevel && <p>{riskLabels[task.riskLevel]}</p>}<Link href={`/tasks/${task.id}/edit`}><Pencil size={15} />Edit tugas</Link><Link href={`/pomodoro?taskId=${task.id}`}><ArrowUpRight size={15} />Mulai fokus</Link><button type="button" disabled={pending} onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onDeleteRequest(task); }}><Trash2 size={15} />Hapus tugas</button></div></details><GripVertical className={s.taskGrip} size={16} aria-hidden="true" /></div>
  </article>;
}

export default function KanbanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const pageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"list" | "board">("board");
  const [pocket, setPocket] = useState<"active" | "doing" | "done" | "all">("active");
  const [sortBy, setSortBy] = useState("priority");
  const [actionError, setActionError] = useState("");
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const pendingRef = useRef(new Set<string>());
  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<TaskDocument | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanColumn | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");

  useEffect(() => {
    const closeMenus = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      pageRef.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(menu => {
        if (event instanceof PointerEvent && event.target instanceof Node && menu.contains(event.target)) return;
        menu.removeAttribute("open");
        if (event instanceof KeyboardEvent && menu.contains(document.activeElement)) menu.querySelector<HTMLElement>("summary")?.focus();
      });
    };
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeMenus);
    return () => { document.removeEventListener("pointerdown", closeMenus); document.removeEventListener("keydown", closeMenus); };
  }, []);

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
              title: "Tenggat tugas mendekat",
              message: `"${task.title}" jatuh tempo ${Math.round(deadlineDays)} hari lagi. Progresnya ${task.progress || 0}%.`,
              type: "high_risk",
            });
          }
          if (deadlineDays >= 0 && deadlineDays < 1 && (task.progress || 0) < 50) {
            await createNotification(user.uid, {
              title: "Tenggat hari ini",
              message: `"${task.title}" jatuh tempo hari ini. Progresnya ${task.progress || 0}%.`,
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

  const changeStatus = async (task: TaskDocument, status: KanbanColumn) => {
    if (pendingRef.current.has(task.id) || task.status === status) return;
    pendingRef.current.add(task.id);
    setPendingIds(previous => [...previous, task.id]);
    setActionError("");
    try {
      await updateTask(task.id, { status });
      const result = computePriorityDetailed({ deadlineDays: task.deadline?.toDate ? deadlineToDays(task.deadline.toDate()) : 7, importance: task.importance, difficulty: task.difficulty, progress: task.progress, academicRisk: task.academicRisk ?? 40 });
      setTasks(previous => previous.map(item => item.id === task.id ? { ...item, status, priorityScore: status === "done" ? 0 : result.priorityScore, priorityLevel: status === "done" ? "Low" : result.priorityLevel } : item));
    } catch { setActionError("Status belum tersimpan. Coba lagi."); }
    finally { pendingRef.current.delete(task.id); setPendingIds(previous => previous.filter(id => id !== task.id)); }
  };
  const handleDrop = async (event: React.DragEvent, status: KanbanColumn) => {
    event.preventDefault();
    const task = draggedTask;
    setDraggedTask(null);
    setDragOverCol(null);
    if (task) await changeStatus(task, status);
  };

  const confirmDeleteTask = async () => {
    if (!deleteTarget || isDeleting) return;
    setActionError("");
    setIsDeleting(true);
    try {
      await deleteTask(deleteTarget.id);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
      setActionError("Tugas belum terhapus. Coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteWorkspace = async () => {
    if (!workspaceToDelete || !user || isDeletingWorkspace) return;
    setActionError("");
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
      setActionError("Workspace belum terhapus. Coba lagi.");
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

  const sortTasks = (items: TaskDocument[]) => [...items].sort((a, b) => sortBy === "title" ? a.title.localeCompare(b.title, "id") : sortBy === "deadline" ? (a.deadline?.toDate?.().getTime() || Infinity) - (b.deadline?.toDate?.().getTime() || Infinity) : b.priorityScore - a.priorityScore);
  const listTasks = sortTasks(filteredTasks.filter(task => pocket === "all" || (pocket === "active" ? task.status !== "done" : task.status === pocket)));
  const createHref = selectedWorkspace === "all" ? "/tasks/create" : `/tasks/create?workspace=${encodeURIComponent(selectedWorkspace)}`;
  const card = (task: TaskDocument) => <TaskCard key={task.id} task={task} pending={pendingIds.includes(task.id)} onStatus={status => changeStatus(task, status)} onDeleteRequest={setDeleteTarget} onDragStart={handleDragStart} onDragEnd={() => { setDraggedTask(null); setDragOverCol(null); }} />;

  if (authLoading || loading) {
    return (
      <DashboardShell fullWidth>
        <LoadingScreen label="Memuat tugas…" />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell fullWidth>
        <ErrorState
          title="Tugas belum bisa dimuat"
          message={error}
          onRetry={loadTasks}
        />
      </DashboardShell>
    );
  }

  return <DashboardShell fullWidth>
      {actionError && (deleteTarget || workspaceToDelete) && <div className={s.modalError} role="alert">{actionError}</div>}
      {/* Warning Modal for Task Deletion */}
      <WarningModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteTask}
        title="Hapus tugas"
        description={`Hapus tugas "${deleteTarget?.title}"? Tugas dan progresnya akan dihapus permanen.`}
        confirmText="Hapus tugas"
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
              ? `Workspace ini memiliki ${workspaceToDelete.taskCount} tugas. Pilih tindakan untuk tugas di dalamnya:`
              : `Apakah kamu yakin ingin menghapus workspace "${workspaceToDelete.name}" dari daftar?`
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
                  <p className="font-bold text-gray-900">Pindahkan semua tugas ke Workspace "Umum" </p>
                  <p className="text-[11px] text-gray-500 font-normal mt-0.5">
                    Tugas tetap tersimpan dan tidak akan terhapus, hanya workspace-nya yang berubah.
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
                    Tugas dan progresnya tidak bisa dikembalikan.
                  </p>
                </div>
              </label>
            </div>
          )}
        </WarningModal>
      )}

    <div ref={pageRef} className={s.page}>
      <header className={s.header}><div><h1>Tugas</h1><p>{tasks.filter(task => task.status !== "done").length} tugas aktif</p></div><Link href={createHref} className={s.primary}><Plus size={17} />Tambah tugas</Link></header>
      {actionError && <p className={s.error} role="alert">{actionError}</p>}
      <section className={s.workspaces} aria-label="Workspace"><div className={s.workspaceHeading}><h2>Workspace</h2><Link href="/tasks/create" className={s.textLink}><FolderPlus size={16} />Workspace baru</Link></div><div className={s.workspaceTabs}>
        <button type="button" aria-pressed={selectedWorkspace === "all"} onClick={() => setSelectedWorkspace("all")}>Semua<span>{tasks.length}</span></button>
        {workspacesList.map(name => { const selected = selectedWorkspace.toLowerCase() === name.toLowerCase(); const count = tasks.filter(task => (task.workspace || task.course || "Umum").toLowerCase() === name.toLowerCase()).length; return <div className={s.workspaceTab} key={name} data-selected={selected}><button type="button" aria-pressed={selected} onClick={() => setSelectedWorkspace(selected ? "all" : name)}>{name}<span>{count}</span></button>{name !== "Umum" && <button type="button" className={s.workspaceRemove} aria-label={`Hapus workspace ${name}`} onClick={() => { setWorkspaceDeleteAction("relocate"); setWorkspaceToDelete({ name, taskCount: count }); }}><Trash2 size={13} /></button>}</div>; })}
      </div></section>
      <div className={s.toolbar}><div className={s.search}><Search size={17} aria-hidden="true" /><input aria-label="Cari tugas" placeholder="Cari tugas atau workspace…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /></div><Dropdown className={s.filterDropdown} label="Filter prioritas" value={selectedPriority} onChange={setSelectedPriority} options={[{ value: "all", label: "Semua prioritas" }, ...Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))]} /><Dropdown className={s.filterDropdown} label="Urutkan tugas" value={sortBy} onChange={setSortBy} options={[{ value: "priority", label: "Prioritas" }, { value: "deadline", label: "Tenggat terdekat" }, { value: "title", label: "Nama tugas" }]} /><div className={s.viewSwitch} aria-label="Tampilan tugas"><button type="button" aria-label="Daftar" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={18} /></button><button type="button" aria-label="Papan" aria-pressed={view === "board"} onClick={() => setView("board")}><Columns3 size={18} /></button></div></div>
      {view === "list" ? <><nav className={s.statusTabs} aria-label="Status tugas">{([{ id: "active", label: "Aktif" }, { id: "doing", label: "Dikerjakan" }, { id: "done", label: "Selesai" }, { id: "all", label: "Semua" }] as const).map(item => <button type="button" key={item.id} aria-pressed={pocket === item.id} onClick={() => setPocket(item.id)}>{item.label}<span>{filteredTasks.filter(task => item.id === "all" || (item.id === "active" ? task.status !== "done" : task.status === item.id)).length}</span></button>)}</nav><div className={s.list}>{listTasks.length ? listTasks.map(card) : <div className={s.empty}><CheckCircle2 size={28} /><h2>{searchQuery || selectedPriority !== "all" ? "Tidak ada tugas yang cocok" : pocket === "done" ? "Belum ada tugas selesai" : "Belum ada tugas di sini"}</h2><Link href={createHref} className={s.textLink}>Tambah tugas<Plus size={16} /></Link></div>}</div></> : <div className={s.board}>{COLUMNS.map(column => { const items = sortTasks(filteredTasks.filter(task => task.status === column.id)); return <section key={column.id} className={s.boardColumn} data-status={column.id} data-drag-over={dragOverCol === column.id} onDragOver={event => { event.preventDefault(); setDragOverCol(column.id); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverCol(null); }} onDrop={event => handleDrop(event, column.id)}><header><h2>{column.label}<span>{items.length}</span></h2>{column.id === "todo" && <Link href={createHref} aria-label="Tambah tugas"><Plus size={17} /></Link>}</header><div className={s.boardItems}>{items.length ? items.map(card) : <p className={s.boardEmpty}>Tarik tugas ke sini untuk mengubah status.</p>}</div></section>; })}</div>}
    </div>
  </DashboardShell>;
}
