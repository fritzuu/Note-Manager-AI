"use client";

import React, { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Maximize2, MoveDiagonal2 } from "lucide-react";
import {
  BentoWidgetConfig,
  SIZE_CLASS_MAP,
  WIDGET_LIBRARY,
  WidgetSize,
} from "./types";
import { cn } from "@/lib/utils";

interface BentoItemWrapperProps {
  widget: BentoWidgetConfig;
  isEditMode: boolean;
  index: number;
  onResize: (id: string, newSize: WidgetSize) => void;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

export function BentoItemWrapper({
  widget,
  isEditMode,
  index,
  onResize,
  onRemove,
  children,
}: BentoItemWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    disabled: !isEditMode,
  });

  const [isResizing, setIsResizing] = useState(false);
  const [liveResizeTarget, setLiveResizeTarget] = useState<WidgetSize | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; startSize: WidgetSize } | null>(null);

  const widgetDef = WIDGET_LIBRARY.find((w) => w.id === widget.id);
  const allowedSizes = widgetDef?.allowedSizes || ["1x1", "2x1", "2x2"];

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? "none" : transition || undefined,
    animationDelay: isEditMode && !isResizing ? `${(index % 4) * 0.07}s` : undefined,
  };

  const currentSize = liveResizeTarget || widget.size;
  const sizeClass = SIZE_CLASS_MAP[currentSize] || "col-span-1 row-span-1";

  // Seamless Drag-to-Resize Pointer Handler
  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setIsResizing(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startSize: widget.size,
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizing || !dragStartRef.current) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Thresholds for snapping to different column/row ratios
    let targetSize: WidgetSize = dragStartRef.current.startSize;

    // Calculate desired width & height steps
    const isWider = deltaX > 60;
    const isNarrower = deltaX < -60;
    const isTaller = deltaY > 60;
    const isShorter = deltaY < -60;

    if (isWider && isTaller && allowedSizes.includes("2x2")) {
      targetSize = "2x2";
    } else if (isWider && allowedSizes.includes("2x1")) {
      targetSize = "2x1";
    } else if (isTaller && allowedSizes.includes("2x2")) {
      targetSize = "2x2";
    } else if (isNarrower && isShorter && allowedSizes.includes("1x1")) {
      targetSize = "1x1";
    } else if (isNarrower && allowedSizes.includes("1x1")) {
      targetSize = "1x1";
    } else if (isShorter && allowedSizes.includes("2x1")) {
      targetSize = "2x1";
    }

    if (deltaX > 160 && allowedSizes.includes("4x1")) {
      targetSize = "4x1";
    }
    if (deltaX > 160 && deltaY > 100 && allowedSizes.includes("4x2")) {
      targetSize = "4x2";
    }

    if (allowedSizes.includes(targetSize)) {
      setLiveResizeTarget(targetSize);
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (!isResizing) return;
    e.stopPropagation();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (liveResizeTarget && liveResizeTarget !== widget.size) {
      onResize(widget.id, liveResizeTarget);
    }
    setIsResizing(false);
    setLiveResizeTarget(null);
    dragStartRef.current = null;
  };

  const handleCycleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = allowedSizes.indexOf(widget.size);
    const nextIndex = (currentIndex + 1) % allowedSizes.length;
    onResize(widget.id, allowedSizes[nextIndex]);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClass,
        "flex flex-col min-h-[160px] transition-all duration-200 relative group/wrapper",
        isEditMode && !isResizing
          ? "cursor-grab active:cursor-grabbing animate-wobble"
          : "cursor-default",
        isResizing && "ring-4 ring-primary/40 shadow-2xl z-40 scale-[1.01]"
      )}
    >
      <div
        className={cn(
          "w-full h-full rounded-3xl transition-all duration-200 relative flex flex-col justify-between overflow-hidden",
          isEditMode
            ? "border-2 border-dashed border-primary/60 bg-white/95 shadow-md hover:border-primary hover:shadow-lg"
            : "border border-border/80 bg-white shadow-card hover:shadow-card-hover",
          isDragging && "opacity-40 scale-[0.98] ring-4 ring-primary/20 shadow-2xl"
        )}
      >
        {/* Edit Mode Top Toolbar */}
        {isEditMode && (
          <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between pointer-events-auto">
            {/* Top Left: Quick Size Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={handleCycleSize}
                onMouseDown={(e) => e.stopPropagation()}
                title={`Click to cycle or drag bottom-right corner to resize. Allowed: ${allowedSizes.join(", ")}`}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 hover:text-primary text-[10px] font-bold font-mono rounded-full shadow-md border border-border transition-all cursor-pointer"
              >
                <Maximize2 className="w-2.5 h-2.5 text-primary" />
                <span>{currentSize}</span>
              </button>
            </div>

            {/* Top Center: Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary/90 hover:bg-primary text-white text-[10px] font-bold rounded-full shadow-md backdrop-blur-sm cursor-grab active:cursor-grabbing select-none"
            >
              <GripVertical className="w-3.5 h-3.5 opacity-80" />
              <span className="truncate max-w-[90px]">{widget.title}</span>
            </div>

            {/* Top Right: Delete / Remove Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(widget.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Remove widget from dashboard"
              className="p-1 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full shadow-md border border-border transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Seamless Drag-to-Resize Corner Handle at Bottom-Right */}
        {isEditMode && (
          <div
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            title="Press and drag this corner to seamlessly resize widget"
            className="absolute bottom-1 right-1 z-40 w-7 h-7 flex items-end justify-end p-1.5 cursor-nwse-resize select-none group/resize"
          >
            <div className="w-4 h-4 rounded-br-xl rounded-tl-md bg-primary/80 group-hover/resize:bg-primary group-hover/resize:scale-125 text-white flex items-center justify-center shadow-md transition-transform">
              <MoveDiagonal2 className="w-2.5 h-2.5 rotate-90" />
            </div>
          </div>
        )}

        {/* Widget Child Component */}
        <div
          {...(isEditMode && !isResizing ? { ...attributes, ...listeners } : {})}
          className={cn(
            "w-full h-full flex flex-col flex-1",
            isEditMode && "select-none opacity-90 pt-6 cursor-grab active:cursor-grabbing"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
