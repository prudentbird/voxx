import { describe, expect, it } from "vitest";
import { deriveExcerpt } from "../src/util";

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

  it("keeps the 180-character default and truncates at a word boundary", () => {
    expect(deriveExcerpt("word ".repeat(40))).toBe(
      `${"word ".repeat(35)}word…`,
    );
    expect(deriveExcerpt("First second third", 12)).toBe("First second…");
    expect(deriveExcerpt("Exact length", 12)).toBe("Exact length");
  });
});
