import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Academic Assessment — MindFlow AI",
  description: "Complete your Academic Insight profile to get personalized AI-powered recommendations.",
};

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
