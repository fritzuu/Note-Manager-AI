"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getTask, updateTask, getAcademicInsight, getUserTasks, getEffectiveWorkspaces } from "@/lib/firestore";
import { computePriorityDetailed, deadlineToDays, deriveAcademicRiskFromInsight, type FuzzyDetailedResult } from "@/lib/fuzzyLogic";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { computePomodoroFocus } from "@/lib/pomodoroFuzzy";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorState } from "@/components/ui/ErrorState";
import { TaskForm } from "@/components/tasks/TaskForm";

export default function EditTaskPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [form, setForm] = useState({
    title: "",
    workspace: "",
    description: "",
    deadline: "",
    importance: 5,
    difficulty: 5,
    progress: 0,
    status: "todo" as "todo" | "doing" | "done",
  });
  const [academicRisk, setAcademicRisk] = useState(40);
  const [prediction, setPrediction] = useState("—");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const [loadError, setLoadError] = useState("");
  const [existingWorkspaces, setExistingWorkspaces] = useState<string[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    const load = async () => {
      try {
        const [task, insight, userTasks] = await Promise.all([
          getTask(taskId),
          getAcademicInsight(user.uid).catch(() => null),
          getUserTasks(user.uid),
        ]);
        if (!task || task.userId !== user.uid) { router.push("/tasks"); return; }

        let hidden: string[] = [];
        try { hidden = JSON.parse(localStorage.getItem("mindflow_hidden_workspaces") || "[]"); } catch {}
        setExistingWorkspaces(getEffectiveWorkspaces(userTasks, hidden));
        const deadlineDate = task.deadline?.toDate ? task.deadline.toDate() : new Date();
        setForm({
          title:       task.title,
          workspace:   task.workspace || task.course || "",
          description: task.description,
          deadline:    deadlineDate.toISOString().split("T")[0],
          importance:  task.importance,
          difficulty:  task.difficulty,
          progress:    task.progress,
          status:      task.status,
        });

        if (insight) {
          setAcademicRisk(deriveAcademicRiskFromInsight(insight.academicScore, insight.prediction));
          setPrediction(insight.prediction);
        } else {
          setAcademicRisk(40);
          setPrediction("Belum tersedia");
        }
      } catch (e) {
        console.error(e);
        setLoadError("Tugas belum bisa dimuat. Coba buka kembali.");
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
      await updateTask(taskId, {
        title:                  form.title.trim(),
        workspace:              selectedWs,
        course:                 selectedWs,
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
      setError("Gagal memperbarui tugas.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (authLoading || loading) return <DashboardShell fullWidth><LoadingScreen label="Memuat tugas…" fullHeight /></DashboardShell>;
  if (loadError) return <DashboardShell fullWidth><ErrorState title="Tugas belum bisa dibuka" message={loadError} showHomeButton fullHeight /></DashboardShell>;
  return <DashboardShell fullWidth><TaskForm taskId={taskId} value={form} onChange={patch => setForm(previous => ({ ...previous, ...patch, status: patch.status ?? previous.status }))} onSubmit={handleSubmit} saving={saving} error={error} workspaces={existingWorkspaces} result={preview} pomodoro={pomodoro} deadlineDays={deadlineDays} academicRisk={academicRisk} prediction={prediction} /></DashboardShell>;
}
