"use client";

import React from "react";

export type FlameTier = "spark" | "scholar" | "diamond" | "inferno";

interface LivingFlameProps {
  tier?: FlameTier;
  streakDays?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

export function LivingFlame({
  tier: propTier,
  streakDays,
  size = "md",
  className = "",
}: LivingFlameProps) {
  // Infer tier from streakDays if provided
  const getTier = (): FlameTier => {
    if (propTier) return propTier;
    if (streakDays !== undefined) {
      if (streakDays >= 30) return "inferno";
      if (streakDays >= 14) return "diamond";
      if (streakDays >= 7) return "scholar";
    }
    return "spark";
  };

  const activeTier = getTier();

  // Gradients for outer, middle, and inner cores
  const TIER_CONFIG = {
    inferno: {
      outer: ["#fef08a", "#f59e0b", "#b45309"],
      mid: ["#fffbeb", "#fcd34d", "#f59e0b"],
      core: "#ffffff",
      ember: "#fef08a",
      glowFilter: "drop-shadow(0 0 16px rgba(245, 158, 11, 0.85))",
    },
    diamond: {
      outer: ["#f3e8ff", "#c084fc", "#7e22ce"],
      mid: ["#ffffff", "#e879f9", "#a855f7"],
      core: "#ffffff",
      ember: "#f5d0fe",
      glowFilter: "drop-shadow(0 0 16px rgba(168, 85, 247, 0.85))",
    },
    scholar: {
      outer: ["#fef08a", "#f97316", "#dc2626"],
      mid: ["#ffffff", "#fed7aa", "#f97316"],
      core: "#ffffff",
      ember: "#fed7aa",
      glowFilter: "drop-shadow(0 0 16px rgba(239, 68, 68, 0.85))",
    },
    spark: {
      outer: ["#a7f3d0", "#34d399", "#059669"],
      mid: ["#ecfdf5", "#6ee7b7", "#10b981"],
      core: "#ffffff",
      ember: "#a7f3d0",
      glowFilter: "drop-shadow(0 0 14px rgba(16, 185, 129, 0.8))",
    },
  };

  const config = TIER_CONFIG[activeTier];
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const gradientId = `living-flame-${activeTier}-${size}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${sizeClasses} ${className}`}
      style={{ filter: config.glowFilter }}
    >
      {/* Rising Embers (Only on larger sizes) */}
      {(size === "lg" || size === "xl") && (
        <>
          <div
            className="absolute top-1 left-1/3 w-1.5 h-1.5 rounded-full animate-ember-rise-1 pointer-events-none"
            style={{ backgroundColor: config.ember }}
          />
          <div
            className="absolute top-0 right-1/3 w-1 h-1 rounded-full animate-ember-rise-2 pointer-events-none"
            style={{ backgroundColor: config.ember }}
          />
        </>
      )}

      {/* SVG Living Multi-layered Fire with Explicit Keyframes */}
      <svg
        viewBox="0 0 32 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible pointer-events-none"
      >
        <defs>
          {/* Outer Flame Gradient */}
          <linearGradient
            id={`${gradientId}-outer`}
            x1="16"
            y1="2"
            x2="16"
            y2="34"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={config.outer[0]} />
            <stop offset="0.45" stopColor={config.outer[1]} />
            <stop offset="1" stopColor={config.outer[2]} />
          </linearGradient>

          {/* Middle Tongue Gradient */}
          <linearGradient
            id={`${gradientId}-mid`}
            x1="16"
            y1="10"
            x2="16"
            y2="34"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={config.mid[0]} />
            <stop offset="0.5" stopColor={config.mid[1]} />
            <stop offset="1" stopColor={config.mid[2]} />
          </linearGradient>
        </defs>

        {/* 1. Outer Flame Tongue (Swaying fluidly) */}
        <g className="flame-sway-anim">
          <path
            d="M16 2C16 2 20.5 7.5 20.5 11C20.5 12.8 19.8 14.3 18.8 15.5C21.8 16.2 25 19.3 25 24C25 28.5 21 34 16 34C11 34 7 28.5 7 24C7 20.2 9.2 17.5 12.2 16.2C11 15 10 13.2 10 11C10 7.5 16 2 16 2Z"
            fill={`url(#${gradientId}-outer)`}
          />
        </g>

        {/* 2. Middle Flame Tongue (Flickering with dynamic phase) */}
        <g className="flame-flicker-anim">
          <path
            d="M16 11C16 11 19 14.5 19 17C19 18.2 18.5 19.3 17.8 20C19.8 20.5 21.5 22.5 21.5 25.5C21.5 28.5 19 32 16 32C13 32 10.5 28.5 10.5 25.5C10.5 23 12 21.2 13.8 20.2C13.2 19.5 12.8 18.2 12.8 17C12.8 14.5 16 11 16 11Z"
            fill={`url(#${gradientId}-mid)`}
          />
        </g>

        {/* 3. Hot White-Core Pulse (Center kernel) */}
        <g className="flame-core-anim">
          <path
            d="M16 19C16 19 18 21.5 18 23.5C18 24.5 17.5 25.5 17 26C18 26.5 18.5 27.5 18.5 28.8C18.5 30.5 17.2 31.5 16 31.5C14.8 31.5 13.5 30.5 13.5 28.8C13.5 27.5 14 26.5 15 26C14.5 25.5 14 24.5 14 23.5C14 21.5 16 19 16 19Z"
            fill={config.core}
          />
        </g>
      </svg>
    </div>
  );
}
