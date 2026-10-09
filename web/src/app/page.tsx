"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function RootPage() {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/landing");
      return;
    }

    if (userDoc?.assessmentCompleted) {
      router.replace("/dashboard");
    } else {
      router.replace("/assessment");
    }
  }, [user, userDoc, loading, router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background" suppressHydrationWarning>
      <LoadingScreen
        label="Membuka MindFlow AI..."
        subtext="Mengalihkan ke landing page"
        fullHeight
      />
    </div>
  );
}
