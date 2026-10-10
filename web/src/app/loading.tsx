"use client";

import { usePathname } from "next/navigation";
import { isWorkspacePath } from "@/components/layout/WorkspaceFrame";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function Loading() {
  const pathname = usePathname();
  // Public pages do not need an account or workspace loading screen.
  if (!isWorkspacePath(pathname)) return null;
  return <LoadingScreen />;
}
