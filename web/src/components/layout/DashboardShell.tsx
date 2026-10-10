"use client";

import { createContext, useContext, useEffect, useRef, useState, useId, type ReactNode } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, MessageSquare, Brain, TrendingUp, Settings, LogOut, Menu, X, CheckSquare, Timer, ChevronUp, Key, User, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { getCustomApiKey } from "@/lib/aiConfig";
import { AiApiKeyModal } from "@/components/modals/AiApiKeyModal";
import { EmailVerificationGatekeeper } from "@/components/auth/EmailVerificationGatekeeper";
import ds from "./dashboard-shell.module.css";

const navigation = [
  { label: "Ruangmu", items: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Catatan", href: "/notes", icon: FileText },
    { name: "Tugas", href: "/tasks", icon: CheckSquare },
    { name: "Sesi fokus", href: "/pomodoro", icon: Timer },
  ] },
  { label: "Belajar", items: [
    { name: "Asisten", href: "/assistant", icon: MessageSquare },
    { name: "Pola belajar", href: "/insight", icon: Brain },
    { name: "Aktivitas", href: "/analytics", icon: TrendingUp },
  ] },
];

const ShellContext = createContext(false);
type ShellProps = { children: ReactNode; fullWidth?: boolean };

// Pages can still declare a shell, while navigation keeps one shared instance alive.
export function DashboardShell({ children, fullWidth = false }: ShellProps) {
  const hasShell = useContext(ShellContext);
  if (hasShell) return <>{children}</>;
  return <ShellContext.Provider value={true}><DashboardShellFrame fullWidth={fullWidth}>{children}</DashboardShellFrame></ShellContext.Provider>;
}

function DashboardShellFrame({ children, fullWidth = false }: ShellProps) {
  const { user, userDoc } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const accountId = useId();
  const sidebarId = useId();
  const [collapsed, setCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; left: number; top: number } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [hasCustomApiKey, setHasCustomApiKey] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    try { setCollapsed(localStorage.getItem("cogniva_sidebar_collapsed") === "true"); } catch { /* Sidebar stays usable without browser storage. */ }
    const update = () => setHasCustomApiKey(!!getCustomApiKey());
    update();
    window.addEventListener("mindflow-api-key-updated", update);
    return () => window.removeEventListener("mindflow-api-key-updated", update);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); setUserMenuOpen(false); setTooltip(null); }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const outside = (event: PointerEvent) => { if (!accountRef.current?.contains(event.target as Node)) setUserMenuOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setUserMenuOpen(false); accountButtonRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (accountRef.current?.querySelector('[data-account-panel]')) return;
        setMobileMenuOpen(false); return;
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onDesktop = () => { if (desktop.matches) setMobileMenuOpen(false); };
    desktop.addEventListener("change", onDesktop);
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); desktop.removeEventListener("change", onDesktop); previous?.focus(); };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!tooltip) return;
    const hide = () => setTooltip(null);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => { document.removeEventListener("keydown", escape); window.removeEventListener("scroll", hide, true); window.removeEventListener("resize", hide); };
  }, [tooltip]);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next); setUserMenuOpen(false); setTooltip(null);
    try { localStorage.setItem("cogniva_sidebar_collapsed", String(next)); } catch { /* Keep the current choice for this page. */ }
  };
  const showLabel = (element: HTMLElement, label: string) => {
    if (!collapsed || !window.matchMedia("(min-width: 768px)").matches) return;
    const rect = element.getBoundingClientRect();
    setTooltip({ label, left: rect.right + 16, top: rect.top + rect.height / 2 });
  };
  const closeNavigation = () => { setMobileMenuOpen(false); setUserMenuOpen(false); };
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const name = mounted ? userDoc?.name || user?.displayName || "Akunmu" : "Akunmu";
  const detail = mounted ? userDoc?.major || user?.email || "Pengaturan akun" : "Pengaturan akun";
  const avatar = mounted ? userDoc?.avatarUrl || user?.photoURL : null;
  const avatarContent = avatar ? <Image src={avatar} alt="" fill sizes="40px" className={ds.avatarImage} unoptimized /> : <span>{Array.from(name.trim())[0]?.toUpperCase() || "U"}</span>;
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true); setSignOutError("");
    try {
      await signOut();
      document.cookie = "auth-token=; path=/; max-age=0";
      document.cookie = "__session=; path=/; max-age=0";
      closeNavigation(); router.push("/");
    } catch { setSignOutError("Belum bisa keluar. Coba lagi."); setSigningOut(false); }
  };

  return <div className={ds.shell}>
    {tooltip && mounted && createPortal(<div role="tooltip" className={ds.navTooltip} style={{ left: tooltip.left, top: tooltip.top }}>{tooltip.label}</div>, document.body)}
    <AiApiKeyModal isOpen={apiKeyModalOpen} onClose={() => setApiKeyModalOpen(false)} />
    {mobileMenuOpen && <div className={ds.drawerBackdrop} onClick={closeNavigation} aria-hidden="true" />}
    <aside ref={sidebarRef} id={sidebarId} className={ds.sidebar} data-collapsed={collapsed} data-open={mobileMenuOpen} role={mobileMenuOpen ? "dialog" : undefined} aria-modal={mobileMenuOpen ? true : undefined} aria-label="Navigasi utama">
      <div className={ds.brandRow}><Link href="/dashboard" onClick={closeNavigation} aria-label="Cogniva, buka dashboard"><Image src="/brand/cogniva/cogniva-horizontal-color.svg" alt="Cogniva" width={146} height={42} className={ds.brand} priority /><Image src="/brand/cogniva/cogniva-symbol-color.svg" alt="" width={32} height={32} className={ds.brandSymbol} /></Link><button ref={drawerCloseRef} type="button" className={ds.drawerClose} onClick={closeNavigation} aria-label="Tutup navigasi"><X size={20} /></button></div>
      <button type="button" className={ds.collapseButton} onClick={toggleSidebar} aria-label={collapsed ? "Buka sidebar" : "Ringkas sidebar"} aria-expanded={!collapsed} aria-controls={sidebarId}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
      <nav className={ds.navigation} aria-label="Halaman">{navigation.map(group => <div key={group.label} className={ds.navGroup}><p className={ds.groupLabel}>{group.label}</p>{group.items.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={ds.navLink} aria-label={item.name} onMouseEnter={event => showLabel(event.currentTarget, item.name)} onMouseLeave={() => setTooltip(null)} onFocus={event => showLabel(event.currentTarget, item.name)} onBlur={() => setTooltip(null)} onClick={closeNavigation}><Icon size={19} strokeWidth={1.65} /><span>{item.name}</span>{active(item.href) && <i aria-hidden="true" />}</Link>; })}</div>)}</nav>
      <div className={ds.sidebarFooter}>
        <Link href="/settings" className={ds.navLink} aria-current={active("/settings") ? "page" : undefined} aria-label="Pengaturan" onMouseEnter={event => showLabel(event.currentTarget, "Pengaturan")} onMouseLeave={() => setTooltip(null)} onFocus={event => showLabel(event.currentTarget, "Pengaturan")} onBlur={() => setTooltip(null)} onClick={closeNavigation}><Settings size={19} strokeWidth={1.65} /><span>Pengaturan</span></Link>
        <div ref={accountRef} className={ds.account}>
          {userMenuOpen && <div id={accountId} data-account-panel className={ds.accountPanel}>
            <div className={ds.accountHeading}><strong>{name}</strong><span>{mounted ? user?.email : ""}</span></div>
            <Link href="/settings" onClick={closeNavigation}><User size={17} /><span>Profil</span></Link>
            <Link href="/assessment" onClick={closeNavigation}><BookOpen size={17} /><span>Gaya belajar<small>{userDoc?.assessmentCompleted ? "Sudah diisi" : "Belum diisi"}</small></span></Link>
            <button type="button" onClick={() => { closeNavigation(); setApiKeyModalOpen(true); }}><Key size={17} /><span>Koneksi asisten<small>{hasCustomApiKey ? "Key pribadi" : "Koneksi bawaan"}</small></span></button>
            <div className={ds.signOut}><button type="button" disabled={signingOut} onClick={handleSignOut}><LogOut size={17} /><span>{signingOut ? "Keluar…" : "Keluar"}</span></button>{signOutError && <p role="alert">{signOutError}</p>}</div>
          </div>}
          <button ref={accountButtonRef} type="button" className={ds.accountButton} aria-expanded={userMenuOpen} aria-controls={userMenuOpen ? accountId : undefined} aria-label={`Menu akun ${name}`} onClick={() => { setTooltip(null); setUserMenuOpen(previous => !previous); }}><span className={ds.avatar}>{avatarContent}</span><span className={ds.accountText}><strong>{name}</strong><span>{detail}</span></span><ChevronUp size={16} className={ds.accountChevron} data-open={userMenuOpen} /></button>
        </div>
      </div>
    </aside>
    <div className={ds.main}>
      <header className={ds.mobileHeader}><button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Buka navigasi" aria-expanded={mobileMenuOpen}><Menu size={21} /></button><Link href="/dashboard"><Image src="/brand/cogniva/cogniva-horizontal-color.svg" alt="Cogniva" width={112} height={32} className={ds.mobileBrand} /></Link><Link href="/settings" aria-label="Pengaturan akun" className={ds.mobileAvatar}>{avatarContent}</Link></header>
      <div className={pathname === "/dashboard" ? ds.content : fullWidth ? ds.fullWidthContent : ds.pageContent}><EmailVerificationGatekeeper>{children}</EmailVerificationGatekeeper></div>
    </div>
  </div>;
}
