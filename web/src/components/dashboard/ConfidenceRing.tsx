"use client";

import React, { useEffect, useState } from "react";

interface ConfidenceRingProps {
  confidence: number;  // 0–100
  size?: number;
  label?: string;
}

export function ConfidenceRing({ confidence, size = 120, label = "Confidence" }: ConfidenceRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(confidence), 150);
    return () => clearTimeout(timer);
  }, [confidence]);

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  const cx = size / 2;
  const cy = size / 2;

  // Color based on confidence
  let color = "#4F8A6B";
  if (confidence < 50) color = "#EF4444";
  else if (confidence < 70) color = "#F59E0B";
  else if (confidence < 85) color = "#3B82F6";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(0 0 4px ${color}40)`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#1F2937]">
            {Math.round(animatedValue)}%
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </div>
  );
}
