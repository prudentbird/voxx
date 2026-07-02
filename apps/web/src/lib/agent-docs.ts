export const FAQ = [
  {
    question: "What is Voxx?",
    answer:
      "A zero-friction CMS for you and your agents. Point Voxx at a folder of markdown and ship a blog, docs, or changelog.",
  },
  {
    question: "How do AI agents use Voxx?",
    answer:
      "Content lives as plain .md files in your repo, so an agent reads and writes posts with the same filesystem and git tools it uses for code. Every change lands as a reviewable diff in a pull request.",
  },
  {
    question: "How do I install Voxx?",
    answer:
      "Run `npx @prudentbird/voxx init` to scaffold a blog into a Next.js app, or `npx @prudentbird/voxx init docs` / `changelog` for the other surfaces. With no framework, `npx @prudentbird/voxx dev` previews a static site locally and `voxx build` renders it to plain HTML.",
  },
  {
    question: "Is Voxx free and open source?",
    answer:
      "Yes. Voxx is MIT-licensed and published on npm as @prudentbird/voxx (the CLI) and @prudentbird/voxx-core (the portable content engine). The source lives at https://github.com/prudentbird/voxx.",
  },
  {
    question: "What does Voxx generate automatically?",
    answer:
      "Frontmatter validation, GFM with raw HTML, Shiki syntax highlighting, heading anchors, table of contents, excerpts, and reading time — plus canonical, Open Graph, Twitter, and JSON-LD tags, rss.xml, sitemap.xml, robots.txt, and llms.txt.",
  },
];

const AGENT_GUIDANCE = `Voxx is a build-time content engine, not a hosted service. There is no API
to authenticate against, no SDK to install at runtime, and no webhooks. Content
is plain markdown committed to a git repository.

When to use Voxx, and how an agent should operate:

- To add or edit content, read and write \`.md\` files under the content
  directory with ordinary filesystem tools, then commit the change. Treat it
  exactly like editing source code.
- Frontmatter is validated at build time. Match the existing fields in
  neighbouring files; a typo fails the build loudly rather than silently.
- File and folder names are the routing API: dates sort a blog, folder nesting
  orders docs, and version numbers cut changelog releases.
- Ship changes through pull requests so a human can review the diff.`;

export function buildAgentLlmsSection(): string {
  return `## For agents

${AGENT_GUIDANCE}
`;
}
