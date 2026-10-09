"use client";

import { useState, type InputHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, ArrowUpRight, AlertCircle, CheckCircle2, Info } from "lucide-react";
import s from "./auth.module.css";
import { FlowLoader } from "./AuthLoading";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };
export function AuthField({ label, error, hint, type = "text", id, ...props }: FieldProps) {
  const [show, setShow] = useState(false);
  const password = type === "password";
  return <div className={s.field}><label htmlFor={id}>{label}</label><div className={s.inputWrap}>
    <input {...props} id={id} type={password && show ? "text" : type} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={password ? s.passwordInput : undefined} />
    {password && <button className={s.eye} type="button" onClick={() => setShow(!show)} aria-label={`${show ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`} aria-pressed={show} disabled={props.disabled}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
  </div>{error ? <p className={s.fieldError} id={`${id}-error`}>{error}</p> : hint ? <p className={s.hint} id={`${id}-hint`}>{hint}</p> : null}</div>;
}

export function AuthSubmit({ children, loading = false, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return <button {...props} className={s.submit} disabled={disabled || loading} aria-busy={loading}><span className={s.submitLabel}>{children}</span>{loading ? <span className={s.submitLoader}><FlowLoader /></span> : <ArrowUpRight size={18} />}</button>;
}

export function AuthNotice({ children, kind = "error" }: { children: ReactNode; kind?: "error" | "success" | "info" }) {
  const Icon = kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;
  return <div className={`${s.notice} ${s[kind]}`} role={kind === "error" ? "alert" : "status"}><Icon size={19} /><div>{children}</div></div>;
}

export function AuthDivider() { return <div className={s.divider}><span />atau dengan email<span /></div>; }
