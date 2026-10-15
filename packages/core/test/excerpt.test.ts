import type { Root } from "mdast";
import { afterEach, describe, expect, it, vi } from "vitest";
import { unified } from "unified";
import { deriveExcerpt } from "../src/util";

afterEach(() => {
  vi.restoreAllMocks();
});

const processorPrototype = Object.getPrototypeOf(unified()) as Pick<
  typeof unified,
  "parse"
>;

describe("deriveExcerpt", () => {
  it("handles the reported HTML, punctuation, and reference-link regression", () => {
    expect(
      deriveExcerpt(
        'hi <div class="x">raw</div> snake_case_name and C# and [ref][1]\n\n[1]: https://a.b',
      ),
    ).toBe("hi raw snake_case_name and C# and ref");
  });

  it.each([
    [
      "snake_case_name C# literal*asterisk a > b",
      "snake_case_name C# literal*asterisk a > b",
    ],
    [
      "Some *italic*, **bold**, _emphasis_, and ~~deleted~~ text.",
      "Some italic, bold, emphasis, and deleted text.",
    ],
    [
      "Escaped \\*stars\\* and \\_underscores\\_.",
      "Escaped *stars* and _underscores_.",
    ],
    ['Hello <span title="secret">world</span>!', "Hello world!"],
    ["Hello <!-- hidden -->world!\n\n<!-- block comment -->", "Hello world!"],
    [
      "[inline](https://a.b) and [reference][id] and [shortcut].\n\n[id]: https://c.d\n[shortcut]: https://e.f",
      "inline and reference and shortcut.",
    ],
    [
      "Visit <https://a.b> or <me@example.com> and https://c.d.",
      "Visit https://a.b or me@example.com and https://c.d.",
    ],
    [
      "Text[^note] continues.\n\n[^note]: Hidden footnote paragraph.\n\n    Another hidden paragraph.",
      "Text continues.",
    ],
    [
      "Before.\n\n| Hidden | Table |\n| --- | --- |\n| secret | cells |\n\nAfter.",
      "Before. After.",
    ],
    [
      "# Hidden heading\n\nSetext heading\n===\n\n```ts\nhidden();\n```\n\n    indented code\n\nVisible `hidden inline code` text.\n\n![hidden alt](image.png) ![reference image][img]\n\n[img]: image.png",
      "Visible text.",
    ],
    [
      "<div>\nHidden HTML block.\n</div>\n\nVisible paragraph.",
      "Visible paragraph.",
    ],
    [
      "First  paragraph\nwraps.\n\n> Quoted paragraph.\n\n- List paragraph.\n\nLast paragraph.",
      "First paragraph wraps. Quoted paragraph. List paragraph. Last paragraph.",
    ],
    ["Line one.  \nLine two.\n\nA &amp; B.", "Line one. Line two. A & B."],
    ["# Heading only\n\n<!-- comment -->\n\n[ref]: https://a.b", ""],
    ["", ""],
  ])("extracts paragraph text from %j", (markdown, expected) => {
    expect(deriveExcerpt(markdown)).toBe(expected);
  });

  it.each([
    "<br>",
    "<br/>",
    "<br />",
    "<BR>",
    '<br class="line" title="a > b">',
  ])("separates words across inline %s tags", (tag) => {
    expect(deriveExcerpt(`one${tag}two`)).toBe("one two");
  });

  it("reuses excerpts without reparsing unchanged sources", () => {
    const parse = vi.spyOn(processorPrototype, "parse");
    const source =
      "Cache regression: [label][end].\n\n" +
      "<!-- padding -->\n".repeat(100) +
      "\n[end]: https://example.com";
    expect(deriveExcerpt(source)).toBe("Cache regression: label.");
    expect(deriveExcerpt(source)).toBe("Cache regression: label.");
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("invalidates cached results for changed content, definitions, or limits", () => {
    const source =
      "Changed reference: [label][end].\n\n[end]: https://example.com";
    expect(deriveExcerpt(source)).toBe("Changed reference: label.");
    expect(deriveExcerpt(source, 10)).toBe("Changed…");
    expect(deriveExcerpt(source)).toBe("Changed reference: label.");
    expect(deriveExcerpt(source.replace("[end]:", "[other]:"))).toBe(
      "Changed reference: [label][end].",
    );
    expect(deriveExcerpt(source.replace("label", "updated"))).toBe(
      "Changed reference: updated.",
    );
  });

  it("bounds cache entries and refreshes recently used excerpts", () => {
    const parse = vi.spyOn(processorPrototype, "parse");
    const sources = Array.from(
      { length: 1024 },
      (_, i) => `Eviction regression ${i}.`,
    );
    for (const source of sources) deriveExcerpt(source);
    parse.mockClear();
    deriveExcerpt(sources[0]!);
    deriveExcerpt("Eviction regression overflow.");
    deriveExcerpt(sources[0]!);
    expect(parse).toHaveBeenCalledTimes(1);
    deriveExcerpt(sources[1]!);
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("evicts sources by character budget and does not retain oversized sources", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", value: "Budget test." }],
        },
      ],
    };
    const parse = vi.spyOn(processorPrototype, "parse").mockReturnValue(tree);
    const padding = "x".repeat(4 * 1024 * 1024);
    const first = `First budget source ${padding}`;
    const second = `Second budget source ${padding}`;
    deriveExcerpt(first);
    deriveExcerpt(second);
    deriveExcerpt(first);
    expect(parse).toHaveBeenCalledTimes(3);
    const oversized = `Oversized budget source ${padding}${padding}`;
    deriveExcerpt(oversized);
    deriveExcerpt(oversized);
    expect(parse).toHaveBeenCalledTimes(5);
  });

  it("keeps the 180-character default and truncates at a word boundary", () => {
    expect(deriveExcerpt("word ".repeat(40))).toBe(
      `${"word ".repeat(35)}word…`,
    );
    expect(deriveExcerpt("First second third", 12)).toBe("First second…");
    expect(deriveExcerpt("Exact length", 12)).toBe("Exact length");
  });
});
