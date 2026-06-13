import { cn } from "@voxx/ui/lib/utils";

export function Icon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex flex-col items-center font-display leading-none tracking-tight [text-box:trim-both_ex_alphabetic]",
        "not-supports-[text-box:trim-both_ex_alphabetic]:-translate-y-[0.06em]",
        className,
      )}
    >
      <span className="font-normal">vo</span>
      <b className="font-extrabold">xx</b>
    </div>
  );
}
