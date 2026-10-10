"use client";

import { useEffect, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from "@dnd-kit/sortable";
import { SlidersHorizontal, Check, RotateCcw, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BentoItemWrapper } from "./BentoItemWrapper";
import { usePackedWidgetGrid } from "./usePackedWidgetGrid";
import { AddWidgetModal } from "./AddWidgetModal";
import { DEFAULT_BENTO_LAYOUT, WIDGET_LIBRARY, type BentoWidgetConfig, type WidgetSize } from "./types";
import { DailyFocus, OpenNotes, OpenTasks, StudyRhythm, QuietInsight, QuietStat } from "./DashboardWidgets";
import { PomodoroBentoWidget } from "./widgets/PomodoroBentoWidget";
import { ClockBentoWidget } from "./widgets/ClockBentoWidget";
import { CalendarBentoWidget } from "./widgets/CalendarBentoWidget";
import { StreakBentoWidget } from "./widgets/StreakBentoWidget";
import type { NoteDocument, AcademicInsight, TaskDocument, PomodoroSession } from "@/lib/firestore";
import s from "./workspace.module.css";

const LEGACY_KEY = "mindflow_bento_dashboard_layout_v3";
const LEGACY_OWNER = "cogniva_dashboard_legacy_owner";
const OLD_DEFAULT = ["notes-stat", "clock", "productivity-chart", "pomodoro-timer", "calendar", "priority-tasks", "academic-insight"];
const OLD_SIZES = ["1x1", "1x1", "2x1", "2x2", "2x2", "2x2", "2x1"];

function restoreLayout(raw: string): BentoWidgetConfig[] | null {
  const parsed: unknown = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && "widgets" in parsed ? parsed.widgets : null;
  if (!Array.isArray(list)) return null;
  const seen = new Set<string>();
  return list.flatMap(item => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || seen.has(item.id)) return [];
    const definition = WIDGET_LIBRARY.find(w => w.id === item.id);
    if (!definition) return [];
    seen.add(item.id);
    return [{ id: definition.id, title: definition.title, size: definition.allowedSizes.includes(item.size) ? item.size : item.size === "1x1" && definition.allowedSizes.includes("2x1") ? "2x1" : definition.defaultSize }];
  });
}

interface BentoGridProps { notes: NoteDocument[]; summariesCount: number; insight: AcademicInsight | null; tasks: TaskDocument[]; sessions: PomodoroSession[]; unavailable?: string[]; onRetry?: () => void }

export function BentoGrid({ notes, summariesCount, insight, tasks, sessions, unavailable = [], onRetry }: BentoGridProps) {
  const { user } = useAuth();
  const storageKey = user ? `cogniva_dashboard_layout_v4:${user.uid}` : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<BentoWidgetConfig[]>(DEFAULT_BENTO_LAYOUT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addWidgetModalOpen, setAddWidgetModalOpen] = useState(false);
  const [resetPrompt, setResetPrompt] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!storageKey || !user) return;
    let layout = DEFAULT_BENTO_LAYOUT;
    let failed = false;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        layout = restoreLayout(saved) ?? DEFAULT_BENTO_LAYOUT;
      } else {
        // Claim the old device-wide preference once; later accounts use their own layout.
        const owner = localStorage.getItem(LEGACY_OWNER);
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy !== null && (!owner || owner === user.uid)) {
          const previous = restoreLayout(legacy);
          const untouched = previous?.length === OLD_DEFAULT.length && previous.every((widget, index) => widget.id === OLD_DEFAULT[index] && widget.size === OLD_SIZES[index]);
          if (previous && !untouched) layout = previous;
          localStorage.setItem(LEGACY_OWNER, user.uid);
        }
        localStorage.setItem(storageKey, JSON.stringify({ version: 1, widgets: layout }));
      }
    } catch { failed = true; }
    setWidgets(layout);
    setLoadedKey(storageKey);
    setSaveError(failed);
    setIsEditMode(false);
    setActiveId(null);
    setAddWidgetModalOpen(false);
    setResetPrompt(false);
  }, [storageKey, user]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ready = storageKey !== null && loadedKey === storageKey;
  const visibleWidgets = ready ? widgets : DEFAULT_BENTO_LAYOUT;
  const gridRef = usePackedWidgetGrid(`${isEditMode}:${visibleWidgets.map(widget => `${widget.id}:${widget.size}`).join(",")}`);
  const saveLayout = (next: BentoWidgetConfig[], message = "Susunan diperbarui.") => {
    if (!ready || !storageKey) return;
    setWidgets(next);
    setAnnouncement(message);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, widgets: next }));
      setSaveError(false);
    } catch { setSaveError(true); }
  };

  function moveWidget(id: string, direction: -1 | 1) {
    const from = widgets.findIndex(widget => widget.id === id);
    const to = from + direction;
    if (!isEditMode || from < 0 || to < 0 || to >= widgets.length) return;
    saveLayout(arrayMove(widgets, from, to), `${widgets[from].title} dipindahkan ke posisi ${to + 1}.`);
  }
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (isEditMode && over && active.id !== over.id) {
      const from = widgets.findIndex(widget => widget.id === active.id);
      const to = widgets.findIndex(widget => widget.id === over.id);
      if (from >= 0 && to >= 0) saveLayout(arrayMove(widgets, from, to), `${widgets[from].title} dipindahkan ke posisi ${to + 1}.`);
    }
    setActiveId(null);
  }
  function resizeWidget(id: string, size: WidgetSize) {
    const definition = WIDGET_LIBRARY.find(widget => widget.id === id);
    if (!isEditMode || !definition?.allowedSizes.includes(size)) return;
    saveLayout(widgets.map(widget => widget.id === id ? { ...widget, size } : widget), `Ukuran ${definition.title} diperbarui.`);
  }
  function renderWidget(id: string, size: WidgetSize) {
    const source: Record<string, string[]> = {
      "daily-focus": ["tasks"], "notes-stat": ["notes"], "ai-summaries-stat": ["summaries"],
      "productivity-chart": ["sessions"], "priority-tasks": ["tasks"], "academic-insight": ["insight"],
      "recent-notes": ["notes"], "upcoming-deadlines": ["tasks"], "calendar": ["tasks"], "streak-badge": ["sessions"],
    };
    if (source[id]?.some(key => unavailable.includes(key))) return <div className={s.unavailable}><h2>{WIDGET_LIBRARY.find(widget => widget.id === id)?.title}</h2><p>Bagian ini belum bisa dimuat.</p>{onRetry && <button className={s.secondaryButton} onClick={onRetry}>Coba lagi</button>}</div>;
    switch (id) {
      case "daily-focus": return <DailyFocus tasks={tasks} />;
      case "notes-stat": return <QuietStat value={notes.filter(n => !n.isTrashed && !n.isArchived).length} title="Catatan tersimpan" description="Buka catatanmu" href="/notes" />;
      case "ai-summaries-stat": return <QuietStat value={summariesCount} title="Rangkuman tersimpan" description="Buka asisten" href="/assistant" />;
      case "productivity-chart": return <StudyRhythm sessions={sessions} />;
      case "pomodoro-timer": return <PomodoroBentoWidget />;
      case "priority-tasks": return <OpenTasks tasks={tasks} />;
      case "academic-insight": return <QuietInsight insight={insight} />;
      case "recent-notes": return <OpenNotes notes={notes} />;
      case "upcoming-deadlines": return <OpenTasks tasks={tasks} upcoming />;
      case "clock": return <ClockBentoWidget />;
      case "calendar": return <CalendarBentoWidget tasks={tasks} size={size} />;
      case "streak-badge": return <StreakBentoWidget sessions={sessions} />;
      default: return null;
    }
  }
  const activeWidget = visibleWidgets.find(widget => widget.id === activeId);

  return <section className={s.workspace} aria-label="Dashboard yang bisa diatur">
    <div className={s.toolbar}>
      <div><h2>{isEditMode ? "Atur dashboard" : "Ruang belajar"}</h2><p>{isEditMode ? "Geser widget, tarik sudut untuk mengubah ukuran, atau pilih lewat menu." : "Catatan, tugas, dan aktivitas belajarmu."}</p></div>
      <div className={s.toolbarActions}>
        {isEditMode ? <><button className={s.secondaryButton} onClick={() => setAddWidgetModalOpen(true)}><Plus size={16} />Tambah widget</button><button className={s.resetButton} onClick={() => setResetPrompt(!resetPrompt)} aria-label="Kembalikan susunan awal"><RotateCcw size={17} /></button><button className={s.primaryButton} onClick={() => { setIsEditMode(false); setResetPrompt(false); setAddWidgetModalOpen(false); }}><Check size={17} />Selesai</button></> : <button className={s.secondaryButton} disabled={!ready} onClick={() => setIsEditMode(true)}><SlidersHorizontal size={16} />Atur dashboard</button>}
      </div>
    </div>
    {isEditMode && <div className={s.editStatus}><span>{saveError ? "Susunan belum tersimpan." : "Perubahan tersimpan otomatis di perangkat ini."}</span><span>Keyboard: Space untuk angkat, panah untuk pindah, Escape untuk batal drag.</span></div>}
    {resetPrompt && isEditMode && <div className={s.resetPrompt}><p>Kembalikan susunan awal? Catatan dan tugas tetap tersimpan.</p><div><button className={s.secondaryButton} onClick={() => setResetPrompt(false)}>Batal</button><button className={s.primaryButton} onClick={() => { saveLayout(DEFAULT_BENTO_LAYOUT, "Susunan awal dipulihkan."); setResetPrompt(false); }}>Kembalikan</button></div></div>}
    {saveError && <div className={s.saveError} role="alert">Perubahan tampil di sini, tetapi belum bisa disimpan. <button onClick={() => saveLayout(widgets)}>Coba simpan lagi</button></div>}
    <span className={s.srOnly} role="status" aria-live="polite">{announcement}</span>
    <AddWidgetModal isOpen={addWidgetModalOpen && isEditMode} onClose={() => setAddWidgetModalOpen(false)} activeWidgetIds={widgets.map(widget => widget.id)} onAddWidget={widget => {
      const definition = WIDGET_LIBRARY.find(item => item.id === widget.id);
      if (!definition || !isEditMode || widgets.some(item => item.id === widget.id)) return;
      saveLayout([...widgets, { id: definition.id, title: definition.title, size: definition.allowedSizes.includes(widget.size) ? widget.size : definition.defaultSize }], `${definition.title} ditambahkan.`);
    }} />
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={event => { if (isEditMode) setActiveId(String(event.active.id)); }} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <SortableContext items={visibleWidgets.map(widget => widget.id)} strategy={rectSortingStrategy}>
        <div ref={gridRef} className={s.grid} data-editing={isEditMode}>
          {visibleWidgets.map((widget, index) => <BentoItemWrapper key={widget.id} widget={widget} isEditMode={isEditMode} index={index} count={visibleWidgets.length} onMove={moveWidget} onResize={resizeWidget} onRemove={id => saveLayout(widgets.filter(item => item.id !== id), `${widget.title} disembunyikan.`)}>{renderWidget(widget.id, widget.size)}</BentoItemWrapper>)}
          {isEditMode && <button className={s.addSlot} onClick={() => setAddWidgetModalOpen(true)}><Plus size={22} />Tambah widget</button>}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(.22,1,.36,1)" }}>{activeWidget && <div className={s.dragGhost}>{activeWidget.title}<span>Lepaskan untuk menempatkan</span></div>}</DragOverlay>
    </DndContext>
    {ready && !widgets.length && !isEditMode && <div className={s.emptyWorkspace}><h3>Ruang kosong untuk caramu sendiri.</h3><p>Tambahkan catatan, fokus, atau widget lain yang kamu butuhkan.</p><button className={s.primaryButton} onClick={() => { setIsEditMode(true); setAddWidgetModalOpen(true); }}><Plus size={17} />Tambah widget</button></div>}
  </section>;
}
