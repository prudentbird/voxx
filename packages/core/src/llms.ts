import { absoluteUrl } from "./util";
import type { ContentType, Post, PostMeta, VoxxConfig } from "./types";

const SECTION_HEADING: Record<ContentType, string> = {
  blog: "Posts",
  docs: "Pages",
  changelog: "Releases",
};

const oneLine = (s: string) => s.replace(/\s*\n\s*/g, " ").trim();
const escLinkText = (s: string) => oneLine(s).replace(/([[\]])/g, "\\$1");
const escHeading = (s: string) => oneLine(s);

/** A titled group of posts for use in `renderLlmsTxtSections`. */
export interface LlmsSection {
  heading: string;
  posts: PostMeta[];
}

/**
 * Returns the default section heading for a content type.
 *
 * @param type - Content type from the Voxx config.
 * @returns Human-readable heading, e.g. `"Posts"`, `"Pages"`, `"Releases"`.
 */
export function sectionHeading(type: ContentType): string {
  return SECTION_HEADING[type];
}

/**
 * Renders a `llms.txt` file from one or more labeled post sections.
 *
 * @param sections - Ordered list of headings with their associated posts.
 * @param config - Resolved Voxx config (used for site title and description).
 * @returns `llms.txt` Markdown string.
 */
export function renderLlmsTxtSections(
  sections: LlmsSection[],
  config: VoxxConfig,
): string {
  const lines: string[] = [`# ${config.site.title}`, ""];
  if (config.site.description) lines.push(`> ${config.site.description}`, "");
  for (const section of sections) {
    lines.push(`## ${section.heading}`, "");
    for (const p of section.posts) {
      const link = absoluteUrl(config.site.url, p.url);
      const summary = p.description ?? p.excerpt;
      const title = escLinkText(p.title);
      const safeSummary = summary ? oneLine(summary) : "";
      lines.push(
        `- [${title}](${link})${safeSummary ? `: ${safeSummary}` : ""}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Renders a `llms.txt` index linking all posts with one-line summaries.
 *
 * @param posts - All posts to include.
 * @param config - Resolved Voxx config.
 * @returns `llms.txt` Markdown string.
 */
export function renderLlmsTxt(posts: PostMeta[], config: VoxxConfig): string {
  return renderLlmsTxtSections(
    [{ heading: SECTION_HEADING[config.content.type], posts }],
    config,
  );
}

/**
 * Renders an `llms-full.txt` file containing the complete Markdown content
 * of every post, separated by `---` dividers.
 *
 * @param posts - All posts to include.
 * @param config - Resolved Voxx config.
 * @returns Full-content `llms-full.txt` string.
 */
export function renderLlmsFull(posts: Post[], config: VoxxConfig): string {
  const out: string[] = [`# ${config.site.title}`, ""];
  if (config.site.description) out.push(config.site.description, "");
  for (const p of posts) {
    const link = absoluteUrl(config.site.url, p.url);
    out.push(
      "---",
      "",
      `# ${escHeading(p.title)}`,
      "",
      `Source: ${link}`,
      `Date: ${p.date}`,
    );
    if (p.tags.length) out.push(`Tags: ${p.tags.join(", ")}`);
    out.push("", p.content.trim(), "");
  }
  return out.join("\n");
}
