import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Fraunces, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ArrowRight } from "lucide-react";
import { Button } from "@voxx/ui/components/button";
import { ThemeSwitcher } from "~/components/theme-switcher";
import "@voxx/ui/globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://voxx.dev"),
  title: {
    default: "Voxx — publishing is a side effect of writing",
    template: "%s · Voxx",
  },
  description:
    "A zero-friction CMS for you and your agents. Point Voxx at a folder of markdown and ship a blog, a docs site, or a changelog — no database, no admin UI, no lock-in.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
              <Link href="/" className="font-mono text-lg font-semibold tracking-tight">
                vo<span className="text-muted-foreground">xx</span>
              </Link>
              <nav className="flex items-center gap-1">
                <Button asChild variant="ghost" className="max-sm:hidden">
                  <Link href="/docs">Docs</Link>
                </Button>
                <Button asChild variant="ghost" className="max-sm:hidden">
                  <a
                    href="https://github.com/prudentbird/voxx"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                </Button>
                <Button asChild>
                  <Link href="/docs">
                    Get started
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t">
            <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6">
              <p className="text-sm text-muted-foreground">
                Voxx — files in, site out. Built with{" "}
                <Link href="/docs" className="underline underline-offset-4 hover:text-foreground">
                  Voxx itself
                </Link>
                . © {new Intl.DateTimeFormat("en-UK", { year: "numeric" }).format()}
              </p>
              <ThemeSwitcher />
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
