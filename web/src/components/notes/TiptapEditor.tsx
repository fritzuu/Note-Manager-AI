"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import React, { useRef, useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Youtube } from "@tiptap/extension-youtube";
import { Highlight } from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Extension } from "@tiptap/core";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Video as YoutubeIcon,
  Undo,
  Redo,
  CheckSquare,
  Table as TableIcon,
  Smile,
  ChevronDown,
  Highlighter,
  MoreHorizontal,
  X,
} from "lucide-react";
import es from "./tiptap-editor.module.css";

// Define custom Font Size extension for Tiptap
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize.replace(/['"]+/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: { chain: () => unknown }) => {
          return (chain() as { setMark: (mark: string, attrs: Record<string, unknown>) => { run: () => boolean } })
            .setMark("textStyle", { fontSize })
            .run();
        },
      unsetFontSize:
        () =>
        ({ chain }: { chain: () => unknown }) => {
          return (chain() as { setMark: (mark: string, attrs: Record<string, unknown>) => { run: () => boolean } })
            .setMark("textStyle", { fontSize: null })
            .run();
        },
    } as unknown as Record<string, unknown>;
  },
});

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  userId: string;
  editable?: boolean;
  onStatsChange?: (stats: { words: number; characters: number; readingTime: number }) => void;
}

const fontFamilies = [
  { name: "Sans serif", value: "Inter, sans-serif" },
  { name: "Serif", value: "Georgia, serif" },
  { name: "Monospace", value: "monospace" },
  { name: "Playfair Display", value: "Playfair Display, serif" },
  { name: "Outfit", value: "Outfit, sans-serif" },
];

const fontSizes = [
  { name: "Kecil", value: "12px" },
  { name: "Normal", value: "15px" },
  { name: "Sedang", value: "18px" },
  { name: "Besar", value: "24px" },
  { name: "Sangat besar", value: "32px" },
];

const emojis = ["😊", "😂", "👍", "🔥", "❤️", "✨", "💡", "📝", "🚀", "🎓", "⭐", "✅", "❌", "❓"];

export function TiptapEditor({ content, onChange, userId, onStatsChange, editable = true }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [insertDialog, setInsertDialog] = useState<"link" | "video" | null>(null);
  const [insertUrl, setInsertUrl] = useState("");
  const [insertError, setInsertError] = useState("");
  const insertRef = useRef<HTMLFormElement>(null);
  const insertInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!insertDialog) return;
    insertInputRef.current?.focus();
    const outside = (event: PointerEvent) => { if (!insertRef.current?.contains(event.target as Node)) setInsertDialog(null); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [insertDialog]);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // Disable built-in link & underline since we register them below with custom config
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline hover:text-primary-600 transition-colors cursor-pointer",
        },
      }),
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-2xl border border-border my-6 shadow-md mx-auto block hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer",
        },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: "rounded-2xl border border-border my-6 shadow-md mx-auto block max-w-full",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      FontFamily,
      FontSize,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: "Mulai menulis di sini…",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "cogniva-document",
      },
      handleDOMEvents: {
        drop: (view, event) => {
          if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
            const file = event.dataTransfer.files[0];
            if (file.type.startsWith("image/")) {
              event.preventDefault();
              uploadImageFile(file);
              return true;
            }
          }
          return false;
        },
        paste: (view, event) => {
          if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
            const file = event.clipboardData.files[0];
            if (file.type.startsWith("image/")) {
              event.preventDefault();
              uploadImageFile(file);
              return true;
            }
          }
          return false;
        },
      },
    },
  });

  // Sync content from outside (only if it differs and editor is loaded)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => { editor?.setEditable(editable); }, [editor, editable]);

  // Compute and emit statistics on update
  useEffect(() => {
    if (!editor) return;
    const updateStats = () => {
      const text = editor.state.doc.textContent.trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const characters = text.length;
      const readingTime = Math.ceil(words / 200);

      if (onStatsChange) {
        onStatsChange({ words, characters, readingTime });
      }
    };

    editor.on("update", updateStats);
    updateStats(); // Initial stats run

    return () => {
      editor.off("update", updateStats);
    };
  }, [editor, onStatsChange]);

  if (!editor) return null;

  // Direct image file upload to local upload API
  const uploadImageFile = async (file: File) => {
    if (!userId || !editable) return;
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Local upload failed");
      }

      const data = await res.json();
      editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
    } catch (err) {
      console.warn("Failed to upload image to local API, falling back to local Base64 URL:", err);
      // Fallback: Convert to Base64 local render
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Url = e.target?.result as string;
        if (base64Url) {
          editor.chain().focus().setImage({ src: base64Url, alt: file.name }).run();
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageFile(file);
    }
  };

  const setLink = () => { setInsertUrl(editor.getAttributes("link").href || ""); setInsertError(""); setInsertDialog("link"); };
  const addYoutubeVideo = () => { setInsertUrl(""); setInsertError(""); setInsertDialog("video"); };
  const submitInsert = (event: React.FormEvent) => {
    event.preventDefault();
    const value = insertUrl.trim();
    if (insertDialog === "link" && !value) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run(); setInsertDialog(null); return;
    }
    try {
      const url = new URL(value, window.location.origin);
      if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) throw new Error("Invalid URL");
      if (insertDialog === "video") {
        if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(url.hostname)) throw new Error("Invalid video URL");
        editor.chain().focus().setYoutubeVideo({ src: url.href }).run();
      } else editor.chain().focus().extendMarkRange("link").setLink({ href: url.href }).run();
      setInsertDialog(null); setInsertError("");
    } catch { setInsertError(insertDialog === "video" ? "Masukkan alamat video YouTube yang valid." : "Masukkan alamat tautan yang valid."); }
  };

  // Inline styling calls
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editor.chain().focus().setColor(e.target.value).run();
  };

  const handleHighlightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editor.chain().focus().toggleHighlight({ color: e.target.value }).run();
  };

  const setFontSizeVal = (size: string) => {
    interface CustomChain {
      unsetFontSize: () => CustomChain;
      setFontSize: (size: string) => CustomChain;
      run: () => boolean;
    }
    const focusChain = editor.chain().focus() as unknown as CustomChain;
    if (size === "normal") {
      focusChain.unsetFontSize().run();
    } else {
      focusChain.setFontSize(size).run();
    }
  };

  const tool = (label: string, icon: React.ReactNode, action: () => void, active = false, disabled = false) => <button type="button" key={label} title={label} aria-label={label} aria-pressed={active} disabled={disabled || !editable} className={es.tool} onMouseDown={event => event.preventDefault()} onClick={action}>{icon}</button>;
  const styleTools = <>{tool("Tebal", <Bold size={17} />, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}{tool("Miring", <Italic size={17} />, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}{tool("Garis bawah", <UnderlineIcon size={17} />, () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"))}{tool("Tautan", <LinkIcon size={17} />, setLink, editor.isActive("link"))}</>;
  return <div className={es.editor}>
    <div className={es.toolbar} role="toolbar" aria-label="Format catatan">
      <div className={es.toolGroup}>{tool("Urungkan", <Undo size={17} />, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}{tool("Ulangi", <Redo size={17} />, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}</div>
      <div className={es.toolGroup}><Dropdown compact className={es.editorDropdown} label="Gaya paragraf" disabled={!editable} value={editor.isActive("heading", { level: 1 }) ? "1" : editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : "paragraph"} options={[{ value: "paragraph", label: "Teks biasa" }, { value: "1", label: "Judul besar" }, { value: "2", label: "Subjudul" }, { value: "3", label: "Judul bagian" }]} onChange={value => { if (value === "paragraph") editor.chain().focus().setParagraph().run(); else editor.chain().focus().setHeading({ level: Number(value) as 1 | 2 | 3 }).run(); }} /></div>
      <div className={es.toolGroup}>{styleTools}</div>
      <div className={es.toolGroup}>{tool("Daftar poin", <List size={17} />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}{tool("Daftar bernomor", <ListOrdered size={17} />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}{tool("Checklist", <CheckSquare size={17} />, () => editor.chain().focus().toggleTaskList().run(), editor.isActive("taskList"))}</div>
      <details className={es.more}><summary title="Format dan sisipan lainnya" aria-label="Format dan sisipan lainnya"><MoreHorizontal size={19} /></summary><div className={es.morePanel}>
        <p>Format teks</p><div className={es.extraRow}><Dropdown compact className={es.editorDropdown} label="Jenis huruf" disabled={!editable} onChange={value => { editor.chain().focus().setFontFamily(value).run(); }} value={editor.getAttributes("textStyle").fontFamily || "Inter, sans-serif"} options={fontFamilies.map(font => ({ value: font.value, label: font.name }))} /><Dropdown compact className={es.editorDropdown} label="Ukuran huruf" disabled={!editable} onChange={setFontSizeVal} value={editor.getAttributes("textStyle").fontSize || "15px"} options={fontSizes.map(size => ({ value: size.value, label: size.name }))} /></div>
        <div className={es.extraRow}>{tool("Coret", <Strikethrough size={17} />, () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"))}{tool("Kode inline", <Code size={17} />, () => editor.chain().focus().toggleCode().run(), editor.isActive("code"))}{tool("Kutipan", <Quote size={17} />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}<label className={es.color}>Warna<input type="color" aria-label="Warna teks" disabled={!editable} value={editor.getAttributes("textStyle").color || "#284333"} onChange={handleColorChange} /></label><label className={es.color}>Sorot<input type="color" aria-label="Warna sorotan" disabled={!editable} value={editor.getAttributes("highlight").color || "#dce8c8"} onChange={handleHighlightChange} /></label>{tool("Hapus sorotan", <Highlighter size={17} />, () => editor.chain().focus().unsetHighlight().run())}</div>
        <p>Perataan</p><div className={es.extraRow}>{tool("Rata kiri", <AlignLeft size={17} />, () => editor.chain().focus().setTextAlign("left").run(), editor.isActive({ textAlign: "left" }))}{tool("Rata tengah", <AlignCenter size={17} />, () => editor.chain().focus().setTextAlign("center").run(), editor.isActive({ textAlign: "center" }))}{tool("Rata kanan", <AlignRight size={17} />, () => editor.chain().focus().setTextAlign("right").run(), editor.isActive({ textAlign: "right" }))}{tool("Rata penuh", <AlignJustify size={17} />, () => editor.chain().focus().setTextAlign("justify").run(), editor.isActive({ textAlign: "justify" }))}</div>
        <p>Sisipkan</p><div className={es.extraRow}>{tool(imageUploading ? "Mengunggah gambar…" : "Gambar", <ImageIcon size={17} />, () => fileInputRef.current?.click(), false, imageUploading)}{tool("Video YouTube", <YoutubeIcon size={17} />, addYoutubeVideo)}{tool("Tabel", <TableIcon size={17} />, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}{tool("Emoji", <Smile size={17} />, () => setShowEmojiPicker(previous => !previous), showEmojiPicker)}</div>
        {showEmojiPicker && <div className={es.emojis}>{emojis.map(emoji => <button type="button" key={emoji} disabled={!editable} onMouseDown={event => event.preventDefault()} onClick={() => { editor.chain().focus().insertContent(emoji).run(); setShowEmojiPicker(false); }}>{emoji}</button>)}</div>}
      </div></details>
      {insertDialog && <form ref={insertRef} className={es.insertDialog} onSubmit={submitInsert} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setInsertDialog(null); editor.commands.focus(); } }}><header><label htmlFor={`insert-${userId}`}>{insertDialog === "link" ? "Alamat tautan" : "Video YouTube"}</label><button type="button" aria-label="Tutup sisipan" onClick={() => { setInsertDialog(null); editor.commands.focus(); }}><X size={16} /></button></header><input ref={insertInputRef} id={`insert-${userId}`} value={insertUrl} onChange={event => setInsertUrl(event.target.value)} placeholder="https://…" />{insertError && <p role="alert">{insertError}</p>}<button type="submit" className={es.insertSubmit}>{insertDialog === "link" && !insertUrl.trim() ? "Hapus tautan" : "Sisipkan"}</button></form>}
    </div>
    {editor.isActive("table") && <div className={es.tableControls} aria-label="Pengaturan tabel">{[
      ["Kolom sebelum", () => editor.chain().focus().addColumnBefore().run()], ["Kolom sesudah", () => editor.chain().focus().addColumnAfter().run()], ["Hapus kolom", () => editor.chain().focus().deleteColumn().run()], ["Baris sebelum", () => editor.chain().focus().addRowBefore().run()], ["Baris sesudah", () => editor.chain().focus().addRowAfter().run()], ["Hapus baris", () => editor.chain().focus().deleteRow().run()], ["Hapus tabel", () => editor.chain().focus().deleteTable().run()],
    ].map(([label, action]) => <button key={String(label)} type="button" disabled={!editable} onMouseDown={event => event.preventDefault()} onClick={action as () => void}>{String(label)}</button>)}</div>}
    <BubbleMenu editor={editor} className={es.bubble}>{styleTools}</BubbleMenu>
    <div className={es.document}><EditorContent editor={editor} /></div>
    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} hidden />
    {imageUploading && <p className={es.uploadStatus} role="status">Mengunggah gambar…</p>}
  </div>;
}
