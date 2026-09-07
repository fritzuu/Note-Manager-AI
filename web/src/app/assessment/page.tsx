"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  BookOpen,
  HeartPulse,
  Home,
  Brain,
  Sparkles,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { saveAssessment, markAssessmentComplete, getAssessment, saveAcademicInsight } from "@/lib/firestore";
import { EmailVerificationGatekeeper } from "@/components/auth/EmailVerificationGatekeeper";
import { getAiProvider, getCustomApiKey, setCustomApiKey, type AiProvider } from "@/lib/aiConfig";
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

// ─── Step configuration (Indonesian Localization) ───────────────────────────
const STEPS = [
  { id: 1, title: "Data Pribadi", icon: User, description: "Informasi dasar mahasiswa" },
  { id: 2, title: "Kebiasaan Belajar", icon: BookOpen, description: "Rutinitas akademik dan durasi studi harian" },
  { id: 3, title: "Gaya Hidup & Kesehatan", icon: HeartPulse, description: "Pola tidur, aktivitas, dan waktu layar" },
  { id: 4, title: "Lingkungan Belajar", icon: Home, description: "Fasilitas internet, organisasi, dan kondisi mental" },
  { id: 5, title: "Setup AI Engine", icon: Sparkles, description: "Pilih provider AI dan masukkan API key pribadi" },
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
              className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all duration-300 ${
                isCompleted
                  ? "bg-primary text-white shadow-xs"
                  : isCurrent
                  ? "bg-primary text-white ring-4 ring-primary/20 shadow-sm"
                  : "bg-gray-100 text-gray-400 font-semibold"
              }`}
            >
              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            {step < total && (
              <div
                className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
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

  // AI Provider States
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>("gemini");
  const [geminiKey, setGeminiKey] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const [data, setData] = useState<AssessmentData>({
    age: 20,
    gender: 0,
    study_hours_per_day: 3,
    attendance_percentage: 85,
    part_time_job: 0,
    sleep_hours: 7,
    social_media_hours: 2,
    netflix_hours: 1,
    exercise_frequency: 3,
    diet_quality: 3,
    internet_quality: 4,
    parental_education_level: 3,
    extracurricular_participation: 0,
    mental_health_rating: 8,
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
              attendance_percentage: existing.attendance_percentage ?? 85,
              part_time_job: existing.part_time_job ?? 0,
              sleep_hours: existing.sleep_hours ?? 7,
              social_media_hours: existing.social_media_hours ?? 2,
              netflix_hours: existing.netflix_hours ?? 1,
              exercise_frequency: existing.exercise_frequency ?? 3,
              diet_quality: existing.diet_quality ?? 3,
              internet_quality: existing.internet_quality ?? 4,
              parental_education_level: existing.parental_education_level ?? 3,
              extracurricular_participation: existing.extracurricular_participation ?? 0,
              mental_health_rating: existing.mental_health_rating ?? 8,
            });
          }

          // Load AI provider settings
          const provider = getAiProvider();
          setSelectedProvider(provider);
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

  const handleSaveApiKey = async () => {
    setApiKeyError(null);
    setApiKeySaved(false);

    const keyToSave = selectedProvider === "gemini" ? geminiKey.trim() : openRouterKey.trim();

    if (!keyToSave) {
      setApiKeyError(`Masukkan ${selectedProvider === "gemini" ? "Gemini" : "OpenRouter"} API key`);
      return;
    }

    if (keyToSave.length < 10) {
      setApiKeyError("API key terlalu pendek. Periksa kembali.");
      return;
    }

    setApiKeySaving(true);
    try {
      setCustomApiKey(keyToSave, selectedProvider);
      setApiKeySaved(true);

      // Emit event untuk update state di komponen lain
      window.dispatchEvent(new Event("mindflow-api-key-updated"));

      setTimeout(() => {
        setApiKeySaved(false);
      }, 3000);
    } catch (err) {
      setApiKeyError("Gagal menyimpan API key. Coba lagi.");
      console.error("API key save error:", err);
    } finally {
      setApiKeySaving(false);
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
        <div className="text-center animate-scale-in max-w-sm px-4">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#1F2937]">Profil Selesai Terkalibrasi!</h2>
          <p className="text-sm text-gray-500 mt-1.5">Mengarahkan ke Dashboard Academic Insight...</p>
          <div className="mt-5 w-48 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-primary rounded-full animate-[grow_2s_ease-out_forwards]"
              style={{
                animation: "grow 2s ease-out forwards",
              }}
            />
          </div>
        </div>
        <style>{`@keyframes grow { from { width: 0% } to { width: 100% } }`}</style>
      </div>
    );
  }

  return (
    <EmailVerificationGatekeeper>
      <div className="min-h-screen bg-background pb-12">
        {/* Header */}
        <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            <span className="font-bold text-primary text-lg tracking-tight">MindFlow AI</span>
          </div>
          <div className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Langkah {currentStep} dari {STEPS.length}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 sm:py-10">
        {/* Intro banner — shown on step 1 only */}
        {currentStep === 1 && (
          <div className="mb-8 p-5 rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/15 border border-primary/20 animate-fade-in shadow-xs">
            <div className="flex gap-3.5 items-start">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1F2937] text-sm">Kalibrasi Profil Gaya Belajar AI</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Informasi ini membantu AI memetakan performa akademik, menghitung indeks fokus, dan memberikan strategi belajar personal yang paling efektif untuk Anda. Pengisian hanya butuh ~2 menit.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-8 space-y-4">
          <StepProgress currentStep={currentStep} total={STEPS.length} />
          <div className="pt-2">
            <div className="flex items-center gap-3">
              {(() => {
                const StepIcon = STEPS[currentStep - 1].icon;
                return (
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                    <StepIcon className="w-5 h-5" />
                  </div>
                );
              })()}
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] tracking-tight">
                  {STEPS[currentStep - 1].title}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{STEPS[currentStep - 1].description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step content card */}
        <div className="bg-white rounded-3xl border border-border shadow-card p-6 sm:p-8 animate-slide-up" key={currentStep}>
          {currentStep === 1 && <Step1 data={data} set={set} />}
          {currentStep === 2 && <Step2 data={data} set={set} />}
          {currentStep === 3 && <Step3 data={data} set={set} />}
          {currentStep === 4 && <Step4 data={data} set={set} />}
          {currentStep === 5 && (
            <Step5
              selectedProvider={selectedProvider}
              setSelectedProvider={setSelectedProvider}
              geminiKey={geminiKey}
              setGeminiKey={setGeminiKey}
              openRouterKey={openRouterKey}
              setOpenRouterKey={setOpenRouterKey}
              showGeminiKey={showGeminiKey}
              setShowGeminiKey={setShowGeminiKey}
              showOpenRouterKey={showOpenRouterKey}
              setShowOpenRouterKey={setShowOpenRouterKey}
              onSave={handleSaveApiKey}
              saving={apiKeySaving}
              error={apiKeyError}
              saved={apiKeySaved}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="ghost"
            size="md"
            onClick={handleBack}
            disabled={currentStep === 1}
            icon={<ChevronLeft className="w-4 h-4" />}
            id="assessment-back"
            className="cursor-pointer font-semibold"
          >
            Kembali
          </Button>

          <div className="text-xs text-gray-400 font-semibold">
            {Math.round(((currentStep - 1) / STEPS.length) * 100)}% selesai
          </div>

          {currentStep < STEPS.length ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              icon={<ChevronRight className="w-4 h-4" />}
              className="flex-row-reverse cursor-pointer font-bold shadow-sm"
              id="assessment-next"
            >
              Lanjutkan
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              loading={submitting}
              icon={<Sparkles className="w-4 h-4" />}
              className="cursor-pointer font-bold shadow-sm"
              id="assessment-submit"
            >
              Selesaikan & Kalibrasi AI
            </Button>
          )}
        </div>
      </main>
    </div>
  </EmailVerificationGatekeeper>
  );
}

// ─── Step 1: Data Pribadi ────────────────────────────────────────────────────
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
        label="Usia Mahasiswa"
        value={data.age}
        min={15}
        max={40}
        onChange={(v) => set("age", v)}
        displayValue={(v) => `${v} tahun`}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-[#1F2937]">Jenis Kelamin</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Laki-laki", value: 0 },
            { label: "Perempuan", value: 1 },
            { label: "Lainnya", value: 2 },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              id={`assessment-gender-${opt.value}`}
              onClick={() => set("gender", opt.value)}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                data.gender === opt.value
                  ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                  : "border-border bg-white text-gray-600 hover:border-primary/40"
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-xs font-bold">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Kebiasaan Belajar ───────────────────────────────────────────────
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
        label="Rata-rata Durasi Belajar per Hari"
        value={data.study_hours_per_day}
        min={0}
        max={12}
        step={0.5}
        onChange={(v) => set("study_hours_per_day", v)}
        displayValue={(v) => `${v} Jam`}
      />

      <Slider
        id="assessment-attendance"
        label="Persentase Kehadiran Perkuliahan"
        value={data.attendance_percentage}
        min={0}
        max={100}
        onChange={(v) => set("attendance_percentage", v)}
        displayValue={(v) => `${v}%`}
      />

      <Toggle
        id="assessment-part-time-job"
        label="Pekerjaan Sampingan / Freelance"
        description="Apakah Anda saat ini memiliki pekerjaan sampingan, magang, atau part-time?"
        checked={data.part_time_job === 1}
        onChange={(checked) => set("part_time_job", checked ? 1 : 0)}
      />
    </div>
  );
}

// ─── Step 3: Gaya Hidup & Kesehatan ──────────────────────────────────────────
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
        label="Durasi Tidur per Malam"
        value={data.sleep_hours}
        min={3}
        max={12}
        step={0.5}
        onChange={(v) => set("sleep_hours", v)}
        displayValue={(v) => `${v} Jam`}
      />

      <Slider
        id="assessment-social-media"
        label="Durasi Bermain Media Sosial per Hari"
        value={data.social_media_hours}
        min={0}
        max={12}
        step={0.5}
        onChange={(v) => set("social_media_hours", v)}
        displayValue={(v) => `${v} Jam`}
      />

      <Slider
        id="assessment-netflix"
        label="Durasi Menonton / Hiburan per Hari"
        value={data.netflix_hours}
        min={0}
        max={10}
        step={0.5}
        onChange={(v) => set("netflix_hours", v)}
        displayValue={(v) => `${v} Jam`}
      />

      <RatingCard
        id="assessment-exercise"
        label="Frekuensi Olahraga Mingguan"
        description="Jumlah hari dalam seminggu Anda berolahraga / aktif bergerak"
        value={data.exercise_frequency}
        options={[
          { value: 0, label: "0 Hari" },
          { value: 1, label: "1 Hari" },
          { value: 2, label: "2 Hari" },
          { value: 3, label: "3 Hari" },
          { value: 4, label: "4 Hari" },
          { value: 5, label: "5 Hari" },
          { value: 6, label: "6 Hari" },
          { value: 7, label: "7 Hari" },
        ]}
        onChange={(v) => set("exercise_frequency", v)}
      />

      <RatingCard
        id="assessment-diet"
        label="Kualitas Pola Makan"
        description="1 = Kurang Teratur/Junkfood · 5 = Sangat Bergizi & Teratur"
        value={data.diet_quality}
        max={5}
        onChange={(v) => set("diet_quality", v)}
      />
    </div>
  );
}

// ─── Step 4: Lingkungan Belajar & Kesejahteraan ───────────────────────────────
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
        label="Kualitas Koneksi Internet Belajar"
        description="1 = Sangat Lambat/Sering Terputus · 5 = Sangat Cepat & Stabil"
        value={data.internet_quality}
        max={5}
        onChange={(v) => set("internet_quality", v)}
      />

      <Select
        id="assessment-parental-education"
        label="Tingkat Pendidikan Terakhir Orang Tua"
        value={data.parental_education_level}
        options={[
          { label: "Tidak Bersekolah Formal", value: 0 },
          { label: "Sekolah Dasar / Menengah Pertama (SD/SMP)", value: 1 },
          { label: "Sekolah Menengah Atas / Kejuruan (SMA/SMK)", value: 2 },
          { label: "Diploma / Sarjana (D3/D4/S1)", value: 3 },
          { label: "Pascasarjana (Magister S2 / Doktor S3)", value: 4 },
        ]}
        onChange={(e) => set("parental_education_level", Number(e.target.value))}
      />

      <Toggle
        id="assessment-extracurricular"
        label="Keaktifan Organisasi / UKM Kampus"
        description="Apakah Anda aktif dalam organisasi mahasiswa, kepanitiaan, atau UKM?"
        checked={data.extracurricular_participation === 1}
        onChange={(checked) => set("extracurricular_participation", checked ? 1 : 0)}
      />

      <div className="flex flex-col gap-2">
        <Slider
          id="assessment-mental-health"
          label="Tingkat Kesejahteraan & Kebugaran Mental"
          value={data.mental_health_rating}
          min={1}
          max={10}
          onChange={(v) => set("mental_health_rating", v)}
          displayValue={(v) => `${v} / 10`}
        />
        <p className="text-xs text-gray-500">
          1 = Sangat Tertekan / Burnout · 10 = Sangat Positif & Bersemangat
        </p>
      </div>
    </div>
  );
}

// ─── Step 5: AI Engine Setup & API Key Configuration ─────────────────────────
interface Step5Props {
  selectedProvider: AiProvider;
  setSelectedProvider: (provider: AiProvider) => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  openRouterKey: string;
  setOpenRouterKey: (key: string) => void;
  showGeminiKey: boolean;
  setShowGeminiKey: (show: boolean) => void;
  showOpenRouterKey: boolean;
  setShowOpenRouterKey: (show: boolean) => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  saved: boolean;
}

function Step5({
  selectedProvider,
  setSelectedProvider,
  geminiKey,
  setGeminiKey,
  openRouterKey,
  setOpenRouterKey,
  showGeminiKey,
  setShowGeminiKey,
  showOpenRouterKey,
  setShowOpenRouterKey,
  onSave,
  saving,
  error,
  saved,
}: Step5Props) {
  const isGemini = selectedProvider === "gemini";

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs leading-relaxed space-y-2">
        <p className="font-bold flex items-center gap-2 text-blue-800">
          <AlertCircle className="w-4 h-4" /> Pilihan Provider AI
        </p>
        <p>
          MindFlow AI menggunakan model bahasa terkini untuk memberikan analisis mendalam. Anda dapat menggunakan kunci API pribadi dari Google Gemini atau OpenRouter, atau menggunakan fallback server default kami.
        </p>
      </div>

      {/* Provider Selection */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-gray-800">Pilih AI Provider:</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: "gemini" as AiProvider,
              label: "Google Gemini",
              desc: "Model terbaru dari Google",
            },
            {
              value: "openrouter" as AiProvider,
              label: "OpenRouter",
              desc: "Multi-model marketplace",
            },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedProvider(opt.value)}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${
                selectedProvider === opt.value
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-white hover:border-primary/40"
              }`}
            >
              <div className="font-bold text-sm text-gray-800">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Gemini API Key Input */}
      {isGemini && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-800">Google Gemini API Key</label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              Dapatkan Key →
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative">
            <input
              type={showGeminiKey ? "text" : "password"}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza... (paste key dari Google AI Studio)"
              className="w-full px-4 py-3 rounded-2xl border border-border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 cursor-pointer"
            >
              {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            🔐 API key disimpan aman di browser Anda. MindFlow tidak pernah mengirimkan key ke server kami.
          </p>
        </div>
      )}

      {/* OpenRouter API Key Input */}
      {!isGemini && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-800">OpenRouter API Key</label>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              Dapatkan Key →
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative">
            <input
              type={showOpenRouterKey ? "text" : "password"}
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
              placeholder="sk-or-... (paste key dari OpenRouter dashboard)"
              className="w-full px-4 py-3 rounded-2xl border border-border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 cursor-pointer"
            >
              {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            🔐 API key disimpan aman di browser Anda. MindFlow tidak pernah mengirimkan key ke server kami.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {saved && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-start gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>API Key tersimpan! Siap melanjutkan...</span>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onSave}
          loading={saving}
          icon={<Key className="w-4 h-4" />}
          className="w-full font-bold shadow-sm cursor-pointer"
        >
          Simpan API Key
        </Button>
      </div>

      {/* Optional Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
        <p className="font-bold mb-1">💡 Catatan Penting:</p>
        <p>
          Jika Anda tidak memiliki API key saat ini, sistem akan menggunakan fallback server default kami. Anda dapat mengonfigurasi API key kapan saja di pengaturan setelah login.
        </p>
      </div>
    </div>
  );
}
