"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  User,
  Mail,
  ShieldCheck,
  Sparkles,
  Key,
  ExternalLink,
  Cpu,
  Zap,
  Camera,
  Loader2,
  Check,
  Building2,
  GraduationCap,
  Save,
  AlertTriangle,
  Trash2,
  X,
  MailCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AiApiKeyModal } from "@/components/modals/AiApiKeyModal";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateUserDocument } from "@/lib/firestore";
import { getCustomApiKey, getAiProvider, getOpenRouterModel, type AiProvider } from "@/lib/aiConfig";
import { sendAccountDeletionOtp, executeAccountDeletion } from "@/lib/auth";

export default function SettingsPage() {
  const { user, userDoc, loading: authLoading, refreshUserDoc } = useAuth();
  const router = useRouter();

  // Profile Form States
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [university, setUniversity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Settings States
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<AiProvider>("gemini");
  const [hasCustomApiKey, setHasCustomApiKey] = useState(false);
  const [openRouterModel, setOpenRouterModelState] = useState("google/gemini-2.0-flash-001");

  // Double Verification Account Deletion States
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const [deletionStep, setDeletionStep] = useState<1 | 2>(1);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const REQUIRED_PHRASE = "HAPUS AKUN SAYA SECARA PERMANEN";

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (userDoc) {
      setName(userDoc.name || user?.displayName || "");
      setMajor(userDoc.major || "");
      setUniversity(userDoc.university || "");
      setAvatarUrl(userDoc.avatarUrl || user?.photoURL || null);
    } else if (user) {
      setName(user.displayName || "");
      setAvatarUrl(user.photoURL || null);
    }
  }, [userDoc, user]);

  useEffect(() => {
    const updateAiState = () => {
      const provider = getAiProvider();
      setActiveProvider(provider);
      setHasCustomApiKey(!!getCustomApiKey(provider));
      setOpenRouterModelState(getOpenRouterModel());
    };

    updateAiState();

    window.addEventListener("mindflow-api-key-updated", updateAiState);
    return () => window.removeEventListener("mindflow-api-key-updated", updateAiState);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Handle Avatar Image Upload to ImgBB via /api/upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Pilih file gambar valid (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAvatarError("Ukuran foto maksimal 10 MB");
      return;
    }

    setAvatarError(null);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah gambar ke cloud");
      }

      setAvatarUrl(data.url);
      await updateUserDocument(user.uid, {
        avatarUrl: data.url,
      });
      await refreshUserDoc();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setAvatarError(errorObj.message || "Gagal mengunggah avatar. Periksa koneksi internet.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setSaveSuccess(false);

    try {
      await updateUserDocument(user.uid, {
        name: name.trim() || "Mahasiswa",
        major: major.trim(),
        university: university.trim(),
      });
      await refreshUserDoc();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  // Account Deletion Handlers
  const handleStartDeletion = () => {
    setDeletionModalOpen(true);
    setDeletionStep(1);
    setConfirmationPhrase("");
    setOtpCode("");
    setDeletionError(null);
  };

  const handleRequestOtp = async () => {
    if (confirmationPhrase.trim() !== REQUIRED_PHRASE) {
      setDeletionError(`Teks konfirmasi harus sama persis dengan "${REQUIRED_PHRASE}"`);
      return;
    }
    if (!user) return;

    setDeletionError(null);
    setOtpSending(true);
    try {
      await sendAccountDeletionOtp(user);
      setResendCooldown(60);
      setDeletionStep(2);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setDeletionError(errorObj.message || "Gagal mengirimkan kode verifikasi. Coba lagi.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleExecuteDeletion = async () => {
    if (!user) return;
    if (otpCode.trim().length !== 6) {
      setDeletionError("Masukkan 6 digit kode verifikasi yang dikirimkan ke email.");
      return;
    }

    setDeletionError(null);
    setOtpVerifying(true);
    try {
      const result = await executeAccountDeletion(user, otpCode.trim());
      if (!result.success) {
        setDeletionError(result.message || "Kode verifikasi tidak cocok.");
        return;
      }

      setDeletionModalOpen(false);
      router.replace("/login?deleted=success");
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setDeletionError(errorObj.message || "Gagal menghapus akun. Silakan login ulang dan coba lagi.");
    } finally {
      setOtpVerifying(false);
    }
  };

  if (authLoading || !user) {
    return (
      <DashboardShell>
        <LoadingScreen label="Memuat Pengaturan..." subtext="Mengambil preferensi akun" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* AI Key Config Modal */}
      <AiApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />

      {/* ── DOUBLE VERIFICATION ACCOUNT DELETION MODAL ── */}
      {deletionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => {
              if (!otpSending && !otpVerifying) setDeletionModalOpen(false);
            }}
          />

          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-rose-100 animate-scale-in overflow-hidden z-10 space-y-6">
            {/* Top Glow Ambient */}
            <div className="absolute top-0 right-0 left-0 h-28 bg-gradient-to-b from-rose-500/15 via-rose-500/5 to-transparent pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              disabled={otpSending || otpVerifying}
              onClick={() => setDeletionModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon & Title */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-md shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider">
                  Verifikasi Ganda (Double Auth)
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                  Hapus Akun & Seluruh Data
                </h3>
              </div>
            </div>

            {/* Step Progress Indicators */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  deletionStep === 1
                    ? "bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">
                  1
                </span>
                <span>Ketik Konfirmasi</span>
              </div>
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  deletionStep === 2
                    ? "bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">
                  2
                </span>
                <span>Kode OTP Email</span>
              </div>
            </div>

            {deletionError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{deletionError}</span>
              </div>
            )}

            {/* ── STEP 1: TYPING CONFIRMATION PHRASE ── */}
            {deletionStep === 1 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> PERINGATAN KRUSIAL:
                  </p>
                  <p>
                    Semua <strong>catatan, papan tugas, ringkasan AI, data profil, dan sesi fokus</strong> Anda akan dimusnahkan secara permanen dari server dan tidak dapat dipulihkan.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block">
                    Untuk melanjutkan, ketik kalimat di bawah ini:
                  </label>
                  <div className="p-2.5 bg-gray-100 rounded-xl border border-gray-300 font-mono text-xs font-bold text-gray-800 select-all text-center">
                    {REQUIRED_PHRASE}
                  </div>
                  <input
                    type="text"
                    value={confirmationPhrase}
                    onChange={(e) => setConfirmationPhrase(e.target.value)}
                    placeholder="Ketik kalimat konfirmasi di sini..."
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 ${
                      confirmationPhrase === REQUIRED_PHRASE
                        ? "border-emerald-500 bg-emerald-50/30 text-emerald-900 focus:ring-emerald-500/20"
                        : "border-border bg-white text-gray-800 focus:ring-rose-500/20 focus:border-rose-400"
                    }`}
                  />
                  {confirmationPhrase === REQUIRED_PHRASE && (
                    <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Kalimat konfirmasi cocok
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeletionModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border border-border text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Batalkan
                  </button>
                  <Button
                    variant="danger"
                    size="md"
                    disabled={confirmationPhrase !== REQUIRED_PHRASE || otpSending}
                    loading={otpSending}
                    onClick={handleRequestOtp}
                    icon={<ArrowRight className="w-4 h-4" />}
                    className="font-bold shadow-md cursor-pointer"
                  >
                    Lanjut & Kirim Kode Email
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: EMAIL OTP VERIFICATION ── */}
            {deletionStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs leading-relaxed space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-blue-800">
                    <MailCheck className="w-4 h-4 text-blue-600" /> Kode Verifikasi Terkirim
                  </p>
                  <p>
                    Kami telah mengirimkan 6 digit kode OTP ke email:{" "}
                    <span className="font-bold text-blue-950 underline">{user?.email}</span>.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block text-center">
                    Masukkan 6 Digit Kode OTP:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center px-4 py-3.5 rounded-2xl border border-gray-300 bg-white font-mono text-2xl font-black tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 shadow-inner"
                  />
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                    <span className="text-gray-500 font-semibold">⏱️ Kode tetap valid selama 10 menit</span>
                    <button
                      type="button"
                      disabled={otpSending || resendCooldown > 0}
                      onClick={handleRequestOtp}
                      className="text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:no-underline"
                    >
                      <RefreshCw className={`w-3 h-3 ${otpSending ? "animate-spin" : ""}`} />
                      <span>{resendCooldown > 0 ? `Kirim Ulang (${resendCooldown}s)` : "Kirim Ulang"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeletionStep(1)}
                    className="px-4 py-2.5 rounded-2xl border border-border text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Kembali
                  </button>
                  <Button
                    variant="danger"
                    size="md"
                    disabled={otpCode.trim().length !== 6 || otpVerifying}
                    loading={otpVerifying}
                    onClick={handleExecuteDeletion}
                    icon={<Trash2 className="w-4 h-4" />}
                    className="font-bold shadow-lg shadow-rose-500/20 cursor-pointer"
                  >
                    Hapus Akun Selamanya
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1F2937] tracking-tight">
            Pengaturan Akun & Preferensi
          </h1>
          <p className="text-sm text-gray-500">
            Kelola profil mahasiswa, integrasi AI provider, dan keamanan data Anda
          </p>
        </div>

        {/* ── CARD 1: PROFILE MANAGEMENT & AVATAR ── */}
        <div className="bg-white rounded-3xl border border-border p-6 md:p-8 shadow-card space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#1F2937]">
                Profil Mahasiswa & Foto
              </h2>
              <p className="text-xs text-gray-400">
                Informasi identitas akademik dan foto profil cloud ImgBB
              </p>
            </div>
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 rounded-2xl bg-gray-50/70 border border-border/60">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-white border-2 border-primary/20 overflow-hidden shadow-md flex items-center justify-center relative">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name || "Avatar"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-primary to-primary-600 text-white font-black text-3xl flex items-center justify-center">
                    {(name || user?.email || "U")[0].toUpperCase()}
                  </div>
                )}

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-1">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-[10px] font-bold">Mengunggah...</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-primary hover:bg-primary-600 text-white shadow-md transition-all cursor-pointer group-hover:scale-110"
                title="Ganti Foto Profil"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <h4 className="text-sm font-bold text-gray-800">Foto Profil Cloud</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Format didukung: JPG, PNG, atau WebP (Maks. 10MB). Foto disimpan di cloud storage ImgBB dan sinkron ke seluruh aplikasi.
              </p>
              {avatarError && (
                <p className="text-xs font-bold text-rose-500 pt-1">
                  ⚠️ {avatarError}
                </p>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Mahasiswa"
                leftIcon={<User className="w-4 h-4" />}
                required
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>Alamat Email</span>
                  <span className="text-[10px] text-gray-400 font-normal">Tidak dapat diubah</span>
                </label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gray-50 border border-border text-sm text-gray-500">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{user?.email || "email@example.com"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Program Studi / Jurusan"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="cth. Teknik Informatika, Ilmu Komputer"
                leftIcon={<GraduationCap className="w-4 h-4" />}
              />

              <Input
                label="Universitas / Institut"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="cth. Universitas Gadjah Mada"
                leftIcon={<Building2 className="w-4 h-4" />}
              />
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Perubahan profil berhasil disimpan!</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={savingProfile}
                icon={<Save className="w-4 h-4" />}
                className="font-bold shadow-sm cursor-pointer"
              >
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </div>

        {/* ── CARD 2: AI & PROVIDER SETTINGS ── */}
        <div className="bg-white rounded-3xl border border-border p-6 md:p-8 shadow-card space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#1F2937]">
                AI Engine & Provider Key
              </h2>
              <p className="text-xs text-gray-400">
                Pilih provider AI (OpenRouter atau Google Gemini) dan kelola API Key pribadi
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50 border border-border/80">
              <div>
                <h4 className="text-sm font-bold text-gray-800">
                  {activeProvider === "openrouter" ? "OpenRouter AI Engine" : "Google Gemini AI Engine"}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Model: <span className="font-mono text-primary font-bold">{activeProvider === "openrouter" ? openRouterModel : "gemini-2.5-flash"}</span>
                </p>
              </div>

              <span
                className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                  hasCustomApiKey
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-blue-100 text-blue-800 border border-blue-200"
                }`}
              >
                {hasCustomApiKey ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" /> API Key Pribadi Aktif
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" /> Fallback Default Server
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setApiKeyModalOpen(true)}
                className="flex-1 py-3 px-4 bg-primary text-white text-xs font-bold rounded-2xl hover:bg-primary-600 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                Ubah AI Provider & Masukkan API Key
              </button>
              <a
                href={activeProvider === "openrouter" ? "https://openrouter.ai/keys" : "https://aistudio.google.com/app/apikey"}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-gray-50 hover:bg-gray-100 border border-border text-gray-600 rounded-2xl transition-all cursor-pointer shadow-2xs"
                title="Buka Konsol Provider"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* ── CARD 3: DANGER ZONE (DOUBLE VERIFICATION ACCOUNT DELETION) ── */}
        <div className="bg-rose-50/40 rounded-3xl border border-rose-200/80 p-6 md:p-8 shadow-card space-y-5 animate-slide-up">
          <div className="flex items-center gap-3 pb-4 border-b border-rose-200/60">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-rose-950">
                Zona Berbahaya (Danger Zone)
              </h2>
              <p className="text-xs text-rose-700/70">
                Tindakan permanen terkait penghapusan data dan akun pengguna
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h4 className="text-sm font-bold text-rose-900">
                Hapus Akun Secara Permanen
              </h4>
              <p className="text-xs text-rose-700/80 leading-relaxed">
                Menghapus akun akan memusnahkan seluruh catatan kuliah, papan tugas, sesi pomodoro, asesmen gaya belajar, dan dokumen profil Anda secara permanen dengan <strong>sistem verifikasi ganda (Konfirmasi Teks + Kode OTP Email)</strong>.
              </p>
            </div>

            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleStartDeletion}
              icon={<Trash2 className="w-4 h-4" />}
              className="font-bold shadow-sm shrink-0 cursor-pointer"
            >
              Hapus Akun Saya
            </Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
