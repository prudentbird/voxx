import "@voxx/ui/globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider, PostHogPageView } from "@posthog/next";
import { JetBrains_Mono, Outfit, Plus_Jakarta_Sans } from "next/font/google";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const baseUrl = "https://voxx.prudentbird.com";
const siteName = "Voxx";
const siteTitle = "Voxx — A zero-friction CMS for you and your agents";
const siteDescription =
  "A zero-friction CMS for you and your agents. Point Voxx at a folder of markdown and ship a blog, docs, or changelog.";
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
    default: siteTitle,
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
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    site: "@prudentbird",
    creator: "@prudentbird",
    title: siteTitle,
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
      suppressHydrationWarning
      className={`${outfit.variable} ${jakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PostHogProvider
            clientOptions={{
              api_host: "/ingest",
              capture_performance: { web_vitals: true },
              before_send: (event) => {
                if (event) {
                  event.properties.deploy_sha =
                    process.env.NEXT_PUBLIC_DEPLOY_SHA;
                }
                return event;
              },
            }}
          >
            <PostHogPageView />
            {children}
          </PostHogProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
