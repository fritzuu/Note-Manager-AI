"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { createTask, getAcademicInsight, getAssessment, getUserTasks, getEffectiveWorkspaces } from "@/lib/firestore";
import { computePriorityDetailed, deadlineToDays, deriveAcademicRiskFromInsight, type FuzzyDetailedResult } from "@/lib/fuzzyLogic";
import { computePomodoroFocus } from "@/lib/pomodoroFuzzy";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { TaskForm } from "@/components/tasks/TaskForm";

function CreateTaskForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryWorkspace = searchParams.get("workspace");

  // Default deadline: 7 days from now
  const defaultDeadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  // Task form state
  const [form, setForm] = useState({
    title:       "",
    workspace:   queryWorkspace || "",
    description: "",
    deadline:    defaultDeadline,
    importance:  5,
    difficulty:  5,
    progress:    0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);

  // Dynamic user workspaces fetched from existing tasks
  const [existingWorkspaces, setExistingWorkspaces] = useState<string[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  // AI context loaded from Firestore
  const [academicRisk, setAcademicRisk] = useState(40);
  const [prediction, setPrediction] = useState<string>("—");
  const [academicScore, setAcademicScore] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [insight, userTasks] = await Promise.all([
          getAcademicInsight(user.uid).catch(() => null),
          getUserTasks(user.uid).catch(() => []),
          getAssessment(user.uid).catch(() => null),
        ]);

        if (insight) {
          setPrediction(insight.prediction || "—");
          setAcademicScore(insight.academicScore ?? null);
          setAcademicRisk(deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction));
        }

        // Extract distinct workspaces matching exactly what is on /tasks page
        let hidden: string[] = [];
        try {
          const saved = localStorage.getItem("mindflow_hidden_workspaces");
          if (saved) hidden = JSON.parse(saved);
        } catch {}

        const effective = getEffectiveWorkspaces(userTasks || [], hidden);
        setExistingWorkspaces(effective);

        // Pre-select workspace from URL or first available workspace
        if (queryWorkspace) {
          setForm((prev) => ({ ...prev, workspace: queryWorkspace }));
        } else if (!form.workspace && effective.length === 1) {
          setForm((prev) => ({ ...prev, workspace: effective[0] }));
        }
      } catch (e) {
        console.error("Failed to load user AI context and workspaces for task form:", e);
      } finally {
        setLoadingWorkspaces(false);
      }
    };
    load();
  }, [user, queryWorkspace]);

  // Derived priority & pomodoro values
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
    () => computePomodoroFocus(fuzzy.priorityScore, form.difficulty, fuzzy.estimatedTotalMinutes),
    [fuzzy.priorityScore, form.difficulty, fuzzy.estimatedTotalMinutes]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || savingRef.current) return;
    if (!form.title.trim()) { setError("Judul tugas wajib diisi."); return; }
    if (!form.deadline)      { setError("Tenggat wajib diisi."); return; }

    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const selectedWs = form.workspace.trim() || "Umum";
      await createTask(user.uid, {
        title:                  form.title.trim(),
        workspace:              selectedWs,
        course:                 selectedWs,
        description:            form.description.trim(),
        deadline:               Timestamp.fromDate(new Date(form.deadline)),
        importance:             form.importance,
        difficulty:             form.difficulty,
        progress:               form.progress,
        academicRisk,
        priorityScore:          fuzzy.priorityScore,
        priorityLevel:          fuzzy.priorityLevel,
        riskLevel:              fuzzy.riskLevel,
        estimatedTotalMinutes:  fuzzy.estimatedTotalMinutes,
        reasoning:              fuzzy.reasoning,
        status:                 "todo",
      });
      router.push("/tasks");
    } catch (err) {
      console.error(err);
      setError("Gagal menyimpan tugas. Silakan coba lagi.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (authLoading) return <DashboardShell fullWidth><LoadingScreen label="Menyiapkan tugas…" fullHeight /></DashboardShell>;
  return <DashboardShell fullWidth><TaskForm value={form} onChange={patch => setForm(previous => ({ ...previous, ...patch }))} onSubmit={handleSubmit} saving={saving} error={error} workspaces={existingWorkspaces} loadingWorkspaces={loadingWorkspaces} result={fuzzy} pomodoro={pomodoro} deadlineDays={deadlineDays} academicRisk={academicRisk} prediction={prediction} academicScore={academicScore} /></DashboardShell>;
}

export default function CreateTaskPage() {
  return <Suspense fallback={<DashboardShell fullWidth><LoadingScreen label="Menyiapkan tugas…" fullHeight /></DashboardShell>}><CreateTaskForm /></Suspense>;
}
