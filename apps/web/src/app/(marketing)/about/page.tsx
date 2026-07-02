import Link from "next/link";
import type { Metadata } from "next";
import { ProsePage } from "~/components/prose-page";

export const metadata: Metadata = {
  title: "About",
  description:
    "Voxx is a zero-friction, file-based CMS for you and your agents. Write markdown and Voxx turns it into an SEO-ready blog, documentation site, or changelog.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ProsePage
      title="About Voxx"
      intro="Voxx is a zero-friction, file-based CMS for you and your agents. You write markdown, and Voxx turns it into an SEO-ready blog, documentation site, or changelog."
    >
      <p>
        Most content management systems put a database and an admin dashboard
        between you and your content. Voxx removes that layer. Every page is a
        plain <code>.md</code> file that lives next to your code, so you can
        version, diff, and review your content with the same tools you already
        use for software.
      </p>

      <h2>Why files</h2>
      <p>
        A folder of files will outlive every CMS. Because content is just
        markdown in git, there is nothing to migrate, no proprietary export, and
        no vendor lock-in. Filenames do the setup work: dates order a blog,
        folder nesting builds a docs sidebar, and version numbers mark changelog
        releases. There is very little to configure.
      </p>

      <h2>Built for agents</h2>
      <p>
        Voxx has no CMS API because it does not need one. An AI coding agent
        reads and writes posts with the same file and git tools it uses for
        code, and every change shows up as a diff a human can review before it
        ships.
      </p>

      <h2>Open source</h2>
      <p>
        Voxx is MIT-licensed and maintained by{" "}
        <a href="https://prudentbird.com" target="_blank" rel="noreferrer">
          prudentbird
        </a>
        . The core is framework agnostic, so you can use it to read and render
        markdown in whatever stack you build with. The full source is available
        on{" "}
        <a
          href="https://github.com/prudentbird/voxx"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        . Read the <Link href="/docs">docs</Link> to get started.
      </p>
    </ProsePage>
  );
}
