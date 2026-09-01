"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

export function MarkdownRenderer({
  content,
  className = "",
  isUser = false,
}: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into blocks by code blocks first
  const blocks = parseBlocks(content);

  return (
    <div
      className={`space-y-2.5 text-xs sm:text-sm leading-relaxed font-sans ${
        isUser ? "text-white" : "text-gray-800"
      } ${className}`}
      suppressHydrationWarning
    >
      {blocks.map((block, idx) => (
        <BlockComponent key={idx} block={block} isUser={isUser} />
      ))}
    </div>
  );
}

// ── BLOCK PARSER ─────────────────────────────────────────────────────────────

type BlockType =
  | "paragraph"
  | "heading"
  | "code_block"
  | "blockquote"
  | "ul"
  | "ol"
  | "table"
  | "hr";

interface Block {
  type: BlockType;
  content: string;
  level?: number;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  language?: string;
}

function parseBlocks(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = raw.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block (```lang ... ```)
    if (line.trim().startsWith("```")) {
      const language = line.trim().replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        type: "code_block",
        content: codeLines.join("\n"),
        language: language || "text",
      });
      continue;
    }

    // 2. Horizontal Rule (---, ***, ___)
    if (/^(\s*[-*_]\s*){3,}$/.test(line.trim())) {
      blocks.push({ type: "hr", content: "" });
      i++;
      continue;
    }

    // 3. Headings (# H1 - ###### H6)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 4. Blockquote (> quote)
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "blockquote",
        content: quoteLines.join("\n"),
      });
      continue;
    }

    // 5. Table (| Header | Header |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const rawHeaders = tableLines[0]
          .split("|")
          .map((s) => s.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        const rows: string[][] = [];
        for (let r = 2; r < tableLines.length; r++) {
          const cells = tableLines[r]
            .split("|")
            .map((s) => s.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          rows.push(cells);
        }

        blocks.push({
          type: "table",
          content: "",
          headers: rawHeaders,
          rows,
        });
        continue;
      }
    }

    // 6. Unordered List (- , * , + )
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*+]\s+/, "").trim());
        i++;
      }
      blocks.push({
        type: "ul",
        content: "",
        items,
      });
      continue;
    }

    // 7. Ordered List (1. , 2. )
    if (/^[\s]*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*\d+\.\s+/, "").trim());
        i++;
      }
      blocks.push({
        type: "ol",
        content: "",
        items,
      });
      continue;
    }

    // 8. Normal Paragraph (join non-empty lines until blank line or next block)
    if (line.trim().length > 0) {
      const pLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().length > 0 &&
        !lines[i].trim().startsWith("```") &&
        !lines[i].trim().startsWith("#") &&
        !lines[i].trim().startsWith(">") &&
        !/^[\s]*[-*+]\s+/.test(lines[i]) &&
        !/^[\s]*\d+\.\s+/.test(lines[i]) &&
        !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|"))
      ) {
        pLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: "paragraph",
        content: pLines.join("\n"),
      });
      continue;
    }

    i++;
  }

  return blocks;
}

// ── BLOCK COMPONENT ──────────────────────────────────────────────────────────

function BlockComponent({
  block,
  isUser,
}: {
  block: Block;
  isUser?: boolean;
}) {
  switch (block.type) {
    case "heading": {
      const level = block.level || 2;
      const Tag = (`h${Math.min(level, 6)}` as keyof React.JSX.IntrinsicElements);
      const headingStyles: Record<number, string> = {
        1: "text-lg md:text-xl font-extrabold text-gray-900 mt-4 mb-2 pb-1 border-b border-gray-100",
        2: "text-base md:text-lg font-bold text-gray-900 mt-3.5 mb-1.5",
        3: "text-sm md:text-base font-bold text-gray-800 mt-3 mb-1",
        4: "text-xs md:text-sm font-bold text-gray-800 mt-2 mb-1 uppercase tracking-wide",
        5: "text-xs font-bold text-gray-700 mt-2 mb-1",
        6: "text-xs font-semibold text-gray-600 mt-1 mb-0.5",
      };

      return (
        <Tag className={`${headingStyles[level] || headingStyles[2]} ${isUser ? "text-white" : ""}`}>
          <InlineRenderer text={block.content} isUser={isUser} />
        </Tag>
      );
    }

    case "code_block":
      return <CodeBlock language={block.language || "text"} code={block.content} />;

    case "blockquote":
      return (
        <blockquote
          className={`border-l-4 pl-3.5 py-1.5 my-2.5 rounded-r-xl text-xs md:text-sm italic ${
            isUser
              ? "border-white/40 bg-white/10 text-white/90"
              : "border-primary/50 bg-primary-50/50 text-gray-700"
          }`}
        >
          <InlineRenderer text={block.content} isUser={isUser} />
        </blockquote>
      );

    case "ul":
      return (
        <ul className={`space-y-1.5 my-2 pl-4 list-disc marker:text-primary ${isUser ? "marker:text-white" : ""}`}>
          {block.items?.map((item, idx) => (
            <li key={idx} className="leading-relaxed pl-1">
              <InlineRenderer text={item} isUser={isUser} />
            </li>
          ))}
        </ul>
      );

    case "ol":
      return (
        <ol className={`space-y-1.5 my-2 pl-4 list-decimal marker:font-bold marker:text-primary ${isUser ? "marker:text-white" : ""}`}>
          {block.items?.map((item, idx) => (
            <li key={idx} className="leading-relaxed pl-1">
              <InlineRenderer text={item} isUser={isUser} />
            </li>
          ))}
        </ol>
      );

    case "table":
      return (
        <div className="overflow-x-auto my-3 rounded-2xl border border-gray-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            {block.headers && block.headers.length > 0 && (
              <thead className="bg-gray-50/90 border-b border-gray-200">
                <tr>
                  {block.headers.map((h, i) => (
                    <th key={i} className="px-3.5 py-2.5 font-bold text-gray-900">
                      <InlineRenderer text={h} isUser={isUser} />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-gray-100 bg-white">
              {block.rows?.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 text-gray-700">
                      <InlineRenderer text={cell} isUser={isUser} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "hr":
      return <hr className="my-3 border-gray-200/80" />;

    case "paragraph":
    default:
      return (
        <p className="leading-relaxed whitespace-pre-wrap">
          <InlineRenderer text={block.content} isUser={isUser} />
        </p>
      );
  }
}

// ── CODE BLOCK COMPONENT WITH COPY ───────────────────────────────────────────

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy code:", e);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden my-3 border border-gray-800 bg-[#0F172A] shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1E293B] border-b border-gray-800 text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5 font-mono font-semibold text-gray-300">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span>{language || "code"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-gray-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-gray-700/50 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-xs text-gray-200 leading-relaxed scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── INLINE FORMATTER ─────────────────────────────────────────────────────────

function InlineRenderer({
  text,
  isUser,
}: {
  text: string;
  isUser?: boolean;
}) {
  if (!text) return null;

  // Regex patterns:
  // 1. Inline code: `code`
  // 2. Bold+Italic: ***text*** or ___text___
  // 3. Bold: **text** or __text__
  // 4. Italic: *text* or _text_
  // 5. Strikethrough: ~~text~~
  // 6. Link: [text](url)
  const tokenRegex =
    /(`[^`]+`|\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;

  const parts = text.split(tokenRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // Inline Code `...`
        if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
          const codeContent = part.slice(1, -1);
          return (
            <code
              key={index}
              className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] font-semibold border ${
                isUser
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-gray-100 text-primary-800 border-gray-200"
              }`}
            >
              {codeContent}
            </code>
          );
        }

        // Bold + Italic ***...***
        if (
          (part.startsWith("***") && part.endsWith("***") && part.length >= 6) ||
          (part.startsWith("___") && part.endsWith("___") && part.length >= 6)
        ) {
          const inner = part.slice(3, -3);
          return (
            <strong
              key={index}
              className={`font-black italic ${isUser ? "text-white" : "text-gray-900"}`}
            >
              <InlineRenderer text={inner} isUser={isUser} />
            </strong>
          );
        }

        // Bold **...** or __...__
        if (
          (part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
          (part.startsWith("__") && part.endsWith("__") && part.length >= 4)
        ) {
          const inner = part.slice(2, -2);
          return (
            <strong
              key={index}
              className={`font-bold ${isUser ? "text-white" : "text-gray-900"}`}
            >
              <InlineRenderer text={inner} isUser={isUser} />
            </strong>
          );
        }

        // Italic *...* or _..._
        if (
          (part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
          (part.startsWith("_") && part.endsWith("_") && part.length >= 2)
        ) {
          const inner = part.slice(1, -1);
          return (
            <em key={index} className="italic">
              <InlineRenderer text={inner} isUser={isUser} />
            </em>
          );
        }

        // Strikethrough ~~...~~
        if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
          const inner = part.slice(2, -2);
          return (
            <del key={index} className="line-through opacity-70">
              <InlineRenderer text={inner} isUser={isUser} />
            </del>
          );
        }

        // Link [title](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const linkText = linkMatch[1];
          const linkUrl = linkMatch[2];
          return (
            <a
              key={index}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity ${
                isUser ? "text-white" : "text-primary hover:text-primary-700"
              }`}
            >
              {linkText}
            </a>
          );
        }

        // Regular plain text
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
