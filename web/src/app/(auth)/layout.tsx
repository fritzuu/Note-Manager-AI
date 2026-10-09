import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Cogniva — Ruang belajarmu",
  description: "Masuk atau buat akun Cogniva untuk catatan, tugas, dan fokus dalam satu ruang.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
