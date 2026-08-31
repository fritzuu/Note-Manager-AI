"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Check,
  LayoutGrid,
  Search,
  Sparkles,
  FileText,
  TrendingUp,
  Timer,
  CheckSquare,
  Brain,
  Calendar,
  Clock,
  Flame,
  Layers,
} from "lucide-react";
import {
  WIDGET_LIBRARY,
  WidgetDefinition,
  WidgetSize,
  BentoWidgetConfig,
} from "./types";
import { Button } from "@/components/ui/Button";

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWidgetIds: string[];
  onAddWidget: (widget: BentoWidgetConfig) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Sparkles,
  TrendingUp,
  Timer,
  CheckSquare,
  Brain,
  Calendar,
  Clock,
  Flame,
};

export function AddWidgetModal({
  isOpen,
  onClose,
  activeWidgetIds,
  onAddWidget,
}: AddWidgetModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, WidgetSize>>({});

  if (!isOpen) return null;

  const categories = ["All", "General", "Focus & Study", "AI Tools", "Planning"];

  const filteredWidgets = WIDGET_LIBRARY.filter((w) => {
    const matchesCategory =
      selectedCategory === "All" || w.category === selectedCategory;
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSizeChange = (widgetId: string, size: WidgetSize) => {
    setSelectedSizes((prev) => ({ ...prev, [widgetId]: size }));
  };

  const handleAdd = (definition: WidgetDefinition) => {
    const chosenSize = selectedSizes[definition.id] || definition.defaultSize;
    onAddWidget({
      id: definition.id,
      title: definition.title,
      size: chosenSize,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-b border-border flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Widget Library
                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                  Bento Grid
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose and customize modular widgets to add to your personal dashboard.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 border-b border-border bg-gray-50/60 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search available widgets..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-white text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-white shadow-xs"
                    : "bg-white text-gray-600 border border-border hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Widget Grid List */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {filteredWidgets.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Layers className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs font-semibold text-gray-500">No matching widgets found</p>
            </div>
          ) : (
            filteredWidgets.map((item) => {
              const Icon = ICON_MAP[item.icon] || LayoutGrid;
              const isAlreadyAdded = activeWidgetIds.includes(item.id);
              const currentChosenSize = selectedSizes[item.id] || item.defaultSize;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isAlreadyAdded
                      ? "bg-gray-50/60 border-border/80 opacity-75"
                      : "bg-white border-border hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                        <span className="text-[9px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.2 rounded-full">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Right actions (Size selector & Add button) */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {/* Size Selector Pill */}
                    <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-border/50">
                      {item.allowedSizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => handleSizeChange(item.id, size)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                            currentChosenSize === size
                              ? "bg-white text-primary shadow-xs border border-border/60"
                              : "text-gray-400 hover:text-gray-700"
                          }`}
                          title={`Select ratio ${size}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>

                    {isAlreadyAdded ? (
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAdd(item)}
                        icon={<Plus className="w-3.5 h-3.5" />}
                        className="text-xs h-9 px-4 font-bold"
                      >
                        Add Widget
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-gray-50 border-t border-border flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Active in Dashboard: <strong className="text-gray-700">{activeWidgetIds.length}</strong> / {WIDGET_LIBRARY.length}
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
