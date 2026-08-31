"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  TrendingUp,
  Target,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAssessment,
  getAcademicInsight,
  saveAcademicInsight,
  type AcademicInsight,
} from "@/lib/firestore";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { ConfidenceRing } from "@/components/dashboard/ConfidenceRing";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { PerformanceMeter } from "@/components/dashboard/PerformanceMeter";
import { DashboardShell } from "@/components/layout/DashboardShell";

type DashboardState = "loading" | "generating" | "ready" | "error";

export default function AcademicInsightPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<DashboardState>("loading");
  const [insight, setInsight] = useState<AcademicInsight | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const generateInsight = useCallback(async (userId: string) => {
    setState("generating");
    try {
      const assessment = await getAssessment(userId);
      if (!assessment) {
        setErrorMsg("No assessment found. Please complete the Academic Assessment first.");
        setState("error");
        return;
      }

      const assessmentFields = { ...assessment } as Partial<typeof assessment>;
      delete assessmentFields.userId;
      delete assessmentFields.createdAt;
      const res = await fetch("/api/academic-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessmentFields),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Prediction failed");
      }

      const prediction = await res.json();
      await saveAcademicInsight(userId, prediction);

      setInsight({ ...prediction, userId });
      setState("ready");
    } catch (err) {
      console.error("Generate insight error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate insight");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const loadInsight = async () => {
      try {
        const existing = await getAcademicInsight(user.uid);
        if (existing) {
          setInsight(existing);
          setState("ready");
        } else {
          await generateInsight(user.uid);
        }
      } catch (err) {
        console.error("Load insight error:", err);
        await generateInsight(user.uid);
      }
    };

    loadInsight();
  }, [user, authLoading, router, generateInsight]);

  const handleRegenerate = () => {
    if (user) {
      generateInsight(user.uid);
    }
  };

  if (authLoading) {
    return (
      <DashboardShell>
        <LoadingScreen message="Authenticating..." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Page header */}
      <div className="flex items-start justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">
            Academic Insight
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered analysis of your academic performance profile
          </p>
        </div>
        {state === "ready" && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push("/assessment")}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-border rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              Edit Profile
            </button>
            <button
              onClick={handleRegenerate}
              id="regenerate-insight"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Loading / Generating / Error states */}
      {state === "loading" && <LoadingScreen message="Loading your insights..." />}
      {state === "generating" && <GeneratingScreen />}
      {state === "error" && (
        <ErrorScreen message={errorMsg} onRetry={handleRegenerate} />
      )}

      {/* Dashboard content */}
      {state === "ready" && insight && (
        <div className="space-y-8 animate-fade-in">
          {/* Welcome banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/8 via-secondary/6 to-accent/8 border border-primary/15">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shrink-0 shadow-sm">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-[#1F2937]">
                  Your Academic Insight is ready!
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Based on your assessment, our ML model has analyzed your academic profile.
                </p>
              </div>
            </div>
          </div>

          {/* Score + Confidence row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score card */}
            <div className="bg-white rounded-2xl border border-border shadow-card p-6 flex flex-col items-center justify-center animate-scale-in">
              <ScoreGauge score={insight.academicScore} />
            </div>

            {/* Stats sidebar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Prediction */}
              <StatCard
                icon={<Target className="w-5 h-5" />}
                label="Prediction"
                value={insight.prediction}
                color="text-primary"
                bgColor="bg-primary/10"
              />

              {/* Confidence */}
              <div className="bg-white rounded-2xl border border-border shadow-card p-5 flex flex-col items-center justify-center animate-scale-in">
                <ConfidenceRing confidence={insight.confidence} size={100} />
              </div>

              {/* Study Consistency */}
              <div className="sm:col-span-2 bg-white rounded-2xl border border-border shadow-card p-5 animate-scale-in">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-sm font-semibold text-[#1F2937]">
                    Performance Level
                  </span>
                </div>
                <PerformanceMeter prediction={insight.prediction} />
              </div>
            </div>
          </div>

          {/* Recommendation banner */}
          <div className="bg-gradient-to-r from-primary-50 to-white rounded-2xl border border-primary/15 p-5 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1F2937] text-sm">AI Recommendation</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  {insight.recommendation}
                </p>
              </div>
            </div>
          </div>

          {/* Insights grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InsightCard type="strength" items={insight.strengths} />
            <InsightCard type="weakness" items={insight.weaknesses} />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5 animate-scale-in">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bgColor} ${color}`}>
        {icon}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
      <p className="text-sm text-gray-500 font-medium">{message}</p>
    </div>
  );
}

function GeneratingScreen() {
  const steps = [
    "Reading your assessment data...",
    "Running ML analysis...",
    "Generating personalized insights...",
  ];
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shadow-float">
          <Brain className="w-7 h-7 text-white animate-pulse" />
        </div>
        <div className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-accent animate-ping" />
      </div>

      <div className="text-center space-y-3">
        <h3 className="text-lg font-semibold text-[#1F2937]">Analyzing Your Profile</h3>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm transition-all duration-500 ${
                i <= currentStep ? "text-gray-700 opacity-100" : "text-gray-400 opacity-40"
              }`}
            >
              {i < currentStep ? (
                <span className="text-primary">✓</span>
              ) : i === currentStep ? (
                <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <span className="w-3 h-3 rounded-full bg-gray-200" />
              )}
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
        <span className="text-2xl">⚠️</span>
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold text-[#1F2937]">Something went wrong</h3>
        <p className="text-sm text-gray-500 max-w-md">{message}</p>
      </div>
      <button
        onClick={onRetry}
        id="retry-generate"
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}
