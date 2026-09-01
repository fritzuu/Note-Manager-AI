"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  MailCheck,
  RefreshCw,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { sendVerificationEmail, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

interface EmailVerificationGatekeeperProps {
  children: React.ReactNode;
}

export function EmailVerificationGatekeeper({
  children,
}: EmailVerificationGatekeeperProps) {
  const { user, loading, reloadUser } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Check if current user is password-based and unverified
  const isPasswordProvider =
    user?.providerData?.some((p) => p.providerId === "password") ||
    user?.providerData?.length === 0;
  const isUnverified = user && !user.emailVerified && isPasswordProvider;

  // Auto-check on window focus when user returns from opening their email tab
  useEffect(() => {
    if (!isUnverified) return;

    const handleFocus = async () => {
      try {
        await reloadUser();
      } catch {
        // ignore
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isUnverified, reloadUser]);

  const handleCheckVerification = async () => {
    setChecking(true);
    setErrorMessage(null);
    try {
      const verified = await reloadUser();
      if (verified) {
        // Successfully verified!
        router.refresh();
      } else {
        setErrorMessage(
          "Tautan di email belum diklik. Silakan buka kotak masuk email Anda dan klik tautan konfirmasi terlebih dahulu."
        );
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setErrorMessage(errorObj.message || "Gagal memeriksa status verifikasi.");
    } finally {
      setChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setErrorMessage(null);
    try {
      await sendVerificationEmail(user);
      setResendSuccess(true);
      setResendCooldown(60);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setErrorMessage(
        errorObj.message || "Gagal mengirim ulang email verifikasi. Coba beberapa saat lagi."
      );
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    document.cookie = "auth-token=; path=/; max-age=0";
    document.cookie = "__session=; path=/; max-age=0";
    router.replace("/login");
  };

  // If still loading auth or user is already verified (or using Google Sign-In), render children
  if (loading || !isUnverified) {
    return <>{children}</>;
  }

  // ── Verification Gatekeeper Screen ──────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-border text-center animate-scale-in space-y-6 overflow-hidden">
        {/* Top Glow Ambient */}
        <div className="absolute top-0 right-0 left-0 h-28 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent pointer-events-none" />

        {/* Icon Header */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner border border-primary/20">
            <MailCheck className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-1 right-1/2 translate-x-7 bg-amber-500 text-white p-1.5 rounded-full ring-4 ring-white shadow-xs">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Explanation */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Verifikasi Akun Diperlukan
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Untuk memastikan keamanan akun Anda, silakan lakukan konfirmasi email yang telah kami kirimkan ke:
          </p>
          <div className="p-3 bg-primary/5 rounded-2xl border border-primary/20 text-primary font-bold text-sm break-all font-mono">
            {user?.email}
          </div>
        </div>

        {/* Action Guide Steps */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-border text-left space-y-2 text-xs text-gray-700">
          <p className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
            📋 Langkah Mudah:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-gray-600 font-medium leading-relaxed pl-1">
            <li>Buka tab / aplikasi <strong>Gmail</strong> Anda.</li>
            <li>Cari email verifikasi dari <strong>MindFlow AI</strong> (cek juga folder <em>Spam / Promosi</em>).</li>
            <li>Klik tautan konfirmasi di dalam email.</li>
            <li>Klik tombol <strong>"Saya Sudah Verifikasi / Masuk"</strong> di bawah.</li>
          </ol>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2 text-left animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tautan verifikasi baru berhasil dikirimkan ke email Anda!</span>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleCheckVerification}
            loading={checking}
            icon={<CheckCircle2 className="w-5 h-5" />}
            className="w-full font-extrabold shadow-md shadow-primary/25 cursor-pointer py-3.5 text-sm"
          >
            Saya Sudah Verifikasi / Masuk
          </Button>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              disabled={resending || resendCooldown > 0}
              onClick={handleResendEmail}
              className="text-xs font-bold text-gray-500 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
              <span>
                {resendCooldown > 0
                  ? `Kirim Ulang Email (${resendCooldown}s)`
                  : "Kirim Ulang Email Verifikasi"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar / Ganti Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
