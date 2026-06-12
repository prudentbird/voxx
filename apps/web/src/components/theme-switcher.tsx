"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@voxx/ui/components/button";
import { Skeleton } from "@voxx/ui/components/skeleton";
import { Sun, Monitor, MoonStar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@voxx/ui/components/dropdown-menu";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <>
        <Skeleton className="h-10 w-10 sm:hidden" />
        <Skeleton className="hidden h-9 w-28 rounded-full sm:inline-flex" />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="sm:hidden">
            {theme === "light" ? (
              <Sun className="h-4 w-4" />
            ) : theme === "system" ? (
              <Monitor className="h-4 w-4" />
            ) : (
              <MoonStar className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <MoonStar className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="hidden items-center gap-1 rounded-full border border-border bg-muted p-0.5 sm:inline-flex">
        <Button
          onClick={() => setTheme("light")}
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full transition-colors ${
            theme === "light"
              ? "bg-accent-foreground/60 text-background/80 hover:bg-accent-foreground/60 hover:text-background/80 dark:hover:bg-background"
              : "text-accent-foreground/80 hover:bg-muted-foreground/60 hover:text-accent-foreground dark:hover:bg-background/60"
          }`}
          aria-label="Light mode"
          aria-pressed={theme === "light"}
        >
          <Sun className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setTheme("system")}
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full transition-colors ${
            theme === "system"
              ? "bg-background text-foreground hover:bg-background dark:hover:bg-background"
              : "text-accent-foreground/80 hover:bg-muted-foreground/60 hover:text-accent-foreground dark:hover:bg-background/60"
          }`}
          aria-label="System mode"
          aria-pressed={theme === "system"}
        >
          <Monitor className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setTheme("dark")}
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full transition-colors ${
            theme === "dark"
              ? "bg-background text-foreground hover:bg-background dark:hover:bg-background"
              : "text-accent-foreground/80 hover:bg-muted-foreground/60 hover:text-accent-foreground dark:hover:bg-background/60"
          }`}
          aria-label="Dark mode"
          aria-pressed={theme === "dark"}
        >
          <MoonStar className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
