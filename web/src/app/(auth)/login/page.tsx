"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, Brain, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { BrandingPanel } from "@/components/auth/BrandingPanel";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { getUserDocument } from "@/lib/firestore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDeleted = searchParams.get("deleted") === "success";
  const isVerifiedPending = searchParams.get("verified") === "pending";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuthCookie = (token: string) => {
    document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credential = await signInWithEmail(email, password);
      const token = await credential.user.getIdToken();
      setAuthCookie(token);

      const userDoc = await getUserDocument(credential.user.uid);
      if (userDoc?.assessmentCompleted) {
        router.push("/dashboard");
      } else {
        router.push("/assessment");
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (
        firebaseError.code === "auth/user-not-found" ||
        firebaseError.code === "auth/wrong-password" ||
        firebaseError.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (firebaseError.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { credential, isNewUser } = await signInWithGoogle();
      const token = await credential.user.getIdToken();
      setAuthCookie(token);

      if (isNewUser) {
        router.push("/assessment");
      } else {
        const userDoc = await getUserDocument(credential.user.uid);
        if (userDoc?.assessmentCompleted) {
          router.push("/dashboard");
        } else {
          router.push("/assessment");
        }
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/popup-closed-by-user") {
        // User dismissed — no error needed
      } else {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-[60%] shrink-0">
        <BrandingPanel />
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Brain className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-primary">MindFlow AI</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#1F2937] tracking-tight">
              Selamat Datang Kembali
            </h2>
            <p className="text-gray-500 mt-2 text-base">
              Masuk ke akun MindFlow AI Anda
            </p>
          </div>

          {/* Account Deleted Success Notice */}
          {isDeleted && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex gap-3 items-start animate-scale-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm">Akun Berhasil Dihapus</p>
                <p className="font-normal mt-0.5 text-emerald-700">
                  Akun dan seluruh data catatan, tugas, serta profil Anda telah dimusnahkan secara permanen.
                </p>
              </div>
            </div>
          )}

          {/* Verification Pending Notice */}
          {isVerifiedPending && (
            <div className="mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex gap-3 items-start animate-scale-in">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm">Verifikasi Email Anda</p>
                <p className="font-normal mt-0.5 text-blue-700">
                  Tautan verifikasi telah dikirimkan ke email Anda. Silakan periksa inbox/spam sebelum melanjutkan.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex gap-2.5 items-start animate-scale-in">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <Input
              label="Alamat Email"
              type="email"
              id="login-email"
              placeholder="nama@kampus.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoComplete="email"
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-[#1F2937]"
                >
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full h-11 rounded-xl border border-border bg-white pl-10 pr-11 text-sm text-[#1F2937] placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2 font-bold cursor-pointer"
              id="login-submit"
            >
              Masuk ke Akun
            </Button>
          </form>

          <div className="relative my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-gray-400 font-medium">ATAU</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} label="Masuk dengan Google" />

          <p className="mt-8 text-center text-sm text-gray-500">
            Belum memiliki akun?{" "}
            <Link
              href="/register"
              className="text-primary font-semibold hover:text-primary-600 transition-colors"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background">Memuat...</div>}>
      <LoginForm />
    </Suspense>
  );
}
