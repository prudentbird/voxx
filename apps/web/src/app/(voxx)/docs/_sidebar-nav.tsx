"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavNode } from "@prudentbird/voxx-core";

export function SidebarNav({ items }: { items: NavNode[] }) {
  const pathname = usePathname();
  return (
    <nav className="voxx-nav">
      <NavList items={items} pathname={pathname} />
    </nav>
  );
}

function NavList({ items, pathname }: { items: NavNode[]; pathname: string }) {
  return (
    <ul className="voxx-nav__list">
      {items.map((item) => (
        <li key={`${item.url ?? ""}:${item.title}`}>
          {item.url ? (
            <Link
              href={item.url}
              className="voxx-nav__link"
              data-active={pathname === item.url || undefined}
            >
              {item.title}
            </Link>
          ) : (
            <span className="voxx-nav__section">{item.title}</span>
          )}
          {item.children.length > 0 ? (
            <NavList items={item.children} pathname={pathname} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
