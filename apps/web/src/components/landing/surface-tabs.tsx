"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@voxx/ui/lib/utils";

type SurfaceKey = "blog" | "docs" | "changelog";

const SURFACES: { key: SurfaceKey; label: string }[] = [
  { key: "blog", label: "Blog" },
  { key: "docs", label: "Docs" },
  { key: "changelog", label: "Changelog" },
];

function FileName({ children }: { children: ReactNode }) {
  return (
    <li className="text-foreground">
      <span className="text-muted-foreground/70">◇ </span>
      {children}
    </li>
  );
}

function Dir({ name, children }: { name: string; children: ReactNode }) {
  return (
    <li>
      <span className="font-medium text-primary">
        <span className="text-muted-foreground/70">▸ </span>
        {name}
      </span>
      <ul className="pl-5.5">{children}</ul>
    </li>
  );
}

function MiniLine({ width }: { width: string }) {
  return (
    <span className="block h-2 rounded-sm bg-secondary" style={{ width }} />
  );
}

function Panel({
  active,
  files,
  note,
  children,
}: {
  active: boolean;
  files: ReactNode;
  note: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid-cols-[1fr_56px_1.1fr] items-center rounded-2xl border bg-card p-10 px-11 max-lg:grid-cols-1 max-lg:gap-5 max-lg:p-7.5",
        active
          ? "grid animate-in fade-in slide-in-from-bottom-2.5 duration-400"
          : "hidden",
      )}
    >
      <div>
        <ul className="font-mono text-[13.5px] leading-[2.1]">{files}</ul>
        <p className="mt-4.5 max-w-[300px] text-[13.5px] leading-relaxed text-muted-foreground">
          {note}
        </p>
      </div>
      <div
        className="text-center font-display text-[22px] text-muted-foreground/70 max-lg:rotate-90"
        aria-hidden="true"
      >
        →
      </div>
      <div>{children}</div>
    </div>
  );
}

function MiniPage({
  kicker,
  children,
}: {
  kicker: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-6 px-6.5 dark:bg-[#181613]">
      <p className="font-mono text-[11.5px] text-muted-foreground/70">
        {kicker}
      </p>
      {children}
    </div>
  );
}

export function SurfaceTabs() {
  const [active, setActive] = useState<SurfaceKey>("blog");

  return (
    <>
      <div
        role="tablist"
        className="mb-9 inline-flex gap-1 rounded-xl border border-border/60 bg-secondary p-1"
      >
        {SURFACES.map((surface) => (
          <button
            key={surface.key}
            type="button"
            role="tab"
            aria-selected={active === surface.key}
            onClick={() => setActive(surface.key)}
            className={cn(
              "cursor-pointer rounded-[9px] border-none px-5.5 py-2 text-[14.5px] font-semibold transition-[color,background]",
              active === surface.key
                ? "bg-card text-foreground dark:bg-accent"
                : "bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {surface.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Panel
          active={active === "blog"}
          note="The date prefix becomes the publish date. Newest first, automatically."
          files={
            <>
              <li className="mb-1 font-mono text-xs leading-normal text-muted-foreground/70">
                content/posts/
              </li>
              <FileName>2026-06-11-hello.md</FileName>
              <FileName>2026-05-28-v1-launch.md</FileName>
              <FileName>2026-05-02-why-files.md</FileName>
            </>
          }
        >
          <MiniPage kicker="/blog">
            {[
              ["Jun 11", "Hello"],
              ["May 28", "v1 launch"],
              ["May 02", "Why files"],
            ].map(([date, title]) => (
              <div key={title} className="flex items-baseline gap-3.5">
                <span className="min-w-[52px] font-mono text-[11.5px] text-muted-foreground/70">
                  {date}
                </span>
                <span className="font-display text-base font-semibold tracking-tight">
                  {title}
                </span>
              </div>
            ))}
          </MiniPage>
        </Panel>

        <Panel
          active={active === "docs"}
          note="Numeric prefixes pin sidebar order, then disappear from the URL."
          files={
            <>
              <li className="mb-1 font-mono text-xs leading-normal text-muted-foreground/70">
                content/docs/
              </li>
              <Dir name="01-getting-started/">
                <FileName>01-install.md</FileName>
                <FileName>02-configure.md</FileName>
              </Dir>
              <Dir name="02-writing/">
                <FileName>01-frontmatter.md</FileName>
              </Dir>
            </>
          }
        >
          <div className="flex flex-row gap-5.5 rounded-xl border border-border/60 bg-background p-6 px-6.5 dark:bg-[#181613]">
            <div className="flex min-w-[130px] flex-col gap-2 border-r border-border/60 pr-5">
              <p className="font-mono text-[10.5px] tracking-widest text-muted-foreground/70 uppercase">
                Getting started
              </p>
              <p className="text-[13.5px] font-semibold text-primary">
                Install
              </p>
              <p className="text-[13.5px] font-medium text-muted-foreground">
                Configure
              </p>
              <p className="mt-1.5 font-mono text-[10.5px] tracking-widest text-muted-foreground/70 uppercase">
                Writing
              </p>
              <p className="text-[13.5px] font-medium text-muted-foreground">
                Frontmatter
              </p>
            </div>
            <div className="flex flex-1 flex-col gap-2.5">
              <p className="font-mono text-[11.5px] text-muted-foreground/70">
                /docs/getting-started/install
              </p>
              <p className="font-display text-lg font-bold tracking-tight">
                Install
              </p>
              <MiniLine width="80%" />
              <MiniLine width="60%" />
            </div>
          </div>
        </Panel>

        <Panel
          active={active === "changelog"}
          note="One file per release. Each gets a stable anchor you can link forever."
          files={
            <>
              <li className="mb-1 font-mono text-xs leading-normal text-muted-foreground/70">
                content/changelog/
              </li>
              <FileName>1.4.0.md</FileName>
              <FileName>1.3.2.md</FileName>
              <FileName>1.3.0.md</FileName>
            </>
          }
        >
          <MiniPage kicker="/changelog">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[17px] font-bold tracking-tight">
                1.4.0
              </span>
              <span className="font-mono text-[11.5px] text-primary">
                #1-4-0
              </span>
            </div>
            <MiniLine width="80%" />
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[17px] font-bold tracking-tight">
                1.3.2
              </span>
              <span className="font-mono text-[11.5px] text-primary">
                #1-3-2
              </span>
            </div>
            <MiniLine width="60%" />
          </MiniPage>
        </Panel>
      </div>
    </>
  );
}
