import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — MindFlow AI",
  description: "Your AI-powered academic productivity dashboard.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
