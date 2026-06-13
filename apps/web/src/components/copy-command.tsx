"use client";
import { useRef, useState } from "react";
import { Button } from "@voxx/ui/components/button";
import { Copy, Check } from "lucide-react";

export function CopyCommand({
  command = "npx voxx init",
}: {
  command?: string;
}) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="outline"
      onClick={copy}
      aria-label={copied ? "Copied" : `Copy command: ${command}`}
      title={copied ? "Copied" : "Copy command"}
      className="h-auto gap-3 border-dashed border-primary bg-transparent px-[1.1rem] py-[0.7rem] font-mono text-[0.85rem] font-normal text-muted-foreground select-none hover:bg-primary/10 hover:text-foreground dark:border-primary dark:bg-transparent dark:hover:bg-primary/10"
    >
      <span>
        $ npx <b className="font-medium text-primary">voxx</b> init
      </span>
      <span aria-hidden="true" className="inline-flex">
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </span>
    </Button>
  );
}
