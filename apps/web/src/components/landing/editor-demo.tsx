"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseDoc(src: string) {
  const lines = src.split("\n");
  const fm: Record<string, string> = {};
  let bodyStart = 0;
  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]!.trim() === "---") {
        bodyStart = i + 1;
        break;
      }
      const m = lines[i]!.match(/^(\w[\w-]*):\s*(.*)$/);
      if (m) fm[m[1]!] = m[2]!.trim();
    }
  }
  return { fm, body: lines.slice(bodyStart).join("\n") };
}

function inline(s: string) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="#" onclick="return false">$1</a>');
  return s;
}

function renderMD(body: string) {
  const lines = body.split("\n");
  const html: string[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];
  let inFence = false;
  let fence: string[] = [];

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      html.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
      quote = [];
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const ln of lines) {
    if (/^```/.test(ln.trim())) {
      if (inFence) {
        html.push(`<pre><code>${esc(fence.join("\n"))}</code></pre>`);
        fence = [];
        inFence = false;
      } else {
        flushAll();
        inFence = true;
      }
      continue;
    }
    if (inFence) {
      fence.push(ln);
      continue;
    }

    const h = ln.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushAll();
      const lvl = h[1]!.length === 1 ? 2 : h[1]!.length;
      html.push(`<h${lvl}>${inline(h[2]!)}</h${lvl}>`);
      continue;
    }

    const li = ln.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      flushPara();
      flushQuote();
      list.push(li[1]!);
      continue;
    }

    const q = ln.match(/^>\s?(.*)$/);
    if (q) {
      flushPara();
      flushList();
      quote.push(q[1]!);
      continue;
    }

    if (ln.trim() === "") {
      flushAll();
      continue;
    }
    flushList();
    flushQuote();
    para.push(ln.trim());
  }
  if (inFence && fence.length) html.push(`<pre><code>${esc(fence.join("\n"))}</code></pre>`);
  flushAll();
  return html.join("");
}

function highlight(src: string) {
  const lines = src.split("\n");
  const out: string[] = [];
  let fmZone = false;
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const ln = esc(raw);

    if (i === 0 && raw.trim() === "---") {
      fmZone = true;
      out.push(`<span class="tk-fm">${ln}</span>`);
      continue;
    }
    if (fmZone && raw.trim() === "---") {
      fmZone = false;
      out.push(`<span class="tk-fm">${ln}</span>`);
      continue;
    }
    if (fmZone) {
      const kv = ln.match(/^(\w[\w-]*):(.*)$/);
      if (kv) {
        out.push(
          `<span class="tk-key">${kv[1]}</span><span class="tk-mark">:</span><span class="tk-str">${kv[2]}</span>`,
        );
      } else {
        out.push(`<span class="tk-fm">${ln}</span>`);
      }
      continue;
    }
    if (/^```/.test(raw.trim())) {
      inFence = !inFence;
      out.push(`<span class="tk-code">${ln}</span>`);
      continue;
    }
    if (inFence) {
      out.push(`<span class="tk-code">${ln}</span>`);
      continue;
    }

    if (/^#{1,3}\s/.test(raw)) {
      out.push(`<span class="tk-h">${ln}</span>`);
      continue;
    }
    if (/^>\s?/.test(raw)) {
      out.push(`<span class="tk-i tk-fm">${ln}</span>`);
      continue;
    }

    let s = ln;
    s = s.replace(/`([^`]+)`/g, '<span class="tk-code">`$1`</span>');
    s = s.replace(
      /\*\*([^*]+)\*\*/g,
      '<span class="tk-b"><span class="tk-mark">**</span>$1<span class="tk-mark">**</span></span>',
    );
    s = s.replace(/^(\s*)([-*])(\s)/, '$1<span class="tk-mark">$2</span>$3');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="tk-code">[$1]($2)</span>');
    out.push(s);
  }
  return out.join("\n") + "\n";
}

function fmtDate(d?: string) {
  let dt = d ? new Date(d + "T12:00:00") : new Date();
  if (isNaN(dt.getTime())) dt = new Date();
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function slugify(t?: string) {
  return (
    (t ?? "untitled")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40) || "untitled"
  );
}

const SAMPLE = [
  "---",
  "title: Hello, world",
  "date: 2026-06-12",
  "tags: [meta, shipping]",
  "---",
  "",
  "We moved our blog into the repo today.",
  "",
  "## Why",
  "",
  "No dashboards. No tokens. Just files.",
  "Write a post, open a PR, merge. **Deployed.**",
  "",
  "- `git log` is the audit trail",
  "- `git blame` is the byline",
  "",
  "> Prose wants to be prose, not rows in a database.",
  "",
  "Try editing this file. The page keeps up.",
].join("\n");

function Traffic() {
  return (
    <span className="inline-flex gap-1.5" aria-hidden="true">
      <i className="block size-2.5 rounded-full bg-border" />
      <i className="block size-2.5 rounded-full bg-border" />
      <i className="block size-2.5 rounded-full bg-border" />
    </span>
  );
}

export function EditorDemo() {
  const [source, setSource] = useState(SAMPLE);
  const hlRef = useRef<HTMLPreElement>(null);

  const { fm, body } = useMemo(() => parseDoc(source), [source]);
  const highlighted = useMemo(() => highlight(source), [source]);
  const rendered = useMemo(() => renderMD(body), [body]);

  const title = fm.title || "Untitled";
  const words = body.split(/\s+/).filter(Boolean).length;
  const readTime = `${Math.max(1, Math.round(words / 200))} min read`;
  const tags = (fm.tags ?? "")
    .replace(/[[\]]/g, "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="anim-up mx-auto mt-20 w-full max-w-[1180px] px-8 max-sm:px-6" style={{ "--d": 4 } as CSSProperties}>
      <div className="grid items-stretch gap-0 lg:grid-cols-[1fr_56px_1fr] max-lg:grid-cols-1 max-lg:gap-4.5">
        <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center gap-3.5 border-b border-border/60 bg-background px-4 py-3">
            <Traffic />
            <span className="truncate font-mono text-xs text-muted-foreground">
              content/posts/2026-06-12-hello-world.md
            </span>
          </div>
          <div className="relative h-[480px] max-sm:h-[420px]">
            <pre
              ref={hlRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden p-5 px-5.5 font-mono text-[13.5px] leading-[1.75] whitespace-pre-wrap break-words text-foreground"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onScroll={(e) => {
                if (hlRef.current) {
                  hlRef.current.scrollTop = e.currentTarget.scrollTop;
                  hlRef.current.scrollLeft = e.currentTarget.scrollLeft;
                }
              }}
              spellCheck={false}
              aria-label="Markdown source — edit me"
              className="absolute inset-0 resize-none overflow-y-auto border-none bg-transparent p-5 px-5.5 font-mono text-[13.5px] leading-[1.75] whitespace-pre-wrap break-words text-transparent caret-primary outline-none"
            />
          </div>
        </div>

        <div
          className="self-center justify-self-center font-display text-2xl text-muted-foreground/70 max-lg:rotate-90"
          aria-hidden="true"
        >
          →
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center gap-3.5 border-b border-border/60 bg-background px-4 py-3">
            <Traffic />
            <span className="truncate font-mono text-xs text-muted-foreground">
              yoursite.com/blog/{slugify(fm.title)}
            </span>
          </div>
          <div className="h-[480px] overflow-y-auto px-9 py-8 max-sm:h-[420px]">
            <article className="demo-prose">
              <div className="flex min-h-[22px] flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="my-2.5 mt-1.5 font-display text-[27px] leading-[1.15] font-bold tracking-tight">
                {title}
              </h1>
              <p className="mb-4.5 flex items-center gap-2 text-[13px] text-muted-foreground/70">
                <span>{fmtDate(fm.date)}</span>
                <span>·</span>
                <span>{readTime}</span>
              </p>
              <div dangerouslySetInnerHTML={{ __html: rendered }} />
            </article>
          </div>
        </div>
      </div>
      <p className="mt-5.5 text-center font-mono text-[12.5px] text-muted-foreground/70">
        This demo is live — edit the file on the left.
      </p>
    </div>
  );
}
