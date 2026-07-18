import type { MarkdownPostProcessorContext } from "obsidian";

export interface MqBlockParams {
  /** Comma-separated note names/paths/`[[links]]` (`file="a.md, [[b]]"`). */
  file?: string;
  /** Comma-separated folder paths, recursive (`folder="Projects"`). */
  folder?: string;
  /** Comma-separated tags, with or without `#` (`tag="project, active"`). */
  tag?: string;
  /** A Dataview DQL query whose result is fed into mq as Markdown (`dataview="LIST FROM #project"`). */
  dataview?: string;
  /** Module name to scope completion/defined-value lookups to (reserved for future use). */
  module?: string;
}

const PARAM_KEYS: (keyof MqBlockParams)[] = ["file", "folder", "tag", "dataview", "module"];

/**
 * Extracts `key="value"` params written after the ` ```mq ` fence marker, e.g.
 * ` ```mq file="Projects/Roadmap.md" `. Obsidian's code block processor only hands us the
 * block body, so the raw fence line is recovered from the note's full text via
 * `ctx.getSectionInfo`.
 */
export function getBlockParams(ctx: MarkdownPostProcessorContext, el: HTMLElement): MqBlockParams {
  const info = ctx.getSectionInfo(el);
  if (!info) return {};

  const fenceLine = info.text.split("\n")[info.lineStart] ?? "";
  const match = fenceLine.match(/^\s*(?:`{3,}|~{3,})\s*mq(?:\s+(.*))?$/i);
  if (!match) return {};

  return parseParamString(match[1] ?? "");
}

export function parseParamString(raw: string): MqBlockParams {
  const params: MqBlockParams = {};
  const pattern = /([a-zA-Z]+)\s*=\s*"([^"]*)"|([a-zA-Z]+)\s*=\s*'([^']*)'/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    const key = (match[1] ?? match[3])?.toLowerCase() as keyof MqBlockParams | undefined;
    const value = match[2] ?? match[4] ?? "";
    if (key && PARAM_KEYS.includes(key)) {
      params[key] = value;
    }
  }

  return params;
}

export function hasExplicitSource(params: MqBlockParams): boolean {
  return Boolean(params.file || params.folder || params.tag || params.dataview);
}
