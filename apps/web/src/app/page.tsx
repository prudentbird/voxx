import Link from "next/link";
import { ArrowRight, BookOpen, History, Rss } from "lucide-react";
import { Badge } from "@voxx/ui/components/badge";
import { Button } from "@voxx/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@voxx/ui/components/card";
import { CopyCommand } from "~/components/copy-command";

const PRESETS = [
  {
    icon: Rss,
    name: "Blog",
    command: "npx voxx init",
    body: "Date-stamped markdown becomes a reverse-chronological blog with excerpts, tags, and an RSS feed.",
  },
  {
    icon: BookOpen,
    name: "Docs",
    command: "npx voxx init docs",
    body: "Folders become the sidebar. Numeric prefixes order pages, index.md lands a section, prev/next comes free.",
  },
  {
    icon: History,
    name: "Changelog",
    command: "npx voxx init changelog",
    body: "Version-named files like 1.4.0.md become a release timeline with stable anchor links and a feed.",
  },
];

const FEATURES = [
  {
    title: "Files are the database",
    body: "Every page is one markdown file with YAML frontmatter. Grep it, diff it, version it. No CMS to run, nothing to migrate, nothing to back up that git doesn't already handle.",
  },
  {
    title: "Three surfaces, one engine",
    body: "Blog, docs, and changelog share the same pipeline — and collections in voxx.json mount several at once on a single site.",
  },
  {
    title: "SEO, done for you",
    body: "Open Graph, Twitter cards, type-aware JSON-LD, canonical URLs, sitemap.xml and RSS — out of the box, per surface.",
  },
  {
    title: "Inherits your design",
    body: "Voxx reads your design tokens — shadcn variables just work. Looks like your site with zero config, dark mode included.",
  },
  {
    title: "Made for agents too",
    body: "Self-describing files plus a generated llms.txt, so models can discover, read, and write alongside you.",
  },
  {
    title: "Any stack",
    body: "First-class Next.js scaffolding you own and restyle, or render a self-contained static site with one command for everything else.",
  },
];

export default function Home() {
  return (
    <>
      <section className="px-6 pt-24 pb-16 text-center sm:pt-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Publishing is a <em>side effect</em> of writing.
          </h1>
          <p className="mt-6 text-lg text-pretty text-muted-foreground">
            A zero-friction CMS for you and your agents. Write the way
            you ship code, and Voxx handles the rest.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <CopyCommand />
            <Button asChild size="lg">
              <Link href="/docs">
                Read the docs
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>


      <section className="mx-auto w-full max-w-5xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            One engine, three surfaces.
          </h2>
          <span className="font-mono text-xs text-muted-foreground">01 / presets</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {PRESETS.map((preset) => (
            <Card key={preset.name}>
              <CardHeader>
                <preset.icon className="size-5 text-muted-foreground" />
                <CardTitle className="mt-2">{preset.name}</CardTitle>
                <CardDescription>{preset.body}</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto">
                <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                  {preset.command}
                </code>
              </CardFooter>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Need more than one? Mount them together with{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">collections</code>{" "}
          in voxx.json.
        </p>
      </section>

      <section
        className="mx-auto w-full max-w-5xl px-6 pb-20"
        aria-label="A file becomes a page"
      >
        <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="flex-row items-center justify-between border-b bg-muted/50 py-3!">
              <span className="font-mono text-xs text-muted-foreground">
                content/hello-world.md
              </span>
              <Badge variant="outline">source</Badge>
            </CardHeader>
            <CardContent className="py-5">
              <pre className="overflow-x-auto font-mono text-sm leading-6">
                <span className="text-muted-foreground">---</span>
                {"\n"}
                <span className="text-muted-foreground">title:</span> Hello, world
                {"\n"}
                <span className="text-muted-foreground">date:</span> 2026-06-11
                {"\n"}
                <span className="text-muted-foreground">tags:</span> [intro, css]
                {"\n"}
                <span className="text-muted-foreground">---</span>
                {"\n\n"}
                <span className="text-muted-foreground">## </span>Why files win
                {"\n\n"}
                Prose wants to be prose — not rows{"\n"}in a database. Just write
                and commit.
              </pre>
            </CardContent>
          </Card>

          <div
            className="flex items-center justify-center max-lg:rotate-90"
            aria-hidden="true"
          >
            <Badge className="font-mono">
              voxx
              <ArrowRight data-icon="inline-end" />
            </Badge>
          </div>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="flex-row items-center justify-between border-b bg-muted/50 py-3!">
              <span className="font-mono text-xs text-muted-foreground">
                /blog/hello-world
              </span>
              <Badge variant="outline">output</Badge>
            </CardHeader>
            <CardContent className="py-5">
              <h3 className="text-xl font-semibold tracking-tight">Hello, world</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                June 11, 2026 · 1 min read
              </p>
              <p className="mt-4 text-sm leading-6">
                Prose wants to be prose — not rows in a database. Just write and
                commit.
              </p>
              <div className="mt-4 flex gap-1.5">
                <Badge variant="secondary">intro</Badge>
                <Badge variant="secondary">css</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything your writing needs.
            </h2>
            <span className="font-mono text-xs text-muted-foreground">02 / features</span>
          </div>
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <div key={feature.title}>
                <span className="font-mono text-xs text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t px-6 py-24 text-center">
        <blockquote className="mx-auto max-w-2xl text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          A folder of files will <br /> <em>outlive</em> every CMS.
        </blockquote>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <CopyCommand />
          <Button asChild size="lg">
            <Link href="/docs">
              Read the docs
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
