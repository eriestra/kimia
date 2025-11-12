import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BookOpen, ArrowLeft, Home } from "lucide-react";
import React from "react";
import TessellationBackground from "@/components/TessellationBackground";
import ScrollHandler from "./ScrollHandler";
import TableOfContents from "./TableOfContents";
import BackToTop from "./BackToTop";

// Generate slug from heading text for anchor IDs
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const metadata: Metadata = {
  title: "User Guide | Kimia",
  description: "Complete documentation to help you navigate the Kimia Innovation Management Platform.",
};

type Block =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "blockquote"; content: string }
  | { type: "hr" }
  | { type: "table"; header: string[]; rows: string[][] };

export default async function GuidePage() {
  const manualPath = path.join(process.cwd(), "userManual.md");
  const markdown = await fs.readFile(manualPath, "utf8");
  const blocks = parseMarkdown(markdown);

  // Extract headings for table of contents (H2 and H3 only)
  const tocItems = blocks
    .filter((block) => block.type === "heading" && (block.level === 2 || block.level === 3))
    .map((block) => ({
      level: (block as any).level,
      content: (block as any).content,
      slug: slugify((block as any).content),
    }));

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollHandler />
      <BackToTop />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tessellation Header matching platform style */}
        <div className="relative overflow-hidden rounded-2xl mb-8">
          <TessellationBackground className="absolute inset-0 opacity-40" />
          <div className="relative bg-gradient-to-r from-blue-500/80 via-purple-500/80 via-pink-500/80 to-orange-500/80 backdrop-blur-sm">
            <div className="px-8 py-12">
              <div className="flex items-center gap-3 mb-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5"
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                    User Guide
                  </h1>
                  <p className="text-white/90 text-lg max-w-3xl">
                    Complete documentation to help you navigate the Kimia Innovation Management Platform
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Table of Contents - Sticky Sidebar with Active Highlighting */}
          {tocItems.length > 0 && <TableOfContents items={tocItems} />}

          {/* Content Card matching platform style */}
          <section className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
            <article className="px-8 py-10 sm:px-12 sm:py-12">
              <div className="space-y-8">
                {blocks.map((block, index) => (
                  <BlockRenderer key={`block-${index}`} block={block} index={index} />
                ))}
              </div>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}

function BlockRenderer({ block, index }: { block: Block; index: number }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${Math.min(block.level, 6)}` as keyof React.JSX.IntrinsicElements;
      const classes = getHeadingClass(block.level);
      const headingId = slugify(block.content);
      return (
        <Tag id={headingId} className={classes} style={{ scrollMarginTop: "6rem" }}>
          {renderInline(block.content, `h-${index}`)}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="text-gray-700 leading-relaxed">
          {renderInline(block.content, `p-${index}`)}
        </p>
      );
    case "list":
      if (block.ordered) {
        return (
          <ol className="list-decimal list-outside space-y-3 pl-6 text-gray-700 marker:text-blue-600 marker:font-semibold">
            {block.items.map((item, itemIndex) => (
              <li key={`ol-${index}-${itemIndex}`} className="pl-2">
                {renderInline(item, `ol-${index}-${itemIndex}`)}
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="list-disc list-outside space-y-3 pl-6 text-gray-700 marker:text-purple-500">
          {block.items.map((item, itemIndex) => (
            <li key={`ul-${index}-${itemIndex}`} className="pl-2">
              {renderInline(item, `ul-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      );
    case "blockquote":
      return (
        <div className="border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-900 rounded-lg px-6 py-4 leading-relaxed shadow-sm">
          {renderInline(block.content, `blockquote-${index}`)}
        </div>
      );
    case "hr":
      return <div className="border-t border-gray-200" />;
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
              <tr>
                {block.header.map((cell, cellIndex) => (
                  <th
                    key={`th-${index}-${cellIndex}`}
                    className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-700"
                  >
                    {renderInline(cell, `th-${index}-${cellIndex}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {block.rows.map((row, rowIndex) => (
                <tr
                  key={`tr-${index}-${rowIndex}`}
                  className={rowIndex % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}
                >
                  {row.map((cell, cellIndex) => (
                    <td key={`td-${index}-${rowIndex}-${cellIndex}`} className="px-6 py-4 text-gray-700">
                      {renderInline(cell, `td-${index}-${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

function getHeadingClass(level: number) {
  switch (level) {
    case 1:
      return "text-3xl sm:text-4xl font-bold text-gray-900 pb-4 border-b-2 border-gray-200";
    case 2:
      return "text-2xl font-bold text-blue-900 mt-10 mb-4 pb-2 border-b border-blue-200";
    case 3:
      return "text-xl font-semibold text-purple-900 mt-8 mb-3";
    case 4:
      return "text-lg font-semibold text-gray-900 mt-6 mb-2";
    default:
      return "text-base font-semibold text-gray-800 mt-4 mb-2";
  }
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-code-${tokenIndex}`} className="rounded-md bg-purple-100 px-2 py-1 text-sm text-purple-900 font-mono">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      const inner = token.slice(2, -2);
      nodes.push(
        <strong key={`${keyPrefix}-strong-${tokenIndex}`} className="font-bold text-gray-900">
          {renderInline(inner, `${keyPrefix}-strong-${tokenIndex}`)}
        </strong>
      );
    } else if (token.startsWith("[")) {
      const label = match[2] ?? "";
      const href = match[3] ?? "";
      nodes.push(
        <a
          key={`${keyPrefix}-link-${tokenIndex}`}
          href={href}
          className="text-blue-600 hover:text-purple-600 underline decoration-blue-300 hover:decoration-purple-400 transition-colors font-medium"
        >
          {label}
        </a>
      );
    }

    lastIndex = pattern.lastIndex;
    tokenIndex += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#{1,6}/)?.[0].length ?? 1;
      const content = line.replace(/^#{1,6}\s*/, "").trim();
      blocks.push({ type: "heading", level, content });
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      if (tableLines.length >= 2) {
        const [headerLine, maybeDivider, ...bodyLines] = tableLines;
        const header = splitTableRow(headerLine);
        const rows: string[][] = [];
        const divisorIsAlignment = maybeDivider
          ? splitTableRow(maybeDivider).every((cell) => /^:?-+:?$/.test(cell.trim()))
          : false;
        const dataLines = divisorIsAlignment ? bodyLines : [maybeDivider, ...bodyLines].filter(Boolean) as string[];
        dataLines.forEach((rowLine) => {
          rows.push(splitTableRow(rowLine));
        });
        blocks.push({ type: "table", header, rows });
      }
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, "").trim());
        index += 1;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join(" ") });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        const { text: item, nextIndex } = collectListItem(lines, index, /^\s*[-*+]\s+/);
        items.push(item);
        index = nextIndex;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        const { text: item, nextIndex } = collectListItem(lines, index, /^\s*\d+\.\s+/);
        items.push(item);
        index = nextIndex;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,6}\s/.test(lines[index]) &&
      !/^---+$/.test(lines[index].trim())
    ) {
      if (
        /^\s*[-*+]\s+/.test(lines[index]) ||
        /^\s*\d+\.\s+/.test(lines[index]) ||
        /^>\s?/.test(lines[index]) ||
        lines[index].trim().startsWith("|")
      ) {
        break;
      }
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", content: paragraphLines.join(" ") });
  }

  return blocks;
}

function collectListItem(lines: string[], startIndex: number, pattern: RegExp) {
  const match = lines[startIndex].match(pattern);
  const itemContent = lines[startIndex].slice(match?.[0].length ?? 0).trim();
  const collected = [itemContent];
  let nextIndex = startIndex + 1;

  while (
    nextIndex < lines.length &&
    lines[nextIndex] &&
    !pattern.test(lines[nextIndex]) &&
    !/^\s*[-*+]\s+/.test(lines[nextIndex]) &&
    !/^\s*\d+\.\s+/.test(lines[nextIndex]) &&
    lines[nextIndex].startsWith(" ")
  ) {
    collected.push(lines[nextIndex].trim());
    nextIndex += 1;
  }

  return { text: collected.join(" "), nextIndex };
}

function splitTableRow(row: string) {
  return row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}
