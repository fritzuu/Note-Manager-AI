"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useModalDialog } from "@/components/modals/useModalDialog";
import styles from "./settings.module.css";
import {
  User,
  Mail,
  ShieldCheck,
  Key,
  ExternalLink,
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
  const [profileError, setProfileError] = useState("");
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

  const deletionDialogRef = useModalDialog(deletionModalOpen, () => { if (!otpSending && !otpVerifying) setDeletionModalOpen(false); });

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

    if (savingProfile || uploadingAvatar) return;
    setSavingProfile(true);
    setSaveSuccess(false);
    setProfileError("");

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
      setProfileError("Profil belum bisa disimpan. Coba lagi.");
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
        <LoadingScreen label="Memuat pengaturan…" subtext="" />
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
      {deletionModalOpen && createPortal(
        <div className={styles.modalLayer}>
          <div
            className={styles.backdrop}
            onClick={() => {
              if (!otpSending && !otpVerifying) setDeletionModalOpen(false);
            }}
          />

          <div ref={deletionDialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-account-title" tabIndex={-1} className={styles.dialog}>
            {/* Top Glow Ambient */}
            

            {/* Close Button */}
            <button
              type="button"
              disabled={otpSending || otpVerifying}
              onClick={() => setDeletionModalOpen(false)}
              aria-label="Tutup konfirmasi" className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon & Title */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-md shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-medium uppercase tracking-wider">
                  Konfirmasi penghapusan
                </div>
                <h3 id="delete-account-title" className="text-xl font-medium text-gray-900 tracking-tight">
                  Hapus akun dan data
                </h3>
              </div>
            </div>

            {/* Step Progress Indicators */}
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  deletionStep === 1
                    ? "bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-medium">
                  1
                </span>
                <span>Konfirmasi</span>
              </div>
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  deletionStep === 2
                    ? "bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-medium">
                  2
                </span>
                <span>Kode email</span>
              </div>
            </div>

            {deletionError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{deletionError}</span>
              </div>
            )}

            {/* ── STEP 1: TYPING CONFIRMATION PHRASE ── */}
            {deletionStep === 1 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1.5">
                  <p className="font-medium flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Data tidak bisa dikembalikan
                  </p>
                  <p>
                    Semua <strong>catatan, papan tugas, ringkasan AI, data profil, dan sesi fokus</strong> kamu akan dihapus permanen.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="delete-confirmation" className="text-xs font-medium text-gray-700 block">
                    Untuk melanjutkan, ketik kalimat di bawah ini:
                  </label>
                  <div className="p-2.5 bg-gray-100 rounded-xl border border-gray-300 font-mono text-xs font-medium text-gray-800 select-all text-center">
                    {REQUIRED_PHRASE}
                  </div>
                  <input
                    type="text"
                    id="delete-confirmation"
                    value={confirmationPhrase}
                    onChange={(e) => setConfirmationPhrase(e.target.value)}
                    placeholder="Ketik kalimat konfirmasi di sini..."
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-medium transition-all focus:outline-none focus:ring-2 ${
                      confirmationPhrase === REQUIRED_PHRASE
                        ? "border-emerald-500 bg-emerald-50/30 text-emerald-900 focus:ring-emerald-500/20"
                        : "border-border bg-white text-gray-800 focus:ring-rose-500/20 focus:border-rose-400"
                    }`}
                  />
                  {confirmationPhrase === REQUIRED_PHRASE && (
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Kalimat konfirmasi cocok
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeletionModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border border-border text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <Button
                    variant="danger"
                    size="md"
                    disabled={confirmationPhrase !== REQUIRED_PHRASE || otpSending}
                    loading={otpSending}
                    onClick={handleRequestOtp}
                    icon={<ArrowRight className="w-4 h-4" />}
                    className="font-medium shadow-md cursor-pointer"
                  >
                    Kirim kode email
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: EMAIL OTP VERIFICATION ── */}
            {deletionStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs leading-relaxed space-y-1.5">
                  <p className="font-medium flex items-center gap-1.5 text-blue-800">
                    <MailCheck className="w-4 h-4 text-blue-600" /> Kode Verifikasi Terkirim
                  </p>
                  <p>
                    Kami telah mengirimkan kode 6 digit ke email:{" "}
                    <span className="font-medium text-blue-950 underline">{user?.email}</span>.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="delete-email-code" className="text-xs font-medium text-gray-700 block text-center">
                    Masukkan kode 6 digit
                  </label>
                  <input
                    type="text"
                    id="delete-email-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center px-4 py-3.5 rounded-2xl border border-gray-300 bg-white font-mono text-2xl font-medium tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 shadow-inner"
                  />
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                    <span className="text-gray-500 font-semibold">Kode berlaku 10 menit</span>
                    <button
                      type="button"
                      disabled={otpSending || resendCooldown > 0}
                      onClick={handleRequestOtp}
                      className="text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:no-underline"
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
                    className="px-4 py-2.5 rounded-2xl border border-border text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
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
                    className="font-medium shadow-lg shadow-rose-500/20 cursor-pointer"
                  >
                    Hapus akun permanen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>, document.body
      )}

      <main className={styles.page}>
        <header className={styles.header}><h1>Pengaturan</h1><p>Profil dan preferensi untuk ruang belajarmu.</p></header>
        <section className={styles.section} aria-labelledby="profile-heading">
          <div className={styles.sectionHeading}><User size={21} /><h2 id="profile-heading">Profil</h2><p>Nama dan foto ini akan tampil di seluruh aplikasi.</p></div>
          <div className={styles.panel}>
            <div className={styles.photoRow}>
              <div className={styles.avatar}>
                {avatarUrl ? <Image src={avatarUrl} alt="Foto profil" fill sizes="80px" className={styles.avatarImage} unoptimized /> : <span>{(name || user.email || "U")[0].toUpperCase()}</span>}
                {uploadingAvatar && <div className={styles.uploading}><Loader2 size={22} className="animate-spin" /></div>}
              </div>
              <div className={styles.photoDetails}><strong>Foto profil</strong><p>JPG, PNG, atau WebP. Maksimal 10 MB.</p><button type="button" className={styles.outlineButton} disabled={uploadingAvatar || savingProfile} onClick={() => fileInputRef.current?.click()}><Camera size={15} />{uploadingAvatar ? "Mengunggah…" : "Ganti foto"}</button></div>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/jpeg,image/png,image/webp" hidden />
            </div>
            {avatarError && <p className={styles.error} role="alert">{avatarError}</p>}
            <form onSubmit={handleSaveProfile} className={styles.form}>
              <div className={styles.fields}>
                <Input label="Nama lengkap" value={name} onChange={e => { setName(e.target.value); setSaveSuccess(false); }} placeholder="Nama kamu" required disabled={savingProfile} />
                <div className={styles.emailField}><span>Email</span><div><Mail size={16} /><span>{user.email}</span></div><small>Email akun tidak bisa diubah di sini.</small></div>
                <Input label="Jurusan" value={major} onChange={e => { setMajor(e.target.value); setSaveSuccess(false); }} placeholder="Contoh: Teknik Informatika" leftIcon={<GraduationCap size={16} />} disabled={savingProfile} />
                <Input label="Kampus" value={university} onChange={e => { setUniversity(e.target.value); setSaveSuccess(false); }} placeholder="Nama kampus" leftIcon={<Building2 size={16} />} disabled={savingProfile} />
              </div>
              {profileError && <p className={styles.error} role="alert">{profileError}</p>}
              <div className={styles.formFooter}><span role="status">{saveSuccess && <><Check size={16} />Profil tersimpan</>}</span><Button type="submit" loading={savingProfile} disabled={uploadingAvatar} icon={<Save size={16} />} className={styles.primaryButton}>Simpan perubahan</Button></div>
            </form>
          </div>
        </section>
        <section className={styles.section} aria-labelledby="connection-heading">
          <div className={styles.sectionHeading}><Key size={21} /><h2 id="connection-heading">Koneksi asisten</h2><p>Atur layanan untuk percakapan dan rangkuman catatanmu.</p></div>
          <div className={styles.panel}>
            <div className={styles.connectionRow}><div><h3>{activeProvider === "openrouter" ? "OpenRouter" : "Google Gemini"}</h3><p>{hasCustomApiKey ? "Menggunakan kunci pribadi di perangkat ini." : "Menggunakan koneksi bawaan aplikasi."}</p></div><span className={styles.badge}><ShieldCheck size={14} />{hasCustomApiKey ? "Kunci pribadi" : "Bawaan"}</span></div>
            <details className={styles.details}><summary>Detail layanan</summary><p>Model: <span>{activeProvider === "openrouter" ? openRouterModel : "gemini-2.5-flash"}</span></p></details>
            <div className={styles.connectionActions}><button type="button" onClick={() => setApiKeyModalOpen(true)} className={styles.outlineButton}><Key size={16} />Atur koneksi</button><a href={activeProvider === "openrouter" ? "https://openrouter.ai/keys" : "https://aistudio.google.com/app/apikey"} target="_blank" rel="noreferrer" className={styles.textLink}>Buka layanan<ExternalLink size={14} /></a></div>
          </div>
        </section>
        <section className={styles.section} aria-labelledby="account-heading">
          <div className={styles.sectionHeading}><ShieldCheck size={21} /><h2 id="account-heading">Akun</h2><p>Kelola akun dan data yang tersimpan.</p></div>
          <div className={`${styles.panel} ${styles.accountPanel}`}><div><h3>Hapus akun</h3><p>Catatan, tugas, rangkuman, profil, dan sesi fokus akan dihapus permanen. Kamu perlu mengonfirmasi lewat kode email.</p></div><button type="button" onClick={handleStartDeletion} className={styles.dangerButton}><Trash2 size={16} />Hapus akun</button></div>
        </section>
      </main>
    </DashboardShell>
  );
}
