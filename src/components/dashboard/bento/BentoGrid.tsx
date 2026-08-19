"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  SlidersHorizontal,
  Check,
  RotateCcw,
  Plus,
  LayoutGrid,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BentoItemWrapper } from "./BentoItemWrapper";
import { AddWidgetModal } from "./AddWidgetModal";
import {
  BentoWidgetConfig,
  DEFAULT_BENTO_LAYOUT,
  SIZE_CLASS_MAP,
  WidgetSize,
} from "./types";
import { NotesStatWidget } from "./widgets/NotesStatWidget";
import { AiSummariesStatWidget } from "./widgets/AiSummariesStatWidget";
import { ProductivityChartWidget } from "./widgets/ProductivityChartWidget";
import { PomodoroBentoWidget } from "./widgets/PomodoroBentoWidget";
import { PriorityTasksWidget } from "./widgets/PriorityTasksWidget";
import { AcademicInsightWidget } from "./widgets/AcademicInsightWidget";
import { RecentNotesBentoWidget } from "./widgets/RecentNotesBentoWidget";
import { UpcomingDeadlinesBentoWidget } from "./widgets/UpcomingDeadlinesBentoWidget";
import { ClockBentoWidget } from "./widgets/ClockBentoWidget";
import { CalendarBentoWidget } from "./widgets/CalendarBentoWidget";
import { StreakBentoWidget } from "./widgets/StreakBentoWidget";
import {
  NoteDocument,
  AcademicInsight,
  TaskDocument,
  PomodoroSession,
} from "@/lib/firestore";

const STORAGE_KEY = "mindflow_bento_dashboard_layout_v3";

interface BentoGridProps {
  notes: NoteDocument[];
  summariesCount: number;
  insight: AcademicInsight | null;
  tasks: TaskDocument[];
  sessions: PomodoroSession[];
}

export function BentoGrid({
  notes,
  summariesCount,
  insight,
  tasks,
  sessions,
}: BentoGridProps) {
  const [widgets, setWidgets] = useState<BentoWidgetConfig[]>(DEFAULT_BENTO_LAYOUT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addWidgetModalOpen, setAddWidgetModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load layout from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BentoWidgetConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWidgets(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const saveLayout = (newWidgets: BentoWidgetConfig[]) => {
    setWidgets(newWidgets);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
      } catch {
        // Ignore
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(widgets, oldIndex, newIndex);
        saveLayout(reordered);
      }
    }
    setActiveId(null);
  };

  const handleResize = (id: string, newSize: WidgetSize) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, size: newSize } : w));
    saveLayout(updated);
  };

  const handleRemove = (id: string) => {
    const updated = widgets.filter((w) => w.id !== id);
    saveLayout(updated);
  };

  const handleAddWidget = (newWidget: BentoWidgetConfig) => {
    if (widgets.some((w) => w.id === newWidget.id)) return;
    const updated = [...widgets, newWidget];
    saveLayout(updated);
  };

  const handleResetLayout = () => {
    saveLayout(DEFAULT_BENTO_LAYOUT);
  };

  // Render individual widget component by ID
  const renderWidgetContent = (id: string) => {
    switch (id) {
      case "notes-stat":
        return <NotesStatWidget totalNotes={notes.length} />;
      case "ai-summaries-stat":
        return <AiSummariesStatWidget summariesCount={summariesCount} />;
      case "productivity-chart":
        return <ProductivityChartWidget sessions={sessions} />;
      case "pomodoro-timer":
        return <PomodoroBentoWidget />;
      case "priority-tasks":
        return <PriorityTasksWidget tasks={tasks} />;
      case "academic-insight":
        return <AcademicInsightWidget insight={insight} />;
      case "recent-notes":
        return <RecentNotesBentoWidget notes={notes} />;
      case "upcoming-deadlines":
        return <UpcomingDeadlinesBentoWidget tasks={tasks} />;
      case "clock":
        return <ClockBentoWidget />;
      case "calendar":
        return <CalendarBentoWidget tasks={tasks} />;
      case "streak-badge":
        return <StreakBentoWidget sessions={sessions} />;
      default:
        return null;
    }
  };

  const activeWidget = widgets.find((w) => w.id === activeId);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
        {DEFAULT_BENTO_LAYOUT.map((widget) => (
          <div
            key={widget.id}
            className={`${SIZE_CLASS_MAP[widget.size]} bg-white rounded-3xl border border-border shadow-card min-h-[160px]`}
          >
            {renderWidgetContent(widget.id)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={addWidgetModalOpen}
        onClose={() => setAddWidgetModalOpen(false)}
        activeWidgetIds={widgets.map((w) => w.id)}
        onAddWidget={handleAddWidget}
      />

      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-4 px-5 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              Workspace Overview
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                Bento Grid
              </span>
            </h2>
            <p className="text-[11px] text-gray-500">
              {isEditMode
                ? "Drag cards, adjust sizes, or add & remove widgets to customize your layout."
                : "Personalized dashboard widgets for notes, focus, and tasks."}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddWidgetModalOpen(true)}
                icon={<Plus className="w-3.5 h-3.5 text-primary" />}
                className="text-xs font-semibold border-primary/40 text-primary hover:bg-primary-50"
              >
                + Add Widget
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetLayout}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditMode(false)}
                icon={<Check className="w-4 h-4" />}
                className="text-xs font-bold px-5 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                Done
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
              icon={<SlidersHorizontal className="w-3.5 h-3.5 text-primary" />}
              className="text-xs font-semibold hover:border-primary shadow-xs"
            >
              Customize Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Edit Mode Instruction Banner */}
      {isEditMode && (
        <div className="p-3.5 px-5 bg-primary/10 border-2 border-dashed border-primary/40 rounded-2xl flex items-center justify-between gap-3 text-xs text-primary font-semibold animate-scale-in">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              <strong>Edit Mode Active:</strong> Drag cards to reorder, drag bottom-right corner to resize, or click trash to remove widgets.
            </span>
          </div>
          <button
            onClick={() => setIsEditMode(false)}
            className="underline font-bold hover:text-primary-700 cursor-pointer"
          >
            Finish
          </button>
        </div>
      )}

      {/* Main Drag-and-Drop Bento Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
            {widgets.map((widget, index) => (
              <BentoItemWrapper
                key={widget.id}
                widget={widget}
                isEditMode={isEditMode}
                index={index}
                onResize={handleResize}
                onRemove={handleRemove}
              >
                {renderWidgetContent(widget.id)}
              </BentoItemWrapper>
            ))}

            {/* In Edit Mode: Dotted "+ Add More Widget" slot */}
            {isEditMode && (
              <button
                type="button"
                onClick={() => setAddWidgetModalOpen(true)}
                className="col-span-1 min-h-[160px] rounded-3xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary-50/20 hover:bg-primary-50/50 flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-2xl bg-primary/10 group-hover:bg-primary text-primary group-hover:text-white flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span>Add Widget</span>
              </button>
            )}
          </div>
        </SortableContext>

        {/* Drag Overlay with Ghosting / Floating Shadow Preview */}
        <DragOverlay>
          {activeWidget ? (
            <div
              className={`${
                SIZE_CLASS_MAP[activeWidget.size]
              } rounded-3xl bg-white border-2 border-primary shadow-2xl scale-105 opacity-90 overflow-hidden ring-8 ring-primary/10`}
            >
              {renderWidgetContent(activeWidget.id)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
