"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Info, Trash2, X, Loader2 } from "lucide-react";

export type WarningVariant = "danger" | "warning" | "info";

export interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: WarningVariant;
  isLoading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function WarningModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  variant = "danger",
  isLoading = false,
  icon,
  children,
}: WarningModalProps) {
  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-rose-50 border-rose-100 text-rose-600 shadow-rose-100/50",
          defaultIcon: <Trash2 className="w-6 h-6 text-rose-600" />,
          confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/25",
          badgeBg: "bg-rose-50 text-rose-700 border-rose-200/60",
          accentGlow: "from-rose-500/10 via-transparent to-transparent",
        };
      case "warning":
        return {
          iconBg: "bg-amber-50 border-amber-100 text-amber-600 shadow-amber-100/50",
          defaultIcon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25",
          badgeBg: "bg-amber-50 text-amber-700 border-amber-200/60",
          accentGlow: "from-amber-500/10 via-transparent to-transparent",
        };
      case "info":
      default:
        return {
          iconBg: "bg-blue-50 border-blue-100 text-blue-600 shadow-blue-100/50",
          defaultIcon: <Info className="w-6 h-6 text-blue-600" />,
          confirmBtn: "bg-primary hover:bg-primary/90 text-white shadow-primary/25",
          badgeBg: "bg-blue-50 text-blue-700 border-blue-200/60",
          accentGlow: "from-primary/10 via-transparent to-transparent",
        };
    }
  };

  const currentStyles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark & Glass Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 animate-scale-in overflow-hidden z-10`}
      >
        {/* Subtle Ambient Background Gradient */}
        <div
          className={`absolute top-0 right-0 left-0 h-28 bg-gradient-to-b ${currentStyles.accentGlow} pointer-events-none`}
        />

        {/* Close Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-40"
          title="Tutup Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Content */}
        <div className="relative space-y-5">
          {/* Icon Badge */}
          <div
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-lg ${currentStyles.iconBg}`}
          >
            {icon || currentStyles.defaultIcon}
          </div>

          {/* Text Details */}
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
              {title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Custom Children / Options */}
          {children && <div>{children}</div>}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-border text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${currentStyles.confirmBtn}`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
