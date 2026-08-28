import { Effect, ParseResult, Schema } from "effect";
import { load } from "js-yaml";
import { Frontmatter, type FrontmatterData } from "./schema";
import { InvalidFrontmatter } from "./errors";

export interface ParsedFile {
  data: FrontmatterData;
  content: string;
}

const BOM = "\uFEFF";
const FENCE = "---";
const OPEN_RE = /^-{3}\r?\n/;
const CLOSE_RE = /\r?\n-{3}\r?\n?/;

/**
 * Splits a leading `---` YAML frontmatter block from the rest of the file,
 * mirroring gray-matter's index-based splitting (rather than gray-matter
 * itself, whose bundled js-yaml usage — `yaml.safeLoad` — breaks under
 * js-yaml v4):
 *  - the opening `---` must be immediately followed by a newline, or the
 *    whole input is treated as plain content (no frontmatter);
 *  - the closing `---` is the first `\n---` found after that; if none
 *    exists, the rest of the input is YAML (an unterminated block), not
 *    content — this also makes an empty, properly-closed block (`---\n---`)
 *    resolve correctly, since the opening and closing fences share that one
 *    newline instead of each requiring their own;
 *  - a single newline right after the closing fence is swallowed.
 */
const splitFrontmatter = (raw: string) => {
  const stripped = raw.startsWith(BOM) ? raw.slice(BOM.length) : raw;
  if (!OPEN_RE.test(stripped)) return { yaml: "", content: raw };

  const body = stripped.slice(FENCE.length);
  const close = CLOSE_RE.exec(body);
  return close
    ? {
        yaml: body.slice(0, close.index),
        content: body.slice(close.index + close[0].length),
      }
    : { yaml: body, content: "" };
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
