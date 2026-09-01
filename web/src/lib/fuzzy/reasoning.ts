import type { FuzzyInputs, PriorityLevel, RuleResult, RiskLevel } from "./types";

const CONDITION_ID_MAP: Record<string, string> = {
  "Deadline Near": "Tenggat waktu sangat dekat",
  "Deadline Medium": "Tenggat waktu dalam rentang sedang",
  "Deadline Far": "Tenggat waktu masih panjang",
  "Importance High": "tingkat kepentingan tinggi",
  "Importance Medium": "tingkat kepentingan standar",
  "Importance Low": "tingkat kepentingan fleksibel",
  "Progress Low": "progres pengerjaan masih minim",
  "Progress Medium": "progres pengerjaan sudah separuh jalan",
  "Progress High": "tugas sudah mendekati selesai",
  "Difficulty Hard": "tingkat kesulitan cukup rumit",
  "Difficulty Medium": "tingkat kesulitan sedang",
  "Difficulty Easy": "tingkat kesulitan ringan",
  "Academic Risk Critical": "profil risiko akademik sangat tinggi",
  "Academic Risk High": "profil risiko akademik perlu perhatian",
  "Academic Risk Medium": "profil risiko akademik stabil",
  "Academic Risk Low": "profil risiko akademik aman",
};

/**
 * Builds a natural, human-friendly reasoning string based on the activated fuzzy rules.
 */
export function buildReasoning(
  inputs: FuzzyInputs,
  priorityLevel: PriorityLevel,
  activatedRules: RuleResult[]
): string {
  if (inputs.progress >= 100) {
    return "Tugas sudah selesai 100% — tidak ada tindakan lebih lanjut yang diperlukan.";
  }
  if (inputs.deadlineDays < 0) {
    return "Tugas sudah MELEWATI tenggat waktu (Terlambat)! Sangat disarankan untuk segera diselesaikan hari ini.";
  }

  if (activatedRules.length === 0) {
    return "Tugas berada pada prioritas standar tanpa sinyal urgensi mendesak.";
  }

  // Find dominant rule matching output level
  const dominantRule = activatedRules.find(r => r.outputLevel === priorityLevel) || activatedRules[0];
  const indonesianConditions = dominantRule.conditions.map(c => CONDITION_ID_MAP[c] || c);

  const levelLabel = 
    priorityLevel === "Critical" ? "Sangat Mendesak (Urgent)" :
    priorityLevel === "High" ? "Tinggi (High)" :
    priorityLevel === "Medium" ? "Sedang (Medium)" : "Fleksibel (Low)";

  let reason = `Status diprioritaskan ${levelLabel} karena ${indonesianConditions.join(" serta ")}.`;

  if (inputs.progress > 0 && inputs.progress < 100) {
    if (priorityLevel === "Critical" || priorityLevel === "High") {
      reason += ` Progres saat ini ${inputs.progress.toFixed(0)}%, teruskan fokusmu!`;
    }
  }

  return reason;
}

/**
 * Derives a discrete RiskLevel based on fuzzy inputs and final priority score.
 */
export function deriveRiskLevel(
  deadlineDays: number,
  progress: number,
  academicRisk: number,
  priorityScore: number
): RiskLevel {
  if (academicRisk >= 80 || (deadlineDays < 2 && progress < 50)) return "Critical";
  if (priorityScore >= 70 || academicRisk >= 60) return "High";
  if (priorityScore >= 40 || academicRisk >= 35) return "Medium";
  return "Low";
}

/**
 * Estimates required focus minutes based on difficulty, priority, and progress.
 */
export function estimateFocusMinutes(difficulty: number, priorityScore: number, progress: number): number {
  if (progress >= 100) return 0;
  
  const remainingMultiplier = (100 - progress) / 100;
  
  // Base minutes on difficulty: Easy (~30m), Medium (~60m), Hard (~120m)
  const baseMinutes = 20 + difficulty * 10;
  
  // Priority multiplier (up to 1.5x for critical tasks)
  const priorityMultiplier = 1.0 + (priorityScore / 200); 

  return Math.round(baseMinutes * priorityMultiplier * remainingMultiplier);
}
