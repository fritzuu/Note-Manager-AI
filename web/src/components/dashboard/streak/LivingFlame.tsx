"use client";

import React, { useId } from "react";

export type FlameTier = "spark" | "scholar" | "diamond" | "inferno";

interface LivingFlameProps {
  tier?: FlameTier;
  streakDays?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showGlow?: boolean;
}

const SIZE_CONFIG = {
  sm: "w-6 h-7",
  md: "w-10 h-12",
  lg: "w-16 h-20",
  xl: "w-28 h-34",
};

export function LivingFlame({
  tier: propTier,
  streakDays,
  size = "md",
  className = "",
  showGlow = true,
}: LivingFlameProps) {
  const uniqueId = useId().replace(/:/g, "_");

  // Infer tier from streakDays if provided
  const getTier = (): FlameTier => {
    if (propTier) return propTier;
    if (streakDays !== undefined) {
      if (streakDays >= 30) return "inferno";
      if (streakDays >= 14) return "diamond";
      if (streakDays >= 7) return "scholar";
      if (streakDays >= 1) return "spark";
    }
    return "scholar"; // Default to classic flame
  };

  const activeTier = getTier();
  const sizeClasses = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  // Tier Color Themes based on Reference Aesthetic
  const TIER_THEMES = {
    // Classic Solar Flame (Exact match with user image)
    scholar: {
      gradStops: [
        { offset: "0%", color: "#FFF176" },    // Bright lemon yellow top
        { offset: "28%", color: "#FFCA28" },   // Warm amber
        { offset: "55%", color: "#FF7043" },   // Coral orange
        { offset: "82%", color: "#F4511E" },   // Deep flame red-orange
        { offset: "100%", color: "#D84315" },  // Rich base
      ],
      glowColor: "rgba(255, 112, 67, 0.45)",
      coreColor: "#FFFFFF",
      gradAngle: { x1: "42%", y1: "0%", x2: "58%", y2: "100%" },
    },
    // Legendary Inferno (Golden Sunburst)
    inferno: {
      gradStops: [
        { offset: "0%", color: "#FEF08A" },
        { offset: "30%", color: "#FBBF24" },
        { offset: "60%", color: "#F59E0B" },
        { offset: "85%", color: "#D97706" },
        { offset: "100%", color: "#B45309" },
      ],
      glowColor: "rgba(245, 158, 11, 0.5)",
      coreColor: "#FFFFFF",
      gradAngle: { x1: "40%", y1: "0%", x2: "60%", y2: "100%" },
    },
    // Diamond Focus (Plasma Amethyst)
    diamond: {
      gradStops: [
        { offset: "0%", color: "#FDF4FF" },
        { offset: "25%", color: "#F0ABFC" },
        { offset: "55%", color: "#C084FC" },
        { offset: "80%", color: "#9333EA" },
        { offset: "100%", color: "#6B21A8" },
      ],
      glowColor: "rgba(168, 85, 247, 0.5)",
      coreColor: "#FFFFFF",
      gradAngle: { x1: "40%", y1: "0%", x2: "60%", y2: "100%" },
    },
    // Spark Habit (Mint Emerald)
    spark: {
      gradStops: [
        { offset: "0%", color: "#E6FFFA" },
        { offset: "25%", color: "#6EE7B7" },
        { offset: "55%", color: "#10B981" },
        { offset: "80%", color: "#059669" },
        { offset: "100%", color: "#047857" },
      ],
      glowColor: "rgba(16, 185, 129, 0.45)",
      coreColor: "#FFFFFF",
      gradAngle: { x1: "40%", y1: "0%", x2: "60%", y2: "100%" },
    },
  };

  const theme = TIER_THEMES[activeTier] || TIER_THEMES.scholar;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${sizeClasses} ${className}`}
      style={{
        filter: showGlow ? `drop-shadow(0 4px 18px ${theme.glowColor})` : undefined,
      }}
    >
      {/* Background Ambient Glow */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full blur-lg pointer-events-none transition-all duration-700 opacity-60 animate-pulse"
          style={{
            backgroundColor: theme.glowColor,
            transform: "scale(1.25)",
          }}
        />
      )}

      {/* SVG Exact Duolingo-Style Iconic Living Flame */}
      <svg
        viewBox="0 0 100 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible pointer-events-none drop-shadow-sm"
      >
        <defs>
          {/* Main Flame Gradient */}
          <linearGradient
            id={`${uniqueId}-flame-grad`}
            x1={theme.gradAngle.x1}
            y1={theme.gradAngle.y1}
            x2={theme.gradAngle.x2}
            y2={theme.gradAngle.y2}
          >
            {theme.gradStops.map((stop, idx) => (
              <stop key={idx} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>

          {/* Smooth Inner Shadow/Highlight Gradient */}
          <radialGradient
            id={`${uniqueId}-highlight-grad`}
            cx="48%"
            cy="35%"
            r="45%"
            fx="45%"
            fy="25%"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Flame Body Group with Gentle Lifelike Organic Swaying */}
        <g className="flame-duo-anim">
          {/* 1. Main Outer Flame Silhouette */}
          <path
            d="M 46 14
               C 44 26, 26 42, 21 60
               C 14 78, 22 98, 42 107
               C 56 113, 72 110, 82 99
               C 92 88, 93 72, 88 56
               C 85 46, 80 40, 81 37
               C 81 37, 72 44, 64 47
               C 56 50, 50 43, 48 31
               C 46 22, 46 14, 46 14 Z"
            fill={`url(#${uniqueId}-flame-grad)`}
          />

          {/* 2. Ambient Top-Left Soft Highlight Layer */}
          <path
            d="M 46 14
               C 44 26, 26 42, 21 60
               C 14 78, 22 98, 42 107
               C 56 113, 72 110, 82 99
               C 92 88, 93 72, 88 56
               C 85 46, 80 40, 81 37
               C 81 37, 72 44, 64 47
               C 56 50, 50 43, 48 31
               C 46 22, 46 14, 46 14 Z"
            fill={`url(#${uniqueId}-highlight-grad)`}
          />

          {/* 3. Iconic White Hot Core (Matches exact reference geometry) */}
          <g className="flame-duo-core">
            <path
              d="M 49 68
                 C 47 74, 38 82, 36 90
                 C 34 98, 38 106, 48 108
                 C 54 109, 60 108, 64 103
                 C 68 98, 68 91, 65 83
                 C 64 78, 62 75, 63 73
                 C 63 73, 59 76, 56 77
                 C 52 78, 50 75, 49 68 Z"
              fill={theme.coreColor}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

