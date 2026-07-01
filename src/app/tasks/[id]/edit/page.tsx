"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import {
  ChevronLeft,
  AlertTriangle,
  Zap,
  CalendarDays,
  Loader2,
  Brain,
  Lock,
  GitBranch,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getTask, updateTask, getAcademicInsight, getUserWorkspaces, type WorkspaceDocument } from "@/lib/firestore";
import {
  computePriorityDetailed,
  deadlineToDays,
  deriveAcademicRiskFromInsight,
  type FuzzyDetailedResult,
} from "@/lib/fuzzyLogic";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { computePomodoroFocus } from "@/lib/pomodoroFuzzy";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PRIORITY_BG: Record<string, string> = {
  Critical: "bg-red-50 border-red-200 text-red-700",
  High:     "bg-orange-50 border-orange-200 text-orange-700",
  Medium:   "bg-amber-50 border-amber-200 text-amber-700",
  Low:      "bg-emerald-50 border-emerald-200 text-emerald-700",
};

const PRIORITY_RING: Record<string, string> = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#f59e0b",
  Low:      "#10b981",
};

function riskLabel(score: number): string {
  if (score >= 80) return "Critical";
  if (score >= 55) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}

function riskColor(score: number): string {
  if (score >= 80) return "text-red-600";
  if (score >= 55) return "text-orange-600";
  if (score >= 35) return "text-amber-600";
  return "text-emerald-600";
}

function riskBg(score: number): string {
  if (score >= 80) return "bg-red-50 border-red-200";
  if (score >= 55) return "bg-orange-50 border-orange-200";
  if (score >= 35) return "bg-amber-50 border-amber-200";
  return "bg-emerald-50 border-emerald-200";
}

function MembershipRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-500 w-9 text-right shrink-0">{value.toFixed(2)}</span>
    </div>
  );
}

export default function EditTaskPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [form, setForm] = useState({
    title: "", description: "", deadline: "",
    importance: 5, difficulty: 5, progress: 0,
    status: "todo" as "todo" | "doing" | "done",
  });
  const [academicRisk, setAcademicRisk] = useState(40);
  const [prediction, setPrediction] = useState("—");
  const [workspaces, setWorkspaces] = useState<WorkspaceDocument[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    const load = async () => {
      try {
        const [task, insight, wsList] = await Promise.all([
          getTask(taskId),
          getAcademicInsight(user.uid),
          getUserWorkspaces(user.uid),
        ]);
        if (!task || task.userId !== user.uid) { router.push("/tasks"); return; }

        const deadlineDate = task.deadline?.toDate ? task.deadline.toDate() : new Date();
        setForm({
          title:       task.title,
          description: task.description,
          deadline:    deadlineDate.toISOString().split("T")[0],
          importance:  task.importance,
          difficulty:  task.difficulty,
          progress:    task.progress,
          status:      task.status,
        });

        setWorkspaces(wsList);
        setSelectedWorkspaceId(task.workspaceId || (wsList[0]?.id || ""));

        // Always re-derive from latest AI insight; fall back to stored value
        if (insight) {
          setAcademicRisk(deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction));
          setPrediction(insight.prediction);
        } else {
          setAcademicRisk(task.academicRisk ?? 40);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, authLoading, taskId, router]);

  const deadlineDays = form.deadline ? deadlineToDays(new Date(form.deadline)) : 7;
  const preview: FuzzyDetailedResult = useMemo(
    () => computePriorityDetailed({ deadlineDays, importance: form.importance, difficulty: form.difficulty, progress: form.progress, academicRisk }),
    [deadlineDays, form.importance, form.difficulty, form.progress, academicRisk]
  );

  const pomodoro = useMemo(
    () => computePomodoroFocus(preview.priorityScore, form.difficulty, preview.estimatedTotalMinutes),
    [preview.priorityScore, form.difficulty, preview.estimatedTotalMinutes]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ["importance", "difficulty", "progress"].includes(name) ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { setError("Task title is required."); return; }
    setSaving(true);
    setError("");
    try {
      await updateTask(taskId, {
        workspaceId:            selectedWorkspaceId,
        title:                  form.title.trim(),
        description:            form.description.trim(),
        deadline:               Timestamp.fromDate(new Date(form.deadline)),
        importance:             form.importance,
        difficulty:             form.difficulty,
        progress:               form.progress,
        academicRisk,
        status:                 form.status,
        priorityScore:          preview.priorityScore,
        priorityLevel:          preview.priorityLevel,
        riskLevel:              preview.riskLevel,
        estimatedTotalMinutes:  preview.estimatedTotalMinutes,
        reasoning:              preview.reasoning,
      });
      router.push("/tasks");
    } catch (err) {
      console.error(err);
      setError("Failed to update task.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  const accent = PRIORITY_RING[preview.priorityLevel] ?? "#6b7280";
  const { memberships: m } = preview;

  return (
    <DashboardShell fullWidth>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="flex items-center gap-3 animate-slide-up">
          <Link href="/tasks" className="p-2 rounded-xl border border-border hover:bg-primary-50 hover:border-primary/40 text-gray-400 hover:text-primary transition-all">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">Edit Task</h1>
            <p className="text-sm text-gray-500 mt-0.5">Academic Risk is AI-derived · Priority recalculates in real-time</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 animate-scale-in">

          {/* ── LEFT: Form ── */}
          <div className="xl:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-5 sticky top-6">
              <div className="flex items-center gap-2 pb-1 border-b border-border">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-bold text-gray-800">Task Details</span>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}

              {/* Workspace Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide" htmlFor="workspaceId">
                  Workspace
                </label>
                <select
                  id="workspaceId"
                  name="workspaceId"
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide" htmlFor="edit-title">Task Title *</label>
                <input id="edit-title" name="title" type="text" value={form.title} onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide" htmlFor="edit-description">Description</label>
                <textarea id="edit-description" name="description" rows={2} value={form.description} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1" htmlFor="edit-deadline">
                  <CalendarDays className="w-3.5 h-3.5" /> Deadline *
                </label>
                <input id="edit-deadline" name="deadline" type="date" value={form.deadline} onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {form.deadline && (
                  <p className={cn("text-[11px] font-medium", deadlineDays < 0 ? "text-red-600" : deadlineDays < 3 ? "text-orange-600" : deadlineDays < 8 ? "text-amber-600" : "text-emerald-600")}>
                    {deadlineDays < 0 ? `Overdue by ${Math.abs(Math.round(deadlineDays))}d` : deadlineDays < 1 ? "Due today" : `${Math.round(deadlineDays)} days remaining`}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide" htmlFor="edit-status">Status</label>
                <select id="edit-status" name="status" value={form.status} onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="todo">To Do</option>
                  <option value="doing">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              {/* Importance */}
              {[
                { id: "importance", name: "importance", label: "Importance",        value: form.importance, min: 1,  max: 10,  step: 1, left: "1 — Low",  right: "High — 10", display: `${form.importance} / 10` },
                { id: "difficulty", name: "difficulty", label: "Difficulty",        value: form.difficulty, min: 1,  max: 10,  step: 1, left: "1 — Easy", right: "Hard — 10", display: `${form.difficulty} / 10` },
                { id: "progress",   name: "progress",   label: "Current Progress",  value: form.progress,   min: 0,  max: 100, step: 5, left: "0%",        right: "100%",     display: `${form.progress}%` },
              ].map(({ id, name, label, value, min, max, step, left, right, display }) => (
                <div key={name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide" htmlFor={id}>{label}</label>
                    <span className="text-xs font-bold text-primary bg-primary-50 px-2.5 py-0.5 rounded-full">{display}</span>
                  </div>
                  <input id={id} name={name} type="range" min={min} max={max} step={step} value={value} onChange={handleChange}
                    className="w-full h-2 rounded-full appearance-none bg-primary-100 accent-primary cursor-pointer" />
                  <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                    <span>{left}</span><span>{right}</span>
                  </div>
                </div>
              ))}

              {/* Academic Risk — read-only */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-gray-400" /> Academic Risk
                  </span>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", riskBg(academicRisk), riskColor(academicRisk))}>
                    {riskLabel(academicRisk)} · {academicRisk}
                  </span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-border">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    AI-derived from <strong>Random Forest</strong> prediction: <span className="font-semibold text-indigo-600">{prediction}</span>. Cannot be edited manually.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" size="lg" loading={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Link href="/tasks">
                  <Button type="button" variant="outline" size="lg">Cancel</Button>
                </Link>
              </div>
            </form>
          </div>

          {/* ── RIGHT: AI Decision Panel ── */}
          <div className="xl:col-span-3 space-y-4">

            {/* Priority Result */}
            <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">Smart Priority Result</span>
                </div>
                <span className="text-[10px] font-semibold text-primary bg-primary-50 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <GitBranch className="w-2.5 h-2.5" /> Mamdani · 20 rules
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="shrink-0 relative w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: `conic-gradient(${accent} ${(preview.priorityScore / 100) * 360}deg, #e5e7eb 0deg)` }}>
                  <div className="w-[72px] h-[72px] rounded-full bg-white flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-[#1F2937] leading-none">{preview.priorityScore}</span>
                    <span className="text-[8px] text-gray-400 font-semibold tracking-wider">SCORE</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Priority Level</span>
                    <span className={cn("text-xs font-bold px-3 py-1 rounded-full border", PRIORITY_BG[preview.priorityLevel])}>{preview.priorityLevel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Risk Level</span>
                    <span className="text-xs font-bold text-gray-700">{preview.riskLevel}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2.5 mt-1">
                    <span className="text-xs text-gray-500">Estimated Total</span>
                    <span className="text-xs font-bold text-gray-700 text-right">
                      {preview.estimatedTotalMinutes} min
                      <br/>
                      {pomodoro.label !== "Micro" && (
                        <span className="font-normal text-[10px] text-gray-500">(~{Math.max(1, Math.round(preview.estimatedTotalMinutes / pomodoro.recommendedMinutes))} {pomodoro.label} Sessions)</span>
                      )}
                      {pomodoro.label === "Micro" && (
                        <span className="font-normal text-[10px] text-blue-600">(Micro-Task)</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-border">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Fuzzy Reasoning
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">{preview.reasoning}</p>
              </div>
            </div>

            {/* Activated Rules */}
            <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <GitBranch className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">Activated Rules</span>
                </div>
                <span className="text-[10px] text-gray-400 bg-gray-50 border border-border px-2 py-0.5 rounded-full">
                  {preview.activatedRules.length} / 80 fired
                </span>
              </div>
              {preview.activatedRules.slice(0, 5).map((rule) => {
                const colors: Record<string, string> = { Critical: "border-red-200 bg-red-50/60", High: "border-orange-200 bg-orange-50/60", Medium: "border-amber-200 bg-amber-50/60", Low: "border-emerald-200 bg-emerald-50/60" };
                const badges: Record<string, string> = { Critical: "bg-red-100 text-red-700", High: "bg-orange-100 text-orange-700", Medium: "bg-amber-100 text-amber-700", Low: "bg-emerald-100 text-emerald-700" };
                return (
                  <div key={rule.id} className={cn("rounded-xl border p-3 space-y-1.5", colors[rule.outputLevel])}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rule #{rule.id}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", badges[rule.outputLevel])}>{rule.conclusion}</span>
                        <span className="text-[10px] font-mono text-gray-400">α={rule.strength.toFixed(2)}</span>
                      </div>
                    </div>
                    {rule.conditions.map((cond, i) => (
                      <p key={i} className="text-[11px] text-gray-600">
                        <span className="font-semibold text-gray-400">{i === 0 ? "IF" : "AND"}</span> {cond}
                      </p>
                    ))}
                    <p className="text-[11px] font-semibold text-gray-700"><span className="text-gray-400">THEN</span> {rule.conclusion}</p>
                  </div>
                );
              })}
            </div>

            {/* Membership Values */}
            <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
              <span className="text-sm font-bold text-gray-800">Membership Values</span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Deadline",      icon: "📅", rows: [{ label: "Near", value: m.deadline.near, color: "bg-red-400" }, { label: "Medium", value: m.deadline.medium, color: "bg-amber-400" }, { label: "Far", value: m.deadline.far, color: "bg-emerald-400" }] },
                  { label: "Importance",    icon: "⚡", rows: [{ label: "High", value: m.importance.high, color: "bg-red-400" }, { label: "Medium", value: m.importance.medium, color: "bg-amber-400" }, { label: "Low", value: m.importance.low, color: "bg-emerald-400" }] },
                  { label: "Difficulty",    icon: "🔧", rows: [{ label: "Hard", value: m.difficulty.hard, color: "bg-red-400" }, { label: "Medium", value: m.difficulty.medium, color: "bg-amber-400" }, { label: "Easy", value: m.difficulty.easy, color: "bg-emerald-400" }] },
                  { label: "Progress",      icon: "📊", rows: [{ label: "High", value: m.progress.high, color: "bg-emerald-400" }, { label: "Medium", value: m.progress.medium, color: "bg-amber-400" }, { label: "Low", value: m.progress.low, color: "bg-red-400" }] },
                  { label: "Academic Risk", icon: "🛡️", rows: [{ label: "Critical", value: m.academicRisk.critical, color: "bg-red-500" }, { label: "High", value: m.academicRisk.high, color: "bg-orange-400" }, { label: "Med", value: m.academicRisk.medium, color: "bg-amber-400" }, { label: "Low", value: m.academicRisk.low, color: "bg-emerald-400" }] },
                ].map((g) => (
                  <div key={g.label} className="p-3 rounded-xl bg-gray-50 border border-border space-y-2">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{g.icon} {g.label}</p>
                    {g.rows.map((row) => <MembershipRow key={row.label} label={row.label} value={row.value} color={row.color} />)}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
