"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ChevronUp,
  Key,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { getCustomApiKey } from "@/lib/aiConfig";
import { AiApiKeyModal } from "@/components/modals/AiApiKeyModal";

interface DashboardShellProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function DashboardShell({ children, fullWidth = false }: DashboardShellProps) {
  const { user, userDoc } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [hasCustomApiKey, setHasCustomApiKey] = useState(false);
  const [mounted, setMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setHasCustomApiKey(!!getCustomApiKey());

    const handleKeyUpdate = () => {
      setHasCustomApiKey(!!getCustomApiKey());
    };

    window.addEventListener("mindflow-api-key-updated", handleKeyUpdate);
    return () => window.removeEventListener("mindflow-api-key-updated", handleKeyUpdate);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    document.cookie = "auth-token=; path=/; max-age=0";
    router.push("/login");
  };

  // Main navigation items (Settings is now in User Profile Menu)
  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Notes", href: "/notes", icon: FileText },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
    { name: "Pomodoro", href: "/pomodoro", icon: Timer },
    { name: "Academic Insight", href: "/insight", icon: Brain },
    { name: "Analytics", href: "/analytics", icon: TrendingUp },
  ];

  const firstName = mounted
    ? userDoc?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || "Student"
    : "Student";
  const displayName = mounted
    ? userDoc?.name || user?.displayName || "Student"
    : "Student";
  const email = mounted ? user?.email || "" : "";

  const userDropdownMenu = (
    <div
      ref={userMenuRef}
      className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl border border-border shadow-xl p-2 z-50 animate-scale-in"
    >
      {/* User Header */}
      <div className="p-3 border-b border-border/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
          {firstName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-gray-900 truncate">{displayName}</p>
            <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.2 rounded-full">
              Student
            </span>
          </div>
          <p className="text-[11px] text-gray-400 truncate">{email}</p>
        </div>
      </div>

      {/* Menu Options */}
      <div className="py-1 space-y-0.5">
        {/* Custom AI API Key Option */}
        <button
          onClick={() => {
            setUserMenuOpen(false);
            setApiKeyModalOpen(true);
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-gray-700 hover:bg-primary-50 hover:text-primary transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <Key className="w-3.5 h-3.5" />
            </div>
            <span>AI API Key Setup</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
              hasCustomApiKey
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {hasCustomApiKey ? (
              <>
                <ShieldCheck className="w-3 h-3" /> Custom
              </>
            ) : (
              <>
                <Cpu className="w-3 h-3" /> System
              </>
            )}
          </span>
        </button>

        {/* Settings Option */}
        <Link
          href="/settings"
          onClick={() => {
            setUserMenuOpen(false);
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
            pathname === "/settings"
              ? "bg-primary text-white"
              : "text-gray-700 hover:bg-primary-50 hover:text-primary"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              pathname === "/settings"
                ? "bg-white/20 text-white"
                : "bg-gray-100 text-gray-500 group-hover:bg-primary group-hover:text-white"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </div>
          <span>Account Settings</span>
        </Link>
      </div>

      {/* Logout Divider & Action */}
      <div className="pt-1 mt-1 border-t border-border/60">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <div className="w-6 h-6 rounded-lg bg-red-100/60 text-red-600 flex items-center justify-center">
            <LogOut className="w-3.5 h-3.5" />
          </div>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-border relative">
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

      {/* User Profile Avatar / Menu Trigger at Bottom */}
      <div className="p-4 border-t border-border bg-gray-50/50 relative" suppressHydrationWarning>
        {userMenuOpen && userDropdownMenu}

        <button
          onClick={() => setUserMenuOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between gap-3 p-2 rounded-2xl border transition-all duration-200 cursor-pointer text-left ${
            userMenuOpen
              ? "bg-white border-primary shadow-md ring-2 ring-primary/10"
              : "bg-white border-border shadow-sm hover:border-primary/50 hover:bg-primary-50/20"
          }`}
          suppressHydrationWarning
        >
          <div className="flex items-center gap-2.5 min-w-0" suppressHydrationWarning>
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm shrink-0 ring-2 ring-primary/10 relative"
              suppressHydrationWarning
            >
              {firstName[0]}
              {hasCustomApiKey && (
                <span
                  title="Custom AI Key Active"
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"
                />
              )}
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
          <div className="p-1 text-gray-400 shrink-0">
            <ChevronUp
              className={`w-4 h-4 transition-transform duration-200 ${
                userMenuOpen ? "rotate-180 text-primary" : ""
              }`}
            />
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background" suppressHydrationWarning>
      {/* Custom AI API Key Modal */}
      <AiApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />

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
          <button
            onClick={() => setApiKeyModalOpen(true)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-sm ring-2 ring-primary/10 cursor-pointer"
            suppressHydrationWarning
          >
            {firstName[0]}
          </button>
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
