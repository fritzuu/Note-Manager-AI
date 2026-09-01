"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Brain,
  AlertCircle,
  MailCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { BrandingPanel } from "@/components/auth/BrandingPanel";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signUpWithEmail, signInWithGoogle, sendVerificationEmail } from "@/lib/auth";

import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { reloadUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Verification Screen State
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const setAuthCookie = (token: string) => {
    document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = "Nama lengkap wajib diisi";
    if (!email.includes("@")) errors.email = "Masukkan alamat email yang valid";
    if (password.length < 8)
      errors.password = "Kata sandi minimal 8 karakter";
    if (password !== confirmPassword)
      errors.confirmPassword = "Konfirmasi kata sandi tidak cocok";
    return errors;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const credential = await signUpWithEmail(fullName.trim(), email.trim(), password);
      const token = await credential.user.getIdToken();
      setAuthCookie(token);

      setRegisteredEmail(email.trim());
      setVerificationSent(true);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/email-already-in-use") {
        setError("Email ini sudah terdaftar. Silakan masuk.");
      } else if (firebaseError.code === "auth/weak-password") {
        setError("Kata sandi terlalu lemah. Gunakan minimal 8 karakter.");
      } else {
        setError("Pendaftaran gagal. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setVerificationError(null);
    try {
      await sendVerificationEmail();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  const handleCheckAndProceed = async () => {
    setCheckingVerification(true);
    setVerificationError(null);
    try {
      const isVerified = await reloadUser();
      if (isVerified) {
        router.push("/assessment");
      } else {
        setVerificationError(
          "Tautan di Gmail belum dikonfirmasi. Buka email Anda dan klik tautan verifikasi terlebih dahulu."
        );
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setVerificationError(errObj.message || "Gagal memeriksa status email.");
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { credential } = await signInWithGoogle();
      const token = await credential.user.getIdToken();
      setAuthCookie(token);
      router.push("/assessment");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code !== "auth/popup-closed-by-user") {
        setError("Google sign-up failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Verification Sent Screen ──────────────────────────────────────────────
  if (verificationSent) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] shrink-0">
          <BrandingPanel />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
          <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-border shadow-card text-center animate-scale-in space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
              <MailCheck className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Verifikasi Email Telah Dikirim!
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Tautan verifikasi akun telah kami kirimkan ke:
              </p>
              <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/20 text-primary font-bold text-sm break-all font-mono">
                {registeredEmail}
              </div>
              <p className="text-xs text-gray-400 pt-1">
                Silakan buka kotak masuk atau folder spam email Anda, lalu klik tautan konfirmasi untuk mengaktifkan akun Anda.
              </p>
            </div>

            {verificationError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs font-bold text-left flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{verificationError}</span>
              </div>
            )}

            {resendSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-xs font-bold animate-fade-in">
                ✓ Email verifikasi baru berhasil dikirim ulang!
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                loading={checkingVerification}
                onClick={handleCheckAndProceed}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full font-bold shadow-sm cursor-pointer"
              >
                Saya Sudah Verifikasi / Lanjutkan
              </Button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-primary transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                <span>Kirim Ulang Email Verifikasi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] shrink-0">
        <BrandingPanel />
      </div>

      {/* Right: Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background overflow-y-auto">
        <div className="w-full max-w-md animate-slide-up py-4">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Brain className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-primary">MindFlow AI</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#1F2937] tracking-tight">
              Create your account
            </h2>
            <p className="text-gray-500 mt-2 text-base">
              Start your AI-powered academic journey today
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex gap-2.5 items-start animate-scale-in">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <Input
              label="Full Name"
              type="text"
              id="register-name"
              placeholder="Alex Johnson"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              error={fieldErrors.fullName}
              autoComplete="name"
              required
            />

            <Input
              label="Email address"
              type="email"
              id="register-email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              error={fieldErrors.email}
              autoComplete="email"
              required
            />

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="register-password" className="text-sm font-medium text-[#1F2937]">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={`w-full h-11 rounded-xl border bg-white pl-10 pr-11 text-sm text-[#1F2937] placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                    fieldErrors.password ? "border-red-400" : "border-border"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="register-confirm-password" className="text-sm font-medium text-[#1F2937]">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={`w-full h-11 rounded-xl border bg-white pl-10 pr-11 text-sm text-[#1F2937] placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                    fieldErrors.confirmPassword ? "border-red-400" : "border-border"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
              id="register-submit"
            >
              Create Account
            </Button>
          </form>

          <div className="relative my-5 flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <GoogleButton
            onClick={handleGoogleRegister}
            loading={googleLoading}
            label="Sign up with Google"
          />

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-semibold hover:text-primary-600 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
