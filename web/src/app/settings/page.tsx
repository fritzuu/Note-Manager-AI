"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, BookOpen, Sparkles, Key, ExternalLink, ShieldCheck, Cpu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AiApiKeyModal } from "@/components/modals/AiApiKeyModal";
import { getCustomApiKey } from "@/lib/aiConfig";

export default function SettingsPage() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const router = useRouter();
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [hasCustomApiKey, setHasCustomApiKey] = useState(false);

  useEffect(() => {
    setHasCustomApiKey(!!getCustomApiKey());

    const handleKeyUpdate = () => {
      setHasCustomApiKey(!!getCustomApiKey());
    };

    window.addEventListener("mindflow-api-key-updated", handleKeyUpdate);
    return () => window.removeEventListener("mindflow-api-key-updated", handleKeyUpdate);
  }, []);

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
      <AiApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />

      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your student profile, account preferences, and AI integrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile summary card */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 md:p-8 space-y-6 animate-scale-in">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-border/40 pb-4">
            <User className="w-5 h-5 text-primary" />
            Student Profile
          </h3>

          <div className="space-y-4">
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
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-primary bg-primary-50/50 border border-primary-100 rounded-xl px-4 py-3 flex-1">
                  {userDoc?.assessmentCompleted ? "Yes (Active)" : "No"}
                </p>
                <button
                  onClick={() => router.push("/assessment")}
                  className="px-4 py-3 bg-white hover:bg-gray-50 border border-border text-sm font-semibold text-gray-700 rounded-xl transition-all duration-200 shadow-sm cursor-pointer shrink-0"
                >
                  {userDoc?.assessmentCompleted ? "Edit Profile Data" : "Take Assessment"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI & Integration Card */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 md:p-8 space-y-6 animate-scale-in flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI API Configuration
              </h3>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                  hasCustomApiKey
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {hasCustomApiKey ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" /> Custom Gemini Key
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" /> Default System Key
                  </>
                )}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                MindFlow AI uses <strong>Google Gemini 2.5 Flash</strong> to power your Academic Assistant, smart note summarization, and priority recommendations.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                By default, you share a communal quota. You can enter your own free Google Gemini API key to enjoy higher rate limits, faster responses, and dedicated throughput.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-primary" /> Current Status
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {hasCustomApiKey ? "Configured in Browser Storage" : "Using Server Fallback"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {hasCustomApiKey
                  ? "Your custom API key is stored securely in your client browser and automatically used for all AI calls."
                  : "No personal API key entered. You can add one anytime in seconds."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-border/40">
            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="flex-1 py-3 px-4 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              {hasCustomApiKey ? "Manage / Change API Key" : "Add Custom API Key"}
            </button>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="p-3 bg-gray-50 hover:bg-gray-100 border border-border text-gray-600 rounded-xl transition-all cursor-pointer"
              title="Open Google AI Studio"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
