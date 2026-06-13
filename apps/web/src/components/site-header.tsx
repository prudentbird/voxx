"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@voxx/ui/lib/utils";

export function SiteHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-transparent transition-[background,border-color,backdrop-filter] duration-300",
        scrolled && "border-border/60 bg-background/80 backdrop-blur-md",
      )}
    >
      {children}
    </header>
  );
}
