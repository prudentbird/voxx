import { Effect, ParseResult, Schema } from "effect";
import { DEFAULT_SCHEMA, load, Type } from "js-yaml";
import { isValidDate } from "./dates";
import { Frontmatter, type FrontmatterData } from "./schema";
import { InvalidFrontmatter } from "./errors";

export interface ParsedFile {
  data: FrontmatterData;
  content: string;
}

// Match js-yaml's timestamp syntax, but check its components before allowing
// its Date coercion. Keep invalid scalars for field-aware schema errors.
const YAML_TIMESTAMP_RE =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[Tt \t]+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d*))?(?:[ \t]*(Z|([+-])(\d{1,2})(?::(\d{2}))?))?)?$/;
const timestamp = new Type("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: (value: string | null) =>
    value !== null && YAML_TIMESTAMP_RE.test(value),
  construct: (value: string) => {
    const match = YAML_TIMESTAMP_RE.exec(value)!;
    const [
      ,
      year,
      month,
      day,
      hour,
      minute,
      second,
      fraction,
      zone,
      sign,
      zoneHour,
      zoneMinute,
    ] = match;
    const date = `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
    const offset = sign
      ? `${sign}${zoneHour!.padStart(2, "0")}:${zoneMinute ?? "00"}`
      : "Z";
    const iso =
      hour === undefined
        ? date
        : `${date}T${hour.padStart(2, "0")}:${minute}:${second}${fraction ? `.${fraction}` : ""}${zone ? offset : "Z"}`;
    // Use the original loader after validation to retain valid YAML output.
    return isValidDate(iso) ? load(value) : value;
  },
});
const frontmatterYamlSchema = DEFAULT_SCHEMA.extend({
  implicit: [timestamp],
  explicit: [timestamp],
});

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
      return {
        data: yaml ? (load(yaml, { schema: frontmatterYamlSchema }) ?? {}) : {},
        content,
      };
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
