"use client";

import { useEffect, useRef } from "react";

const TEXT = "Prose wants to be prose — not rows in a database.";

export function ManifestoHeading() {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const h = ref.current;
    if (!h) return;
    const spans = Array.from(h.querySelectorAll<HTMLSpanElement>("span"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function onScroll() {
      if (!h) return;
      if (reduced) {
        for (const s of spans) s.style.opacity = "1";
        return;
      }
      const r = h.getBoundingClientRect();
      const vh = window.innerHeight;
      let p = (vh * 0.92 - r.top) / (vh * 0.6);
      p = Math.max(0, Math.min(1, p));
      const lit = Math.floor(p * spans.length + 0.0001);
      spans.forEach((s, i) => {
        s.style.opacity = i < lit ? "1" : "0.16";
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <h2
      ref={ref}
      className="mb-18 max-w-[900px] font-display text-[clamp(40px,5.6vw,68px)] leading-[1.06] font-semibold tracking-[-0.035em]"
    >
      {TEXT.split(" ").map((word, i) => (
        <span key={i} className="transition-opacity duration-300">
          {word}{" "}
        </span>
      ))}
    </h2>
  );
}
