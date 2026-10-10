import Image from "next/image";
import s from "./loading-screen.module.css";

export interface LoadingScreenProps {
  label?: string;
  message?: string;
  subtext?: string;
  fullHeight?: boolean;
  className?: string;
}

export function LoadingScreen({
  label,
  message,
  subtext = "Sebentar lagi siap.",
  fullHeight = false,
  className = "",
}: LoadingScreenProps) {
  const displayLabel = label || message || "Menyiapkan ruangmu";

  return <div data-loading-screen className={`${s.screen} ${fullHeight ? s.fullHeight : ""} ${className}`} role="status" aria-live="polite" aria-label={displayLabel}>
    <div className={s.mark} aria-hidden="true">
      <div className={s.orbit} />
      <div className={s.innerOrbit} />
      <div className={s.logo}><Image src="/brand/cogniva/cogniva-symbol-color.svg" alt="" width={48} height={48} priority /></div>
      <span className={s.satellite} />
    </div>
    <h3 className={s.label}>{displayLabel}</h3>
    {subtext && <p className={s.subtext}>{subtext}</p>}
    <div className={s.track} aria-hidden="true"><span /></div>
  </div>;
}
