export const STREAK_STAGES = [
  { minDays: 0, name: "Mulai dari sini", background: "#eef1e6", foreground: "#254737", accent: "#627b50", muted: "#66795b", orbit: 1 },
  { minDays: 1, name: "Mulai belajar", background: "#193d32", foreground: "#f6f5ee", accent: "#c5d8a8", muted: "#b9cbb0", orbit: 1 },
  { minDays: 3, name: "Mulai rutin", background: "#284c40", foreground: "#fbf8ec", accent: "#d3dfb4", muted: "#c4d0b8", orbit: 2 },
  { minDays: 7, name: "Seminggu berjalan", background: "#dce7c8", foreground: "#213f31", accent: "#536e3f", muted: "#586d4d", orbit: 3 },
  { minDays: 14, name: "Kebiasaan terbentuk", background: "#e8d8c2", foreground: "#443c2b", accent: "#83643d", muted: "#76634c", orbit: 4 },
  { minDays: 30, name: "Sebulan konsisten", background: "#303c37", foreground: "#fff5df", accent: "#dcc48c", muted: "#d0c4a9", orbit: 5 },
] as const;

export function getStreakStage(value: number) {
  const days = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const stageIndex = STREAK_STAGES.reduce((index, stage, current) => days >= stage.minDays ? current : index, 0);
  const stage = STREAK_STAGES[stageIndex];
  const next = STREAK_STAGES[stageIndex + 1];
  const progress = next ? (days - stage.minDays) / (next.minDays - stage.minDays) : 1;
  return { stage, next, days, progress };
}
