"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Brain,
  TrendingUp,
  Settings,
  Sparkles,
  LogOut,
  Menu,
  X,
  CheckSquare,
  Timer,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";

interface DashboardShellProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function DashboardShell({ children, fullWidth = false }: DashboardShellProps) {
  const { user, userDoc } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  const handleSignOut = async () => {
    await signOut();
    document.cookie = "auth-token=; path=/; max-age=0";
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Notes", href: "/notes", icon: FileText },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
    { name: "Pomodoro", href: "/pomodoro", icon: Timer },
    { name: "Academic Insight", href: "/insight", icon: Brain },
    { name: "Analytics", href: "/analytics", icon: TrendingUp },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const firstName = mounted
    ? userDoc?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || "Student"
    : "Student";
  const displayName = mounted
    ? userDoc?.name || user?.displayName || "Student"
    : "Student";
  const email = mounted ? user?.email || "" : "";

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-border">
      {/* Brand Logo */}
      <div className="p-6 border-b border-border flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shadow-md">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <span className="font-bold text-primary text-xl tracking-tight">MindFlow AI</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-primary hover:bg-primary-50 active:scale-[0.98]"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-primary"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-border bg-gray-50/50" suppressHydrationWarning>
        <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-2xl border border-border shadow-sm" suppressHydrationWarning>
          <div className="flex items-center gap-2.5 min-w-0" suppressHydrationWarning>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm shrink-0 ring-2 ring-primary/10" suppressHydrationWarning>
              {firstName[0]}
            </div>
            <div className="min-w-0" suppressHydrationWarning>
              <p className="text-xs font-semibold text-gray-800 truncate" suppressHydrationWarning>
                {displayName}
              </p>
              <p className="text-[10px] text-gray-400 truncate" suppressHydrationWarning>
                {email}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background" suppressHydrationWarning>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0" suppressHydrationWarning>
        {sidebarContent}
      </aside>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer body */}
          <div className="relative flex flex-col w-64 max-w-xs bg-white h-full shadow-2xl animate-[slide-in-left_0.2s_ease-out]">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="h-full">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen" suppressHydrationWarning>
        {/* Mobile Sticky Navbar */}
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-30 px-6 py-4 flex items-center justify-between" suppressHydrationWarning>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-gray-500 hover:text-primary hover:bg-gray-50 rounded-xl border border-border"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-primary tracking-tight">MindFlow AI</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-sm" suppressHydrationWarning>
            {firstName[0]}
          </div>
        </header>

        {/* Inner Content page */}
        <div className={`flex-1 w-full animate-fade-in ${
          fullWidth ? "p-4 md:p-6" : "max-w-7xl mx-auto p-6 md:p-8 space-y-8"
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
}
