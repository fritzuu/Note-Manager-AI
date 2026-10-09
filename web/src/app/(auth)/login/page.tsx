"use client";

import { useState, Suspense, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthField, AuthSubmit, AuthNotice, AuthDivider } from "@/components/auth/AuthControls";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthFormLoading } from "@/components/auth/AuthLoading";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { getUserDocument } from "@/lib/firestore";
import s from "@/components/auth/auth.module.css";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const busy = loading || googleLoading;

  async function continueToWorkspace(uid: string) {
    const userDoc = await getUserDocument(uid);
    router.push(userDoc?.assessmentCompleted ? "/dashboard" : "/assessment");
  }
  const setAuthCookie = (token: string) => { document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`; };

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const errors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Masukkan alamat email yang valid.";
    if (!password) errors.password = "Masukkan kata sandimu.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) { document.getElementById(errors.email ? "login-email" : "login-password")?.focus(); return; }
    setLoading(true);
    try {
      const credential = await signInWithEmail(email.trim(), password);
      setAuthCookie(await credential.user.getIdToken());
      await continueToWorkspace(credential.user.uid);
    } catch (err: unknown) {
      const { code } = err as { code?: string };
      setError(["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential"].includes(code ?? "") ? "Email atau kata sandi belum cocok. Periksa lagi dan coba masuk." : code === "auth/too-many-requests" ? "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi." : "Belum berhasil masuk. Silakan coba lagi.");
    } finally { setLoading(false); }
  }

  async function handleGoogleLogin() {
    if (busy) return;
    setError(null); setGoogleLoading(true);
    try {
      const { credential, isNewUser } = await signInWithGoogle();
      setAuthCookie(await credential.user.getIdToken());
      if (isNewUser) router.push("/assessment"); else await continueToWorkspace(credential.user.uid);
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== "auth/popup-closed-by-user") setError("Belum berhasil masuk dengan Google. Silakan coba lagi.");
    } finally { setGoogleLoading(false); }
  }

  return <>
    <div className={s.heading}><h1>Selamat datang<br />kembali.</h1><p>Ruang belajarmu menunggu.</p></div>
    {params.get("deleted") === "success" && <AuthNotice kind="success"><strong>Akun berhasil dihapus.</strong>Akun beserta catatan, tugas, dan profilmu telah dihapus.</AuthNotice>}
    {params.get("verified") === "pending" && <AuthNotice kind="info"><strong>Periksa emailmu.</strong>Buka tautan verifikasi di kotak masuk atau folder spam sebelum melanjutkan.</AuthNotice>}
    {error && <AuthNotice>{error}</AuthNotice>}
    <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} disabled={loading} label="Masuk dengan Google" />
    <AuthDivider />
    <form onSubmit={handleLogin} className={s.form} noValidate aria-busy={busy}>
      <AuthField label="Email" id="login-email" name="email" type="email" placeholder="nama@email.com" value={email} onChange={(event) => setEmail(event.target.value)} error={fieldErrors.email} autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={busy} />
      <AuthField label="Kata sandi" id="login-password" name="password" type="password" placeholder="Masukkan kata sandimu" value={password} onChange={(event) => setPassword(event.target.value)} error={fieldErrors.password} autoComplete="current-password" required disabled={busy} />
      <AuthSubmit type="submit" id="login-submit" loading={loading} disabled={googleLoading}>Masuk</AuthSubmit>
    </form>
    <p className={s.switch}>Belum punya akun?<Link href="/register">Buat akun</Link></p>
  </>;
}

export default function LoginPage() {
  return <Suspense fallback={<AuthFormLoading />}><LoginForm /></Suspense>;
}
