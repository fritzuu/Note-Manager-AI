"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  displayValue?: (v: number) => string;
  error?: string;
  id?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  displayValue,
  error,
  id,
}: SliderProps) {
  const sliderId = id || label.toLowerCase().replace(/\s+/g, "-");
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={sliderId} className="text-sm font-medium text-[#1F2937]">
          {label}
        </label>
        <span className="text-sm font-semibold text-primary px-2.5 py-0.5 bg-primary-50 rounded-lg">
          {displayValue ? displayValue(value) : value}
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-400 to-primary rounded-full transition-all duration-150"
            style={{ width: `${percent}%` }}
          />
        </div>
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "absolute inset-0 w-full opacity-0 cursor-pointer h-6",
            "focus:outline-none"
          )}
        />
        <div
          className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full shadow-sm transition-all duration-150 pointer-events-none"
          style={{ left: `calc(${percent}% - 10px)` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{displayValue ? displayValue(min) : min}</span>
        <span>{displayValue ? displayValue(max) : max}</span>
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}
