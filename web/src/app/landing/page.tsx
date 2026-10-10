"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, FileText, LayoutGrid, Menu, MessagesSquare, SlidersHorizontal, Timer, X, ChartNoAxesCombined } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { FeatureId } from "@/components/landing/ProductPreviews";
import { useLandingScroll } from "@/components/landing/useLandingScroll";
import s from "./landing.module.css";

const CognivaWorld = dynamic(() => import("@/components/landing/CognivaWorld"), { ssr: false, loading: () => <div className={s.sceneLoading}><span />Menyiapkan ruang belajarmu…</div> });
const FeaturePreview = dynamic(() => import("@/components/landing/ProductPreviews").then((module) => module.FeaturePreview), { loading: () => <div className={s.previewLoading}>Menyiapkan demo interaktif…</div> });
const FEATURES = [
  { id: "notes", icon: FileText, title: "Ide tersimpan. Intinya ditemukan.", description: "Tulis catatan, rapikan materi, lalu gunakan ringkasan AI untuk melihat hal yang paling penting.", caption: "Catatan" },
  { id: "tasks", icon: SlidersHorizontal, title: "Satu prioritas. Langkah yang jelas.", description: "Atur tugas dengan prioritas yang mempertimbangkan deadline, kesulitan, dan progresmu.", caption: "Tugas" },
  { id: "focus", icon: Timer, title: "Waktunya hadir, sepenuhnya.", description: "Pilih tugas dan temukan durasi fokus yang sesuai. Selalu ada ruang untuk istirahat.", caption: "Fokus" },
  { id: "insight", icon: ChartNoAxesCombined, title: "Kenali ritmemu sendiri.", description: "Refleksikan kebiasaan belajar lewat assessment, estimasi, dan rekomendasi yang bisa ditindaklanjuti.", caption: "Insight" },
  { id: "assistant", icon: MessagesSquare, title: "Pertanyaan kecil, pemahaman baru.", description: "Diskusikan materi bersama asisten AI dengan konteks dari catatanmu.", caption: "Asisten AI" },
  { id: "dashboard", icon: LayoutGrid, title: "Semua punya tempatnya.", description: "Atur widget catatan, tugas, dan aktivitas dalam workspace yang mengikuti caramu belajar.", caption: "Dashboard" },
] satisfies { id: FeatureId; icon: typeof FileText; title: string; description: string; caption: string }[];
const CHAPTERS = [
  { id: "notes", title: "Tangkap idenya.", short: "Catat", text: "Beri tempat untuk semua yang kamu pelajari.", icon: BookOpen },
  { id: "tasks", title: "Temukan arahnya.", short: "Atur", text: "Ubah daftar panjang menjadi langkah yang jelas.", icon: SlidersHorizontal },
  { id: "focus", title: "Nikmati prosesnya.", short: "Fokus", text: "Satu tugas, satu sesi, satu langkah lebih dekat.", icon: Timer },
] as const;
const FAQ = [
  ["Apa yang bisa aku lakukan di Cogniva?", "Kamu bisa menulis catatan, mengatur tugas, menjalankan sesi fokus, berdiskusi dengan asisten AI, dan melihat insight kebiasaan belajar dalam satu workspace pribadi."],
  ["Apakah sesi fokus selalu 25 menit?", "Tidak. Rekomendasi durasi menyesuaikan prioritas dan kesulitan tugas. Pilihan standar adalah 25, 40, atau 50 menit, dengan jeda 5, 10, atau 15 menit. Tugas singkat dapat menggunakan sesi micro."],
  ["Apakah aku memerlukan API key sendiri?", "Fitur AI mendukung Gemini atau OpenRouter. Key server dapat digunakan jika tersedia; kuota dan biaya mengikuti konfigurasi serta ketentuan provider yang dipakai."],
  ["Bagaimana cara membaca insight akademik?", "Insight adalah estimasi dan rekomendasi dari assessment untuk membantu refleksi kebiasaan belajar. Hasilnya bukan nilai resmi atau jaminan peningkatan nilai akademik."],
] as const;

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: reduced ? 0 : .65, delay, ease: [.22, 1, .36, 1] }}>{children}</motion.div>;
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const scrollTo = useLandingScroll();
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const journeyRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end end"] });
  const { scrollYProgress: journeyProgress } = useScroll({ target: journeyRef, offset: ["start end", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -45]);
  const watermarkX = useTransform(journeyProgress, [0, 1], [100, -160]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const featureRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuButton = useRef<HTMLButtonElement>(null);
  const mobileMenu = useRef<HTMLDivElement>(null);
  const feature = FEATURES[activeFeature];

  useEffect(() => { if (!loading && user) router.replace("/dashboard"); }, [user, loading, router]);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 32);
    update(); window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    mobileMenu.current?.querySelector("a")?.focus();
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [menuOpen]);

  function explore(id: FeatureId) {
    setActiveFeature(FEATURES.findIndex((item) => item.id === id));
    const target = document.getElementById("fitur");
    if (target) scrollTo(target, () => document.getElementById(`feature-tab-${id}`)?.focus({ preventScroll: true }));
  }
  function switchFeature(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = ["ArrowDown", "ArrowRight"].includes(event.key) ? (index + 1) % FEATURES.length : ["ArrowUp", "ArrowLeft"].includes(event.key) ? (index + FEATURES.length - 1) % FEATURES.length : event.key === "Home" ? 0 : event.key === "End" ? FEATURES.length - 1 : null;
    if (next !== null) { event.preventDefault(); setActiveFeature(next); featureRefs.current[next]?.focus(); }
  }

  return <MotionConfig reducedMotion="user"><div className={s.page} lang="id">
    <a className={s.skipLink} href="#main">Langsung ke konten</a>
    <header className={`${s.header} ${scrolled ? s.headerScrolled : ""}`}>
      <nav className={`${s.container} ${s.nav}`} aria-label="Navigasi utama">
        <Link className={s.brand} href="/landing" aria-label="Cogniva beranda"><Image src="/brand/cogniva/cogniva-horizontal-color.svg" alt="Cogniva" width={160} height={46} priority /></Link>
        <div className={s.desktopNav}><a href="#cara-kerja">Kenali Cogniva</a><a href="#fitur">Jelajahi fitur</a><a href="#faq">FAQ</a></div>
        <div className={s.navActions}><Link className={s.loginLink} href="/login">Masuk</Link><Link className={s.smallCta} href="/register">Mulai sekarang <ArrowUpRight size={16} /></Link><button ref={menuButton} className={s.menuButton} aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
      </nav>
      {menuOpen && <div ref={mobileMenu} id="mobile-navigation" className={s.mobileNav}>{[["Kenali Cogniva", "#cara-kerja"], ["Jelajahi fitur", "#fitur"], ["FAQ", "#faq"], ["Masuk", "/login"]].map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight size={18} /></Link>)}</div>}
    </header>

    <main id="main">
      <section ref={heroRef} className={s.heroTrack} aria-labelledby="hero-title">
        <div className={s.hero}>
          <div className={s.heroOrbit} aria-hidden="true" />
          <div className={`${s.container} ${s.heroInner}`}>
            <motion.div className={s.heroCopy} style={{ y: reduced ? 0 : copyY }}>
              <Reveal><h1 id="hero-title">Ide besar.<br />Langkah <em>kecil.</em></h1></Reveal>
              <Reveal delay={.1}><p className={s.heroDescription}>Bawa catatan, tugas, dan fokus ke satu tempat.<br className={s.desktopBreak} /> Temukan alur belajar yang terasa milikmu.</p></Reveal>
              <Reveal delay={.2} className={s.heroActions}><Link className={s.primaryButton} href="/register">Temukan alurmu <ArrowUpRight size={20} /></Link><a className={s.textButton} href="#fitur">Lihat cara kerjanya <ArrowRight size={17} /></a></Reveal>
            </motion.div>
            <div className={s.worldWrap}>
              <CognivaWorld progress={scrollYProgress} onSelect={explore} />
            </div>
            <div className={s.heroBottom}>
              <a className={s.scrollCue} href="#cara-kerja" aria-label="Jelajahi alur belajar"><span><ArrowDown size={18} /></span></a>
            </div>
          </div>
          <motion.div className={s.heroProgress} style={{ scaleX: scrollYProgress }} />
        </div>
      </section>

      <section id="cara-kerja" ref={journeyRef} className={s.journey} aria-labelledby="journey-title">
        <motion.div className={s.journeyWatermark} style={{ x: reduced ? 0 : watermarkX }} aria-hidden="true">find your flow.</motion.div>
        <div className={s.container}>
          <Reveal className={s.journeyHeading}><h2 id="journey-title">Bukan semakin sibuk.<br /><span>Semakin terarah.</span></h2><p>Keluarkan semuanya dari kepala.<br />Beri setiap ide, tugas, dan waktumu tempatnya.</p></Reveal>
          <div className={s.chapters}>{CHAPTERS.map((item, index) => <Reveal key={item.id} delay={index * .1} className={s.chapter}>
            <div className={s.chapterTop}><div className={`${s.chapterGlyph} ${s[`glyph${index}`]}`} aria-hidden="true">{index === 0 ? <><i /><i /><i /></> : index === 1 ? <><i><Check size={17} /></i><i /><i /></> : <><span>40</span></>}</div></div>
            <h3>{item.title}</h3><p>{item.text}</p><button onClick={() => explore(item.id)}>Jelajahi {item.short.toLowerCase()} <ArrowUpRight size={18} /></button>
          </Reveal>)}</div>
        </div>
      </section>

      <section id="fitur" className={`${s.container} ${s.features}`} aria-labelledby="features-title">
        <Reveal className={s.featureHeading}><div><h2 id="features-title">Rasakan sendiri<br /><em>bedanya.</em></h2></div><p>Kenali alat-alat kecil yang membantu<br />hari belajarmu berjalan lebih baik.</p></Reveal>
        <div className={s.featureTabs} role="tablist" aria-label="Jelajahi fitur Cogniva" aria-orientation="horizontal">{FEATURES.map((item, index) => <button key={item.id} ref={(node) => { featureRefs.current[index] = node; }} id={`feature-tab-${item.id}`} role="tab" aria-selected={activeFeature === index} aria-controls={`feature-panel-${item.id}`} tabIndex={activeFeature === index ? 0 : -1} className={`${s.featureTab} ${activeFeature === index ? s.featureTabActive : ""}`} onClick={() => setActiveFeature(index)} onKeyDown={(event) => switchFeature(event, index)}><item.icon size={17} strokeWidth={1.7} /><span>{item.caption}</span></button>)}</div>
        <div id={`feature-panel-${feature.id}`} role="tabpanel" aria-labelledby={`feature-tab-${feature.id}`} tabIndex={0} className={s.featurePanel}>
          <div className={s.featureInfo}><h3>{feature.title}</h3><p>{feature.description}</p></div>
          <div className={s.featureVisual}><AnimatePresence mode="wait" initial={false}><motion.div key={feature.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: reduced ? 0 : .18 }}><FeaturePreview id={feature.id} onNavigate={(id) => setActiveFeature(FEATURES.findIndex((item) => item.id === id))} /></motion.div></AnimatePresence></div>
        </div>
      </section>

      <section className={s.manifesto} aria-label="Belajar sesuai ritmemu"><div className={`${s.container} ${s.manifestoInner}`}><Reveal><div className={s.asterisk} aria-hidden="true">✳</div><p>Setiap orang punya ritme.</p><h2>Temukan yang<br /><em>milikmu.</em></h2><span>Cogniva membantumu mengenali kebiasaan,<br />memilih prioritas, dan memberi ruang untuk fokus.</span><button className={s.textButton} onClick={() => explore("insight")}>Kenali kebiasaan belajarmu <ArrowUpRight size={18} /></button></Reveal><div className={s.rhythmArt} aria-hidden="true"><div /><div /><div /><div /><div /><div /></div></div></section>

      <section id="faq" className={`${s.container} ${s.faq}`} aria-labelledby="faq-title"><Reveal className={s.faqIntro}><h2 id="faq-title">Sedikit tanya.<br />Lebih jelas.</h2></Reveal><div className={s.faqList}>{FAQ.map(([question, answer], index) => <div key={question} className={s.faqItem}><h3><button aria-expanded={openFaq === index} aria-controls={`faq-answer-${index}`} id={`faq-question-${index}`} onClick={() => setOpenFaq(openFaq === index ? null : index)}>{question}<ChevronDown size={19} className={openFaq === index ? s.chevronOpen : ""} /></button></h3><motion.div id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`} inert={openFaq !== index} initial={false} animate={{ height: openFaq === index ? "auto" : 0, opacity: openFaq === index ? 1 : 0 }} transition={{ duration: reduced ? 0 : .22 }} className={s.faqAnswer}><p>{answer}</p></motion.div></div>)}</div></section>

      <section className={s.closing} aria-labelledby="cta-title"><div className={s.closingOrbit} aria-hidden="true" /><div className={s.container}><Reveal className={s.closingContent}><h2 id="cta-title">Beri ruang.<br /><em>Mulai bertumbuh.</em></h2><Link className={s.lightButton} href="/register">Buat ruang belajarmu <ArrowUpRight size={21} /></Link><Link className={s.closingLogin} href="/login">Sudah punya akun? Masuk <ArrowRight size={15} /></Link></Reveal><footer className={s.footer}><Link className={s.brand} href="/landing"><Image src="/brand/cogniva/cogniva-horizontal-color.svg" alt="Cogniva" width={160} height={46} /></Link><nav aria-label="Navigasi footer"><a href="#cara-kerja">Kenali Cogniva</a><a href="#fitur">Fitur</a><a href="#faq">FAQ</a></nav><span>© 2026 Cogniva</span></footer></div></section>
    </main>
  </div></MotionConfig>;
}
