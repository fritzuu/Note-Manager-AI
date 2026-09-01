"use client";

import { useEffect, useState } from "react";

/**
 * useMounted Hook
 * Returns true only after the component has mounted on the client.
 * Use this to safely guard against SSR / Client hydration mismatches
 * (e.g. when accessing localStorage, browser APIs, or time-dependent values).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
