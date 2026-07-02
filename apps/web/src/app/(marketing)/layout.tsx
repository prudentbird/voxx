import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { JsonLd } from "~/components/json-ld";
import { Wordmark } from "~/components/wordmark";
import { SiteHeader } from "~/components/site-header";
import { ThemeSwitcher } from "~/components/theme-switcher";

const SITE_URL = "https://voxx.prudentbird.com";
const REPO_URL = "https://github.com/prudentbird/voxx";
const SITE_DESCRIPTION =
  "A zero-friction CMS for you and your agents. Point Voxx at a folder of markdown and ship a blog, docs, or changelog.";
const SAME_AS = [
  REPO_URL,
  "https://www.npmjs.com/package/@prudentbird/voxx",
  "https://www.npmjs.com/package/@prudentbird/voxx-core",
  "https://prudentbird.com",
];

const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Voxx",
      url: SITE_URL,
      description: "A zero-friction, file-based CMS for you and your agents.",
      sameAs: SAME_AS,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "technical support",
        email: "me@prudentbird.com",
        url: `${REPO_URL}/issues`,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Voxx",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "SoftwareApplication",
      name: "Voxx",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "macOS, Windows, Linux",
      softwareRequirements: "Node.js >= 24",
      softwareHelp: { "@type": "CreativeWork", url: `${SITE_URL}/docs` },
      author: {
        "@type": "Organization",
        name: "Prudent Bird",
        url: "https://prudentbird.com",
      },
      sameAs: SAME_AS,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <JsonLd data={SITE_JSON_LD} />
      <SiteHeader>
        <div className="mx-auto flex h-[68px] w-full max-w-[1140px] items-center justify-between gap-6 px-8 max-sm:px-6">
          <Wordmark />
          <nav className="flex items-center gap-7">
            <Link
              href="/about"
              className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/docs"
              className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </Link>
            <a
              href="https://github.com/prudentbird/voxx"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
              <ArrowUpRight className="size-3.5" />
            </a>
          </nav>
        </div>
      </SiteHeader>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 bg-secondary">
        <div className="mx-auto flex w-full max-w-[1140px] flex-wrap items-center justify-between gap-6 px-8 py-8 max-sm:gap-5 max-sm:px-6">
          <Wordmark small />
          <nav className="flex flex-wrap gap-6 max-sm:order-last max-sm:w-full">
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
          </nav>
          <ThemeSwitcher />
        </div>
      </footer>
    </>
  );
}
