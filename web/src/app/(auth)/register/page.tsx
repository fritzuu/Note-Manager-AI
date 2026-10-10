"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, RefreshCw } from "lucide-react";
import { AuthField, AuthSubmit, AuthNotice, AuthDivider } from "@/components/auth/AuthControls";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { googleAuthErrorMessage } from "@/lib/authErrors";
import { signUpWithEmail, signInWithGoogle, sendVerificationEmail } from "@/lib/auth";
import { getUserDocument } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import s from "@/components/auth/auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const { reloadUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const busy = loading || googleLoading;

  const setAuthCookie = (token: string) => { document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`; };

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = "Isi nama lengkapmu.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Masukkan alamat email yang valid.";
    if (password.length < 8) errors.password = "Gunakan minimal 8 karakter.";
    if (!confirmPassword) errors.confirmPassword = "Ulangi kata sandimu.";
    else if (password !== confirmPassword) errors.confirmPassword = "Kedua kata sandi belum cocok.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const ids = { fullName: "register-name", email: "register-email", password: "register-password", confirmPassword: "register-confirm-password" };
      document.getElementById(ids[Object.keys(errors)[0] as keyof typeof ids])?.focus();
      return;
    }
    setLoading(true);
    try {
      const credential = await signUpWithEmail(fullName.trim(), email.trim(), password);
      setAuthCookie(await credential.user.getIdToken());
      setRegisteredEmail(email.trim()); setVerificationSent(true);
    } catch (err: unknown) {
      const { code } = err as { code?: string };
      setError(code === "auth/email-already-in-use" ? "Email ini sudah terdaftar. Kamu bisa masuk menggunakan akunmu." : code === "auth/weak-password" ? "Kata sandi terlalu lemah. Gunakan minimal 8 karakter." : "Belum berhasil membuat akun. Silakan coba lagi.");
    } finally { setLoading(false); }
  }

  async function handleGoogleRegister() {
    if (busy) return;
    setError(null); setGoogleLoading(true);
    try {
      const { userDoc } = await signInWithGoogle();
      // Fresh navigation avoids reusing a protected-route redirect prefetched before login.
      window.location.assign(userDoc?.assessmentCompleted ? "/dashboard" : "/assessment");
    } catch (err: unknown) {
      setError(googleAuthErrorMessage(err));
    } finally { setGoogleLoading(false); }
  }

  async function handleResendVerification() {
    if (resending || checkingVerification) return;
    setResending(true); setResendSuccess(false); setVerificationError(null);
    try { await sendVerificationEmail(); setResendSuccess(true); }
    catch { setVerificationError("Email belum berhasil dikirim ulang. Tunggu sebentar lalu coba lagi."); }
    finally { setResending(false); }
  }

  async function handleCheckAndProceed() {
    if (checkingVerification || resending) return;
    setCheckingVerification(true); setVerificationError(null);
    try {
      if (await reloadUser()) router.push("/assessment");
      else setVerificationError("Emailmu belum terverifikasi. Buka email dan klik tautan verifikasi, lalu coba lagi.");
    } catch { setVerificationError("Status email belum bisa diperiksa. Silakan coba lagi."); }
    finally { setCheckingVerification(false); }
  }

  if (verificationSent) return <>
    <div className={s.verificationIcon}><MailCheck size={34} /></div>
    <div className={s.heading}><h1>Satu langkah<br />lagi.</h1><p>Buka tautan verifikasi yang dikirim ke:</p></div>
    <p className={s.email}>{registeredEmail}</p>
    <p className={s.verifyText}>Periksa kotak masuk atau folder spam, lalu klik tautannya untuk mengaktifkan akunmu.</p>
    {verificationError && <AuthNotice>{verificationError}</AuthNotice>}
    {resendSuccess && <AuthNotice kind="success">Email verifikasi berhasil dikirim ulang.</AuthNotice>}
    <AuthSubmit onClick={handleCheckAndProceed} loading={checkingVerification} disabled={resending}>Sudah verifikasi</AuthSubmit>
    <button className={s.resend} onClick={handleResendVerification} disabled={resending || checkingVerification}><RefreshCw size={16} className={resending ? s.spinner : undefined} />{resending ? "Mengirim email…" : "Kirim ulang email"}</button>
    <p className={s.verifyLogin}><Link href="/login">Kembali ke halaman masuk</Link></p>
  </>;

  return <>
    <div className={s.heading}><h1>Buat ruang<br />belajarmu.</h1><p>Satu akun untuk catatan, tugas, dan fokusmu.</p></div>
    {error && <AuthNotice>{error}</AuthNotice>}
    <GoogleButton onClick={handleGoogleRegister} loading={googleLoading} disabled={loading} label="Daftar dengan Google" />
    <AuthDivider />
    <form onSubmit={handleRegister} className={s.form} noValidate aria-busy={busy}>
      <AuthField label="Nama lengkap" id="register-name" name="name" placeholder="Nama kamu" value={fullName} onChange={(event) => setFullName(event.target.value)} error={fieldErrors.fullName} autoComplete="name" required disabled={busy} />
      <AuthField label="Email" id="register-email" name="email" type="email" placeholder="nama@email.com" value={email} onChange={(event) => setEmail(event.target.value)} error={fieldErrors.email} autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={busy} />
      <AuthField label="Kata sandi" id="register-password" name="password" type="password" placeholder="Minimal 8 karakter" value={password} onChange={(event) => setPassword(event.target.value)} error={fieldErrors.password} autoComplete="new-password" required disabled={busy} />
      <AuthField label="Konfirmasi kata sandi" id="register-confirm-password" name="confirmPassword" type="password" placeholder="Ulangi kata sandimu" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} error={fieldErrors.confirmPassword} autoComplete="new-password" required disabled={busy} />
      <AuthSubmit type="submit" id="register-submit" loading={loading} disabled={googleLoading}>Buat akun</AuthSubmit>
    </form>
    <p className={s.switch}>Sudah punya akun?<Link href="/login">Masuk</Link></p>
  </>;
}
