import { Data } from "effect";

export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class InvalidFrontmatter extends Data.TaggedError("InvalidFrontmatter")<{
  readonly file: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class PostNotFound extends Data.TaggedError("PostNotFound")<{
  readonly slug: string;
}> {}

export class ContentDirMissing extends Data.TaggedError("ContentDirMissing")<{
  readonly dir: string;
}> {}

export class RenderError extends Data.TaggedError("RenderError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type VoxxError =
  | ConfigError
  | InvalidFrontmatter
  | PostNotFound
  | ContentDirMissing
  | RenderError;
