"use client";

import React, { useState, useEffect } from "react";

const BRAND_CHARS = Array.from("MindFlow AI");

export function BrandingPanel() {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    // Continuous loop interval matching keyframe duration (6.8s)
    const timer = setInterval(() => {
      setAnimKey((prev) => prev + 1);
    }, 6800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      {/* ── Background gradient (deep, saturated green) ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1B4D3E] via-[#2D6A4F] to-[#357A5B]" />

      {/* ── Grid pattern (tegas, visible) ── */}
      <div
        className="absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Shimmer / light streak sweep (Menyapu dari Kiri Atas → Kanan Bawah) ── */}
      <div
        className="absolute animate-shimmer pointer-events-none"
        style={{
          width: "250%",
          height: "250%",
          top: "-75%",
          left: "-75%",
          background:
            "linear-gradient(135deg, transparent 35%, rgba(255, 255, 255, 0.12) 44%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.12) 56%, transparent 65%)",
          filter: "blur(28px)",
        }}
      />

      {/* ── Content container ── */}
      <div className="relative z-10 flex flex-col h-full p-10 lg:p-12">
        {/* ── Logo (top-left, enlarged, no text) ── */}
        <div className="shrink-0">
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-4xl lg:text-5xl shadow-lg shadow-black/10">
            🌱
          </div>
        </div>

        {/* ── Brand name (centered in panel with staggered character reveal + loop) ── */}
        <div className="flex-1 flex items-center justify-center">
          <h2
            key={animKey}
            aria-label="MindFlow AI"
            className="text-white text-5xl lg:text-6xl xl:text-7xl font-bold italic tracking-tight select-none flex items-center justify-center"
          >
            {BRAND_CHARS.map((char, i) => (
              <span
                key={i}
                className="inline-block animate-char-reveal"
                style={{
                  animationDelay: `${i * 75}ms`,
                }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </h2>
        </div>

        {/* ── Headline & description (bottom-right) ── */}
        <div className="shrink-0 self-end text-right max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
            <span className="text-white">Unlock your</span>
            <br />
            <span className="text-[#8BBF9F]">academic potential</span>
          </h1>
          <p className="text-white/60 mt-4 text-sm leading-relaxed max-w-sm ml-auto">
            An intelligent platform that learns your habits and helps you excel
            in your academic journey.
          </p>
        </div>
      </div>
    </div>
  );
}
