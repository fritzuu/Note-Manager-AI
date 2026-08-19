"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Check,
  X,
  HelpCircle,
  ShieldCheck,
  Cpu,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getCustomApiKey,
  setCustomApiKey,
  removeCustomApiKey,
  testGeminiApiKey,
} from "@/lib/aiConfig";

interface AiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiApiKeyModal({ isOpen, onClose }: AiApiKeyModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"input" | "tutorial">("input");

  useEffect(() => {
    if (isOpen) {
      const existing = getCustomApiKey();
      setApiKeyInput(existing);
      setHasExistingKey(!!existing);
      setSavedSuccess(false);
      setTestResult(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!apiKeyInput.trim()) {
      removeCustomApiKey();
      setHasExistingKey(false);
    } else {
      setCustomApiKey(apiKeyInput.trim());
      setHasExistingKey(true);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleRemove = () => {
    removeCustomApiKey();
    setApiKeyInput("");
    setHasExistingKey(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!apiKeyInput.trim()) {
      setTestResult({
        success: false,
        message: "Please enter a key before testing.",
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await testGeminiApiKey(apiKeyInput);
    setIsTesting(false);
    setTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl border border-border shadow-2xl w-full max-w-xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-b border-border/60 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                AI API Key Setup
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full">
                  Gemini AI
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Use your own Google Gemini API key for dedicated quota and faster inference.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border px-6 bg-gray-50/50">
          <button
            onClick={() => setActiveTab("input")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "input"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Key className="w-4 h-4" />
            API Key Configuration
          </button>
          <button
            onClick={() => setActiveTab("tutorial")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "tutorial"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            How to Get Free API Key
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === "input" ? (
            <>
              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  hasExistingKey
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      hasExistingKey ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {hasExistingKey ? <ShieldCheck className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold">
                      {hasExistingKey ? "Custom API Key Active" : "Using Default System Key"}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {hasExistingKey
                        ? "Requests are routed using your personal Gemini API quota."
                        : "Using shared server-side environment variables."}
                    </p>
                  </div>
                </div>
                {hasExistingKey && (
                  <button
                    onClick={handleRemove}
                    title="Remove custom key"
                    className="p-1.5 text-red-500 hover:bg-red-100/60 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Input Form */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Google Gemini API Key</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold flex items-center gap-1 normal-case text-xs"
                  >
                    Get Key from Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="AIzaSy..."
                    className="w-full h-12 pl-4 pr-24 rounded-2xl border border-border bg-gray-50/50 focus:bg-white text-sm text-[#1F2937] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      title={showPassword ? "Hide API key" : "Show API key"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  Your key is stored securely in your browser&apos;s local storage and is never saved to external third-party databases.
                </p>
              </div>

              {/* Test Connection Button & Result */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTest}
                    loading={isTesting}
                    disabled={!apiKeyInput.trim() || isTesting}
                    icon={<Key className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Test Connection
                  </Button>
                  <span className="text-[11px] text-gray-400">
                    Verify that your API key is valid and connected.
                  </span>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in ${
                      testResult.success
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    )}
                    <div className="flex-1 font-medium">{testResult.message}</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Tutorial Section */
            <div className="space-y-5 animate-fade-in">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-800">
                    Google AI Studio (Free Tier)
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Google provides free Gemini API access with generous rate limits.
                  </p>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-600 transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                >
                  Open AI Studio <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  3 Simple Steps to Get Your API Key
                </h4>

                {/* Step 1 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-gray-50 border border-border">
                  <div className="w-7 h-7 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      Buka Google AI Studio
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Kunjungi link{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline font-medium"
                      >
                        aistudio.google.com/app/apikey
                      </a>{" "}
                      dan login dengan akun Google Anda.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-gray-50 border border-border">
                  <div className="w-7 h-7 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      Klik tombol &quot;Create API Key&quot;
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Pilih project Google Cloud yang tersedia atau klik &quot;Create API key in new project&quot;.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-gray-50 border border-border">
                  <div className="w-7 h-7 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      Salin (Copy) & Tempel (Paste) Key
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Salin key berawalan <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-[10px] font-mono">AIzaSy...</code> ke kolom input di tab konfigurasi lalu klik <strong>Save API Key</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-gray-50 border-t border-border flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {activeTab === "tutorial" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab("input")}
                className="px-5"
              >
                Go to Input Form
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                icon={savedSuccess ? <Check className="w-4 h-4" /> : undefined}
                className={`px-6 transition-all ${
                  savedSuccess ? "bg-emerald-600 hover:bg-emerald-700" : ""
                }`}
              >
                {savedSuccess ? "Saved Successfully!" : "Save API Key"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
