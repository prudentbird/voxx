import type { ReactNode } from "react";

export function ProsePage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="pt-[140px] pb-32 max-sm:pt-[110px]">
      <div className="mx-auto w-full max-w-[680px] px-8 max-sm:px-6">
        <h1 className="font-display text-[clamp(36px,5vw,52px)] leading-[1.05] font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-5 text-[18px] leading-[1.65] text-muted-foreground">
          {intro}
        </p>
        <div className="mt-10 flex flex-col gap-7 text-[16px] leading-[1.7] text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_code]:mx-1 [&_code]:rounded-[5px] [&_code]:border [&_code]:border-border [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[14px] [&_code]:text-foreground [&_h2]:mt-3 [&_h2]:font-display [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
          {children}
        </div>
      </div>
    </section>
  );
}
