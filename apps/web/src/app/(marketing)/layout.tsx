import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Wordmark } from "~/components/wordmark";
import { SiteHeader } from "~/components/site-header";
import { ThemeSwitcher } from "~/components/theme-switcher";

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
              href="/about"
              className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
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
        <div className="mx-auto flex w-full max-w-[1140px] flex-wrap items-center justify-between gap-6 px-8 py-8 max-sm:gap-5 max-sm:px-6">
          <Wordmark small />
          <nav className="flex flex-wrap gap-6 max-sm:order-last max-sm:w-full">
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
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
