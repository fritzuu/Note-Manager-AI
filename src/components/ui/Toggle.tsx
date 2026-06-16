"use client";

import React from "react";

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export function Toggle({ label, description, checked, onChange, id }: ToggleProps) {
  const toggleId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-white hover:border-primary/30 transition-colors duration-200">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={toggleId} className="text-sm font-medium text-[#1F2937] cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 ${
          checked ? "bg-primary" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
