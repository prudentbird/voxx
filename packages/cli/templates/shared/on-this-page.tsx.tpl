"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@voxx/core";

export function OnThisPage({ toc }: { toc: TocItem[] }) {
  const [active, setActive] = useState<string>(toc[0]?.id ?? "");

  useEffect(() => {
    const headings = toc
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

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
      <ul className="voxx-toc__list">
        {toc.map((t) => (
          <li
            key={t.id}
            className="voxx-toc__item"
            data-depth={t.depth}
            data-active={active === t.id}
          >
            <a href={`#${t.id}`}>{t.text}</a>
          </li>
        ))}
      </ul>
      <div className="voxx-toc__top">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Top ↑
        </a>
      </div>
    </nav>
  );
}
