"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import s from "./time-widgets.module.css";

export function ClockBentoWidget() {
  const [time, setTime] = useState<Date | null>(null);
  const [zone, setZone] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date());
    update();
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Lokal");
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);
  const hours = time?.getHours() || 0;
  const night = hours < 6 || hours >= 18;
  const progress = time ? (hours * 3600 + time.getMinutes() * 60 + time.getSeconds()) / 86400 : 0;
  const location = zone.includes("/") ? zone.split("/").slice(1).join(" / ").replace(/_/g, " ") : zone;
  const offset = time ? new Intl.DateTimeFormat("id-ID", { timeZoneName: "shortOffset" }).formatToParts(time).find(part => part.type === "timeZoneName")?.value : "";
  const clock = time ? `${String(hours).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}` : "––:––";
  return <div className={s.clock}>
    <div className={s.clockOrbit} aria-hidden="true"><i /><i /><span style={{ transform: `rotate(${progress * 360}deg)` }}><b /></span></div>
    <header className={s.clockHeader}><h2>Waktu sekarang</h2>{time && (night ? <Moon size={17} strokeWidth={1.5} aria-label="Malam" /> : <Sun size={19} strokeWidth={1.5} aria-label="Siang" />)}</header>
    <div className={s.clockMain}><time className={s.clockDigits} dateTime={time?.toISOString()}>{clock}</time><p>{time ? time.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) : "Menyiapkan waktu lokal…"}</p></div>
    <footer className={s.clockFooter}><span>{location || "Waktu lokal"}</span><span>{offset}</span></footer>
  </div>;
}
