"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import type { NavNode } from "@voxx/core";
import { Button } from "@voxx/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@voxx/ui/components/sheet";
import { Wordmark } from "~/components/wordmark";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav({ items }: { items: NavNode[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <PanelLeft className="size-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        aria-describedby={undefined}
        className="voxx w-80 gap-0 p-0"
      >
        <SheetHeader className="h-12 justify-center border-b border-border/60 px-5 py-0">
          <SheetTitle>
            <Wordmark />
          </SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav items={items} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
