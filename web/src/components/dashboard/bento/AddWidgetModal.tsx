"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Check, Search } from "lucide-react";
import { WIDGET_LIBRARY, type BentoWidgetConfig, type WidgetSize } from "./types";
import s from "./workspace.module.css";
import { WidgetSizePicker } from "./WidgetSizePicker";

interface AddWidgetModalProps { isOpen: boolean; onClose: () => void; activeWidgetIds: string[]; onAddWidget: (widget: BentoWidgetConfig) => void }
const categories = [
  { id: "All", label: "Semua" }, { id: "General", label: "Pribadi" },
  { id: "Focus & Study", label: "Fokus" }, { id: "AI Tools", label: "Insight & AI" }, { id: "Planning", label: "Rencana" },
];
export function AddWidgetModal({ isOpen, onClose, activeWidgetIds, onAddWidget }: AddWidgetModalProps) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, WidgetSize>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [isOpen]);

  if (!isOpen) return null;
  const filtered = WIDGET_LIBRARY.filter(widget => (category === "All" || widget.category === category) && `${widget.title} ${widget.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className={s.modalBackdrop} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} className={s.modal} role="dialog" aria-modal="true" aria-labelledby="widget-library-title" onKeyDown={event => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
      if (event.key !== "Tab") return;
      const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, a[href], [tabindex="0"]'));
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className={s.modalHeader}><div><h2 id="widget-library-title">Apa yang kamu butuhkan?</h2><p>Pilih alat yang ingin kamu lihat di ruang belajarmu.</p></div><button className={s.iconButton} onClick={onClose} aria-label="Tutup pilihan widget"><X size={20} /></button></div>
      <div className={s.librarySearch}><Search size={17} /><input aria-label="Cari widget" placeholder="Cari widget…" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className={s.categories}>{categories.map(item => <button key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
      <div className={s.libraryList}>
        {!filtered.length && <p className={s.muted}>Tidak ada widget yang cocok.</p>}
        {filtered.map(widget => {
          const added = activeWidgetIds.includes(widget.id);
          const size = selectedSizes[widget.id] || widget.defaultSize;
          return <div key={widget.id} className={s.libraryRow}><div><h3>{widget.title}</h3><p>{widget.description}</p></div><div className={s.libraryActions}><WidgetSizePicker label={`Ukuran ${widget.title}`} disabled={added} value={size} sizes={widget.allowedSizes} onChange={value => setSelectedSizes(previous => ({ ...previous, [widget.id]: value }))} /><button className={added ? s.secondaryButton : s.primaryButton} disabled={added} aria-label={`${added ? "Sudah ditambahkan" : "Tambahkan"}: ${widget.title}`} onClick={() => onAddWidget({ id: widget.id, title: widget.title, size })}>{added ? <Check size={16} /> : <Plus size={16} />}{added ? "Ditambahkan" : "Tambah"}</button></div></div>;
        })}
      </div>
      <div className={s.modalFooter}><span>{activeWidgetIds.length} widget di dashboardmu</span><button className={s.primaryButton} onClick={onClose}>Selesai</button></div>
    </div>
  </div>;
}
