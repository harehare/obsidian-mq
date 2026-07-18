// Thin wrapper around the mq-wasm bindings shipped inside the published `mq-web` npm
// package (its `dist/` contains the raw wasm-pack `--target web` output alongside the
// bundled JS/TS API, and has no "exports" restriction, so both are reachable as deep
// imports).
//
// Unlike `mq-web`'s own `run`/`format`/etc. helpers, initialization here is synchronous:
// the .wasm binary is inlined into this plugin's bundle at build time (esbuild's `dataurl`
// loader, decoded by hand below with `atob` — NOT the `binary` loader, which emits a call
// to `Uint8Array.fromBase64` that doesn't exist in Obsidian's Electron/Chromium yet) and
// instantiated with the named `initSync` export instead of `fetch()`-ing a sibling file.
// That keeps the plugin a single `main.js` with no extra assets to ship, and works the
// same on desktop and mobile.
//
// `initSync` MUST be a named import here, not the default import: this module's default
// export is `__wbg_init`, the async `fetch()`-based initializer (see `export { initSync,
// __wbg_init as default }` in mq-wasm's generated glue) — importing it as `initSync` by
// mistake compiles fine but silently calls the wrong (async, fetch-based) function.
import {
  initSync,
  run as wasmRun,
  format as wasmFormat,
  diagnostics as wasmDiagnostics,
  inlayHints as wasmInlayHints,
  hover as wasmHover,
  definedValues as wasmDefinedValues,
  toHtml as wasmToHtml,
  htmlToMarkdown as wasmHtmlToMarkdown,
  toAst as wasmToAst,
} from "mq-web/dist/mq_wasm.js";
import type {
  Options,
  Diagnostic,
  InlayHint,
  HoverResult,
  DefinedValue,
  ConversionOptions,
} from "mq-web/dist/mq_wasm.js";
import wasmDataUrl from "mq-web/dist/mq_wasm_bg.wasm";

export type { Options, Diagnostic, InlayHint, HoverResult, DefinedValue };

/** Decodes an esbuild `dataurl`-loader `data:application/wasm;base64,...` string to bytes. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

let initialized = false;

function ensureInit(): void {
  if (initialized) return;
  initSync({ module: dataUrlToBytes(wasmDataUrl) });
  initialized = true;
}

const DEFAULT_OPTIONS: Options = {
  isUpdate: false,
  inputFormat: "markdown",
  listStyle: "dash",
  linkTitleStyle: "paren",
  linkUrlStyle: "none",
};

/** Runs an mq query over `content` and returns the resulting Markdown. */
export function run(
  code: string,
  content: string,
  options: Partial<Options> = {},
): Promise<string> {
  ensureInit();
  return wasmRun(code, content, { ...DEFAULT_OPTIONS, ...options });
}

/** Formats mq source code. */
export function format(code: string): Promise<string> {
  ensureInit();
  return wasmFormat(code);
}

/** Returns parse/type diagnostics for mq source code. */
export function diagnostics(
  code: string,
  enableTypeCheck?: boolean,
): Promise<ReadonlyArray<Diagnostic>> {
  ensureInit();
  return wasmDiagnostics(code, enableTypeCheck);
}

/** Returns inlay type hints for mq source code. */
export function inlayHints(code: string): Promise<ReadonlyArray<InlayHint>> {
  ensureInit();
  return wasmInlayHints(code);
}

/** Returns hover information for the symbol at `line`/`column` (1-based), or `null`. */
export function hover(
  code: string,
  line: number,
  column: number,
): Promise<HoverResult | null> {
  ensureInit();
  return wasmHover(code, line, column);
}

/** Lists functions/selectors/variables defined in mq source code, for completion. */
export function definedValues(
  code: string,
  module?: string,
): Promise<ReadonlyArray<DefinedValue>> {
  ensureInit();
  return wasmDefinedValues(code, module);
}

/** Converts Markdown to HTML. */
export function toHtml(markdown: string): Promise<string> {
  ensureInit();
  return wasmToHtml(markdown);
}

/** Converts HTML to Markdown. */
export function htmlToMarkdown(
  html: string,
  options?: ConversionOptions,
): Promise<string> {
  ensureInit();
  return wasmHtmlToMarkdown(html, options);
}

/** Parses mq source code and returns its AST as a JSON string. */
export function toAst(code: string): Promise<string> {
  ensureInit();
  return wasmToAst(code);
}
