import { describe, expect, it } from "vitest";
import { normalizeBase, render, titleCase, yamlValue } from "../src/util";

describe("render", () => {
  it("replaces tokens and drops unknown ones", () => {
    expect(render("a {{X}} b {{Y}}", { X: "1", Y: "2" })).toBe("a 1 b 2");
    expect(render("hi {{MISSING}}!", {})).toBe("hi !");
  });
});

describe("normalizeBase", () => {
  it("ensures a leading slash and trims trailing", () => {
    expect(normalizeBase("blog")).toBe("/blog");
    expect(normalizeBase("/blog/")).toBe("/blog");
    expect(normalizeBase("/")).toBe("/");
  });
});

describe("titleCase", () => {
  it("turns a package name into a title", () => {
    expect(titleCase("my-cool-site")).toBe("My Cool Site");
    expect(titleCase("@acme/blog_app")).toBe("Blog App");
  });
});

describe("yamlValue", () => {
  it("leaves plain scalars unquoted", () => {
    expect(yamlValue("My First Post")).toBe("My First Post");
  });

  it("quotes values containing a colon", () => {
    expect(yamlValue("Release 1.0: The Big One")).toBe(
      '"Release 1.0: The Big One"',
    );
  });

  it("escapes embedded double quotes", () => {
    expect(yamlValue('He said "hi"')).toBe('"He said \\"hi\\""');
  });

  it("escapes newlines", () => {
    expect(yamlValue("line1\nline2")).toBe('"line1\\nline2"');
  });
});
