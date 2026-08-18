import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";

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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 1. Prevent extensions from polluting DOM with bis_skin_checked
                  var origSetAttribute = Element.prototype.setAttribute;
                  Element.prototype.setAttribute = function(name, value) {
                    if (name === 'bis_skin_checked' || name === 'data-bis-skin-checked') {
                      return;
                    }
                    return origSetAttribute.apply(this, arguments);
                  };

                  // 2. Filter console.error from extension hydration mismatches
                  var origError = console.error;
                  console.error = function() {
                    for (var i = 0; i < arguments.length; i++) {
                      var arg = arguments[i];
                      if (typeof arg === 'string' && (arg.indexOf('bis_skin_checked') !== -1 || (arg.indexOf('hydration') !== -1 && arg.indexOf('attribute') !== -1))) {
                        return;
                      }
                      if (arg && typeof arg === 'object') {
                        var str = String(arg.message || arg.stack || '');
                        if (str.indexOf('bis_skin_checked') !== -1) return;
                      }
                    }
                    origError.apply(console, arguments);
                  };
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-[#1F2937]" suppressHydrationWarning>
        <AuthProvider>
          <PomodoroProvider>
            {children}
          </PomodoroProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
