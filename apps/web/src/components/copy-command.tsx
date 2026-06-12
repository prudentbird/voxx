"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@voxx/ui/components/button";

export function CopyCommand({ command = "npx voxx init" }: { command?: string }) {
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
    <Button variant="outline" size="lg" className="font-mono" onClick={copy}>
      <span className="text-muted-foreground">$</span> {command}
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
