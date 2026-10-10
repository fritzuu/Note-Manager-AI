import { ENGINE_VERSION, profileSignature, type LearningProfile } from "./profile";
export const PERFORMANCE_LABELS = ["Low", "Average", "Good", "Excellent"] as const;
export type PerformanceLabel = typeof PERFORMANCE_LABELS[number];
export interface ModelResult { prediction: PerformanceLabel; confidence: number; modelVersion?: string }
/** Shared habit rules for both service and fallback. This is not an exam-grade prediction. */
export function summarizeHabits(profile: LearningProfile) {
  const strengths: string[] = [], weaknesses: string[] = [];
  const note = (good: boolean, needsAttention: boolean, positive: string, negative: string) => {
    if (good) strengths.push(positive); else if (needsAttention) weaknesses.push(negative);
  };
  note(profile.study_hours_per_day >= 4, profile.study_hours_per_day < 2, "Waktu belajar cukup terjaga", "Waktu belajar mandiri masih sedikit");
  note(profile.attendance_percentage >= 85, profile.attendance_percentage < 70, "Kehadiran kuliah terjaga", "Kehadiran kuliah perlu diperhatikan");
  note(profile.sleep_hours >= 7 && profile.sleep_hours <= 9, profile.sleep_hours < 6 || profile.sleep_hours > 9, "Waktu tidur cukup teratur", "Coba tinjau kembali waktu tidurmu");
  note(profile.mental_health_rating >= 7, profile.mental_health_rating <= 4, "Kondisi diri terasa baik", "Kondisi diri perlu perhatian. Cari dukungan jika kamu membutuhkannya");
  note(profile.exercise_frequency >= 3, profile.exercise_frequency === 0, "Ada waktu untuk bergerak", "Belum ada waktu olahraga dalam jawabanmu");
  const entertainment = profile.social_media_hours + profile.netflix_hours;
  note(entertainment <= 3, entertainment > 5, "Waktu hiburan cukup terkendali", "Waktu hiburan dan media sosial cukup tinggi");
  note(profile.diet_quality >= 2, profile.diet_quality === 0, "Pola makan cukup terjaga", "Pola makan perlu diperhatikan");
  note(profile.internet_quality === 2, profile.internet_quality === 0, "Koneksi internet mendukung belajar", "Koneksi internet bisa menghambat belajar");
  if (profile.extracurricular_participation === 1) strengths.push("Aktif berkegiatan di luar kelas");
  if (!strengths.length) strengths.push("Sudah meluangkan waktu untuk mengenali kebiasaanmu");
  // Same transparent rule score regardless of model availability; exclude demographic categories.
  let score = 50 + Math.min(profile.study_hours_per_day * 3.5, 25)
    + ((profile.attendance_percentage - 50) / 50) * 20 - Math.min(entertainment * 1.8, 15)
    + (profile.mental_health_rating - 5) * 1.5 + (profile.diet_quality - 1) * 2
    + (profile.exercise_frequency - 2) * 1.5;
  if (profile.sleep_hours >= 7 && profile.sleep_hours <= 9) score += 5;
  else if (profile.sleep_hours < 6) score -= 8;
  const academicScore = Math.max(0, Math.min(100, Math.round(score)));
  const fallbackPrediction: PerformanceLabel = academicScore < 50 ? "Low" : academicScore < 65 ? "Average" : academicScore < 80 ? "Good" : "Excellent";
  const headline = profile.study_hours_per_day < 2 ? "Beri ruang untuk belajar"
    : profile.attendance_percentage < 70 ? "Jaga kehadiran kuliah"
    : profile.sleep_hours < 6 || profile.sleep_hours > 9 ? "Tinjau waktu istirahatmu"
    : profile.mental_health_rating <= 4 ? "Beri ruang untuk diri sendiri"
    : profile.exercise_frequency === 0 ? "Luangkan waktu untuk bergerak"
    : entertainment > 5 ? "Atur waktu hiburanmu"
    : profile.diet_quality === 0 ? "Perhatikan pola makanmu"
    : profile.internet_quality === 0 ? "Cari tempat belajar yang mendukung"
    : "Pertahankan ritme belajarmu";
  const recommendation = weaknesses.length
    ? `Mulai dari satu kebiasaan yang perlu perhatian: ${weaknesses[0].charAt(0).toLowerCase()}${weaknesses[0].slice(1)}. Pilih perubahan kecil yang bisa kamu jalani minggu ini.`
    : "Pertahankan kebiasaan yang sudah berjalan. Sesuaikan jadwal saat beban tugas berubah dan sisakan waktu untuk istirahat.";
  return { academicScore, fallbackPrediction, headline, recommendation, strengths, weaknesses };
}
export function makeLearningInsight(profile: LearningProfile, model: ModelResult | null, fallbackReason?: string) {
  const { fallbackPrediction, ...summary } = summarizeHabits(profile);
  return {
    ...summary, prediction: model?.prediction ?? fallbackPrediction,
    confidence: model?.confidence ?? null,
    source: model ? "machine_learning" as const : "heuristic_fallback" as const,
    engineVersion: ENGINE_VERSION, scoreKind: "habit_summary" as const,
    modelVersion: model?.modelVersion ?? null,
    fallbackReason: model ? null : fallbackReason ?? "service_unavailable",
    profileSignature: profileSignature(profile), profileSnapshot: profile,
  };
}
export function parseModelResult(value: unknown): ModelResult | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!PERFORMANCE_LABELS.includes(data.prediction as PerformanceLabel) || typeof data.confidence !== "number" || !Number.isFinite(data.confidence) || data.confidence < 0 || data.confidence > 100) return null;
  // The Python service contract is percentage, never guessing fractions.
  return { prediction: data.prediction as PerformanceLabel, confidence: data.confidence, ...(typeof data.modelVersion === "string" ? { modelVersion: data.modelVersion } : {}) };
}
