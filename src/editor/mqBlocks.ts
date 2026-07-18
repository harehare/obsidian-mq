import type { Text } from "@codemirror/state";

export interface MqBlock {
  /** Doc offset of the first character of the block's content (line after the opening fence). */
  contentFrom: number;
  /** Doc offset of the last character of the block's content (end of the line before the closing fence). */
  contentTo: number;
  /** 1-based line number of the first content line, used to map mq (1-based) positions back to the doc. */
  firstContentLine: number;
}

const OPEN_FENCE_RE = /^(\s*)(`{3,}|~{3,})\s*mq(?:\s|$).*$/i;

/**
 * Scans the whole document for ` ```mq ` fenced code blocks (CommonMark-style, `~~~` fences
 * also accepted) and returns their content ranges. This intentionally re-scans the raw text
 * rather than relying on Obsidian's internal syntax tree, whose shape for embedded-language
 * fences isn't a stable public API.
 */
export function findMqBlocks(doc: Text): MqBlock[] {
  const blocks: MqBlock[] = [];
  const total = doc.lines;
  let i = 1;

  while (i <= total) {
    const line = doc.line(i);
    const openMatch = OPEN_FENCE_RE.exec(line.text);
    if (!openMatch) {
      i++;
      continue;
    }

    const fenceChar = openMatch[2][0];
    const fenceLen = openMatch[2].length;
    const closeRe = new RegExp(`^\\s*[${fenceChar}]{${fenceLen},}\\s*$`);

    let j = i + 1;
    while (j <= total && !closeRe.test(doc.line(j).text)) {
      j++;
    }

    const contentStartLine = i + 1;
    const contentEndLine = Math.min(j - 1, total);
    if (contentEndLine >= contentStartLine) {
      blocks.push({
        contentFrom: doc.line(contentStartLine).from,
        contentTo: doc.line(contentEndLine).to,
        firstContentLine: contentStartLine,
      });
    }

    i = j + 1;
  }

  return blocks;
}

export function blockContainingPos(blocks: readonly MqBlock[], pos: number): MqBlock | undefined {
  return blocks.find((block) => pos >= block.contentFrom && pos <= block.contentTo);
}

/** Converts a doc offset inside `block` to a 1-based mq (line, column). */
export function lineColFromDocPos(doc: Text, block: MqBlock, pos: number): { line: number; column: number } {
  const lineObj = doc.lineAt(pos);
  return {
    line: lineObj.number - block.firstContentLine + 1,
    column: pos - lineObj.from + 1,
  };
}

/** Converts a 1-based mq (line, column) within `block` back to a doc offset, or `null` if out of range. */
export function docPosFromLineCol(doc: Text, block: MqBlock, line: number, column: number): number | null {
  const targetLine = block.firstContentLine + (line - 1);
  if (targetLine < 1 || targetLine > doc.lines) return null;
  const lineObj = doc.line(targetLine);
  return Math.min(lineObj.from + Math.max(0, column - 1), lineObj.to);
}
