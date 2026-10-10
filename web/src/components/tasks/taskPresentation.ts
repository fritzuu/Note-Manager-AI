import type { FuzzyDetailedResult } from "@/lib/fuzzyLogic";

export const priorityLabels: Record<string, string> = { Critical: "Mendesak", High: "Prioritas tinggi", Medium: "Prioritas sedang", Low: "Prioritas rendah" };
export const statusLabels = { todo: "Belum mulai", doing: "Dikerjakan", done: "Selesai" };
export const riskLabels: Record<string, string> = { Critical: "Perlu segera diperhatikan", High: "Perlu perhatian", Medium: "Tetap pantau", Low: "Rendah" };
const conditions: Record<string, string> = {
  "Deadline Near": "tenggatnya dekat", "Deadline Medium": "tenggatnya beberapa hari lagi", "Deadline Far": "tenggatnya masih jauh",
  "Importance High": "tugas ini penting", "Importance Medium": "kepentingannya sedang", "Importance Low": "kepentingannya lebih rendah",
  "Progress Low": "baru sedikit yang dikerjakan", "Progress Medium": "pengerjaannya sudah berjalan", "Progress High": "pengerjaannya hampir selesai",
  "Difficulty Hard": "tugasnya sulit", "Difficulty Medium": "kesulitannya sedang", "Difficulty Easy": "tugasnya ringan",
  "Academic Risk Critical": "hasil penilaian belajarmu membutuhkan perhatian", "Academic Risk High": "hasil penilaian belajarmu perlu diperhatikan",
  "Academic Risk Medium": "hasil penilaian belajarmu ikut dipertimbangkan", "Academic Risk Low": "hasil penilaian belajarmu menunjukkan risiko rendah",
};
export const describeConditions = (items: string[]) => items.map(item => conditions[item] || "informasi tugas ikut dipertimbangkan").join(", ");
export function priorityReason(result: FuzzyDetailedResult, deadlineDays: number, progress: number) {
  if (progress >= 100) return "Pengerjaan tugas sudah mencapai 100%.";
  if (deadlineDays < 0) return "Tenggat sudah lewat. Selesaikan bagian yang masih tersisa.";
  const rule = result.activatedRules.find(item => item.outputLevel === result.priorityLevel) || result.activatedRules[0];
  if (!rule) return "Belum ada alasan yang menonjol untuk mendahulukan tugas ini.";
  const text = describeConditions(rule.conditions);
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
