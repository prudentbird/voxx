import "./_voxx/voxx.css";
{{GLOBALS_IMPORT}}
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { buildNavTree } from "@voxx/core";
import { getConfig, getPosts } from "./_voxx/data";
import { SidebarNav } from "./_voxx/sidebar-nav";
import { MobileNav } from "./_voxx/mobile-nav";
import { ThemeToggle } from "./_voxx/theme-toggle";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  return {
    title: {
      default: config.site.title,
      template: `%s · ${config.site.title}`,
    },
  };
}

export default async function DocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [posts, config] = await Promise.all([getPosts(), getConfig()]);
  const tree = buildNavTree(posts);
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="voxx voxx-docs">
          <aside className="voxx-docs__nav">
            <div className="voxx-docs__nav-inner">
              <div className="voxx-docs__nav-header">
                <MobileNav items={tree} title={config.site.title} />
                <Link href="{{BASE_PATH}}" className="voxx-docs__title">
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
      </body>
    </html>
  );
}
