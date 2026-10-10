/** Numeric categories match ml/eda/eda.py. Unversioned profiles use the old form. */
export const PROFILE_VERSION = 2 as const;
export const ENGINE_VERSION = "profile-v2";
export const PROFILE_FIELDS = ["age", "gender", "study_hours_per_day", "social_media_hours", "netflix_hours", "part_time_job", "attendance_percentage", "sleep_hours", "diet_quality", "exercise_frequency", "parental_education_level", "internet_quality", "mental_health_rating", "extracurricular_participation"] as const;
export type ProfileField = typeof PROFILE_FIELDS[number];
export type LearningProfile = Record<ProfileField, number> & { schemaVersion: 2 };
export type ProfileDraft = Record<ProfileField, number | null>;
export const DEFAULT_PROFILE: ProfileDraft = {
  age: 20, gender: null, study_hours_per_day: 3, social_media_hours: 2, netflix_hours: 1,
  part_time_job: 0, attendance_percentage: 85, sleep_hours: 7, diet_quality: null,
  exercise_frequency: 3, parental_education_level: null, internet_quality: null,
  mental_health_rating: 8, extracurricular_participation: 0,
};
export const PROFILE_LABELS: Record<ProfileField, string> = {
  age: "Usia", gender: "Jenis kelamin", study_hours_per_day: "Waktu belajar", social_media_hours: "Media sosial", netflix_hours: "Hiburan", part_time_job: "Pekerjaan sampingan", attendance_percentage: "Kehadiran", sleep_hours: "Waktu tidur", diet_quality: "Pola makan", exercise_frequency: "Olahraga", parental_education_level: "Pendidikan orang tua", internet_quality: "Koneksi internet", mental_health_rating: "Kondisi diri", extracurricular_participation: "Kegiatan di luar kelas",
};
export const PROFILE_RANGES: Record<ProfileField, readonly [number, number, boolean]> = {
  age: [15, 100, true], gender: [0, 2, true], study_hours_per_day: [0, 12, false],
  social_media_hours: [0, 12, false], netflix_hours: [0, 10, false], part_time_job: [0, 1, true],
  attendance_percentage: [0, 100, false], sleep_hours: [0, 12, false], diet_quality: [0, 3, true],
  exercise_frequency: [0, 7, true], parental_education_level: [0, 5, true], internet_quality: [0, 2, true],
  mental_health_rating: [1, 10, true], extracurricular_participation: [0, 1, true],
};
export function validateProfile(input: unknown): { ok: true; data: LearningProfile } | { ok: false; errors: Partial<Record<ProfileField | "schemaVersion", string>> } {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const errors: Partial<Record<ProfileField | "schemaVersion", string>> = {};
  if (body.schemaVersion !== PROFILE_VERSION) errors.schemaVersion = "Profil ini memakai pilihan lama. Buka Ubah profil dan konfirmasi pilihanmu terlebih dahulu.";
  const values: Record<string, number> = {};
  for (const key of PROFILE_FIELDS) {
    const value = body[key];
    const [min, max, integer] = PROFILE_RANGES[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) errors[key] = `${PROFILE_LABELS[key]} belum diisi dengan benar.`;
    else values[key] = value;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { ...values, schemaVersion: PROFILE_VERSION } as LearningProfile };
}
/** Preserve old answers where their meaning is unambiguous; ask again for changed scales. */
export function draftFromSaved(saved: Record<string, unknown>): ProfileDraft {
  const draft = { ...DEFAULT_PROFILE };
  for (const key of PROFILE_FIELDS) if (typeof saved[key] === "number" && Number.isFinite(saved[key])) draft[key] = saved[key] as number;
  if (saved.schemaVersion !== PROFILE_VERSION) {
    draft.gender = saved.gender === 0 ? 1 : saved.gender === 1 ? 0 : saved.gender === 2 ? 2 : null;
    draft.diet_quality = null; draft.internet_quality = null; draft.parental_education_level = null;
  }
  return draft;
}
export function profileSignature(profile: LearningProfile): string {
  return JSON.stringify([PROFILE_VERSION, ...PROFILE_FIELDS.map(key => profile[key])]);
}
/** Categories absent from training are kept in the profile but never fabricated for the model. */
export function supportsModel(profile: LearningProfile): boolean { return profile.gender <= 1 && profile.parental_education_level <= 3; }
