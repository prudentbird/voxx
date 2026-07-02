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
