import "./_voxx/voxx.css";
import "./_voxx/voxx-globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { getConfig } from "./_voxx/data";
import { ThemeToggle } from "./_voxx/theme-toggle";

export default async function BlogLayout({
  children,
}: {
  children: ReactNode;
}) {
  const config = await getConfig();
  return (
    <div className="voxx">
      <header className="voxx-header">
        <Link href="/blog" className="voxx-header__title">
          {config.site.title}
        </Link>
        <div className="voxx-header__actions">
          {config.features.rss ? (
            <a
              className="voxx-icon-button"
              href="/blog/rss.xml"
              aria-label="RSS feed"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="5" cy="19" r="1" fill="currentColor" />
              </svg>
            </a>
          ) : null}
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
