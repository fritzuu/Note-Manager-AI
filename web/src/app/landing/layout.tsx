import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Cogniva — Belajar lebih terarah",
  description: "Catatan, prioritas, dan fokus dalam satu ruang. Kenali Cogniva dan jelajahi fitur belajarnya.",
  openGraph: {
    title: "Cogniva — Belajar lebih terarah",
    description: "Catatan, prioritas, dan fokus dalam satu ruang.",
    type: "website",
  },
  icons: { icon: "/brand/cogniva/favicon.ico", apple: "/brand/cogniva/cogniva-app-icon-256.png" },
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  return children;
}
