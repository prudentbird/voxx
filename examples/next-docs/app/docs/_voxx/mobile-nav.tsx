"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { NavNode } from "@prudentbird/voxx-core";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav({
  items,
  title,
}: {
  items: NavNode[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="voxx-icon-button voxx-menu-button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
        </svg>
      </button>
      {open ? (
        <div className="voxx-drawer" role="dialog" aria-modal="true">
          <div
            className="voxx-drawer__overlay"
            onClick={() => setOpen(false)}
          />
          <div className="voxx-drawer__panel">
            <div className="voxx-drawer__header">
              <span className="voxx-docs__title">{title}</span>
              <button
                type="button"
                className="voxx-icon-button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="voxx-drawer__body">
              <SidebarNav items={items} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
