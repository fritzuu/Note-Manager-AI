"use client";

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
  Heading1,
  Heading2,
  Heading3,
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
  Info,
  ChevronDown,
  Highlighter,
} from "lucide-react";
// Firebase Storage imports removed - local upload endpoint is used instead

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
  onStatsChange?: (stats: { words: number; characters: number; readingTime: number }) => void;
}

const fontFamilies = [
  { name: "Default (Inter)", value: "Inter, sans-serif" },
  { name: "Serif (Georgia)", value: "Georgia, serif" },
  { name: "Monospace", value: "monospace" },
  { name: "Playfair Display", value: "Playfair Display, serif" },
  { name: "Outfit", value: "Outfit, sans-serif" },
];

const fontSizes = [
  { name: "Small", value: "12px" },
  { name: "Normal", value: "15px" },
  { name: "Medium", value: "18px" },
  { name: "Large", value: "24px" },
  { name: "Extra Large", value: "32px" },
];

const emojis = ["😊", "😂", "👍", "🔥", "❤️", "✨", "💡", "📝", "🚀", "🎓", "⭐", "✅", "❌", "❓"];

export function TiptapEditor({ content, onChange, userId, onStatsChange }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
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
        placeholder: "Start typing your notes... You can use standard formatting, insert tables, checklists, or drag and drop images here.",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm md:prose-base focus:outline-none min-h-[480px] max-w-none text-gray-800 leading-relaxed font-sans pb-12 select-text",
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
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  // Compute and emit statistics on update
  useEffect(() => {
    if (!editor) return;
    const updateStats = () => {
      const text = editor.state.doc.textContent.trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const characters = text.length;
      const readingTime = Math.max(1, Math.ceil(words / 200));

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
    if (!userId) return;
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

  // Link Dialog
  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  // YouTube Dialog
  const addYoutubeVideo = () => {
    const url = window.prompt("Enter YouTube Video URL:");
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
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

  return (
    <div className="flex flex-col border border-border bg-white rounded-2xl overflow-hidden shadow-card relative">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 border-b border-border p-2.5 sticky top-0 z-20">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 mr-1">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Cmd+Z)"
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-white rounded-lg disabled:opacity-30 transition-all cursor-pointer"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Cmd+Shift+Z)"
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-white rounded-lg disabled:opacity-30 transition-all cursor-pointer"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-border" />

        {/* Font Family Dropdown */}
        <div className="relative flex items-center bg-white border border-border rounded-lg px-2 py-1 select-none">
          <select
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            value={editor.getAttributes("textStyle").fontFamily || "Inter, sans-serif"}
            className="text-xs text-gray-600 bg-transparent focus:outline-none border-none pr-4 appearance-none cursor-pointer font-medium"
          >
            {fontFamilies.map((f) => (
              <option key={f.value} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 pointer-events-none" />
        </div>

        {/* Font Size Dropdown */}
        <div className="relative flex items-center bg-white border border-border rounded-lg px-2 py-1 select-none">
          <select
            onChange={(e) => setFontSizeVal(e.target.value)}
            value={editor.getAttributes("textStyle").fontSize || "15px"}
            className="text-xs text-gray-600 bg-transparent focus:outline-none border-none pr-4 appearance-none cursor-pointer font-medium"
          >
            {fontSizes.map((s) => (
              <option key={s.value} value={s.value}>
                {s.name} ({s.value})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 pointer-events-none" />
        </div>

        <div className="w-[1px] h-6 bg-border" />

        {/* Text Styles */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("bold") ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Bold (Cmd+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("italic") ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Italic (Cmd+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("underline") ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Underline (Cmd+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("strike") ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("code") ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Code Inline"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-border" />

        {/* Headings */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("heading", { level: 1 }) ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Heading H1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("heading", { level: 2 }) ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Heading H2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("heading", { level: 3 }) ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Heading H3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-border" />

        {/* Text Alignments */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive({ textAlign: "left" }) ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive({ textAlign: "center" }) ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive({ textAlign: "right" }) ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive({ textAlign: "justify" }) ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Align Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-border" />

        {/* Lists & Quotes */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("bulletList") ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("orderedList") ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("taskList") ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Todo List"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("blockquote") ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-border" />

        {/* Insert Media & Table */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={setLink}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              editor.isActive("link") ? "bg-primary text-white" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Insert Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-all cursor-pointer flex items-center"
            title="Upload/Insert Image"
          >
            {imageUploading ? (
              <span className="w-4 h-4 rounded-full border-2 border-primary-200 border-t-primary animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={addYoutubeVideo}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-all cursor-pointer"
            title="Embed YouTube Video"
          >
            <YoutubeIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-all cursor-pointer"
            title="Insert Table (3x3)"
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-border" />

        {/* Text & Background Colors */}
        <div className="flex items-center gap-1 bg-white border border-border rounded-lg px-1.5 py-0.5 select-none">
          <div className="flex items-center gap-1" title="Text Color">
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Text</span>
            <input
              type="color"
              onChange={handleColorChange}
              value={editor.getAttributes("textStyle").color || "#1F2937"}
              className="w-4.5 h-4.5 rounded cursor-pointer border-none p-0 overflow-hidden bg-transparent"
            />
          </div>
          <div className="w-[1px] h-4 bg-border mx-1" />
          <div className="flex items-center gap-1" title="Highlight/Background Color">
            <Highlighter className="w-3 h-3 text-gray-400" />
            <input
              type="color"
              onChange={handleHighlightChange}
              value={editor.getAttributes("highlight").color || "#FFFFFF"}
              className="w-4.5 h-4.5 rounded cursor-pointer border-none p-0 overflow-hidden bg-transparent"
            />
          </div>
        </div>

        <div className="w-[1px] h-6 bg-border" />

        {/* Emojis, Shortcuts, Table Controls */}
        <div className="flex items-center gap-0.5 relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              showEmojiPicker ? "bg-primary-50 text-primary" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Insert Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Emoji Popover */}
          {showEmojiPicker && (
            <div className="absolute right-0 top-9 bg-white border border-border shadow-float rounded-xl p-2.5 z-30 grid grid-cols-7 gap-1.5 w-44 animate-scale-in">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    editor.chain().focus().insertContent(emoji).run();
                    setShowEmojiPicker(false);
                  }}
                  className="text-lg p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              showShortcuts ? "bg-primary-50 text-primary" : "text-gray-500 hover:text-primary hover:bg-white"
            }`}
            title="Formatting Shortcuts Help"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Shortcuts Popover */}
          {showShortcuts && (
            <div className="absolute right-0 top-9 bg-white border border-border shadow-float rounded-xl p-4 z-30 w-72 text-xs space-y-2.5 text-gray-600 animate-scale-in">
              <h4 className="font-bold text-gray-800 border-b border-border pb-1">Keyboard Shortcuts</h4>
              <div className="flex justify-between">
                <span>Bold</span>
                <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-border font-mono">Cmd + B</kbd>
              </div>
              <div className="flex justify-between">
                <span>Italic</span>
                <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-border font-mono">Cmd + I</kbd>
              </div>
              <div className="flex justify-between">
                <span>Underline</span>
                <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-border font-mono">Cmd + U</kbd>
              </div>
              <div className="flex justify-between">
                <span>Code Inline</span>
                <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-border font-mono">Cmd + E</kbd>
              </div>
              <div className="flex justify-between">
                <span>Bullet List</span>
                <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-border font-mono">Cmd + Shift + 8</kbd>
              </div>
              <div className="flex justify-between">
                <span>Numbered List</span>
                <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-border font-mono">Cmd + Shift + 9</kbd>
              </div>
              <div className="flex justify-between">
                <span>Heading 1-3</span>
                <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-border font-mono">Cmd + Alt + 1-3</kbd>
              </div>
              <div className="flex justify-between text-gray-400 pt-1 border-t border-border/60">
                <span>Drag & Drop images directly in editor</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Table Controls when inside Table */}
      {editor.isActive("table") && (
        <div className="flex flex-wrap items-center gap-1.5 bg-primary-50 border-b border-border/60 px-4 py-1.5 text-xs text-primary-800 font-semibold select-none">
          <span className="mr-1.5 text-primary-700">Table Settings:</span>
          <button
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="hover:bg-primary-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
          >
            + Col Before
          </button>
          <button
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="hover:bg-primary-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
          >
            + Col After
          </button>
          <button
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="hover:bg-red-50 text-red-700 hover:text-red-800 px-2 py-0.5 rounded transition-colors cursor-pointer"
          >
            - Delete Col
          </button>
          <div className="w-[1px] h-3.5 bg-primary-200" />
          <button
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="hover:bg-primary-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
          >
            + Row Before
          </button>
          <button
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="hover:bg-primary-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
          >
            + Row After
          </button>
          <button
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="hover:bg-red-50 text-red-700 hover:text-red-800 px-2 py-0.5 rounded transition-colors cursor-pointer"
          >
            - Delete Row
          </button>
          <div className="w-[1px] h-3.5 bg-primary-200" />
          <button
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="hover:bg-red-100 bg-red-50 text-red-700 px-2 py-0.5 rounded transition-colors cursor-pointer font-bold"
          >
            Delete Table
          </button>
        </div>
      )}

      {/* Floating Selection Bubble Menu */}
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 bg-white border border-border shadow-float rounded-xl p-1 animate-scale-in"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              editor.isActive("bold") ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100 hover:text-primary"
            }`}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              editor.isActive("italic") ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100 hover:text-primary"
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              editor.isActive("underline") ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100 hover:text-primary"
            }`}
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            onClick={setLink}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              editor.isActive("link") ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100 hover:text-primary"
            }`}
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </BubbleMenu>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 p-6 md:p-10 bg-white min-h-[480px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        /* Tiptap Placeholder style */
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          font-style: italic;
        }

        /* Tiptap Task List style */
        ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
          margin: 1.25rem 0;
        }
        ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.4rem;
        }
        ul[data-type="taskList"] li > label {
          user-select: none;
          margin-top: 0.2rem;
          cursor: pointer;
        }
        ul[data-type="taskList"] li > div {
          flex: 1;
        }
        ul[data-type="taskList"] input[type="checkbox"] {
          cursor: pointer;
          width: 1.1rem;
          height: 1.1rem;
          border-radius: 4px;
          border: 1.5px solid #d1d5db;
          accent-color: var(--color-primary, #059669);
        }

        /* Tiptap Table style */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1.5rem 0;
          overflow: hidden;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          min-width: 1em;
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror table th {
          background-color: #f9fafb;
          font-weight: bold;
          text-align: left;
        }
        .ProseMirror table .selectedCell::after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: rgba(5, 150, 105, 0.08);
          pointer-events: none;
        }
        .ProseMirror table .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          z-index: 20;
          background-color: #3b82f6;
          pointer-events: none;
        }

        /* General styling for blockquote and inline code */
        .ProseMirror blockquote {
          border-left: 4px solid #059669;
          padding-left: 1rem;
          color: #4b5563;
          font-style: italic;
          margin: 1.25rem 0;
        }
        .ProseMirror pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 12px;
          font-family: monospace;
          overflow-x: auto;
          margin: 1.5rem 0;
        }
        .ProseMirror code {
          background-color: #f3f4f6;
          color: #d97706;
          padding: 0.15rem 0.35rem;
          border-radius: 6px;
          font-size: 0.9em;
          font-family: monospace;
        }
        .ProseMirror pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }
      `}</style>
    </div>
  );
}
