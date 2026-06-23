"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function SettingsPage() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading Settings...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your student profile and account preferences</p>
      </div>

      {/* Profile summary card */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 md:p-8 space-y-6 animate-scale-in">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-border/40 pb-4">
          <User className="w-5 h-5 text-primary" />
          Student Profile
        </h3>

        <div className="space-y-4 max-w-md">
          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Full Name
            </span>
            <p className="text-sm font-semibold text-gray-800 bg-gray-50 border border-border rounded-xl px-4 py-3">
              {userDoc?.name || user?.displayName || "Student"}
            </p>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </span>
            <p className="text-sm font-semibold text-gray-800 bg-gray-50 border border-border rounded-xl px-4 py-3">
              {user?.email}
            </p>
          </div>

          {/* UID */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Account ID (UID)
            </span>
            <p className="text-xs font-mono text-gray-500 bg-gray-50 border border-border rounded-xl px-4 py-3 truncate">
              {user?.uid}
            </p>
          </div>

          {/* Assessment status */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Assessment Completed
            </span>
            <p className="text-sm font-semibold text-primary bg-primary-50/50 border border-primary-100 rounded-xl px-4 py-3">
              {userDoc?.assessmentCompleted ? "Yes (Active)" : "No"}
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
