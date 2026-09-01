"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  Sparkles,
  Award,
  Send,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LivingFlame } from "./LivingFlame";

interface StreakShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakDays: number;
  todayMinutes: number;
  totalSessions: number;
  userName: string;
}

export function StreakShareModal({
  isOpen,
  onClose,
  streakDays,
  todayMinutes,
  totalSessions,
  userName,
}: StreakShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentStreak = Math.max(1, streakDays);

  // Streak Tier styling and title
  const getStreakTier = (days: number) => {
    if (days >= 30) {
      return {
        title: "Legendary Inferno",
        subtitle: "Top 1% Consistent Learner",
        theme: "from-amber-500 via-orange-600 to-red-600",
        glow: "rgba(245, 158, 11, 0.6)",
        flameGradient: ["#fef08a", "#f59e0b", "#b45309"],
      };
    }
    if (days >= 14) {
      return {
        title: "Diamond Focus",
        subtitle: "Unbreakable Habit Achieved",
        theme: "from-purple-600 via-pink-600 to-orange-500",
        glow: "rgba(168, 85, 247, 0.6)",
        flameGradient: ["#e9d5ff", "#c084fc", "#7e22ce"],
      };
    }
    if (days >= 7) {
      return {
        title: "Blazing Scholar",
        subtitle: "1 Week Consistency Streak!",
        theme: "from-orange-500 via-red-500 to-amber-500",
        glow: "rgba(239, 68, 68, 0.6)",
        flameGradient: ["#fef08a", "#f97316", "#dc2626"],
      };
    }
    return {
      title: "Rising Spark",
      subtitle: "Building the daily focus momentum",
      theme: "from-emerald-600 via-teal-600 to-primary",
      glow: "rgba(79, 138, 107, 0.6)",
      flameGradient: ["#a7f3d0", "#34d399", "#059669"],
    };
  };

  const tier = getStreakTier(currentStreak);
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://mindflow.ai";
  const shareText = `I am on a ${currentStreak}-day study streak on MindFlow AI! I just completed ${todayMinutes} focus minutes today. Join me and boost your productivity! ${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}'s ${currentStreak}-Day Learning Streak on MindFlow AI`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // Ignore user cancel
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  // Download Card as high-quality Canvas PNG
  const handleDownloadCard = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 1080;
      canvas.height = 1350;

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(0.5, "#1e293b");
      grad.addColorStop(1, "#020617");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1350);

      // Glow circle
      const glowGrad = ctx.createRadialGradient(540, 500, 50, 540, 500, 450);
      glowGrad.addColorStop(0, "rgba(249, 115, 22, 0.4)");
      glowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(540, 500, 450, 0, Math.PI * 2);
      ctx.fill();

      // Card Container
      ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(90, 90, 900, 1170, 48);
      ctx.fill();
      ctx.stroke();

      // App Brand
      ctx.font = "bold 36px Inter, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("MINDFLOW AI", 540, 190);

      ctx.font = "24px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("Smart AI Study & Focus Command Center", 540, 235);

      // Flame emoji / icon
      ctx.font = "140px serif";
      ctx.fillText("🔥", 540, 430);

      // Streak number
      ctx.font = "900 160px Inter, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${currentStreak}`, 540, 610);

      ctx.font = "bold 38px Inter, sans-serif";
      ctx.fillStyle = "#f97316";
      ctx.fillText("DAYS STREAK ON FIRE!", 540, 680);

      // Tier badge
      ctx.font = "600 28px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`★ ${tier.title} • ${userName} ★`, 540, 750);

      // Divider
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.moveTo(180, 810);
      ctx.lineTo(900, 810);
      ctx.stroke();

      // Stats boxes
      ctx.font = "bold 48px Inter, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${todayMinutes}m`, 340, 900);
      ctx.fillText(`${totalSessions}`, 740, 900);

      ctx.font = "24px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("Focus Today", 340, 945);
      ctx.fillText("Sessions Done", 740, 945);

      // Motivational footer
      ctx.font = "italic 26px Inter, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText('"Consistency is the key to mastery."', 540, 1070);

      ctx.font = "bold 24px Inter, sans-serif";
      ctx.fillStyle = "#4ade80";
      ctx.fillText("Join the challenge at mindflow.ai", 540, 1170);

      // Download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `mindflow-streak-${currentStreak}-days.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="bg-white rounded-3xl border border-border shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 🎨 Top Visual Card Centerpiece (Instagram/Duolingo Style) */}
        <div
          ref={cardRef}
          className={`p-8 pb-9 bg-gradient-to-br ${tier.theme} text-white flex flex-col items-center text-center relative overflow-hidden transition-all duration-500`}
        >
          {/* Floating Embers / Sparkles Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-6 left-12 w-2 h-2 rounded-full bg-yellow-300 animate-sparkle-float" />
            <div className="absolute top-16 right-16 w-3 h-3 rounded-full bg-orange-300 animate-sparkle-float delay-300" />
            <div className="absolute bottom-12 left-1/4 w-2 h-2 rounded-full bg-white animate-sparkle-float delay-700" />
            <div className="absolute top-1/2 right-10 w-2.5 h-2.5 rounded-full bg-amber-200 animate-sparkle-float delay-500" />
          </div>

          {/* User & App Tag */}
          <div className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/20 text-[11px] font-bold tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>MindFlow AI • {userName}</span>
          </div>

          {/* Animated Living Flame Centerpiece */}
          <div className="relative my-3">
            <LivingFlame streakDays={currentStreak} size="xl" className="scale-125" />
          </div>

          {/* Massive Number Counter */}
          <div className="space-y-0.5 mt-1">
            <p className="text-6xl font-black font-mono tracking-tight text-white drop-shadow-md">
              {currentStreak}
            </p>
            <h3 className="text-lg font-extrabold uppercase tracking-wider text-yellow-200">
              Days Streak On Fire!
            </h3>
          </div>

          {/* Tier Badge */}
          <div className="mt-3 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-extrabold tracking-wide flex items-center gap-1.5 shadow-sm">
            <Award className="w-3.5 h-3.5 text-yellow-300" />
            <span>{tier.title}</span>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 w-full mt-5 bg-black/25 backdrop-blur-md p-3 rounded-2xl border border-white/15">
            <div className="text-center border-r border-white/20 pr-2">
              <p className="text-xl font-extrabold text-white">{todayMinutes}m</p>
              <p className="text-[10px] text-white/75 font-semibold">Today&apos;s Focus</p>
            </div>
            <div className="text-center pl-2">
              <p className="text-xl font-extrabold text-white">{totalSessions}</p>
              <p className="text-[10px] text-white/75 font-semibold">Sessions Done</p>
            </div>
          </div>
        </div>

        {/* 🚀 Social Share Actions Bottom Area */}
        <div className="p-6 bg-white space-y-4 overflow-y-auto">
          <div className="text-center space-y-0.5">
            <h4 className="text-xs font-bold text-gray-900">
              Bagikan pencapaian & inspirasi teman belajarmu
            </h4>
            <p className="text-[11px] text-gray-500">
              Simpan kartu grafis atau undang teman untuk bergabung.
            </p>
          </div>

          {/* Social Buttons Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border hover:border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 transition-all cursor-pointer group"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold mt-1">WhatsApp</span>
            </button>

            <button
              onClick={handleTwitterShare}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 transition-all cursor-pointer group"
            >
              <Send className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold mt-1">X / Twitter</span>
            </button>

            <button
              onClick={handleNativeShare}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border hover:border-primary bg-primary-50/50 hover:bg-primary-50 text-primary transition-all cursor-pointer group"
            >
              <Share2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold mt-1">Share...</span>
            </button>
          </div>

          {/* Download Card & Copy Link Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="md"
              onClick={handleDownloadCard}
              disabled={downloading}
              icon={<Download className="w-4 h-4" />}
              className="flex-1 text-xs font-bold border-border"
            >
              {downloading ? "Exporting..." : "Save Image Card"}
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleCopyLink}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              className={`flex-1 text-xs font-bold shadow-sm transition-all ${
                copied ? "bg-emerald-600 hover:bg-emerald-700" : ""
              }`}
            >
              {copied ? "Copied Link!" : "Copy Share Link"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
