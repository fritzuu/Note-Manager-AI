import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — MindFlow AI",
  description: "Sign in to your MindFlow AI account to access your academic productivity dashboard.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
