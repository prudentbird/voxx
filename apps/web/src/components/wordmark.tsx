import Link from "next/link";
import { cn } from "@voxx/ui/lib/utils";

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Voxx home"
      className={cn(
        "inline-block font-display leading-none tracking-tight [text-box:trim-both_ex_alphabetic]",
        "not-supports-[text-box:trim-both_ex_alphabetic]:-translate-y-[0.06em]",
        small ? "text-[20px]" : "text-2xl",
      )}
    >
      <span className="font-normal">vo</span>
      <b className="font-extrabold">xx</b>
    </Link>
  );
}
