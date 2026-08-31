"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { saveAssessment, markAssessmentComplete, getAssessment, saveAcademicInsight } from "@/lib/firestore";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { RatingCard } from "@/components/ui/RatingCard";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AssessmentData {
  age: number;
  gender: number;
  study_hours_per_day: number;
  attendance_percentage: number;
  part_time_job: number;
  sleep_hours: number;
  social_media_hours: number;
  netflix_hours: number;
  exercise_frequency: number;
  diet_quality: number;
  internet_quality: number;
  parental_education_level: number;
  extracurricular_participation: number;
  mental_health_rating: number;
}

// ─── Step configuration ──────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Personal", emoji: "👤", description: "Tell us about yourself" },
  { id: 2, title: "Study Habits", emoji: "📚", description: "Your academic routines" },
  { id: 3, title: "Lifestyle", emoji: "🌿", description: "Daily life & wellness" },
  { id: 4, title: "Environment", emoji: "🏠", description: "Your learning environment" },
];

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function StepProgress({ currentStep, total }: { currentStep: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        return (
          <React.Fragment key={step}>
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all duration-300 ${
                isCompleted
                  ? "bg-primary text-white"
                  : isCurrent
                  ? "bg-primary text-white ring-4 ring-primary/20"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            {step < total && (
              <div
                className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                  isCompleted ? "bg-primary" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function AssessmentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [data, setData] = useState<AssessmentData>({
    age: 20,
    gender: 0,
    study_hours_per_day: 3,
    attendance_percentage: 80,
    part_time_job: 0,
    sleep_hours: 7,
    social_media_hours: 2,
    netflix_hours: 1,
    exercise_frequency: 3,
    diet_quality: 3,
    internet_quality: 3,
    parental_education_level: 2,
    extracurricular_participation: 0,
    mental_health_rating: 7,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      const loadExistingAssessment = async () => {
        try {
          const existing = await getAssessment(user.uid);
          if (existing) {
            setData({
              age: existing.age ?? 20,
              gender: existing.gender ?? 0,
              study_hours_per_day: existing.study_hours_per_day ?? 3,
              attendance_percentage: existing.attendance_percentage ?? 80,
              part_time_job: existing.part_time_job ?? 0,
              sleep_hours: existing.sleep_hours ?? 7,
              social_media_hours: existing.social_media_hours ?? 2,
              netflix_hours: existing.netflix_hours ?? 1,
              exercise_frequency: existing.exercise_frequency ?? 3,
              diet_quality: existing.diet_quality ?? 3,
              internet_quality: existing.internet_quality ?? 3,
              parental_education_level: existing.parental_education_level ?? 2,
              extracurricular_participation: existing.extracurricular_participation ?? 0,
              mental_health_rating: existing.mental_health_rating ?? 7,
            });
          }
        } catch (err) {
          console.error("Failed to load existing assessment:", err);
        }
      };
      loadExistingAssessment();
    }
  }, [user, authLoading, router]);

  const set = <K extends keyof AssessmentData>(key: K, value: AssessmentData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      await saveAssessment(user.uid, data);
      await markAssessmentComplete(user.uid);

      // Automatically trigger academic insight regeneration
      const res = await fetch("/api/academic-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Prediction API failed");
      }

      const prediction = await res.json();
      await saveAcademicInsight(user.uid, prediction);

      setSubmitted(true);

      setTimeout(() => {
        router.push("/insight");
      }, 2000);
    } catch (err) {
      console.error("Assessment submission error:", err);
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-[#1F2937]">Profile Complete! 🎉</h2>
          <p className="text-gray-500 mt-2">Redirecting to your dashboard…</p>
          <div className="mt-4 w-48 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[grow_2s_ease-out_forwards]" style={{
              animation: "grow 2s ease-out forwards",
            }} />
          </div>
        </div>
        <style>{`@keyframes grow { from { width: 0% } to { width: 100% } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="font-bold text-primary text-lg">MindFlow AI</span>
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStep} of {STEPS.length}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 sm:py-12">
        {/* Intro banner — shown on step 1 only */}
        {currentStep === 1 && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 animate-fade-in">
            <div className="flex gap-3">
              <span className="text-3xl">🧠</span>
              <div>
                <h3 className="font-semibold text-[#1F2937]">Academic Insight Profile</h3>
                <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
                  We use this information to generate your personalized Academic Insight profile. 
                  Our AI model will predict your performance and suggest targeted improvements. 
                  This takes about 3 minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-8">
          <StepProgress currentStep={currentStep} total={STEPS.length} />
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{STEPS[currentStep - 1].emoji}</span>
              <div>
                <h1 className="text-2xl font-bold text-[#1F2937]">
                  {STEPS[currentStep - 1].title}
                </h1>
                <p className="text-sm text-gray-500">{STEPS[currentStep - 1].description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="animate-slide-up" key={currentStep}>
          {currentStep === 1 && (
            <Step1 data={data} set={set} />
          )}
          {currentStep === 2 && (
            <Step2 data={data} set={set} />
          )}
          {currentStep === 3 && (
            <Step3 data={data} set={set} />
          )}
          {currentStep === 4 && (
            <Step4 data={data} set={set} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
          <Button
            variant="ghost"
            size="md"
            onClick={handleBack}
            disabled={currentStep === 1}
            icon={<ChevronLeft className="w-4 h-4" />}
            id="assessment-back"
          >
            Back
          </Button>

          <div className="text-xs text-gray-400 font-medium">
            {Math.round(((currentStep - 1) / STEPS.length) * 100)}% complete
          </div>

          {currentStep < STEPS.length ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              icon={<ChevronRight className="w-4 h-4" />}
              className="flex-row-reverse"
              id="assessment-next"
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              loading={submitting}
              id="assessment-submit"
            >
              Generate My Profile ✨
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Step 1: Personal ────────────────────────────────────────────────────────
function Step1({
  data,
  set,
}: {
  data: AssessmentData;
  set: <K extends keyof AssessmentData>(k: K, v: AssessmentData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Slider
        id="assessment-age"
        label="Age"
        value={data.age}
        min={15}
        max={40}
        onChange={(v) => set("age", v)}
        displayValue={(v) => `${v} years`}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#1F2937]">Gender</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Male", value: 0, emoji: "👨" },
            { label: "Female", value: 1, emoji: "👩" },
            { label: "Other", value: 2, emoji: "🧑" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              id={`assessment-gender-${opt.value}`}
              onClick={() => set("gender", opt.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                data.gender === opt.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-white text-gray-600 hover:border-primary/40"
              }`}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Study Habits ────────────────────────────────────────────────────
function Step2({
  data,
  set,
}: {
  data: AssessmentData;
  set: <K extends keyof AssessmentData>(k: K, v: AssessmentData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Slider
        id="assessment-study-hours"
        label="Study Hours Per Day"
        value={data.study_hours_per_day}
        min={0}
        max={12}
        step={0.5}
        onChange={(v) => set("study_hours_per_day", v)}
        displayValue={(v) => `${v}h`}
      />

      <Slider
        id="assessment-attendance"
        label="Attendance Percentage"
        value={data.attendance_percentage}
        min={0}
        max={100}
        onChange={(v) => set("attendance_percentage", v)}
        displayValue={(v) => `${v}%`}
      />

      <Toggle
        id="assessment-part-time-job"
        label="Part-Time Job"
        description="Do you currently have a part-time job?"
        checked={data.part_time_job === 1}
        onChange={(checked) => set("part_time_job", checked ? 1 : 0)}
      />
    </div>
  );
}

// ─── Step 3: Lifestyle ───────────────────────────────────────────────────────
function Step3({
  data,
  set,
}: {
  data: AssessmentData;
  set: <K extends keyof AssessmentData>(k: K, v: AssessmentData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Slider
        id="assessment-sleep-hours"
        label="Sleep Hours Per Night"
        value={data.sleep_hours}
        min={3}
        max={12}
        step={0.5}
        onChange={(v) => set("sleep_hours", v)}
        displayValue={(v) => `${v}h`}
      />

      <Slider
        id="assessment-social-media"
        label="Social Media Hours Per Day"
        value={data.social_media_hours}
        min={0}
        max={12}
        step={0.5}
        onChange={(v) => set("social_media_hours", v)}
        displayValue={(v) => `${v}h`}
      />

      <Slider
        id="assessment-netflix"
        label="Netflix / Streaming Hours Per Day"
        value={data.netflix_hours}
        min={0}
        max={10}
        step={0.5}
        onChange={(v) => set("netflix_hours", v)}
        displayValue={(v) => `${v}h`}
      />

      <RatingCard
        id="assessment-exercise"
        label="Exercise Frequency"
        description="Days per week you exercise"
        value={data.exercise_frequency}
        options={[
          { value: 0, label: "0" },
          { value: 1, label: "1" },
          { value: 2, label: "2" },
          { value: 3, label: "3" },
          { value: 4, label: "4" },
          { value: 5, label: "5" },
          { value: 6, label: "6" },
          { value: 7, label: "7" },
        ]}
        onChange={(v) => set("exercise_frequency", v)}
      />

      <RatingCard
        id="assessment-diet"
        label="Diet Quality"
        description="1 = Poor · 5 = Excellent"
        value={data.diet_quality}
        max={5}
        onChange={(v) => set("diet_quality", v)}
      />
    </div>
  );
}

// ─── Step 4: Environment ─────────────────────────────────────────────────────
function Step4({
  data,
  set,
}: {
  data: AssessmentData;
  set: <K extends keyof AssessmentData>(k: K, v: AssessmentData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <RatingCard
        id="assessment-internet"
        label="Internet Quality"
        description="1 = Very Poor · 5 = Excellent"
        value={data.internet_quality}
        max={5}
        onChange={(v) => set("internet_quality", v)}
      />

      <Select
        id="assessment-parental-education"
        label="Parental Education Level"
        value={data.parental_education_level}
        options={[
          { label: "No formal education", value: 0 },
          { label: "Primary school", value: 1 },
          { label: "High school", value: 2 },
          { label: "Bachelor's degree", value: 3 },
          { label: "Postgraduate (Master's / PhD)", value: 4 },
        ]}
        onChange={(e) => set("parental_education_level", Number(e.target.value))}
      />

      <Toggle
        id="assessment-extracurricular"
        label="Extracurricular Participation"
        description="Are you involved in extracurricular activities?"
        checked={data.extracurricular_participation === 1}
        onChange={(checked) => set("extracurricular_participation", checked ? 1 : 0)}
      />

      <div className="flex flex-col gap-2">
        <Slider
          id="assessment-mental-health"
          label="Mental Health Rating"
          value={data.mental_health_rating}
          min={1}
          max={10}
          onChange={(v) => set("mental_health_rating", v)}
          displayValue={(v) => {
            if (v <= 3) return `${v} 😔`;
            if (v <= 6) return `${v} 😐`;
            if (v <= 8) return `${v} 🙂`;
            return `${v} 😄`;
          }}
        />
        <p className="text-xs text-gray-500">
          1 = Very poor · 10 = Excellent mental wellbeing
        </p>
      </div>
    </div>
  );
}
