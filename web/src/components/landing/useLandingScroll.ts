"use client";

import { useCallback, useEffect, useRef } from "react";
import type Lenis from "lenis";
import "lenis/dist/lenis.css";

/** Landing-only scroll easing; touch and reduced-motion keep native scrolling. */
export function useLandingScroll() {
  const controller = useRef<Lenis | null>(null);

  useEffect(() => {
    let disposed = false;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)");
    const offset = () => window.innerWidth > 760 ? -100 : -78;
    const destroy = () => { controller.current?.destroy(); controller.current = null; };
    const configure = async () => {
      destroy();
      if (disposed || preference.matches || !desktop.matches) return;
      const { default: Lenis } = await import("lenis");
      if (disposed || preference.matches || !desktop.matches || controller.current) return;
      controller.current = new Lenis({
        autoRaf: true,
        lerp: 0.14,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: offset(), duration: 1, lerp: 0, easing: (t) => 1 - Math.pow(1 - t, 3) },
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
      });
    };
    void configure();
    preference.addEventListener("change", configure);
    desktop.addEventListener("change", configure);
    return () => {
      disposed = true;
      preference.removeEventListener("change", configure);
      desktop.removeEventListener("change", configure);
      destroy();
    };
  }, []);

  return useCallback((target: HTMLElement, onComplete?: () => void) => {
    if (controller.current) {
      controller.current.scrollTo(target, {
        offset: window.innerWidth > 760 ? -100 : -78,
        duration: 1,
        lerp: 0,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        onComplete,
      });
    } else {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
      onComplete?.();
    }
  }, []);
}
