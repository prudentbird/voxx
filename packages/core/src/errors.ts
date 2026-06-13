import { Data } from "effect";

/** Thrown when `voxx.json` is missing, unreadable, or fails schema validation. */
export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** Thrown when a Markdown file's frontmatter cannot be parsed or is invalid. */
export class InvalidFrontmatter extends Data.TaggedError("InvalidFrontmatter")<{
  readonly file: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** Thrown when a requested slug does not match any loaded post. */
export class PostNotFound extends Data.TaggedError("PostNotFound")<{
  readonly slug: string;
}> {}

/** Thrown when the configured content directory does not exist. */
export class ContentDirMissing extends Data.TaggedError("ContentDirMissing")<{
  readonly dir: string;
}> {}

/** Thrown when the Markdown-to-HTML pipeline fails. */
export class RenderError extends Data.TaggedError("RenderError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** Union of all typed errors that Voxx can surface. */
export type VoxxError =
  | ConfigError
  | InvalidFrontmatter
  | PostNotFound
  | ContentDirMissing
  | RenderError;
