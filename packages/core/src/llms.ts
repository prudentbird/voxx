import { absoluteUrl } from "./util";
import type { ContentType, Post, VoxxConfig } from "./types";

const SECTION_HEADING: Record<ContentType, string> = {
  blog: "Posts",
  docs: "Pages",
  changelog: "Releases",
};

export interface LlmsSection {
  heading: string;
  posts: Post[];
}

export function sectionHeading(type: ContentType): string {
  return SECTION_HEADING[type];
}

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
      lines.push(`- [${p.title}](${link})${summary ? `: ${summary}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function renderLlmsTxt(posts: Post[], config: VoxxConfig): string {
  return renderLlmsTxtSections(
    [{ heading: SECTION_HEADING[config.content.type], posts }],
    config,
  );
}

export function renderLlmsFull(posts: Post[], config: VoxxConfig): string {
  const out: string[] = [`# ${config.site.title}`, ""];
  if (config.site.description) out.push(config.site.description, "");
  for (const p of posts) {
    const link = absoluteUrl(config.site.url, p.url);
    out.push(
      "---",
      "",
      `# ${p.title}`,
      "",
      `Source: ${link}`,
      `Date: ${p.date}`,
    );
    if (p.tags.length) out.push(`Tags: ${p.tags.join(", ")}`);
    out.push("", p.content.trim(), "");
  }
  return out.join("\n");
}
