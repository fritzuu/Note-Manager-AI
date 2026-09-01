"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-white rounded-3xl border border-border p-8 shadow-card max-w-lg w-full">
        <ErrorState
          title="Terjadi Kendala Sistem"
          message={error.message || "Aplikasi mengalami kendala tak terduga. Silakan coba muat ulang."}
          onRetry={reset}
          showHomeButton
        />
      </div>
    </div>
  );
}
