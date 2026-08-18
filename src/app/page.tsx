"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function RootPage() {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (userDoc?.assessmentCompleted) {
      router.replace("/dashboard");
    } else {
      router.replace("/assessment");
    }
  }, [user, userDoc, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" suppressHydrationWarning>
      <div className="flex flex-col items-center gap-4" suppressHydrationWarning>
        <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading MindFlow AI…</p>
      </div>
    </div>
  );
}
