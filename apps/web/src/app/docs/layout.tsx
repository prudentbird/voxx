import "@prudentbird/voxx-core/theme/voxx.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildNavTree } from "@prudentbird/voxx-core";
import { ThemeSwitcher } from "~/components/theme-switcher";
import { Wordmark } from "~/components/wordmark";
import { getPosts } from "./_voxx/data";
import { MobileNav } from "./_voxx/mobile-nav";
import { SidebarNav } from "./_voxx/sidebar-nav";

export const metadata: Metadata = {
  title: {
    default: "Docs · Voxx",
    template: "%s · Voxx",
  },
};

export default async function DocsLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const posts = await getPosts();
  const tree = buildNavTree(posts);
  return (
    <div className="voxx voxx-docs">
      <aside className="voxx-docs__nav">
        <div className="voxx-docs__nav-inner">
          <div className="voxx-docs__nav-header">
            <MobileNav items={tree} />
            <Wordmark />
          </div>
          <SidebarNav items={tree} />
          <div className="voxx-docs__nav-footer">
            <ThemeSwitcher />
          </div>
        </div>
      </aside>
      {children}
    </div>
  );
}
