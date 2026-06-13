import type { CSSProperties } from "react";
import Link from "next/link";
import { CopyCommand } from "~/components/copy-command";
import { EditorDemo } from "~/components/landing/editor-demo";
import { ManifestoHeading } from "~/components/landing/manifesto-heading";
import { Reveal } from "~/components/landing/reveal";
import { SurfaceTabs } from "~/components/landing/surface-tabs";
import { Button } from "@voxx/ui/components/button";
import "./landing.css";

const VERBS = [
  {
    cmd: 'grep -r "pricing" content/',
    body: "Search your writing like you search your code.",
  },
  { cmd: "git diff", body: "Every edit is a readable, reviewable change." },
  {
    cmd: "git checkout -b rewrite",
    body: "Draft a whole new direction on a branch.",
  },
  { cmd: "gh pr review", body: "Content ships through the same gate as code." },
];

const BATTERIES = [
  {
    cmd: "og: + json-ld",
    body: "Open Graph tags and structured data on every page.",
  },
  {
    cmd: "canonical",
    body: "Canonical URLs, handled. No duplicate-content debt.",
  },
  { cmd: "rss.xml", body: "A real feed, generated from your posts." },
  { cmd: "sitemap.xml", body: "Always current. Never hand-edited." },
  { cmd: "robots.txt", body: "Sane defaults, easy overrides." },
  { cmd: "shiki", body: "Syntax highlighting, light and dark, at build time." },
  { cmd: "toc", body: "Table of contents from your headings." },
  { cmd: "~4 min read", body: "Reading time, computed for you." },
  {
    cmd: "frontmatter ✓",
    body: "Validated at build. Typos fail loudly, not silently.",
  },
  { cmd: "voxx.json", body: "One config file, JSON-schema validated." },
];

const AGENT_STEPS = [
  { path: "content/changelog/1.4.0.md", verb: "Read" },
  { path: "content/changelog/1.4.0.md", verb: "Edit" },
];

function Eyebrow({ children }: { children: string }) {
  return (
    <Reveal
      as="p"
      className="mb-5 font-mono text-[12.5px] font-medium tracking-[0.14em] uppercase text-primary"
    >
      {children}
    </Reveal>
  );
}

function Ctas() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <CopyCommand />
      <Button
        asChild
        className="h-auto gap-2 px-[1.1rem] py-[0.7rem] font-mono text-[0.85rem] font-normal hover:bg-primary hover:brightness-90"
      >
        <Link href="/docs">Read the docs →</Link>
      </Button>
    </div>
  );
}

function Traffic() {
  return (
    <span className="inline-flex gap-1.5" aria-hidden="true">
      <i className="block size-2.5 rounded-full bg-[rgba(237,232,221,0.12)]" />
      <i className="block size-2.5 rounded-full bg-[rgba(237,232,221,0.12)]" />
      <i className="block size-2.5 rounded-full bg-[rgba(237,232,221,0.12)]" />
    </span>
  );
}

export default function Home() {
  return (
    <>
      <section className="pt-[168px] max-sm:pt-[130px]">
        <div className="mx-auto flex max-w-[880px] flex-col items-center gap-7 px-8 text-center max-sm:px-6">
          <h1
            className="anim-up font-display text-[clamp(48px,7.4vw,88px)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance"
            style={{ "--d": 1 } as CSSProperties}
          >
            Publishing is a side&nbsp;effect of&nbsp;writing.
          </h1>
          <p
            className="anim-up max-w-[620px] text-[19px] leading-[1.65] text-pretty text-muted-foreground"
            style={{ "--d": 2 } as CSSProperties}
          >
            Voxx is a zero&#8209;friction CMS for you and your agents. A folder
            of markdown becomes your blog, docs, or changelog — written like
            prose, shipped like code.
          </p>
          <div className="anim-up" style={{ "--d": 3 } as CSSProperties}>
            <Ctas />
          </div>
        </div>

        <EditorDemo />
      </section>

      <section className="py-40 max-sm:py-24">
        <div className="mx-auto w-full max-w-[1140px] px-8 max-sm:px-6">
          <Eyebrow>Why files</Eyebrow>
          <ManifestoHeading />
          <Reveal className="grid grid-cols-4 gap-px border-y border-border/60 bg-border/60 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {VERBS.map((verb, i) => (
              <div
                key={verb.cmd}
                className={`bg-background py-7 pr-6 pl-6 ${i === 0 ? "lg:pl-0" : ""}`}
              >
                <code className="mb-2.5 block font-mono text-[13px] text-foreground">
                  {verb.cmd}
                </code>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {verb.body}
                </p>
              </div>
            ))}
          </Reveal>
          <Reveal
            as="p"
            className="mt-8 font-display text-[clamp(22px,2.6vw,30px)] font-medium tracking-tight"
          >
            A folder of files will outlive every CMS.
          </Reveal>
        </div>
      </section>

      <section className="pb-40 max-sm:py-24">
        <div className="mx-auto w-full max-w-[1140px] px-8 max-sm:px-6">
          <Eyebrow>One engine, three surfaces</Eyebrow>
          <Reveal
            as="h2"
            className="mb-5.5 font-display text-[clamp(34px,4.4vw,52px)] leading-[1.08] font-semibold tracking-[-0.03em]"
          >
            File names are the API.
          </Reveal>
          <Reveal
            as="p"
            className="mb-12 max-w-[560px] text-lg text-muted-foreground"
          >
            Dates sort the blog. Folders order the sidebar. Versions cut the
            releases. No config required — the convention does the work.
          </Reveal>
          <Reveal>
            <SurfaceTabs />
          </Reveal>
        </div>
      </section>

      <section className="bg-[#161410] py-[150px] text-[#ede8dd] max-sm:py-24 dark:border-y dark:bg-[#0e0d0a]">
        <div className="mx-auto grid w-full max-w-[1140px] grid-cols-[1.05fr_1fr] items-center gap-18 px-8 max-lg:grid-cols-1 max-lg:gap-12 max-sm:px-6">
          <div>
            <Eyebrow>Agent-native</Eyebrow>
            <Reveal
              as="h2"
              className="mb-5.5 font-display text-[clamp(34px,4.4vw,52px)] leading-[1.08] font-semibold tracking-[-0.03em] text-[#ede8dd]"
            >
              Your agent doesn&rsquo;t need a CMS API.
              <br />
              It needs a filesystem.
            </Reveal>
            <Reveal
              as="p"
              className="mb-9 max-w-[480px] text-[17px] leading-[1.7] text-[#a39c8d]"
            >
              Every page is a plain{" "}
              <code className="rounded-[5px] border border-[rgba(237,232,221,0.12)] bg-[#1f1c16] px-1.5 font-mono text-sm text-[#ede8dd]">
                .md
              </code>{" "}
              file in your repo. Agents read and write content with the same
              tools they use for code — no API tokens, no SDK, no custom
              integration. And every change lands as a diff a human can review.
            </Reveal>
          </div>

          <Reveal className="overflow-hidden rounded-2xl border border-[rgba(237,232,221,0.12)] bg-[#1f1c16]">
            <div className="flex items-center gap-3.5 border-b border-[rgba(237,232,221,0.12)] bg-[rgba(237,232,221,0.04)] px-4 py-3">
              <Traffic />
              <span className="font-mono text-xs text-[#a39c8d]">
                agent session
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-6 py-5.5 font-mono text-[13px] leading-[2.05]">
              <p className="mb-2 text-[#ede8dd]">
                <span className="text-[#a39c8d]">$</span> claude{" "}
                <span className="text-[oklch(0.75_0.1_150)]">
                  &quot;fix the typo in last week&apos;s release notes&quot;
                </span>
              </p>
              {AGENT_STEPS.map((step) => (
                <p key={step.verb} className="text-[#a39c8d]">
                  <span className="mr-1 text-primary">⏺</span> {step.verb}{" "}
                  <span className="text-[#ede8dd]">{step.path}</span>
                </p>
              ))}
              <p className="pl-6.5 text-[12.5px] text-[oklch(0.65_0.13_25)]">
                - drafts no longer apeear in the RSS feed
              </p>
              <p className="pl-6.5 text-[12.5px] text-[oklch(0.72_0.12_150)]">
                + drafts no longer appear in the RSS feed
              </p>
              <p className="text-[#a39c8d]">
                <span className="mr-1 text-primary">⏺</span> Bash{" "}
                <span className="text-[#ede8dd]">
                  git commit -m &quot;fix: typo in 1.4.0 notes&quot;
                </span>
              </p>
              <p className="mt-2 text-[#ede8dd]">
                <span className="mr-1 text-[oklch(0.72_0.12_150)]">✓</span>{" "}
                Done. Opened PR <span className="text-[#ede8dd]">#412</span> for
                review.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pt-40 pb-35 max-sm:py-24">
        <div className="mx-auto w-full max-w-[1140px] px-8 max-sm:px-6">
          <Eyebrow>Batteries included</Eyebrow>
          <Reveal
            as="h2"
            className="mb-5.5 font-display text-[clamp(34px,4.4vw,52px)] leading-[1.08] font-semibold tracking-[-0.03em]"
          >
            Everything a page needs.
            <br />
            Nothing you have to wire up.
          </Reveal>
          <Reveal className="mt-6.5 grid grid-cols-5 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 max-lg:grid-cols-3 max-sm:grid-cols-2">
            {BATTERIES.map((battery) => (
              <div
                key={battery.cmd}
                className="bg-background p-6.5 px-5.5 transition-colors duration-250 hover:bg-card"
              >
                <code className="mb-2.5 block font-mono text-[13px] text-primary">
                  {battery.cmd}
                </code>
                <p className="text-[13.5px] leading-[1.55] text-muted-foreground">
                  {battery.body}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="pt-5 pb-40 max-sm:py-24">
        <div className="mx-auto w-full max-w-[1140px] px-8 max-sm:px-6">
          <Eyebrow>Two ways to ship</Eyebrow>
          <Reveal
            as="h2"
            className="mb-5.5 font-display text-[clamp(34px,4.4vw,52px)] leading-[1.08] font-semibold tracking-[-0.03em]"
          >
            In your app, or on its own.
          </Reveal>
          <div className="mt-6.5 grid grid-cols-2 gap-6 max-sm:grid-cols-1">
            <Reveal className="flex flex-col gap-3.5 rounded-2xl border bg-card p-9 pb-8">
              <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground/70 uppercase">
                Next.js
              </p>
              <h3 className="font-display text-[23px] font-semibold tracking-tight">
                Scaffolded into your app
              </h3>
              <p className="text-[15px] leading-[1.65] text-muted-foreground">
                <code className="rounded-[5px] border border-border/60 bg-secondary px-1 font-mono text-[13px] text-foreground">
                  npx voxx init
                </code>{" "}
                writes real route files into your project. You own them —
                restyle them, extend them, delete what you don&rsquo;t need. No
                black box.
              </p>
              <ul className="mt-2 border-t border-border/60 pt-3.5 font-mono text-[13px] leading-8 text-muted-foreground">
                {[
                  "app/blog/page.tsx",
                  "app/blog/[slug]/page.tsx",
                  "app/blog/_voxx/data.ts",
                ].map((f) => (
                  <li key={f}>
                    <span className="text-muted-foreground/70">◇ </span>
                    {f}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal className="flex flex-col gap-3.5 rounded-2xl border bg-card p-9 pb-8">
              <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground/70 uppercase">
                Any stack
              </p>
              <h3 className="font-display text-[23px] font-semibold tracking-tight">
                Fully static with{" "}
                <code className="font-mono text-xl text-primary">
                  voxx build
                </code>
              </h3>
              <p className="text-[15px] leading-[1.65] text-muted-foreground">
                No framework? One command renders the whole site to plain HTML
                in{" "}
                <code className="rounded-[5px] border border-border/60 bg-secondary px-1 font-mono text-[13px] text-foreground">
                  dist/
                </code>
                . Deploy it anywhere a folder can go.
              </p>
              <ul className="mt-2 border-t border-border/60 pt-3.5 font-mono text-[13px] leading-8 text-muted-foreground">
                {[
                  "dist/blog/index.html",
                  "dist/blog/hello-world/index.html",
                  "dist/blog/rss.xml",
                ].map((f) => (
                  <li key={f}>
                    <span className="text-muted-foreground/70">◇ </span>
                    {f}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal as="p" className="mt-9 text-[15px] text-muted-foreground">
            Bringing your own framework?{" "}
            <code className="rounded-[5px] border border-border/60 bg-secondary px-1.5 font-mono text-[13.5px] text-foreground">
              @prudentbird/voxx-core
            </code>{" "}
            exposes the parsing, validation and rendering primitives directly.
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary pt-35 pb-30 max-sm:py-24">
        <div className="mx-auto flex w-full max-w-[1140px] flex-col items-center gap-8 px-8 text-center max-sm:px-6">
          <Reveal
            as="h2"
            className="max-w-[720px] font-display text-[clamp(36px,5vw,60px)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance"
          >
            Your next post is one file away.
          </Reveal>
          <Reveal>
            <Ctas />
          </Reveal>
        </div>
      </section>
    </>
  );
}
