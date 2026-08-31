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
  {
    id: "notes-stat",
    title: "Total Notes",
    description: "Displays total count of notes saved with quick creation link.",
    category: "General",
    defaultSize: "1x1",
    allowedSizes: ["1x1", "2x1"],
    icon: "FileText",
  },
  {
    id: "ai-summaries-stat",
    title: "AI Summaries",
    description: "Quick access to AI conversation stats and assistant chats.",
    category: "AI Tools",
    defaultSize: "1x1",
    allowedSizes: ["1x1", "2x1"],
    icon: "Sparkles",
  },
  {
    id: "clock",
    title: "Digital Clock",
    description: "Real-time digital clock with timezone, day progress, and live seconds.",
    category: "General",
    defaultSize: "1x1",
    allowedSizes: ["1x1", "2x1"],
    icon: "Clock",
  },
  {
    id: "calendar",
    title: "Monthly Calendar",
    description: "Interactive mini monthly calendar planner with deadline highlights.",
    category: "Planning",
    defaultSize: "2x2",
    allowedSizes: ["2x2", "2x1", "1x1"],
    icon: "Calendar",
  },
  {
    id: "productivity-chart",
    title: "Productivity Trends",
    description: "Weekly focus activity, study minutes, and consecutive day streak.",
    category: "Focus & Study",
    defaultSize: "2x1",
    allowedSizes: ["2x1", "2x2", "4x1"],
    icon: "TrendingUp",
  },
  {
    id: "pomodoro-timer",
    title: "Pomodoro Focus",
    description: "Interactive smart fuzzy timer with live countdown & direct controls.",
    category: "Focus & Study",
    defaultSize: "2x2",
    allowedSizes: ["2x2", "2x1"],
    icon: "Timer",
  },
  {
    id: "priority-tasks",
    title: "Priority Tasks",
    description: "Top urgent tasks ranked by the Mamdani Fuzzy Logic priority engine.",
    category: "Planning",
    defaultSize: "2x2",
    allowedSizes: ["2x2", "2x1", "4x2"],
    icon: "CheckSquare",
  },
  {
    id: "academic-insight",
    title: "Academic Score",
    description: "Machine Learning performance prediction and habit risk analytics.",
    category: "AI Tools",
    defaultSize: "2x1",
    allowedSizes: ["2x1", "1x1", "2x2"],
    icon: "Brain",
  },
  {
    id: "recent-notes",
    title: "Recent Notes",
    description: "Quick shortcut list of recently edited student notes.",
    category: "General",
    defaultSize: "2x1",
    allowedSizes: ["2x1", "2x2", "4x1"],
    icon: "FileText",
  },
  {
    id: "upcoming-deadlines",
    title: "Upcoming Deadlines",
    description: "Tasks with closest deadlines sorted by urgent days remaining.",
    category: "Planning",
    defaultSize: "2x1",
    allowedSizes: ["2x1", "2x2"],
    icon: "Calendar",
  },
  {
    id: "streak-badge",
    title: "Study Streak Fire",
    description: "Animated Duolingo-style flame counter and brag-ready social share card.",
    category: "Focus & Study",
    defaultSize: "1x1",
    allowedSizes: ["1x1", "2x1"],
    icon: "Flame",
  },
];

export const DEFAULT_BENTO_LAYOUT: BentoWidgetConfig[] = [
  { id: "notes-stat", title: "Total Notes", size: "1x1" },
  { id: "clock", title: "Digital Clock", size: "1x1" },
  { id: "productivity-chart", title: "Productivity Trends", size: "2x1" },
  { id: "pomodoro-timer", title: "Pomodoro Focus", size: "2x2" },
  { id: "calendar", title: "Monthly Calendar", size: "2x2" },
  { id: "priority-tasks", title: "Priority Tasks", size: "2x2" },
  { id: "academic-insight", title: "Academic Score", size: "2x1" },
];
