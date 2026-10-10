"use client";

import { createPortal } from "react-dom";

import { useState, useEffect, useRef } from "react";
import { X, Eye, EyeOff, ExternalLink, Check, Loader2 } from "lucide-react";
import { getAiProvider, setAiProvider, getCustomApiKey, setCustomApiKey, removeCustomApiKey, getOpenRouterModel, setOpenRouterModel, testAiApiKey, DEFAULT_OPENROUTER_MODEL, type AiProvider } from "@/lib/aiConfig";
import { useModalDialog } from "./useModalDialog";
import s from "./cogniva-modal.module.css";

interface AiApiKeyModalProps { isOpen: boolean; onClose: () => void }
type ConnectionResult = { success?: boolean; message?: string; latencyMs?: number };

export function AiApiKeyModal({ isOpen, onClose }: AiApiKeyModalProps) {
  const dialogRef = useModalDialog(isOpen, onClose);
  const [provider, setProvider] = useState<AiProvider>("gemini");
  const [keys, setKeys] = useState<Record<AiProvider, string>>({ gemini: "", openrouter: "" });
  const [model, setModel] = useState(DEFAULT_OPENROUTER_MODEL);
  const [showKey, setShowKey] = useState(false);
  const [guide, setGuide] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [error, setError] = useState("");
  const request = useRef(0);

  useEffect(() => {
    request.current++;
    if (!isOpen) return;
    setProvider(getAiProvider());
    setKeys({ gemini: getCustomApiKey("gemini"), openrouter: getCustomApiKey("openrouter") });
    setModel(getOpenRouterModel());
    setShowKey(false); setSaved(false); setGuide(false); setTesting(false); setResult(null); setError("");
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;
  const key = keys[provider];
  const keyLink = provider === "gemini" ? "https://aistudio.google.com/app/apikey" : "https://openrouter.ai/keys";
  const invalidate = () => { request.current++; setTesting(false); setResult(null); setSaved(false); setError(""); };
  const save = () => {
    if (provider === "openrouter" && !model.trim()) { setError("Isi ID model yang ingin digunakan."); return; }
    setCustomApiKey(keys.gemini.trim(), "gemini");
    setCustomApiKey(keys.openrouter.trim(), "openrouter");
    setOpenRouterModel(model.trim());
    setAiProvider(provider);
    const stored = getAiProvider() === provider && getCustomApiKey("gemini") === keys.gemini.trim() && getCustomApiKey("openrouter") === keys.openrouter.trim() && getOpenRouterModel() === (model.trim() || DEFAULT_OPENROUTER_MODEL);
    setSaved(stored);
    setError(stored ? "" : "Pengaturan belum bisa disimpan. Periksa izin penyimpanan browser, lalu coba lagi.");
  };
  const test = async () => {
    if (testing || !key.trim()) return;
    if (provider === "openrouter" && !model.trim()) { setError("Isi ID model sebelum memeriksa koneksi."); return; }
    const id = ++request.current;
    setTesting(true); setResult(null); setError("");
    try {
      const response = await testAiApiKey(key.trim(), provider, provider === "openrouter" ? model.trim() : undefined);
      if (id === request.current) setResult(response);
    } catch { if (id === request.current) setResult({ success: false, message: "Koneksi belum bisa diperiksa. Coba lagi." }); }
    finally { if (id === request.current) setTesting(false); }
  };
  return createPortal(<div className={s.backdrop} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="assistant-connection-title" className={s.modal}>
      <header className={s.header}><div><span className={s.overline}>Pengaturan</span><h2 id="assistant-connection-title">Koneksi asisten</h2><p>Pilih layanan untuk ringkasan dan percakapanmu.</p></div><button className={s.iconButton} onClick={onClose} aria-label="Tutup pengaturan koneksi"><X size={20} /></button></header>
      <div className={s.body}>
        <fieldset className={s.providers}><legend>Layanan</legend>{([{ id: "gemini", name: "Gemini", detail: "Terhubung langsung ke Google." }, { id: "openrouter", name: "OpenRouter", detail: "Pilih model lewat satu layanan." }] as const).map(item => <label key={item.id} className={s.provider} data-selected={provider === item.id}><input type="radio" name="assistant-provider" value={item.id} checked={provider === item.id} onChange={() => { invalidate(); setProvider(item.id); setShowKey(false); }} /><span><strong>{item.name}</strong><span>{item.detail}</span></span><Check size={17} aria-hidden="true" /></label>)}</fieldset>
        {provider === "openrouter" && <div className={s.field}><label htmlFor="assistant-model">ID model</label><input id="assistant-model" value={model} placeholder="provider/nama-model" autoComplete="off" spellCheck={false} onChange={event => { invalidate(); setModel(event.target.value); }} /><p>Gunakan ID dari <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer">daftar model OpenRouter<ExternalLink size={13} /></a>.</p></div>}
        <div className={s.field}><label htmlFor="assistant-api-key">API key {provider === "gemini" ? "Gemini" : "OpenRouter"}</label><div className={s.keyInput}><input id="assistant-api-key" type={showKey ? "text" : "password"} autoComplete="off" autoCapitalize="none" spellCheck={false} value={key} placeholder="Tempel API key di sini" onChange={event => { invalidate(); setKeys(previous => ({ ...previous, [provider]: event.target.value })); }} /><button className={s.iconButton} type="button" aria-label={showKey ? "Sembunyikan API key" : "Tampilkan API key"} aria-pressed={showKey} onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><div className={s.fieldLinks}><a href={keyLink} target="_blank" rel="noreferrer">Buka halaman API key<ExternalLink size={14} /></a><button type="button" className={s.textButton} disabled={!key} onClick={() => { invalidate(); removeCustomApiKey(provider); setKeys(previous => ({ ...previous, [provider]: "" })); }}>Hapus key</button></div></div>
        <p className={s.storageNote}>Key tersimpan di browser ini. Saat digunakan, key dikirim melalui server Cogniva ke layanan yang kamu pilih. Tanpa key pribadi, aplikasi memakai konfigurasi server jika tersedia.</p>
        <button className={s.guideToggle} onClick={() => setGuide(!guide)} aria-expanded={guide} aria-controls="api-key-guide">{guide ? "Tutup panduan" : "Belum punya API key?"}<span>{guide ? "−" : "+"}</span></button>
        {guide && <div className={s.guide} id="api-key-guide"><p>Buka halaman API key layanan pilihanmu, buat key, lalu salin dan tempel ke kolom di atas.</p><p>Ketersediaan model, kuota, dan biaya mengikuti akun serta ketentuan layanan tersebut.</p></div>}
        {result && <div className={s.result} data-success={!!result.success} role={result.success ? "status" : "alert"}><strong>{result.success ? "Koneksi tersedia" : "Belum terhubung"}</strong><p>{result.message}</p>{result.latencyMs !== undefined && <span>Waktu respons {result.latencyMs} ms</span>}</div>}
        {error && <p className={s.error} role="alert">{error}</p>}
        {saved && <p className={s.saved} role="status"><Check size={16} />Pengaturan tersimpan di browser ini.</p>}
      </div>
      <footer className={s.footer}><button className={s.secondary} disabled={testing || !key.trim()} onClick={test}>{testing && <Loader2 size={16} className={s.spinner} />}{testing ? "Memeriksa…" : "Cek koneksi"}</button><button className={s.primary} disabled={testing} onClick={saved ? onClose : save}>{saved ? "Selesai" : "Simpan pengaturan"}</button></footer>
    </div>
  </div>, document.body);
}
