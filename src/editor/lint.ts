import { linter, type Diagnostic as CmDiagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import { docPosFromLineCol, findMqBlocks } from "./mqBlocks";
import { diagnostics as mqDiagnostics } from "../mq/wasm";

async function collectDiagnostics(view: EditorView): Promise<CmDiagnostic[]> {
  const blocks = findMqBlocks(view.state.doc);
  const results: CmDiagnostic[] = [];

  for (const block of blocks) {
    const code = view.state.sliceDoc(block.contentFrom, block.contentTo);
    if (code.trim().length === 0) continue;

    let diags;
    try {
      diags = await mqDiagnostics(code, true);
    } catch {
      // A malformed wasm call shouldn't take down the whole linter pass.
      continue;
    }

    for (const diag of diags) {
      const from = docPosFromLineCol(view.state.doc, block, diag.startLine, diag.startColumn);
      const to = docPosFromLineCol(view.state.doc, block, diag.endLine, diag.endColumn);
      if (from === null || to === null) continue;

      results.push({
        from,
        to: Math.max(to, from + 1),
        severity: "error",
        message: diag.message,
        source: "mq",
      });
    }
  }

  return results;
}

export const mqLinter = linter(collectDiagnostics, { delay: 500 });
