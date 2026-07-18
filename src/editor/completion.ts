import { EditorState } from "@codemirror/state";
import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { blockContainingPos, findMqBlocks } from "./mqBlocks";
import { definedValues } from "../mq/wasm";

async function mqCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
  const block = blockContainingPos(findMqBlocks(context.state.doc), context.pos);
  if (!block) return null;

  const word = context.matchBefore(/[a-zA-Z_$][a-zA-Z0-9_]*/);
  if (!word && !context.explicit) return null;

  const code = context.state.sliceDoc(block.contentFrom, block.contentTo);
  let values;
  try {
    values = await definedValues(code);
  } catch {
    return null;
  }

  return {
    from: word ? word.from : context.pos,
    options: values.map((value) => ({
      label: value.name,
      type: value.valueType === "Function" ? "function" : "variable",
      detail: value.args ? `(${value.args.join(", ")})` : undefined,
      info: value.doc || undefined,
    })),
  };
}

/**
 * Contributes an mq-aware completion source via CodeMirror's language-data mechanism, scoped
 * to positions inside `mq` code blocks. This is additive rather than an `autocompletion()`
 * override, so it can't clobber Obsidian's own completion sources elsewhere in the document.
 */
export const mqCompletionLanguageData = EditorState.languageData.of((state, pos) => {
  const block = blockContainingPos(findMqBlocks(state.doc), pos);
  return block ? [{ autocomplete: mqCompletionSource }] : [];
});
