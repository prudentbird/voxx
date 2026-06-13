import "@voxx/ui/globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { fontClasses } from "./fonts";

const baseUrl = "https://voxx.prudentbird.com";
const siteName = "Voxx";
const siteDescription =
  "A zero-friction CMS for Next.js. Write markdown, Voxx handles routing, SEO, RSS, and llms.txt — for you and your agents.";
const keywords = [
  "Voxx",
  "CMS",
  "markdown",
  "Next.js",
  "blog",
  "docs",
  "changelog",
  "static site generator",
  "SEO",
  "RSS",
  "llms.txt",
  "AI agents",
  "content management",
  "TypeScript",
];

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  keywords,
  authors: [{ name: "Prudent Bird", url: "https://prudentbird.com" }],
  creator: "Prudent Bird",
  publisher: "Prudent Bird",
  referrer: "origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName,
    title: siteName,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    site: "@prudentbird",
    creator: "@prudentbird",
    title: siteName,
    description: siteDescription,
  },
  alternates: {
    canonical: baseUrl,
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fontClasses} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
