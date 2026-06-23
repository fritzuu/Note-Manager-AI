"use client";

import React, { useEffect, useState } from "react";

interface ScoreGaugeProps {
  score: number;     // 0–100
  label?: string;
  size?: number;
}

const COLORS = {
  low: "#EF4444",
  average: "#F59E0B",
  good: "#3B82F6",
  excellent: "#4F8A6B",
};

function getColor(score: number): string {
  if (score < 40) return COLORS.low;
  if (score < 65) return COLORS.average;
  if (score < 80) return COLORS.good;
  return COLORS.excellent;
}

function getLabel(score: number): string {
  if (score < 40) return "Low";
  if (score < 65) return "Average";
  if (score < 80) return "Good";
  return "Excellent";
}

export function ScoreGauge({ score, label = "Academic Score", size = 220 }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = size / 2 - 20;
  const strokeWidth = 14;

  // Semicircle: from 180° to 0° (π to 0)
  const startAngle = Math.PI;
  const endAngle = 0;
  const sweepAngle = startAngle - endAngle;
  const progress = animatedScore / 100;
  const currentAngle = startAngle - sweepAngle * progress;
  // Background arc path
  const bgArc = describeArc(cx, cy, radius, startAngle, endAngle);
  // Fill arc path
  const fillArc = describeArc(cx, cy, radius, startAngle, currentAngle);

  const color = getColor(score);
  const performanceLabel = getLabel(score);

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size / 2 + 40}
        viewBox={`0 0 ${size} ${size / 2 + 40}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={bgArc}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <path
          d={fillArc}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            transition: "all 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const tickAngle = startAngle - sweepAngle * (tick / 100);
          const innerR = radius - strokeWidth / 2 - 6;
          const outerR = radius - strokeWidth / 2 - 2;
          const x1 = cx + innerR * Math.cos(tickAngle);
          const y1 = cy - innerR * Math.sin(tickAngle);
          const x2 = cx + outerR * Math.cos(tickAngle);
          const y2 = cy - outerR * Math.sin(tickAngle);
          return (
            <line
              key={tick}
              x1={x1} y1={y1}
              x2={x2} y2={y2}
              stroke="#D1D5DB"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Score text */}
        <text
          x={cx}
          y={cy - 16}
          textAnchor="middle"
          className="font-bold"
          fill="#1F2937"
          fontSize={size * 0.2}
          style={{ transition: "all 0.6s ease" }}
        >
          {Math.round(animatedScore)}
        </text>

        {/* Performance label */}
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fill={color}
          fontSize={13}
          fontWeight={600}
        >
          {performanceLabel}
        </text>
      </svg>

      <p className="text-sm text-gray-500 font-medium -mt-1">{label}</p>
    </div>
  );
}

/**
 * Describe an SVG arc path from startAngle to endAngle (in radians).
 * Angles are measured counterclockwise from the positive x-axis.
 */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);

  const sweep = startAngle - endAngle;
  const largeArc = sweep > Math.PI ? 1 : 0;

  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export { getColor, getLabel, COLORS };
