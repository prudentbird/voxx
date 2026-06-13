import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ThemeSwitcher } from "~/components/theme-switcher";
import { SiteHeader } from "~/components/site-header";
import { Wordmark } from "~/components/wordmark";

export const metadata: Metadata = {
  title: {
    default: "Voxx — publishing is a side effect of writing",
    template: "%s · Voxx",
  },
  description:
    "A zero-friction CMS for you and your agents. Point Voxx at a folder of markdown and ship a blog, a docs site, or a changelog — no database, no admin UI, no lock-in.",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <SiteHeader>
        <div className="mx-auto flex h-[68px] w-full max-w-[1140px] items-center justify-between gap-6 px-8 max-sm:px-6">
          <Wordmark />
          <nav className="flex items-center gap-7">
            <Link
              href="/docs"
              className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </Link>
            <a
              href="https://github.com/prudentbird/voxx"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
              <ArrowUpRight className="size-3.5" />
            </a>
          </nav>
        </div>
      </SiteHeader>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 bg-secondary">
        <div className="mx-auto flex w-full max-w-[1140px] flex-wrap items-center justify-between gap-6 px-8 py-8 max-sm:gap-4 max-sm:px-6">
          <Wordmark small />
          <nav className="flex gap-6">
            <Link
              href="/docs"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </Link>
            <a
              href="https://github.com/prudentbird/voxx"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
          <ThemeSwitcher />
        </div>
      </footer>
    </>
  );
}
