"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import s from "./dropdown.module.css";

export interface DropdownOption { value: string; label: string; icon?: ReactNode; detail?: string }
export function Dropdown({ value, options, label, onChange, disabled = false, compact = false, className = "", id: providedId }: { value: string; options: DropdownOption[]; label: string; onChange: (value: string) => void; disabled?: boolean; compact?: boolean; className?: string; id?: string }) {
  const generatedId = useId();
  const id = `${providedId || generatedId}-options`;
  const selected = options.find(option => option.value === value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || disabled) return;
    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 216), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 20;
      const above = rect.top - 20;
      const desiredHeight = options.length * 48 + 12;
      const upward = below < desiredHeight && above > below;
      const maxHeight = Math.max(48, upward ? above : below);
      setPosition({ top: upward ? Math.max(12, rect.top - Math.min(desiredHeight, maxHeight) - 8) : rect.bottom + 8, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width, maxHeight });
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const observer = new ResizeObserver(place);
    if (triggerRef.current) observer.observe(triggerRef.current);
    place();
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { observer.disconnect(); document.removeEventListener("pointerdown", outside, true); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, disabled, options.length]);

  useLayoutEffect(() => {
    if (open && position && !menuRef.current?.contains(document.activeElement)) menuRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
  }, [open, position]);

  const close = () => { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); };
  const menuKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === "Tab") { close(); return; }
    const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    if (!options.length) return;
    const index = options.findIndex(option => option === document.activeElement);
    let next = index;
    if (event.key === "ArrowDown") next = (index + 1) % options.length;
    else if (event.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else return;
    event.preventDefault(); event.stopPropagation(); options[next]?.focus();
  };

  return <>
    <button ref={triggerRef} type="button" disabled={disabled} id={providedId} className={`${s.trigger} ${compact ? s.compact : ""} ${className}`} aria-label={`${label}: ${selected?.label || ""}`} aria-haspopup="listbox" aria-expanded={open && !disabled} aria-controls={open ? id : undefined} onClick={() => setOpen(previous => !previous)} onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }}><span className={s.value}>{selected?.icon}<span>{selected?.label || label}{selected?.detail && <span className={s.dimension}>{selected.detail}</span>}</span></span><ChevronDown size={16} className={s.chevron} data-open={open} /></button>
    {open && !disabled && position && createPortal(<div ref={menuRef} id={id} role="listbox" aria-label={label} className={s.menu} style={position} onKeyDown={menuKeyboard}>{options.map(option => <button key={option.value} type="button" role="option" aria-selected={value === option.value} tabIndex={-1} className={s.option} onClick={() => { onChange(option.value); close(); }}>{option.icon}<span>{option.label}{option.detail && <span className={s.dimension}>{option.detail}</span>}</span>{option.value === value && <Check size={16} />}</button>)}</div>, document.body)}
  </>;
}
