import { Effect, ParseResult, Schema } from "effect";
import { load } from "js-yaml";
import { Frontmatter, type FrontmatterData } from "./schema";
import { InvalidFrontmatter } from "./errors";

export interface ParsedFile {
  data: FrontmatterData;
  content: string;
}

/**
 * Matches a leading `---` YAML block: the opening `---` and the newline
 * after it (so a line like `---title: Hi` isn't mistaken for frontmatter),
 * the YAML body, and either a closing `---` (plus the single newline that
 * follows it) or, if there's no closing fence, the end of the string —
 * gray-matter treats an unterminated block as YAML through the end of input
 * rather than as content. Mirrors gray-matter's splitting behavior without
 * depending on the unmaintained gray-matter package, whose bundled js-yaml
 * usage (`yaml.safeLoad`) breaks under js-yaml v4.
 */
const FRONTMATTER_RE =
  /^\uFEFF?-{3}\r?\n([\s\S]*?)(?:\r?\n-{3}\r?\n?|$)([\s\S]*)$/;

const splitFrontmatter = (raw: string) => {
  const match = FRONTMATTER_RE.exec(raw);
  return match
    ? { yaml: match[1] ?? "", content: match[2] ?? "" }
    : { yaml: "", content: raw };
};

const parseYaml = (file: string, raw: string) =>
  Effect.try({
    try: () => {
      const { yaml, content } = splitFrontmatter(raw);
      return { data: yaml ? (load(yaml) ?? {}) : {}, content };
    },
    catch: (cause) =>
      new InvalidFrontmatter({
        file,
        message: cause instanceof Error ? cause.message : String(cause),
        cause,
      }),
  });

export const parseFrontmatter = (file: string, raw: string) =>
  Effect.gen(function* () {
    const { data: rawData, content } = yield* parseYaml(file, raw);
    const data = yield* Schema.decodeUnknown(Frontmatter)(rawData).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidFrontmatter({
            file,
            message: ParseResult.TreeFormatter.formatErrorSync(cause),
            cause,
          }),
      ),
    );
    return { data, content } satisfies ParsedFile;
  });
