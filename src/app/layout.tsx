import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MindFlow AI — Academic Productivity Platform",
  description:
    "MindFlow AI is an AI-powered academic productivity platform that helps students optimize their study habits, track progress, and achieve academic excellence.",
  keywords: ["academic", "AI", "productivity", "study", "students"],
  openGraph: {
    title: "MindFlow AI",
    description: "AI-powered academic productivity platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-background text-[#1F2937]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
