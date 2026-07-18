import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { blockContainingPos, docPosFromLineCol, findMqBlocks, lineColFromDocPos } from "../src/editor/mqBlocks";

function doc(text: string): Text {
  return Text.of(text.split("\n"));
}

describe("findMqBlocks", () => {
  it("finds a single fenced mq block", () => {
    const d = doc(["# Title", "", "```mq", ".h1", "```", "", "text"].join("\n"));
    const blocks = findMqBlocks(d);
    expect(blocks).toHaveLength(1);
    expect(d.sliceString(blocks[0].contentFrom, blocks[0].contentTo)).toBe(".h1");
    expect(blocks[0].firstContentLine).toBe(4);
  });

  it("finds multiple blocks and ignores non-mq fences", () => {
    const d = doc(["```mq", ".h1", "```", "```js", "1", "```", "```mq", ".h2", "```"].join("\n"));
    const blocks = findMqBlocks(d);
    expect(blocks).toHaveLength(2);
    expect(d.sliceString(blocks[0].contentFrom, blocks[0].contentTo)).toBe(".h1");
    expect(d.sliceString(blocks[1].contentFrom, blocks[1].contentTo)).toBe(".h2");
  });

  it("supports ~~~ fences and multi-line content", () => {
    const d = doc(["~~~mq", "def foo(x):", "  x | upcase();", "foo()", "~~~"].join("\n"));
    const blocks = findMqBlocks(d);
    expect(blocks).toHaveLength(1);
    expect(d.sliceString(blocks[0].contentFrom, blocks[0].contentTo)).toBe(
      "def foo(x):\n  x | upcase();\nfoo()",
    );
  });

  it("treats an unterminated fence as extending to the end of the document", () => {
    const d = doc(["```mq", ".h1", ".h2"].join("\n"));
    const blocks = findMqBlocks(d);
    expect(blocks).toHaveLength(1);
    expect(d.sliceString(blocks[0].contentFrom, blocks[0].contentTo)).toBe(".h1\n.h2");
  });

  it("returns nothing for a doc with no mq blocks", () => {
    expect(findMqBlocks(doc("# just markdown\n\n```js\n1\n```"))).toHaveLength(0);
  });
});

describe("blockContainingPos", () => {
  it("finds the block containing a position and excludes positions outside it", () => {
    const d = doc(["```mq", ".h1", "```", "text"].join("\n"));
    const blocks = findMqBlocks(d);
    const contentLine = d.line(2);
    expect(blockContainingPos(blocks, contentLine.from)).toBe(blocks[0]);
    expect(blockContainingPos(blocks, d.line(4).from)).toBeUndefined();
  });
});

describe("lineColFromDocPos / docPosFromLineCol", () => {
  it("round-trips positions inside a multi-line block", () => {
    const d = doc(["```mq", "def foo(x):", "  x | upcase();", "```"].join("\n"));
    const [block] = findMqBlocks(d);

    const pos = d.line(3).from + 2; // the "x" on the second content line
    const { line, column } = lineColFromDocPos(d, block, pos);
    expect(line).toBe(2);
    expect(column).toBe(3);
    expect(docPosFromLineCol(d, block, line, column)).toBe(pos);
  });

  it("returns null for a line outside the document", () => {
    const d = doc(["```mq", ".h1", "```"].join("\n"));
    const [block] = findMqBlocks(d);
    expect(docPosFromLineCol(d, block, 99, 1)).toBeNull();
  });
});
