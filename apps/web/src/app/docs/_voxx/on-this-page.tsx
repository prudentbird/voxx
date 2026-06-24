"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@prudentbird/voxx-core";

type TrackSvg = { path: string; width: number; height: number };

function getItemOffset(depth: number): number {
  if (depth <= 2) return 14;
  if (depth === 3) return 26;
  return 36;
}

function getLineOffset(depth: number): number {
  return depth >= 3 ? 10 : 0;
}

export function OnThisPage({ toc }: { toc: TocItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string[]>([]);
  const [svg, setSvg] = useState<TrackSvg | null>(null);

  useEffect(() => {
    const ids = toc.map((t) => t.id);
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        if (visible.size > 0) {
          setActive(ids.filter((id) => visible.has(id)));
          return;
        }
        const viewTop = entries[0]?.rootBounds?.top ?? 0;
        let fallback: string | undefined;
        let min = -1;
        for (const id of ids) {
          const el = document.getElementById(id);
          if (!el) continue;
          const d = Math.abs(viewTop - el.getBoundingClientRect().top);
          if (min === -1 || d < min) {
            fallback = id;
            min = d;
          }
        }
        setActive(fallback ? [fallback] : []);
      },
      { rootMargin: "0px", threshold: 0.98 },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [toc]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onResize() {
      if (!container || container.clientHeight === 0) return;
      let width = 0;
      let height = 0;
      const path: string[] = [];
      for (let i = 0; i < toc.length; i++) {
        const item = toc[i];
        if (!item) continue;
        const el = container.querySelector<HTMLAnchorElement>(
          `a[href="#${item.id}"]`,
        );
        if (!el) continue;
        const styles = getComputedStyle(el);
        const offset = getLineOffset(item.depth) + 1;
        const top = el.offsetTop + parseFloat(styles.paddingTop);
        const bottom =
          el.offsetTop + el.clientHeight - parseFloat(styles.paddingBottom);
        width = Math.max(offset, width);
        height = Math.max(height, bottom);
        path.push(`${i === 0 ? "M" : "L"}${offset} ${top}`);
        path.push(`L${offset} ${bottom}`);
      }
      setSvg({ path: path.join(" "), width: width + 1, height });
    }

    const observer = new ResizeObserver(onResize);
    onResize();
    observer.observe(container);
    return () => observer.disconnect();
  }, [toc]);

  useEffect(() => {
    const container = containerRef.current;
    const thumb = thumbRef.current;
    if (!container || !thumb) return;
    let top = Number.MAX_VALUE;
    let bottom = 0;
    for (const id of active) {
      const el = container.querySelector<HTMLAnchorElement>(`a[href="#${id}"]`);
      if (!el) continue;
      const styles = getComputedStyle(el);
      top = Math.min(top, el.offsetTop + parseFloat(styles.paddingTop));
      bottom = Math.max(
        bottom,
        el.offsetTop + el.clientHeight - parseFloat(styles.paddingBottom),
      );
    }
    if (active.length === 0 || container.clientHeight === 0) {
      top = 0;
      bottom = 0;
    }
    thumb.style.setProperty("--voxx-toc-thumb-top", `${top}px`);
    thumb.style.setProperty(
      "--voxx-toc-thumb-height",
      `${Math.max(bottom - top, 0)}px`,
    );
  }, [active, svg]);

  return (
    <nav className="voxx-toc" aria-label="On this page">
      <p className="voxx-toc__title">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2.5 4h7M2.5 8h11M2.5 12h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        On this page
      </p>
      <div className="voxx-toc__body">
        {svg ? (
          <div
            className="voxx-toc__mask"
            style={{
              width: svg.width,
              height: svg.height,
              maskImage: `url("data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svg.width} ${svg.height}"><path d="${svg.path}" stroke="black" stroke-width="1" fill="none" /></svg>`,
              )}")`,
            }}
          >
            <div
              ref={thumbRef}
              className="voxx-toc__thumb"
              data-hidden={active.length === 0 || undefined}
            />
          </div>
        ) : null}
        <div ref={containerRef} className="voxx-toc__items">
          {toc.map((item, i) => (
            <TocLink
              key={item.id}
              item={item}
              upper={toc[i - 1]?.depth ?? item.depth}
              lower={toc[i + 1]?.depth ?? item.depth}
              active={active.includes(item.id)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function TocLink({
  item,
  upper,
  lower,
  active,
}: {
  item: TocItem;
  upper: number;
  lower: number;
  active: boolean;
}) {
  const offset = getLineOffset(item.depth);
  const upperOffset = getLineOffset(upper);
  const lowerOffset = getLineOffset(lower);

  return (
    <a
      href={`#${item.id}`}
      className="voxx-toc__link"
      data-active={active || undefined}
      style={{ paddingInlineStart: getItemOffset(item.depth) }}
    >
      {offset !== upperOffset ? (
        <svg
          className="voxx-toc__connector"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <line x1={upperOffset} y1="0" x2={offset} y2="12" />
        </svg>
      ) : null}
      <span
        className="voxx-toc__line"
        aria-hidden="true"
        style={{
          insetInlineStart: offset,
          top: offset !== upperOffset ? "0.375rem" : 0,
          bottom: offset !== lowerOffset ? "0.375rem" : 0,
        }}
      />
      {item.text}
    </a>
  );
}
