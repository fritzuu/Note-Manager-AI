"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Lightbulb, type LucideIcon } from "lucide-react";

interface InsightCardProps {
  type: "strength" | "weakness" | "recommendation";
  items: string[];
}

const CONFIG: Record<string, { icon: LucideIcon; title: string; bgClass: string; iconClass: string; dotClass: string }> = {
  strength: {
    icon: CheckCircle2,
    title: "Strength Areas",
    bgClass: "bg-emerald-50 border-emerald-200",
    iconClass: "text-emerald-600 bg-emerald-100",
    dotClass: "bg-emerald-500",
  },
  weakness: {
    icon: AlertTriangle,
    title: "Areas for Improvement",
    bgClass: "bg-amber-50 border-amber-200",
    iconClass: "text-amber-600 bg-amber-100",
    dotClass: "bg-amber-500",
  },
  recommendation: {
    icon: Lightbulb,
    title: "Recommendations",
    bgClass: "bg-blue-50 border-blue-200",
    iconClass: "text-blue-600 bg-blue-100",
    dotClass: "bg-blue-500",
  },
};

export function InsightCard({ type, items }: InsightCardProps) {
  const config = CONFIG[type];
  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border p-5 ${config.bgClass} animate-slide-up`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.iconClass}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <h3 className="font-semibold text-[#1F2937] text-sm">{config.title}</h3>
      </div>

      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${config.dotClass}`} />
            <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
