import "../_voxx/voxx.css";
import "../_voxx/voxx-globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { buildNavTree } from "@prudentbird/voxx-core";
import { getConfig, listPosts } from "./_data";
import { SidebarNav } from "./_sidebar-nav";
import { MobileNav } from "./_mobile-nav";
import { ThemeToggle } from "./_theme-toggle";

export default async function DocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [{ posts }, config] = await Promise.all([listPosts(), getConfig()]);
  const tree = buildNavTree(posts);
  return (
    <div className="voxx voxx-docs">
      <aside className="voxx-docs__nav">
        <div className="voxx-docs__nav-inner">
          <div className="voxx-docs__nav-header">
            <MobileNav items={tree} title={config.site.title} />
            <Link
              href={config.site.titleHref ?? "/"}
              className="voxx-docs__title"
            >
              {config.site.title}
            </Link>
          </div>
          <SidebarNav items={tree} />
          <div className="voxx-docs__nav-footer">
            <ThemeToggle />
          </div>
        </div>
      </aside>
      {children}
    </div>
  );
}
