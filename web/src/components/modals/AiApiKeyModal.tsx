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
  Zap,
  Globe,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getAiProvider,
  setAiProvider,
  getCustomApiKey,
  setCustomApiKey,
  removeCustomApiKey,
  getOpenRouterModel,
  setOpenRouterModel,
  testAiApiKey,
  type AiProvider,
} from "@/lib/aiConfig";
import { cn } from "@/lib/utils";

interface AiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_OPENROUTER_MODELS = [
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash (Rekomendasi - Super Cepat & Cerdas)" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (Analitik & Penalaran Mendalam)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (Hemat & Responsif)" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek V3 (Sangat Cerdas & Efisien)" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1 (Advanced Reasoning & Problem Solving)" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B (Meta Open-Source Flagship)" },
  { id: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B (Alibaba Flagship)" },
  { id: "mistralai/mistral-small-24b-instruct-2501", label: "Mistral Small 24B" },
];

export function AiApiKeyModal({ isOpen, onClose }: AiApiKeyModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>("openrouter");
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState("");
  const [openRouterModelInput, setOpenRouterModelInput] = useState("google/gemini-2.0-flash-001");
  const [activeProvider, setActiveProviderState] = useState<AiProvider>("gemini");

  const [showPassword, setShowPassword] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    latencyMs?: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"config" | "tutorial">("config");

  useEffect(() => {
    if (isOpen) {
      const currProvider = getAiProvider();
      setSelectedProvider(currProvider);
      setActiveProviderState(currProvider);

      const gemKey = getCustomApiKey("gemini");
      const orKey = getCustomApiKey("openrouter");
      setGeminiKeyInput(gemKey);
      setOpenRouterKeyInput(orKey);
      setOpenRouterModelInput(getOpenRouterModel());

      setSavedSuccess(false);
      setTestResult(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentKeyInput = selectedProvider === "openrouter" ? openRouterKeyInput : geminiKeyInput;
  const hasExistingKeyForSelected =
    selectedProvider === "openrouter" ? !!getCustomApiKey("openrouter") : !!getCustomApiKey("gemini");

  const handleSave = () => {
    // 1. Save keys for both providers
    setCustomApiKey(geminiKeyInput.trim(), "gemini");
    setCustomApiKey(openRouterKeyInput.trim(), "openrouter");
    if (selectedProvider === "openrouter") {
      setOpenRouterModel(openRouterModelInput);
    }

    // 2. Set active provider
    setAiProvider(selectedProvider);
    setActiveProviderState(selectedProvider);

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleRemoveCurrent = () => {
    removeCustomApiKey(selectedProvider);
    if (selectedProvider === "openrouter") {
      setOpenRouterKeyInput("");
    } else {
      setGeminiKeyInput("");
    }
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!currentKeyInput.trim()) {
      setTestResult({
        success: false,
        message: `Silakan masukkan API key ${selectedProvider === "openrouter" ? "OpenRouter" : "Gemini"} terlebih dahulu sebelum mengetes.`,
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await testAiApiKey(
      currentKeyInput,
      selectedProvider,
      selectedProvider === "openrouter" ? openRouterModelInput : undefined
    );
    setIsTesting(false);
    setTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl border border-border shadow-2xl w-full max-w-xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-b border-border/60 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                Setup AI API Key
                <span className="text-[11px] font-bold uppercase tracking-wider bg-primary-100 text-primary-800 px-2.5 py-0.5 rounded-full">
                  OpenRouter & Gemini
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Gunakan API key <strong>OpenRouter</strong> (Claude, GPT-4o, DeepSeek, Gemini, Llama) atau <strong>Google Gemini</strong> langsung.
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
            onClick={() => setActiveTab("config")}
            className={cn(
              "py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2",
              activeTab === "config"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            <Key className="w-4 h-4" />
            Konfigurasi & Model
          </button>
          <button
            onClick={() => setActiveTab("tutorial")}
            className={cn(
              "py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2",
              activeTab === "tutorial"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            Panduan Mendapatkan API Key
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {activeTab === "config" ? (
            <>
              {/* Provider Selection Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  Pilih AI Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* OpenRouter Provider Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider("openrouter");
                      setTestResult(null);
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 relative",
                      selectedProvider === "openrouter"
                        ? "border-primary bg-primary-50/50 shadow-xs ring-2 ring-primary/20"
                        : "border-border bg-white hover:bg-gray-50"
                    )}
                  >
                    {activeProvider === "openrouter" && (
                      <span className="absolute top-2.5 right-2.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Aktif
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">OpenRouter AI</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Claude 3.5, DeepSeek R1, GPT-4o, Llama 3.3 via openrouter.ai
                    </p>
                  </button>

                  {/* Gemini Provider Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider("gemini");
                      setTestResult(null);
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 relative",
                      selectedProvider === "gemini"
                        ? "border-primary bg-primary-50/50 shadow-xs ring-2 ring-primary/20"
                        : "border-border bg-white hover:bg-gray-50"
                    )}
                  >
                    {activeProvider === "gemini" && (
                      <span className="absolute top-2.5 right-2.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Aktif
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Google Gemini</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Gemini 2.5 Flash dari Google AI Studio langsung
                    </p>
                  </button>
                </div>
              </div>

              {/* OpenRouter Model Selection (Shown only when OpenRouter is selected) */}
              {selectedProvider === "openrouter" && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      Pilih Model OpenRouter
                    </label>
                    <span className="text-[10px] font-bold text-primary bg-primary-50 border border-primary-200/60 px-2 py-0.5 rounded-md font-mono truncate max-w-[200px]">
                      {openRouterModelInput}
                    </span>
                  </div>
                  <select
                    value={
                      POPULAR_OPENROUTER_MODELS.some((m) => m.id === openRouterModelInput)
                        ? openRouterModelInput
                        : "custom"
                    }
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        setOpenRouterModelInput(e.target.value);
                      }
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-border bg-white text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
                  >
                    {POPULAR_OPENROUTER_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                    <option value="custom">Model Kustom Lainnya (Ketik di bawah)...</option>
                  </select>

                  {/* Custom Model String Input */}
                  {(!POPULAR_OPENROUTER_MODELS.some((m) => m.id === openRouterModelInput) ||
                    openRouterModelInput === "custom") && (
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Contoh: anthropic/claude-3-haiku atau deepseek/deepseek-r1"
                        value={openRouterModelInput === "custom" ? "" : openRouterModelInput}
                        onChange={(e) => setOpenRouterModelInput(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl border border-border bg-white text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* API Key Input Container */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-primary" />
                    {selectedProvider === "openrouter" ? "OpenRouter API Key" : "Google Gemini API Key"}
                  </label>
                  {hasExistingKeyForSelected && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Tersimpan di Browser
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      selectedProvider === "openrouter"
                        ? "Masukkan OpenRouter API key (sk-or-v1-...)"
                        : "Masukkan Gemini API key (AIzaSy...)"
                    }
                    value={selectedProvider === "openrouter" ? openRouterKeyInput : geminiKeyInput}
                    onChange={(e) => {
                      if (selectedProvider === "openrouter") {
                        setOpenRouterKeyInput(e.target.value);
                      } else {
                        setGeminiKeyInput(e.target.value);
                      }
                      setTestResult(null);
                    }}
                    className="w-full h-12 pl-4 pr-24 rounded-2xl border border-border bg-gray-50/60 font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all shadow-2xs"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
                      title={showPassword ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {hasExistingKeyForSelected && (
                      <button
                        type="button"
                        onClick={handleRemoveCurrent}
                        className="p-2 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Hapus API key ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  {selectedProvider === "openrouter"
                    ? "Dapatkan API Key di openrouter.ai/keys. Key disimpan lokal di browser Anda."
                    : "Dapatkan API Key gratis di aistudio.google.com. Key disimpan lokal di browser Anda."}
                </p>
              </div>

              {/* Test Diagnostics Result Box */}
              {testResult && (
                <div
                  className={cn(
                    "p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fade-in",
                    testResult.success
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                      : "bg-rose-50/80 border-rose-200 text-rose-900"
                  )}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <p className="font-bold">
                      {testResult.success ? "Koneksi Berhasil!" : "Gagal Terhubung"}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">{testResult.message}</p>
                    {testResult.latencyMs && (
                      <p className="text-[10px] font-mono font-bold mt-1 text-gray-500">
                        Waktu Respons: {testResult.latencyMs}ms
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Security Privacy Notice */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-border/70 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-[11px] text-gray-500 leading-relaxed space-y-1">
                  <p className="font-bold text-gray-700">Privasi & Keamanan Terjamin</p>
                  <p>
                    API key Anda disimpan di <code>localStorage</code> browser dan dikirim langsung ke gateway OpenRouter / Gemini tanpa disimpan permanen di database backend.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* ════════════════════════════════════════════
                TUTORIAL TAB: HOW TO GET KEYS
            ════════════════════════════════════════════ */
            <div className="space-y-6 text-xs text-gray-600 leading-relaxed">
              {/* OpenRouter Guide */}
              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <h4 className="font-bold text-gray-900 text-sm">Cara Mendapatkan OpenRouter API Key</h4>
                  </div>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
                  >
                    openrouter.ai/keys <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-gray-700 pl-1">
                  <li>Buka website <strong>openrouter.ai/keys</strong>.</li>
                  <li>Login atau daftar menggunakan akun Google/GitHub Anda.</li>
                  <li>Klik tombol <strong>Create Key</strong>.</li>
                  <li>Beri nama key (misal: <code>MindFlow AI</code>) dan klik <strong>Create</strong>.</li>
                  <li>Salin API key (berawalan <code>sk-or-v1-...</code>) dan tempelkan ke form di atas.</li>
                </ol>
              </div>

              {/* Google Gemini Guide */}
              <div className="p-4 rounded-2xl border border-primary/30 bg-primary-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="font-bold text-gray-900 text-sm">Cara Mendapatkan Google Gemini API Key</h4>
                  </div>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    aistudio.google.com <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-gray-700 pl-1">
                  <li>Buka portal <strong>Google AI Studio</strong>.</li>
                  <li>Klik tombol <strong>Create API Key</strong>.</li>
                  <li>Salin API Key (berawalan <code>AIzaSy...</code>) dan tempelkan ke form Gemini di atas.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 bg-gray-50 border-t border-border flex items-center justify-between gap-3">
          {activeTab === "config" ? (
            <>
              <Button
                variant="outline"
                size="md"
                onClick={handleTest}
                disabled={isTesting || !currentKeyInput.trim()}
                loading={isTesting}
                icon={<Zap className="w-4 h-4 text-primary" />}
                className="rounded-xl font-bold text-xs"
              >
                Tes Koneksi
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={onClose}
                  className="rounded-xl text-xs font-semibold"
                >
                  Batal
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSave}
                  icon={savedSuccess ? <Check className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  className={cn(
                    "rounded-xl text-xs font-bold px-5 shadow-sm",
                    savedSuccess && "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {savedSuccess
                    ? "Tersimpan!"
                    : `Simpan & Aktifkan ${selectedProvider === "openrouter" ? "OpenRouter" : "Gemini"}`}
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => setActiveTab("config")}
              className="ml-auto rounded-xl text-xs font-bold"
            >
              Kembali ke Konfigurasi
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
