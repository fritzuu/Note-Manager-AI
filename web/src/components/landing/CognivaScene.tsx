"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import type { FeatureId } from "./ProductPreviews";
import s from "./cogniva-scene.module.css";

const OBJECTS = {
  notes: { label: "Catatan", text: "Simpan materi dan temukan intinya dengan ringkasan AI." },
  tasks: { label: "Prioritas", text: "Susun tugas berdasarkan deadline, kesulitan, dan progres." },
  focus: { label: "Fokus", text: "Mulai satu sesi dengan durasi yang sesuai tugasmu." },
} as const;
type ObjectId = keyof typeof OBJECTS;

export default function CognivaScene({ onExplore }: { onExplore?: (id: FeatureId) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const visible = useInView(root, { amount: 0.12 });
  const reduced = useReducedMotion();
  const [active, setActive] = useState(true);
  const [mobile, setMobile] = useState(true);
  const [selected, setSelected] = useState<ObjectId>("notes");
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] });
  const x = useSpring(0, { stiffness: 65, damping: 22 });
  const y = useSpring(0, { stiffness: 65, damping: 22 });
  const rotateX = useTransform(y, [-1, 1], [3, -3]);
  const rotateY = useTransform(x, [-1, 1], [-4, 4]);
  const paperY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const taskY = useTransform(scrollYProgress, [0, 1], [0, -15]);
  const focusY = useTransform(scrollYProgress, [0, 1], [0, 12]);
  const quiet = reduced || mobile || !visible || !active;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px), (pointer: coarse)");
    const resize = () => setMobile(media.matches);
    const update = () => setActive(!document.hidden);
    resize(); update();
    media.addEventListener("change", resize);
    document.addEventListener("visibilitychange", update);
    return () => { media.removeEventListener("change", resize); document.removeEventListener("visibilitychange", update); };
  }, []);

  function pointer(event: PointerEvent<HTMLDivElement>) {
    if (quiet || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - box.left) / box.width * 2 - 1);
    y.set((event.clientY - box.top) / box.height * 2 - 1);
  }

  return <div ref={root} className={s.stage} onPointerMove={pointer} onPointerLeave={() => { x.set(0); y.set(0); }} data-running={!quiet}>
    <div className={s.sceneLabel}><span className={s.liveDot} /> Ruang belajarmu <span>Klik objek untuk menjelajahi</span></div>
    <div className={s.visual}>
      <motion.div className={s.scene} style={{ rotateX: quiet ? 0 : rotateX, rotateY: quiet ? 0 : rotateY }}>
        <div className={s.desk} aria-hidden="true" /><div className={s.shadow} aria-hidden="true" />
        <motion.div className={s.papers} style={{ y: quiet ? 0 : paperY }}>
          <div className={`${s.paper} ${s.paperBack}`} aria-hidden="true" /><div className={`${s.paper} ${s.paperMiddle}`} aria-hidden="true" />
          <button type="button" className={`${s.paper} ${s.paperFront} ${s.object}`} aria-label="Jelajahi catatan AI" aria-pressed={selected === "notes"} onClick={() => setSelected("notes")}>
            <span className={s.objectNumber}>01 / CATATAN</span><span className={s.paperTitle}>Ide besar dimulai<br />dari satu catatan.</span>
            <span className={s.lines} aria-hidden="true"><i /><i /><mark /><i /><i /></span><span className={s.paperCorner} aria-hidden="true" />
          </button>
        </motion.div>
        <motion.button type="button" className={`${s.task} ${s.object}`} style={{ y: quiet ? 0 : taskY, rotate: 8 }} aria-label="Jelajahi prioritas tugas" aria-pressed={selected === "tasks"} onClick={() => setSelected("tasks")}>
          <span className={s.objectNumber}>02 / PRIORITAS</span><span className={s.taskTop}><span className={s.check} aria-hidden="true" /><span className={s.badge}>Kerjakan lebih dulu</span></span><strong>Laporan praktikum</strong><span className={s.track} aria-hidden="true"><span style={{ width: "64%" }} /></span>
        </motion.button>
        <motion.button type="button" className={`${s.focus} ${s.object}`} style={{ y: quiet ? 0 : focusY, rotate: -10 }} aria-label="Jelajahi sesi fokus" aria-pressed={selected === "focus"} onClick={() => setSelected("focus")}>
          <span className={s.ringDepth} aria-hidden="true" /><span className={s.ring}><span className={s.ringFace}><strong>40:00</strong><span>Satu sesi fokus</span></span></span><span className={s.ringCap} aria-hidden="true" />
        </motion.button>
      </motion.div>
    </div>
    <div className={s.exploreCard}>
      <div aria-live="polite" aria-atomic="true"><span className={s.exploreLabel}>{OBJECTS[selected].label}</span><p>{OBJECTS[selected].text}</p></div>
      <button type="button" onClick={() => onExplore?.(selected)}>Lihat demo <span aria-hidden="true">↗</span></button>
    </div>
  </div>;
}
