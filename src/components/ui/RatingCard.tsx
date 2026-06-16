"use client";

import React from "react";

interface RatingCardProps {
  label: string;
  description?: string;
  value: number;
  max?: number;
  options?: { value: number; label: string }[];
  onChange: (value: number) => void;
  id?: string;
}

export function RatingCard({
  label,
  description,
  value,
  max = 5,
  options,
  onChange,
  id,
}: RatingCardProps) {
  const ratingId = id || label.toLowerCase().replace(/\s+/g, "-");
  const items = options || Array.from({ length: max }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="text-sm font-medium text-[#1F2937]">{label}</label>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label={label} id={ratingId}>
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={value === item.value}
            onClick={() => onChange(item.value)}
            className={`flex-1 min-w-[48px] h-11 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
              value === item.value
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-border bg-white text-gray-600 hover:border-primary/50 hover:text-primary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
