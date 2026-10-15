import { describe, expect, it } from "vitest";
import { Effect, Schema } from "effect";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseFrontmatter } from "../src/frontmatter";
import { Frontmatter } from "../src/schema";
import { isoDate, rfc822 } from "../src/util";
import { DEFAULT_CONFIG, listPosts } from "../src/index";

describe("frontmatter dates", () => {
  for (const field of ["date", "updated"] as const) {
    it.each([
      "next tuesday",
      "2024-13-45",
      "2024-02-30",
      "2023-02-29",
      "01/02/2024",
      "2024-01-01T25:00:00Z",
      "2024-01-01T12:00:00",
      "",
    ])(
      `rejects invalid ${field}: %j with field and file context`,
      async (value) => {
        const result = await Effect.runPromise(
          parseFrontmatter(
            "posts/bad.md",
            `---\ntitle: Bad\n${field}: "${value}"\n---\nbody`,
          ).pipe(Effect.either),
        );
        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("InvalidFrontmatter");
          expect(result.left.file).toBe("posts/bad.md");
          expect(result.left.message).toContain(`"${field}"`);
          expect(result.left.message).toContain("valid ISO 8601 date");
        }
      },
    );

    it.each([
      ["2024-02-29", "2024-02-29"],
      ["2024-02-29T12:34:56Z", "2024-02-29T12:34:56.000Z"],
      ["2024-03-01T01:34:56.123+02:00", "2024-02-29T23:34:56.123Z"],
      [new Date("2024-02-29T00:00:00Z"), "2024-02-29T00:00:00.000Z"],
    ])(`decodes valid ${field}: %s`, (value, expected) => {
      const decoded = Schema.decodeUnknownSync(Frontmatter)({
        title: "Valid",
        [field]: value,
      });
      expect(decoded[field]).toBe(expected);
    });

    it(`rejects an invalid Date object in ${field} during schema decoding`, () => {
      expect(() =>
        Schema.decodeUnknownSync(Frontmatter)({
          title: "Invalid",
          [field]: new Date(NaN),
        }),
      ).toThrow("valid ISO 8601 date");
    });
  }

  it("preserves YAML dates and normalizes quoted datetimes", async () => {
    const parsed = await Effect.runPromise(
      parseFrontmatter(
        "valid.md",
        '---\ntitle: Valid\ndate: 2024-02-29\nupdated: "2024-03-01T01:00:00+02:00"\n---\n',
      ),
    );
    expect(parsed.data.date).toBe("2024-02-29T00:00:00.000Z");
    expect(parsed.data.updated).toBe("2024-02-29T23:00:00.000Z");
  });

  it("sorts mixed date formats by instant, including midnight ties", async () => {
    const dir = await mkdtemp(join(tmpdir(), "voxx-dates-"));
    for (const [slug, date] of [
      ["a-date", "2024-02-29"],
      ["b-midnight", "2024-02-29T00:00:00Z"],
      ["c-earlier", "2024-03-01T00:30:00+02:00"],
      ["d-later", "2024-02-29T23:00:00Z"],
    ]) {
      await writeFile(
        join(dir, `${slug}.md`),
        `---\ntitle: ${slug}\ndate: "${date}"\n---\n`,
      );
    }
    const { posts } = await listPosts({
      config: {
        ...DEFAULT_CONFIG,
        content: { ...DEFAULT_CONFIG.content, dir },
      },
    });
    expect(posts.map((post) => post.slug)).toEqual([
      "d-later",
      "c-earlier",
      "a-date",
      "b-midnight",
    ]);
  });
});

describe("feed and sitemap dates", () => {
  it.each([rfc822, isoDate])(
    "throws for invalid input instead of using now",
    (format) => {
      expect(() => format("next tuesday")).toThrow(RangeError);
      expect(() => format("2024-13-45")).toThrow(RangeError);
    },
  );

  it("keeps valid feed and sitemap output", () => {
    expect(rfc822("2024-02-29")).toBe("Thu, 29 Feb 2024 00:00:00 GMT");
    expect(isoDate("2024-02-29T23:00:00Z")).toBe("2024-02-29");
  });
});
