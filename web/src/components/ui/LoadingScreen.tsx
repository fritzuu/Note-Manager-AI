"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import s from "./loading-screen.module.css";

export interface LoadingScreenProps {
  label?: string;
  message?: string;
  subtext?: string;
  fullHeight?: boolean;
  className?: string;
  compact?: boolean;
}

export function LoadingScreen({
  label,
  message,
  subtext = "Sebentar lagi siap.",
  fullHeight = false,
  className = "",
  compact = false,
}: LoadingScreenProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 350);
    return () => window.clearTimeout(timer);
  }, []);
  const displayLabel = label || message || "Menyiapkan ruangmu";

  return <div data-loading-screen data-compact={compact || undefined} data-visible={visible} className={`${s.screen} ${fullHeight ? s.fullHeight : ""} ${compact ? s.compact : ""} ${className}`} role={visible ? "status" : undefined} aria-live={visible ? "polite" : undefined} aria-label={visible ? displayLabel : undefined} aria-hidden={!visible}>
    {visible && <>
    <div className={s.mark} aria-hidden="true">
      <div className={s.orbit} />
      <div className={s.innerOrbit} />
      <div className={s.logo}><Image src="/brand/cogniva/cogniva-symbol-color.svg" alt="" width={48} height={48} priority /></div>
      <span className={s.satellite} />
    </div>
    <h3 className={s.label}>{displayLabel}</h3>
    {subtext && <p className={s.subtext}>{subtext}</p>}
    <div className={s.track} aria-hidden="true"><span /></div>
    </>}
  </div>;
}
