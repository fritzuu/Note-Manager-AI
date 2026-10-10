export type WidgetSize = "1x1" | "2x1" | "2x2" | "4x1" | "4x2";

export interface BentoWidgetConfig {
  id: string;
  title: string;
  size: WidgetSize;
  minColSpan?: number;
  minRowSpan?: number;
}

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  category: "General" | "Focus & Study" | "AI Tools" | "Planning";
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
  icon: string;
}

export const SIZE_CLASS_MAP: Record<WidgetSize, string> = {
  "1x1": "col-span-1 md:col-span-1 lg:col-span-1 row-span-1",
  "2x1": "col-span-1 md:col-span-2 lg:col-span-2 row-span-1",
  "2x2": "col-span-1 md:col-span-2 lg:col-span-2 row-span-2",
  "4x1": "col-span-1 md:col-span-2 lg:col-span-4 row-span-1",
  "4x2": "col-span-1 md:col-span-2 lg:col-span-4 row-span-2",
};

export const WIDGET_LIBRARY: WidgetDefinition[] = [
  { id: "daily-focus", title: "Fokus hari ini", description: "Satu prioritas dan akses cepat ke sesi fokus.", category: "Focus & Study", defaultSize: "2x1", allowedSizes: ["2x1", "2x2", "4x1"], icon: "Timer" },
  {
    id: "notes-stat",
    title: "Catatan tersimpan",
    description: "Jumlah catatan dan akses ke koleksimu.",
    category: "General",
    defaultSize: "1x1",
    allowedSizes: ["1x1", "2x1"],
    icon: "FileText",
  },
  {
    id: "ai-summaries-stat",
    title: "Rangkuman tersimpan",
    description: "Jumlah rangkuman dan akses ke asisten.",
    category: "AI Tools",
    defaultSize: "1x1",
    allowedSizes: ["1x1", "2x1"],
    icon: "Sparkles",
  },
  {
    id: "clock",
    title: "Waktu sekarang",
    description: "Jam lokal dan progres hari ini.",
    category: "General",
    defaultSize: "1x1",
    allowedSizes: ["1x1", "2x1"],
    icon: "Clock",
  },
  {
    id: "calendar",
    title: "Kalender",
    description: "Kalender interaktif dengan deadline tugas.",
    category: "Planning",
    defaultSize: "2x2",
    allowedSizes: ["1x1", "2x1", "2x2"],
    icon: "Calendar",
  },
  {
    id: "productivity-chart",
    title: "Ritme belajar",
    description: "Menit dan sesi fokus selama tujuh hari terakhir.",
    category: "Focus & Study",
    defaultSize: "2x1",
    allowedSizes: ["2x1", "2x2", "4x1"],
    icon: "TrendingUp",
  },
  {
    id: "pomodoro-timer",
    title: "Timer fokus",
    description: "Pilih tugas dan jalankan timer fokus.",
    category: "Focus & Study",
    defaultSize: "2x2",
    allowedSizes: ["2x1", "2x2"],
    icon: "Timer",
  },
  {
    id: "priority-tasks",
    title: "Tugas berikutnya",
    description: "Tugas aktif berdasarkan prioritasnya.",
    category: "Planning",
    defaultSize: "2x2",
    allowedSizes: ["2x1", "2x2", "4x2"],
    icon: "CheckSquare",
  },
  {
    id: "academic-insight",
    title: "Pola belajar",
    description: "Hasil assessment dan rekomendasi kebiasaan belajar.",
    category: "AI Tools",
    defaultSize: "2x1",
    allowedSizes: ["2x1", "1x1", "2x2"],
    icon: "Brain",
  },
  {
    id: "recent-notes",
    title: "Catatan terbaru",
    description: "Lanjutkan catatan yang terakhir diperbarui.",
    category: "General",
    defaultSize: "2x1",
    allowedSizes: ["2x1", "2x2", "4x1"],
    icon: "FileText",
  },
  {
    id: "upcoming-deadlines",
    title: "Deadline terdekat",
    description: "Tugas dengan deadline paling dekat.",
    category: "Planning",
    defaultSize: "2x1",
    allowedSizes: ["2x1", "2x2"],
    icon: "Calendar",
  },
  {
    id: "streak-badge",
    title: "Konsistensi belajar",
    description: "Lihat konsistensi dan bagikan progres belajar.",
    category: "Focus & Study",
    defaultSize: "2x1",
    allowedSizes: ["1x1", "2x1", "2x2"],
    icon: "TrendingUp",
  },
];

export const DEFAULT_BENTO_LAYOUT: BentoWidgetConfig[] = [
  { id: "daily-focus", title: "Fokus hari ini", size: "2x1" },
  { id: "productivity-chart", title: "Ritme belajar", size: "2x1" },
  { id: "recent-notes", title: "Catatan terbaru", size: "2x1" },
  { id: "priority-tasks", title: "Tugas berikutnya", size: "2x1" },
  { id: "academic-insight", title: "Pola belajar", size: "2x1" },
  { id: "pomodoro-timer", title: "Timer fokus", size: "2x1" },
];
