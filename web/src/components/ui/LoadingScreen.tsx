"use client";

import React from "react";
import { Brain } from "lucide-react";

export interface LoadingScreenProps {
  label?: string;
  message?: string;
  subtext?: string;
  fullHeight?: boolean;
  className?: string;
}

export function LoadingScreen({
  label,
  message,
  subtext = "Mohon tunggu sebentar...",
  fullHeight = false,
  className = "",
}: LoadingScreenProps) {
  const displayLabel = label || message || "Memuat data...";

  return (
    <div
      className={`w-full flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in ${
        fullHeight ? "min-h-screen" : "min-h-[calc(100vh-140px)]"
      } ${className}`}
      suppressHydrationWarning
    >
      <div className="relative mb-4 flex items-center justify-center">
        {/* Outer glowing ambient layer */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center shadow-lg shadow-primary/10">
          <Brain className="w-8 h-8 text-primary animate-pulse" />
        </div>

        {/* Spinning smooth gradient border ring */}
        <div className="absolute -inset-1.5 rounded-2xl border-2 border-primary/40 border-t-primary animate-spin pointer-events-none" />
      </div>

      {/* Label and Subtext */}
      <h3 className="font-bold text-gray-800 text-base tracking-tight" suppressHydrationWarning>
        {displayLabel}
      </h3>
      {subtext && (
        <p className="text-xs text-gray-400 mt-1.5 font-medium max-w-xs leading-relaxed" suppressHydrationWarning>
          {subtext}
        </p>
      )}
    </div>
  );
}
