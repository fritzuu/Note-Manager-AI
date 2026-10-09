"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import s from "./auth.module.css";
import { AuthSceneLoading } from "./AuthLoading";

const CognivaWorld = dynamic(() => import("@/components/landing/CognivaWorld"), { ssr: false, loading: () => <AuthSceneLoading /> });
const ease = [.22, 1, .36, 1] as const;

// The shared route layout keeps the visual panel and WebGL canvases alive during navigation.
export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const login = pathname === "/login";
  const reduced = useReducedMotion();
  return <main className={`${s.shell} ${login ? s.login : s.register}`} lang="id">
    <aside className={s.brandPanel} aria-label="Cogniva">
      <Link href="/landing" className={s.brand} aria-label="Cogniva beranda"><Image src="/brand/cogniva/cogniva-horizontal-color.svg" alt="Cogniva" width={168} height={48} priority /></Link>
      <div className={s.brandCopy}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={login ? "login" : "register"} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{ duration: reduced ? 0 : .25, ease }}>
            {login ? <>Kembali ke<br /><em>ritmemu.</em></> : <>Mulai kecil.<br /><em>Tumbuh besar.</em></>}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className={s.orbit} aria-hidden="true" />
      <div className={s.world} aria-hidden="true">
        <div className={`${s.sceneLayer} ${login ? s.sceneVisible : ""}`}><CognivaWorld paused={!login} theme="dark" experience="login" /></div>
        <div className={`${s.sceneLayer} ${!login ? s.sceneVisible : ""}`}><CognivaWorld paused={login} theme="light" experience="register" /></div>
      </div>
    </aside>
    <section className={s.formPanel} aria-label={login ? "Masuk ke Cogniva" : "Buat akun Cogniva"}>
      <div className={s.formNav}><Link href="/landing" className={s.mobileBrand} aria-label="Cogniva beranda"><Image src="/brand/cogniva/cogniva-horizontal-color.svg" alt="Cogniva" width={140} height={40} priority /></Link><Link href="/landing" className={s.back}><ArrowLeft size={17} />Beranda</Link></div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div className={s.formContent} key={pathname} initial={{ opacity: 0, y: reduced ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{ duration: reduced ? 0 : .24, ease }}>
          {children}
        </motion.div>
      </AnimatePresence>
    </section>
  </main>;
}
