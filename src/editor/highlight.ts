import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { findMqBlocks } from "./mqBlocks";

// Mirrors editors/vscode/syntaxes/mq.tmLanguage.json's token categories, in the same
// match-priority order (first alternative to match at a position wins).
const TOKEN_RE =
  /(?<comment>#[^\n]*)|(?<string>b?"(?:\\.|[^"\\])*"|s"(?:\\.|[^"\\])*")|(?<number>\b0x[0-9a-fA-F]+\b|\b0b[01]+\b|\b\d+\.\d+\b|\b\d+\b)|(?<keyword>\b(?:def|do|let|if|elif|else|end|while|foreach|self|nodes|fn|break|continue|include|match|module|import|var|macro|quote|unquote|loop|try|catch|as|true|false|None)\b)|(?<selector>\.[a-zA-Z_][a-zA-Z0-9_[\]]*)|(?<variable>\$[a-zA-Z_][a-zA-Z0-9_]*)|(?<func>[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\())|(?<operator>=~|!~|\/\/=|::|\.\.|<=|>=|==|!=|&&|\|\||\?\?|\+=|-=|\*=|\/=|%=|\|=|<<|>>|->|=|\||:|;|\?|!|\+|-|\*|\/|%|<|>|@)/g;

const CLASS_BY_GROUP: Record<string, string> = {
  comment: "mq-cm-comment",
  string: "mq-cm-string",
  number: "mq-cm-number",
  keyword: "mq-cm-keyword",
  selector: "mq-cm-selector",
  variable: "mq-cm-variable",
  func: "mq-cm-function",
  operator: "mq-cm-operator",
};

export function tokenizeLine(text: string): { from: number; to: number; cls: string }[] {
  const tokens: { from: number; to: number; cls: string }[] = [];
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    const groups = match.groups ?? {};
    for (const [name, value] of Object.entries(groups)) {
      if (value !== undefined) {
        tokens.push({ from: match.index, to: match.index + value.length, cls: CLASS_BY_GROUP[name] });
        break;
      }
    }
    if (match.index === TOKEN_RE.lastIndex) {
      TOKEN_RE.lastIndex++;
    }
  }

  return tokens;
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const blocks = findMqBlocks(view.state.doc);

  for (const block of blocks) {
    const startLine = view.state.doc.lineAt(block.contentFrom).number;
    const endLine = view.state.doc.lineAt(block.contentTo).number;

    for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
      const line = view.state.doc.line(lineNo);
      for (const token of tokenizeLine(line.text)) {
        builder.add(line.from + token.from, line.from + token.to, Decoration.mark({ class: token.cls }));
      }
    }
  }

  return builder.finish();
}

export const mqHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate): void {
      if (update.docChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (instance) => instance.decorations,
  },
);
