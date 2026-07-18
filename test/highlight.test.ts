import { describe, expect, it } from "vitest";
import { tokenizeLine } from "../src/editor/highlight";

function classesFor(text: string): { text: string; cls: string }[] {
  return tokenizeLine(text).map((token) => ({ text: text.slice(token.from, token.to), cls: token.cls }));
}

describe("tokenizeLine", () => {
  it("tokenizes keywords, selectors and calls", () => {
    expect(classesFor("def foo(x): x | upcase();")).toEqual([
      { text: "def", cls: "mq-cm-keyword" },
      { text: "foo", cls: "mq-cm-function" },
      { text: ":", cls: "mq-cm-operator" },
      { text: "|", cls: "mq-cm-operator" },
      { text: "upcase", cls: "mq-cm-function" },
      { text: ";", cls: "mq-cm-operator" },
    ]);
  });

  it("tokenizes strings and comments", () => {
    expect(classesFor('"hello" # a comment')).toEqual([
      { text: '"hello"', cls: "mq-cm-string" },
      { text: "# a comment", cls: "mq-cm-comment" },
    ]);
  });

  it("tokenizes numbers", () => {
    expect(classesFor("1 + 2.5 + 0x1F + 0b101")).toEqual([
      { text: "1", cls: "mq-cm-number" },
      { text: "+", cls: "mq-cm-operator" },
      { text: "2.5", cls: "mq-cm-number" },
      { text: "+", cls: "mq-cm-operator" },
      { text: "0x1F", cls: "mq-cm-number" },
      { text: "+", cls: "mq-cm-operator" },
      { text: "0b101", cls: "mq-cm-number" },
    ]);
  });

  it("tokenizes variables and selectors", () => {
    expect(classesFor("let $x = .h1")).toEqual([
      { text: "let", cls: "mq-cm-keyword" },
      { text: "$x", cls: "mq-cm-variable" },
      { text: "=", cls: "mq-cm-operator" },
      { text: ".h1", cls: "mq-cm-selector" },
    ]);
  });
});
