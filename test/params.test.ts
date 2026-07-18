import { describe, expect, it } from "vitest";
import { hasExplicitSource, parseParamString } from "../src/util/params";

describe("parseParamString", () => {
  it("parses a single quoted param", () => {
    expect(parseParamString('file="Projects/Roadmap.md"')).toEqual({ file: "Projects/Roadmap.md" });
  });

  it("parses multiple params in any order", () => {
    expect(parseParamString('tag="project" folder="Areas"')).toEqual({
      tag: "project",
      folder: "Areas",
    });
  });

  it("supports single-quoted values", () => {
    expect(parseParamString("dataview='LIST FROM #project'")).toEqual({
      dataview: "LIST FROM #project",
    });
  });

  it("ignores unknown keys", () => {
    expect(parseParamString('bogus="x" file="a.md"')).toEqual({ file: "a.md" });
  });

  it("returns an empty object for a plain ```mq fence", () => {
    expect(parseParamString("")).toEqual({});
  });
});

describe("hasExplicitSource", () => {
  it("is false when no source param is set", () => {
    expect(hasExplicitSource({})).toBe(false);
    expect(hasExplicitSource({ module: "foo" })).toBe(false);
  });

  it("is true when any source param is set", () => {
    expect(hasExplicitSource({ file: "a.md" })).toBe(true);
    expect(hasExplicitSource({ folder: "Projects" })).toBe(true);
    expect(hasExplicitSource({ tag: "project" })).toBe(true);
    expect(hasExplicitSource({ dataview: "LIST" })).toBe(true);
  });
});
