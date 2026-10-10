"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "./DashboardShell";
import s from "./workspace-frame.module.css";

const workspaceRoutes = ["dashboard", "notes", "tasks", "pomodoro", "assistant", "insight", "assessment", "analytics", "settings"];

export function isWorkspacePath(pathname: string) {
  return workspaceRoutes.includes(pathname.split("/")[1]);
}

export function WorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const section = pathname.split("/")[1];
  if (!isWorkspacePath(pathname)) return <>{children}</>;

  const fullWidth = section === "tasks" || (section === "notes" && pathname !== "/notes");
  return <DashboardShell fullWidth={fullWidth}>
    <div key={pathname} className={s.routeSurface}>{children}</div>
  </DashboardShell>;
}
