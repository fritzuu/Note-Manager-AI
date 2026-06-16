"use client";

import React from "react";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: "🧠",
    title: "AI-Powered Insights",
    description: "Our ML model predicts your academic performance and suggests personalized improvement strategies.",
  },
  {
    icon: "📊",
    title: "Academic Analytics",
    description: "Visualize your study patterns, sleep quality, and lifestyle habits in one unified dashboard.",
  },
  {
    icon: "🎯",
    title: "Personalized Goals",
    description: "Set and track academic goals tailored to your unique learning profile.",
  },
];

export function BrandingPanel() {
  return (
    <div className="relative flex flex-col justify-between h-full p-10 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary to-secondary" />
      
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 -left-20 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full bg-accent/30 blur-xl" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
            🌱
          </div>
          <span className="text-white font-bold text-xl tracking-tight">MindFlow AI</span>
        </div>
      </div>

      <div className="relative z-10 space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Unlock your<br />
            <span className="text-accent">academic potential</span>
          </h1>
          <p className="text-white/70 mt-3 text-base leading-relaxed max-w-xs">
            An intelligent platform that learns your habits and helps you excel in your academic journey.
          </p>
        </div>

        <div className="space-y-4">
          {features.map((feature, i) => (
            <div
              key={i}
              className="flex gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="text-2xl shrink-0">{feature.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{feature.title}</p>
                <p className="text-white/65 text-xs mt-0.5 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-white/40 text-xs">
          © 2025 MindFlow AI · Built for students, by innovators
        </p>
      </div>
    </div>
  );
}
