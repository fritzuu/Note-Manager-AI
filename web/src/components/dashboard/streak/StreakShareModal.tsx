"use client";

import { createPortal } from "react-dom";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Share2, Copy, Check, Download, MessageCircle, ArrowUpRight, Loader2 } from "lucide-react";
import { useModalDialog } from "@/components/modals/useModalDialog";
import s from "@/components/modals/cogniva-modal.module.css";
import { getStreakStage } from "./streakStages";

interface StreakShareModalProps { isOpen: boolean; onClose: () => void; streakDays: number; todayMinutes: number; totalSessions: number; userName: string }
const cleanNumber = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const escapeXml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]!));

function createCard(days: number, minutes: number, sessions: number, name: string, date: string) {
  const { stage } = getStreakStage(days);
  const caption = stage.name;
  const orbits = Array.from({ length: stage.orbit }, (_, index) => `<circle cx="890" cy="580" r="${370 - index * 44}" fill="none" stroke="${stage.accent}" stroke-opacity=".16" stroke-width="2"/>`).join("");
  const safeName = escapeXml(Array.from(name || "Kamu").slice(0, 42).join(""));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <rect width="1080" height="1350" fill="${stage.background}"/>
    <g transform="translate(72 66) scale(.27)" fill="${stage.foreground}"><path d="M180.72 44.64C146.88 10.08 85.68 3.6 44.64 46.08C8.64 83.52 10.08 144.72 43.2 174.96C50.4 182.88 66.96 182.16 79.92 172.08C97.92 156.96 110.88 133.2 126 115.92C100.8 118.8 83.52 109.44 81.36 94.32C76.32 77.04 90.72 64.08 107.28 63.36C133.92 62.64 156.24 69.84 180.72 44.64Z"/><path d="M52.56 185.76C79.92 207.36 123.12 210.96 153.36 185.76C178.56 164.88 177.12 144.72 194.4 143.28L194.4 113.04C172.8 109.44 152.64 111.6 139.68 122.4C120.24 139.68 108.72 165.6 91.44 179.28C79.92 190.08 64.08 191.52 52.56 185.76Z"/></g>
    <text x="152" y="108" fill="${stage.foreground}" font-family="Arial,sans-serif" font-size="35" font-weight="600">Cogniva</text>
    <text x="1000" y="104" fill="${stage.muted}" font-family="Arial,sans-serif" font-size="23" text-anchor="end">${escapeXml(date)}</text>
    ${orbits}
    <circle cx="786" cy="224" r="16" fill="${stage.accent}"/>
    <text x="80" y="255" fill="${stage.accent}" font-family="Arial,sans-serif" font-size="27">${safeName}</text>
    <text x="68" y="575" fill="${stage.foreground}" font-family="Arial,sans-serif" font-size="${days >= 100 ? 245 : 300}" font-weight="400" letter-spacing="-16">${days}</text>
    <text x="84" y="652" fill="${stage.accent}" font-family="Arial,sans-serif" font-size="32">hari belajar berturut-turut</text>
    <text x="80" y="787" fill="${stage.foreground}" font-family="Georgia,serif" font-size="59" font-style="italic">${caption}</text>
    <rect x="0" y="925" width="1080" height="425" fill="#f0f2e6"/>
    <line x1="540" x2="540" y1="992" y2="1167" stroke="#cbd5bd" stroke-width="2"/>
    <text x="80" y="1065" fill="#193d32" font-family="Arial,sans-serif" font-size="78" letter-spacing="-4">${minutes}</text>
    <text x="80" y="1128" fill="#708261" font-family="Arial,sans-serif" font-size="26">menit aktivitas hari ini</text>
    <text x="615" y="1065" fill="#193d32" font-family="Arial,sans-serif" font-size="78" letter-spacing="-4">${sessions}</text>
    <text x="615" y="1128" fill="#708261" font-family="Arial,sans-serif" font-size="26">sesi fokus selesai</text>
    <text x="80" y="1270" fill="#657956" font-family="Arial,sans-serif" font-size="24">Ruang untuk belajar, dengan caramu.</text>
    <path d="M961 1238h36v36m-36 0 36-36" fill="none" stroke="#193d32" stroke-width="3"/>
  </svg>`;
}

export function StreakShareModal({ isOpen, onClose, streakDays, todayMinutes, totalSessions, userName }: StreakShareModalProps) {
  const dialogRef = useModalDialog(isOpen, onClose);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (isOpen) { setCopied(false); setError(""); } }, [isOpen]);
  if (!isOpen || typeof document === "undefined") return null;
  const days = cleanNumber(streakDays), minutes = cleanNumber(todayMinutes), sessions = cleanNumber(totalSessions);
  const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
  const svg = createCard(days, minutes, sessions, userName, date);
  const imageUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const origin = typeof window !== "undefined" && !["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname) ? window.location.origin + "/landing" : "";
  const { stage } = getStreakStage(days);
  const text = days ? `Aku sudah belajar ${days} hari berturut-turut di Cogniva — ${stage.name}. Hari ini: ${minutes} menit aktivitas belajar.` : `Aku mulai mencatat ritme belajarku di Cogniva. Hari ini: ${minutes} menit aktivitas belajar.`;
  const shareText = text + (origin ? "\n" + origin : "");
  const pngFile = async () => {
    const image = new window.Image();
    image.src = imageUrl;
    await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(image, 0, 0, 1080, 1350);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image unavailable")), "image/png"));
    return new File([blob], `cogniva-progres-${days}-hari.png`, { type: "image/png" });
  };
  const copy = async () => {
    setError("");
    try { await navigator.clipboard.writeText(shareText); setCopied(true); }
    catch { setError("Teks belum bisa disalin. Izinkan akses clipboard atau gunakan tombol Bagikan."); }
  };
  const download = async () => {
    if (downloading) return;
    setDownloading(true); setError("");
    try {
      const file = await pngFile();
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { setError("Gambar belum bisa disimpan. Coba lagi melalui browser lain."); }
    finally { setDownloading(false); }
  };
  const nativeShare = async () => {
    setError("");
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title: "Progres belajar di Cogniva", text, ...(origin ? { url: origin } : {}) }); }
    catch (failure) { if (!(failure instanceof Error && failure.name === "AbortError")) setError("Belum bisa membagikan. Simpan gambar atau salin teksnya."); }
  };
  return createPortal(<div className={s.backdrop} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="share-progress-title" className={`${s.modal} ${s.shareModal}`}>
      <header className={s.header}><div><h2 id="share-progress-title">Bagikan progresmu</h2><p>Catatan kecil dari waktu yang sudah kamu luangkan.</p></div><button className={s.iconButton} onClick={onClose} aria-label="Tutup kartu progres"><X size={20} /></button></header>
      <div className={s.shareBody}><div className={s.cardPreview}><Image unoptimized src={imageUrl} width={1080} height={1350} alt={`Kartu progres ${userName}, ${stage.name}: ${days} hari belajar berturut-turut, ${minutes} menit aktivitas hari ini, ${sessions} sesi fokus selesai.`} /></div><p className={s.exportNote}>Gambar PNG · 1080 × 1350</p>
        <div className={s.socialActions}><button className={s.secondary} onClick={() => window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(shareText), "_blank", "noopener,noreferrer")}><MessageCircle size={16} />WhatsApp</button><button className={s.secondary} onClick={() => window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText), "_blank", "noopener,noreferrer")}><ArrowUpRight size={16} />X</button><button className={s.secondary} onClick={nativeShare}><Share2 size={16} />Bagikan</button></div>
        {error && <p className={s.error} role="alert">{error}</p>}
        {copied && <p className={s.saved} role="status"><Check size={16} />Teks progres disalin.</p>}
      </div>
      <footer className={s.footer}><button className={s.secondary} onClick={copy}><Copy size={16} />Salin teks</button><button className={s.primary} disabled={downloading} onClick={download}>{downloading ? <Loader2 size={16} className={s.spinner} /> : <Download size={16} />}{downloading ? "Menyiapkan…" : "Simpan gambar"}</button></footer>
    </div>
  </div>, document.body);
}
