"use client";

import React, { useEffect, useState } from "react";

interface PerformanceMeterProps {
  prediction: string;
}

const SEGMENTS = [
  { label: "Low", color: "#EF4444", range: "< 50" },
  { label: "Average", color: "#F59E0B", range: "50-64" },
  { label: "Good", color: "#3B82F6", range: "65-79" },
  { label: "Excellent", color: "#4F8A6B", range: "≥ 80" },
];

export function PerformanceMeter({ prediction }: PerformanceMeterProps) {
  const [animate, setAnimate] = useState(false);
  const activeIndex = SEGMENTS.findIndex((s) => s.label === prediction);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full">
      {/* Meter bar */}
      <div className="flex rounded-full overflow-hidden h-3 bg-gray-100">
        {SEGMENTS.map((seg, i) => (
          <div
            key={seg.label}
            className="relative transition-all duration-700 ease-out"
            style={{
              flex: 1,
              backgroundColor: animate && i <= activeIndex ? seg.color : "#E5E7EB",
              opacity: animate && i <= activeIndex ? 1 : 0.3,
              transition: `all 0.5s ease ${i * 150}ms`,
            }}
          >
            {i === activeIndex && animate && (
              <div
                className="absolute inset-0 animate-pulse"
                style={{
                  backgroundColor: seg.color,
                  opacity: 0.5,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Labels */}
      <div className="flex mt-2">
        {SEGMENTS.map((seg, i) => (
          <div key={seg.label} className="flex-1 text-center">
            <p
              className={`text-xs font-semibold transition-all duration-500 ${
                i === activeIndex ? "opacity-100" : "opacity-40"
              }`}
              style={{ color: i === activeIndex ? seg.color : "#9CA3AF" }}
            >
              {seg.label}
            </p>
            <p className="text-[10px] text-gray-400">{seg.range}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
