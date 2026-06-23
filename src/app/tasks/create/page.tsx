"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";
import {
  ChevronLeft,
  AlertTriangle,
  CalendarDays,
  Brain,
  Cpu,
  GitBranch,
  Timer,
  Zap,
  ShieldAlert,
  ArrowDown,
  CheckCircle2,
  Lock,
  Loader2,
  Info,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createTask, getAcademicInsight, getAssessment } from "@/lib/firestore";
import {
  computePriorityDetailed,
  deadlineToDays,
  deriveAcademicRiskFromInsight,
  type FuzzyDetailedResult,
  type PriorityLevel,
} from "@/lib/fuzzyLogic";
import { computePomodoroFocus } from "@/lib/pomodoroFuzzy";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// ── Colour maps ───────────────────────────────────────────────────────────────

const PRIORITY_BG: Record<string, string> = {
  Critical: "bg-red-50 border-red-200 text-red-700",
  High:     "bg-orange-50 border-orange-200 text-orange-700",
  Medium:   "bg-amber-50 border-amber-200 text-amber-700",
  Low:      "bg-emerald-50 border-emerald-200 text-emerald-700",
};

const PRIORITY_ACCENT: Record<string, string> = {
  Critical: "text-red-600",
  High:     "text-orange-600",
  Medium:   "text-amber-600",
  Low:      "text-emerald-600",
};

const PRIORITY_RING: Record<string, string> = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#f59e0b",
  Low:      "#10b981",
};

const RULE_OUTPUT_COLOR: Record<PriorityLevel, string> = {
  Critical: "border-red-200 bg-red-50/60",
  High:     "border-orange-200 bg-orange-50/60",
  Medium:   "border-amber-200 bg-amber-50/60",
  Low:      "border-emerald-200 bg-emerald-50/60",
};

const RULE_BADGE: Record<PriorityLevel, string> = {
  Critical: "bg-red-100 text-red-700",
  High:     "bg-orange-100 text-orange-700",
  Medium:   "bg-amber-100 text-amber-700",
  Low:      "bg-emerald-100 text-emerald-700",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

/** Single membership row with label + value + progress bar */
function MembershipRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-gray-500 w-9 text-right shrink-0">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

/** AI Pipeline step node */
function PipelineStep({
  icon,
  title,
  subtitle,
  active,
  last,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active?: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          active
            ? "bg-primary text-white shadow-md"
            : "bg-gray-100 text-gray-400"
        )}
      >
        {icon}
      </div>
      <div className="text-center">
        <p className={cn("text-[10px] font-bold", active ? "text-primary" : "text-gray-500")}>{title}</p>
        <p className="text-[9px] text-gray-400 leading-tight">{subtitle}</p>
      </div>
      {!last && (
        <ArrowDown className={cn("w-3 h-3", active ? "text-primary" : "text-gray-300")} />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateTaskPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Default deadline: 7 days from now
  const defaultDeadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  // Task form state
  const [form, setForm] = useState({
    title:       "",
    description: "",
    deadline:    defaultDeadline,
    importance:  5,
    difficulty:  5,
    progress:    0,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // AI context loaded from Firestore
  const [academicRisk,    setAcademicRisk]    = useState(40);
  const [prediction,      setPrediction]      = useState<string>("—");
  const [academicScore,   setAcademicScore]   = useState<number | null>(null);
  const [attendance,      setAttendance]      = useState<number | null>(null);
  const [studyHours,      setStudyHours]      = useState<number | null>(null);
  const [mentalHealth,    setMentalHealth]    = useState<number | null>(null);
  const [aiContextReady,  setAiContextReady]  = useState(false);

  // Load AI academic context once
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [insight, assessment] = await Promise.all([
          getAcademicInsight(user.uid),
          getAssessment(user.uid),
        ]);
        if (insight) {
          const derived = deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction);
          setAcademicRisk(derived);
          setPrediction(insight.prediction);
          setAcademicScore(insight.academicScore);
        }
        if (assessment) {
          setAttendance(assessment.attendance_percentage);
          setStudyHours(assessment.study_hours_per_day);
          setMentalHealth(assessment.mental_health_rating);
        }
        setAiContextReady(true);
      } catch {
        setAiContextReady(true); // proceed with defaults on error
      }
    };
    load();
  }, [user]);

  // Derived fuzzy values (live, recomputed on every form change)
  const deadlineDays = form.deadline ? deadlineToDays(new Date(form.deadline)) : 7;

  const fuzzy: FuzzyDetailedResult = useMemo(
    () =>
      computePriorityDetailed({
        deadlineDays,
        importance:   form.importance,
        difficulty:   form.difficulty,
        progress:     form.progress,
        academicRisk,
      }),
    [deadlineDays, form.importance, form.difficulty, form.progress, academicRisk]
  );

  const pomodoro = useMemo(
    () => computePomodoroFocus(fuzzy.priorityScore, form.difficulty),
    [fuzzy.priorityScore, form.difficulty]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "importance" || name === "difficulty" || name === "progress"
        ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { setError("Task title is required."); return; }
    if (!form.deadline)      { setError("Deadline is required."); return; }

    setSaving(true);
    setError("");
    try {
      await createTask(user.uid, {
        title:                  form.title.trim(),
        description:            form.description.trim(),
        deadline:               Timestamp.fromDate(new Date(form.deadline)),
        importance:             form.importance,
        difficulty:             form.difficulty,
        progress:               form.progress,
        academicRisk,
        priorityScore:          fuzzy.priorityScore,
        priorityLevel:          fuzzy.priorityLevel,
        riskLevel:              fuzzy.riskLevel,
        estimatedFocusMinutes:  fuzzy.estimatedFocusMinutes,
        reasoning:              fuzzy.reasoning,
        status:                 "todo",
      });
      router.push("/tasks");
    } catch (err) {
      console.error(err);
      setError("Failed to create task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell fullWidth>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-center gap-3 animate-slide-up">
          <Link
            href="/tasks"
            className="p-2 rounded-xl border border-border hover:bg-primary-50 hover:border-primary/40 text-gray-400 hover:text-primary transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">Create New Task</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Academic Risk is computed by AI — Priority is determined by Fuzzy Logic Mamdani
            </p>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 animate-scale-in">

          {/* ════════════════════════════════════════════
              LEFT PANEL — Task Input Form (2/5)
          ════════════════════════════════════════════ */}
          <div className="xl:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-5 sticky top-6"
            >
              <div className="flex items-center gap-2 pb-1 border-b border-border">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-bold text-gray-800">Task Details</span>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide" htmlFor="title">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title" name="title" type="text"
                  placeholder="e.g. Complete Chapter 5 essay"
                  value={form.title} onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-[#1F2937] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description" name="description" rows={2}
                  placeholder="Optional context or notes..."
                  value={form.description} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm text-[#1F2937] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1" htmlFor="deadline">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  id="deadline" name="deadline" type="date"
                  value={form.deadline} onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                {form.deadline && (
                  <p className={cn("text-[11px] font-medium", deadlineDays < 0 ? "text-red-600" : deadlineDays < 3 ? "text-orange-600" : deadlineDays < 8 ? "text-amber-600" : "text-emerald-600")}>
                    {deadlineDays < 0 ? `Overdue by ${Math.abs(Math.round(deadlineDays))}d` : deadlineDays < 1 ? "Due today" : `${Math.round(deadlineDays)} days remaining`}
                  </p>
                )}
              </div>

              {/* Importance slider */}
              <SliderField
                id="importance" name="importance" label="Importance"
                value={form.importance} min={1} max={10} step={1}
                leftLabel="1 — Low" rightLabel="High — 10"
                display={`${form.importance} / 10`}
                onChange={handleChange}
              />

              {/* Difficulty slider */}
              <SliderField
                id="difficulty" name="difficulty" label="Difficulty"
                value={form.difficulty} min={1} max={10} step={1}
                leftLabel="1 — Easy" rightLabel="Hard — 10"
                display={`${form.difficulty} / 10`}
                onChange={handleChange}
              />

              {/* Progress slider */}
              <SliderField
                id="progress" name="progress" label="Current Progress"
                value={form.progress} min={0} max={100} step={5}
                leftLabel="0%" rightLabel="100%"
                display={`${form.progress}%`}
                onChange={handleChange}
              />

              {/* Academic Risk — read-only, AI-derived */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-gray-400" />
                    Academic Risk
                  </span>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", riskBg(academicRisk), riskColor(academicRisk))}>
                    {riskLabel(academicRisk)} · {academicRisk}
                  </span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-border">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Automatically derived from your <strong>Random Forest</strong> academic performance prediction. Cannot be edited manually.
                    </p>
                    {!aiContextReady && (
                      <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Loading AI context...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" size="lg" loading={saving} className="flex-1">
                  {saving ? "Creating..." : "Create Task"}
                </Button>
                <Link href="/tasks">
                  <Button type="button" variant="outline" size="lg">Cancel</Button>
                </Link>
              </div>
            </form>
          </div>

          {/* ════════════════════════════════════════════
              RIGHT PANEL — AI Decision Panel (3/5)
          ════════════════════════════════════════════ */}
          <div className="xl:col-span-3 space-y-4">
            <AcademicContextSection
              prediction={prediction}
              academicScore={academicScore}
              academicRisk={academicRisk}
              attendance={attendance}
              studyHours={studyHours}
              mentalHealth={mentalHealth}
              aiContextReady={aiContextReady}
            />
            <SmartPrioritySection fuzzy={fuzzy} deadlineDays={deadlineDays} />
            <FuzzyRulesSection fuzzy={fuzzy} />
            <MembershipSection fuzzy={fuzzy} />
            <PomodoroSection pomodoro={pomodoro} fuzzy={fuzzy} difficulty={form.difficulty} />
            <AIFlowSection priorityLevel={fuzzy.priorityLevel} />
          </div>

        </div>
      </div>
    </DashboardShell>
  );
}

// ── Reusable slider field ─────────────────────────────────────────────────────

function SliderField({
  id, name, label, value, min, max, step,
  leftLabel, rightLabel, display, onChange,
}: {
  id: string; name: string; label: string; value: number;
  min: number; max: number; step: number;
  leftLabel: string; rightLabel: string; display: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide" htmlFor={id}>{label}</label>
        <span className="text-xs font-bold text-primary bg-primary-50 px-2.5 py-0.5 rounded-full">{display}</span>
      </div>
      <input
        id={id} name={name} type="range" min={min} max={max} step={step} value={value}
        onChange={onChange}
        className="w-full h-2 rounded-full appearance-none bg-primary-100 accent-primary cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-gray-400 font-medium">
        <span>{leftLabel}</span><span>{rightLabel}</span>
      </div>
    </div>
  );
}

// ── Section 1: Academic Context ───────────────────────────────────────────────

function AcademicContextSection({
  prediction, academicScore, academicRisk,
  attendance, studyHours, mentalHealth, aiContextReady,
}: {
  prediction: string; academicScore: number | null; academicRisk: number;
  attendance: number | null; studyHours: number | null; mentalHealth: number | null;
  aiContextReady: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-sm font-bold text-gray-800">Academic Context</span>
        </div>
        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Cpu className="w-2.5 h-2.5" /> Random Forest + Academic Risk Engine
        </span>
      </div>

      {!aiContextReady ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading AI academic context...
        </div>
      ) : (
        <>
          {/* Primary metrics row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Performance Prediction */}
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1">
              <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
                Performance Prediction
              </p>
              <p className="text-base font-bold text-indigo-700 truncate">{prediction}</p>
              <p className="text-[10px] text-indigo-400">Random Forest output</p>
            </div>

            {/* Academic Risk */}
            <div className={cn("p-3 rounded-xl border space-y-1", riskBg(academicRisk))}>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", riskColor(academicRisk))}>
                Academic Risk
              </p>
              <div className="flex items-end gap-1.5">
                <p className={cn("text-base font-bold", riskColor(academicRisk))}>{riskLabel(academicRisk)}</p>
                <p className={cn("text-[11px] font-semibold mb-0.5", riskColor(academicRisk))}>({academicRisk}/100)</p>
              </div>
              <p className={cn("text-[10px]", riskColor(academicRisk), "opacity-70")}>Fuzzy Risk Engine</p>
            </div>
          </div>

          {/* Academic score bar */}
          {academicScore !== null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Academic Score</span>
                <span className="text-[10px] font-bold text-gray-700">{academicScore} / 100</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                  style={{ width: `${academicScore}%` }}
                />
              </div>
            </div>
          )}

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: "Attendance", value: attendance !== null ? `${attendance}%` : "—", icon: "📅" },
              { label: "Study Hrs/Day", value: studyHours !== null ? `${studyHours}h` : "—", icon: "📚" },
              { label: "Mental Health", value: mentalHealth !== null ? `${mentalHealth}/10` : "—", icon: "🧠" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="text-center p-2.5 rounded-xl bg-gray-50 border border-border">
                <p className="text-base mb-0.5">{icon}</p>
                <p className="text-xs font-bold text-gray-700">{value}</p>
                <p className="text-[9px] text-gray-400 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Section 2: Smart Priority Result ─────────────────────────────────────────

function SmartPrioritySection({
  fuzzy, deadlineDays,
}: {
  fuzzy: FuzzyDetailedResult;
  deadlineDays: number;
}) {
  const accent = PRIORITY_RING[fuzzy.priorityLevel] ?? "#6b7280";
  const deg = (fuzzy.priorityScore / 100) * 360;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-bold text-gray-800">Smart Priority Result</span>
        </div>
        <span className="text-[10px] font-semibold text-primary bg-primary-50 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
          <GitBranch className="w-2.5 h-2.5" /> Mamdani Fuzzy · Centroid
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Score ring */}
        <div className="shrink-0 relative w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: `conic-gradient(${accent} ${deg}deg, #e5e7eb 0deg)` }}>
          <div className="w-[72px] h-[72px] rounded-full bg-white flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-[#1F2937] leading-none">{fuzzy.priorityScore}</span>
            <span className="text-[8px] text-gray-400 font-semibold tracking-wider">SCORE</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Priority Level</span>
            <span className={cn("text-xs font-bold px-3 py-1 rounded-full border", PRIORITY_BG[fuzzy.priorityLevel])}>
              {fuzzy.priorityLevel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Risk Level</span>
            <span className={cn("text-xs font-bold", PRIORITY_ACCENT[fuzzy.riskLevel])}>
              {fuzzy.riskLevel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Est. Focus</span>
            <span className="text-xs font-bold text-gray-700">{fuzzy.estimatedFocusMinutes} min</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Deadline</span>
            <span className={cn("text-xs font-bold", deadlineDays < 0 ? "text-red-600" : deadlineDays < 3 ? "text-orange-600" : deadlineDays < 8 ? "text-amber-600" : "text-emerald-600")}>
              {deadlineDays < 0 ? "Overdue!" : `${Math.round(deadlineDays)}d left`}
            </span>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="p-3 rounded-xl bg-gray-50 border border-border">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Info className="w-3 h-3" /> Fuzzy Reasoning
        </p>
        <p className="text-xs text-gray-600 leading-relaxed">{fuzzy.reasoning}</p>
      </div>
    </div>
  );
}

// ── Section 3: Activated Fuzzy Rules ─────────────────────────────────────────

function FuzzyRulesSection({ fuzzy }: { fuzzy: FuzzyDetailedResult }) {
  const top = fuzzy.activatedRules.slice(0, 6);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <GitBranch className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-sm font-bold text-gray-800">Fuzzy Reasoning</span>
        </div>
        <span className="text-[10px] text-gray-400 bg-gray-50 border border-border px-2 py-0.5 rounded-full">
          {fuzzy.activatedRules.length} / 20 rules fired
        </span>
      </div>

      {top.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">No rules activated — adjust inputs</p>
      ) : (
        <div className="space-y-2.5">
          {top.map((rule) => (
            <div
              key={rule.id}
              className={cn("rounded-xl border p-3 space-y-1.5", RULE_OUTPUT_COLOR[rule.outputLevel])}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Activated Rule #{rule.id}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", RULE_BADGE[rule.outputLevel])}>
                    {rule.conclusion}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    α={rule.strength.toFixed(2)}
                  </span>
                </div>
              </div>
              {/* IF–THEN display */}
              <div className="space-y-0.5">
                {rule.conditions.map((cond, i) => (
                  <p key={i} className="text-[11px] text-gray-600 leading-snug">
                    <span className="font-semibold text-gray-400">{i === 0 ? "IF" : "AND"}</span>{" "}
                    {cond}
                  </p>
                ))}
                <p className="text-[11px] font-semibold text-gray-700">
                  <span className="text-gray-400">THEN</span> {rule.conclusion}
                </p>
              </div>
              {/* Strength bar */}
              <div className="h-1 bg-white/80 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-current opacity-40 transition-all duration-500"
                  style={{ width: `${Math.round(rule.strength * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section 4: Membership Values ─────────────────────────────────────────────

function MembershipSection({ fuzzy }: { fuzzy: FuzzyDetailedResult }) {
  const { memberships: m } = fuzzy;

  const groups = [
    {
      label: "Deadline",
      icon: "📅",
      rows: [
        { label: "Near",   value: m.deadline.near,   color: "bg-red-400" },
        { label: "Medium", value: m.deadline.medium, color: "bg-amber-400" },
        { label: "Far",    value: m.deadline.far,    color: "bg-emerald-400" },
      ],
    },
    {
      label: "Importance",
      icon: "⚡",
      rows: [
        { label: "High",   value: m.importance.high,   color: "bg-red-400" },
        { label: "Medium", value: m.importance.medium, color: "bg-amber-400" },
        { label: "Low",    value: m.importance.low,    color: "bg-emerald-400" },
      ],
    },
    {
      label: "Difficulty",
      icon: "🔧",
      rows: [
        { label: "Hard",   value: m.difficulty.hard,   color: "bg-red-400" },
        { label: "Medium", value: m.difficulty.medium, color: "bg-amber-400" },
        { label: "Easy",   value: m.difficulty.easy,   color: "bg-emerald-400" },
      ],
    },
    {
      label: "Progress",
      icon: "📊",
      rows: [
        { label: "High",   value: m.progress.high,   color: "bg-emerald-400" },
        { label: "Medium", value: m.progress.medium, color: "bg-amber-400" },
        { label: "Low",    value: m.progress.low,    color: "bg-red-400" },
      ],
    },
    {
      label: "Academic Risk",
      icon: "🛡️",
      rows: [
        { label: "Critical", value: m.academicRisk.critical, color: "bg-red-500" },
        { label: "High",     value: m.academicRisk.high,     color: "bg-orange-400" },
        { label: "Medium",   value: m.academicRisk.medium,   color: "bg-amber-400" },
        { label: "Low",      value: m.academicRisk.low,      color: "bg-emerald-400" },
      ],
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <span className="text-sm font-bold text-gray-800">Membership Values</span>
        <span className="text-[10px] text-gray-400 ml-auto">μ(x) — Fuzzification step</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
        {groups.map((g) => (
          <div key={g.label} className="p-3 rounded-xl bg-gray-50 border border-border space-y-2">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>{g.icon}</span> {g.label}
            </p>
            {g.rows.map((row) => (
              <MembershipRow key={row.label} label={row.label} value={row.value} color={row.color} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 5: Smart Pomodoro Recommendation ──────────────────────────────────

function PomodoroSection({
  pomodoro, fuzzy, difficulty,
}: {
  pomodoro: { recommendedMinutes: number; label: "Short" | "Medium" | "Long"; breakMinutes: number };
  fuzzy: FuzzyDetailedResult;
  difficulty: number;
}) {
  const options = [
    { label: "Short",  minutes: 25, break: 5  },
    { label: "Medium", minutes: 40, break: 10 },
    { label: "Long",   minutes: 50, break: 15 },
  ] as const;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
            <Timer className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <span className="text-sm font-bold text-gray-800">Smart Pomodoro Recommendation</span>
        </div>
        <span className="text-[10px] text-gray-400 bg-gray-50 border border-border px-2 py-0.5 rounded-full">
          Pomodoro Fuzzy Engine
        </span>
      </div>

      {/* Sessions */}
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const isSelected = opt.label === pomodoro.label;
          return (
            <div
              key={opt.label}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-gray-50 opacity-60"
              )}
            >
              {isSelected && (
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              )}
              <span className={cn("text-2xl font-extrabold", isSelected ? "text-primary" : "text-gray-400")}>
                {opt.minutes}
              </span>
              <span className={cn("text-[10px] font-semibold", isSelected ? "text-primary" : "text-gray-400")}>
                min · {opt.label}
              </span>
              <span className="text-[9px] text-gray-400">+{opt.break}m break</span>
              {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </div>
          );
        })}
      </div>

      {/* Reasoning */}
      <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-100 space-y-1">
        <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">Reason</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            `Priority ${fuzzy.priorityLevel}`,
            difficulty >= 7 ? "Difficulty Hard" : difficulty <= 3 ? "Difficulty Easy" : "Difficulty Medium",
            `Risk ${fuzzy.riskLevel}`,
          ].map((tag) => (
            <span key={tag} className="text-[10px] font-semibold text-orange-700 bg-white border border-orange-200 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Section 6: AI Decision Flow ───────────────────────────────────────────────

function AIFlowSection({ priorityLevel }: { priorityLevel: PriorityLevel }) {
  const steps = [
    { icon: <Brain className="w-4 h-4" />,     title: "Academic Assessment", subtitle: "User inputs",        active: true  },
    { icon: <Cpu className="w-4 h-4" />,       title: "Random Forest",       subtitle: "ML Prediction",     active: true  },
    { icon: <ShieldAlert className="w-4 h-4"/>, title: "Academic Risk Engine",subtitle: "Fuzzy Logic",       active: true  },
    { icon: <Zap className="w-4 h-4" />,       title: "Smart Priority Engine",subtitle: "Mamdani · 15 rules",active: true  },
    { icon: <Timer className="w-4 h-4" />,     title: "Smart Pomodoro",      subtitle: "Fuzzy Logic",       active: true  },
  ];

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
          <GitBranch className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <span className="text-sm font-bold text-gray-800">AI Decision Flow</span>
        <span className={cn("ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full border", PRIORITY_BG[priorityLevel])}>
          Final: {priorityLevel}
        </span>
      </div>

      <div className="flex items-start justify-between gap-1 py-2">
        {steps.map((step, i) => (
          <PipelineStep key={i} {...step} last={i === steps.length - 1} />
        ))}
      </div>

      <div className="p-3 rounded-xl bg-gray-50 border border-border">
        <p className="text-[11px] text-gray-500 leading-relaxed text-center">
          Academic Risk feeds directly into the Priority Engine · Priority drives the Pomodoro recommendation
        </p>
      </div>
    </div>
  );
}
