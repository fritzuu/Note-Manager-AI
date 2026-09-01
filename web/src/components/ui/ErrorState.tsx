"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  fullHeight?: boolean;
}

export function ErrorState({
  title = "Terjadi Kesalahan",
  message = "Gagal memuat data. Periksa koneksi internet atau coba beberapa saat lagi.",
  onRetry,
  showHomeButton = true,
  fullHeight = false,
}: ErrorStateProps) {
  return (
    <div
      className={`w-full flex-1 flex flex-col items-center justify-center p-8 text-center animate-scale-in ${
        fullHeight ? "min-h-screen" : "min-h-[calc(100vh-140px)]"
      }`}
      suppressHydrationWarning
    >
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h3 className="font-extrabold text-gray-800 text-lg tracking-tight">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mt-1.5 leading-relaxed font-medium">
        {message}
      </p>

      <div className="flex items-center gap-3 mt-6">
        {onRetry && (
          <Button
            variant="primary"
            size="sm"
            onClick={onRetry}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Coba Lagi
          </Button>
        )}

        {showHomeButton && (
          <Button
            variant="outline"
            size="sm"
            href="/dashboard"
            icon={<Home className="w-3.5 h-3.5" />}
          >
            Ke Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
