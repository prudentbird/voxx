import { Effect, ParseResult, Schema } from "effect";
import matter from "gray-matter";
import { Frontmatter, type FrontmatterData } from "./schema";
import { InvalidFrontmatter } from "./errors";

export interface ParsedFile {
  data: FrontmatterData;
  content: string;
}

export const parseFrontmatter = (file: string, raw: string) =>
  Effect.gen(function* () {
    const parsed = matter(raw);
    const data = yield* Schema.decodeUnknown(Frontmatter)(parsed.data).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidFrontmatter({
            file,
            message: ParseResult.TreeFormatter.formatErrorSync(cause),
            cause,
          }),
      ),
    );
    return { data, content: parsed.content } satisfies ParsedFile;
  });
