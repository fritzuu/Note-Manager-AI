"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, EyeOff, ArrowUp, ArrowDown, MoveDiagonal2, SlidersHorizontal } from "lucide-react";
import { WIDGET_LIBRARY, type BentoWidgetConfig, type WidgetSize } from "./types";
import s from "./workspace.module.css";
import { WidgetSizePicker } from "./WidgetSizePicker";

interface BentoItemWrapperProps {
  widget: BentoWidgetConfig;
  isEditMode: boolean;
  index: number;
  count: number;
  onMove: (id: string, direction: -1 | 1) => void;
  onResize: (id: string, size: WidgetSize) => void;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}
export function BentoItemWrapper({ widget, isEditMode, index, count, onMove, onResize, onRemove, children }: BentoItemWrapperProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id, disabled: !isEditMode });
  const allowedSizes: WidgetSize[] = WIDGET_LIBRARY.find(w => w.id === widget.id)?.allowedSizes || ["1x1", "2x1", "2x2"];
  const [resizePreview, setResizePreview] = useState<WidgetSize | null>(null);
  const resizeRef = useRef<{ x: number; y: number; columns: number; rows: number; columnStep: number; target: WidgetSize } | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!isEditMode) setToolsOpen(false);
  }, [isEditMode]);
  useEffect(() => {
    if (!toolsOpen) return;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !toolsRef.current?.contains(target) && !target.closest('[role="listbox"]')) setToolsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setToolsOpen(false);
      settingsRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [toolsOpen]);
  const currentSize = resizePreview || widget.size;
  const nearestSize = (columns: number, rows: number, previous: WidgetSize) => {
    const distance = (size: WidgetSize) => {
      const [width, height] = size.split("x").map(Number);
      return (width - columns) ** 2 + (height - rows) ** 2;
    };
    return allowedSizes.reduce((best, size) => distance(size) < distance(best) ? size : best, previous);
  };
  const beginResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const article = event.currentTarget.closest("article");
    const grid = article?.parentElement;
    if (!grid) return;
    const gridStyle = window.getComputedStyle(grid);
    const tracks = gridStyle.gridTemplateColumns.split(/\s+/).filter(Boolean);
    const gap = parseFloat(gridStyle.columnGap) || 0;
    const columnStep = (grid.getBoundingClientRect().width + gap) / Math.max(1, tracks.length);
    const [columns, rows] = widget.size.split("x").map(Number);
    resizeRef.current = { x: event.clientX, y: event.clientY, columns, rows, columnStep, target: widget.size };
    setResizePreview(widget.size);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = resizeRef.current;
    if (!start) return;
    event.stopPropagation();
    const columns = Math.max(1, Math.min(4, start.columns + (event.clientX - start.x) / start.columnStep));
    const rows = Math.max(1, Math.min(2, start.rows + (event.clientY - start.y) / 235));
    start.target = nearestSize(columns, rows, start.target);
    setResizePreview(start.target);
  };
  const endResize = (event: React.PointerEvent<HTMLButtonElement>, commit: boolean) => {
    const start = resizeRef.current;
    if (!start) return;
    event.stopPropagation();
    resizeRef.current = null;
    setResizePreview(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (commit && start.target !== widget.size) onResize(widget.id, start.target);
  };
  const keyboardResize = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault(); event.stopPropagation();
    const [columns, rows] = widget.size.split("x").map(Number);
    const candidates = allowedSizes.filter(size => {
      const [width, height] = size.split("x").map(Number);
      return direction[0] ? (width - columns) * direction[0] > 0 : (height - rows) * direction[1] > 0;
    });
    if (!candidates.length) return;
    const size = candidates.reduce((best, candidate) => {
      const distance = (value: WidgetSize) => { const [w, h] = value.split("x").map(Number); return (w - columns) ** 2 + (h - rows) ** 2; };
      return distance(candidate) < distance(best) ? candidate : best;
    }, candidates[0]);
    if (size !== widget.size) onResize(widget.id, size);
  };
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition: resizePreview ? "none" : transition || undefined };
  return <article ref={setNodeRef} style={style} className={s.widget} data-size={currentSize} data-resizing={resizePreview !== null} data-kind={widget.id} data-editing={isEditMode} data-tools-open={toolsOpen} data-dragging={isDragging} aria-label={widget.title}>
    {isEditMode && <div ref={toolsRef} className={s.widgetTools}>
      <button ref={setActivatorNodeRef} {...attributes} {...listeners} type="button" className={s.dragHandle} aria-label={`Pindahkan ${widget.title}`}><GripVertical size={17} /></button>
      <button ref={settingsRef} type="button" className={s.widgetSettings} aria-label={`Atur ${widget.title}`} aria-expanded={toolsOpen} aria-controls={toolsOpen ? panelId : undefined} onClick={() => setToolsOpen(open => !open)}><SlidersHorizontal size={16} /></button>
      {toolsOpen && <div id={panelId} className={s.widgetSettingsPanel}><h3>{widget.title}</h3>
      <div className={s.sizeControl}><span>Ukuran</span><WidgetSizePicker label={`Ukuran ${widget.title}`} value={currentSize} sizes={allowedSizes} onChange={size => onResize(widget.id, size)} /></div>
      <div className={s.widgetToolActions}>
        <button type="button" disabled={index === 0} onClick={() => onMove(widget.id, -1)} aria-label={`Pindahkan ${widget.title} ke atas`} title="Pindah ke atas"><ArrowUp size={16} /></button>
        <button type="button" disabled={index === count - 1} onClick={() => onMove(widget.id, 1)} aria-label={`Pindahkan ${widget.title} ke bawah`} title="Pindah ke bawah"><ArrowDown size={16} /></button>
        <button type="button" onClick={() => onRemove(widget.id)} aria-label={`Sembunyikan ${widget.title}`} title="Sembunyikan widget"><EyeOff size={16} /></button>
      </div>
      </div>}
    </div>}
    <div className={s.widgetBody}>{children}</div>
    {isEditMode && <button type="button" className={s.resizeHandle} aria-label={`Ubah ukuran ${widget.title}: tarik sudut atau gunakan tombol panah`} title="Tarik untuk mengubah ukuran" onPointerDown={beginResize} onPointerMove={moveResize} onPointerUp={event => endResize(event, true)} onPointerCancel={event => endResize(event, false)} onLostPointerCapture={event => endResize(event, false)} onKeyDown={keyboardResize}><MoveDiagonal2 size={17} /></button>}
  </article>;
}
