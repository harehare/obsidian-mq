import { hoverTooltip, type Tooltip } from "@codemirror/view";
import { blockContainingPos, findMqBlocks, lineColFromDocPos } from "./mqBlocks";
import { hover as mqHover } from "../mq/wasm";

export const mqHoverTooltip = hoverTooltip(async (view, pos): Promise<Tooltip | null> => {
  const block = blockContainingPos(findMqBlocks(view.state.doc), pos);
  if (!block) return null;

  const code = view.state.sliceDoc(block.contentFrom, block.contentTo);
  const { line, column } = lineColFromDocPos(view.state.doc, block, pos);

  let result;
  try {
    result = await mqHover(code, line, column);
  } catch {
    return null;
  }
  if (!result) return null;

  return {
    pos,
    create: () => {
      const dom = document.createElement("div");
      dom.className = "mq-hover-tooltip";
      const pre = document.createElement("pre");
      pre.textContent = result.content;
      dom.appendChild(pre);
      return { dom };
    },
  };
});
