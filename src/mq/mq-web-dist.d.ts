/**
 * Ambient types for `mq-web/dist/mq_wasm.js`, the raw wasm-bindgen (`--target web`) output
 * that `mq-web` ships inside its published `dist/` alongside its own typed API. `mq-web`'s
 * package.json has no "exports" restriction, so this deep import is reachable at runtime,
 * but `mq-web` only publishes rolled-up declarations for its own `index`/`core` entry
 * points — not for `mq_wasm.d.ts` itself — so TypeScript can't see it without this shim.
 *
 * Mirrors the `typescript_custom_section` in `mq-wasm`'s `script.rs` for the `mq-web@0.6.5`
 * release this plugin depends on; keep in sync when bumping that dependency.
 */
declare module "mq-web/dist/mq_wasm.js" {
  export type DefinedValueType = "Function" | "Variable";

  export interface DefinedValue {
    name: string;
    args?: string[];
    doc: string;
    valueType: DefinedValueType;
  }

  export interface Diagnostic {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    message: string;
  }

  export interface InlayHint {
    line: number;
    column: number;
    label: string;
  }

  export interface HoverResult {
    content: string;
  }

  export interface Options {
    isUpdate: boolean;
    inputFormat: "markdown" | "text" | "mdx" | "html" | "null" | "raw" | null;
    listStyle: "dash" | "plus" | "star" | null;
    linkTitleStyle: "double" | "single" | "paren" | null;
    linkUrlStyle: "angle" | "none" | null;
    /** Domains permitted for HTTP module imports in addition to github.com/harehare (always allowed). */
    allowedDomains?: string[];
    /** Maximum time in milliseconds a query may run before evaluation is aborted. Disabled (no timeout) if omitted. */
    timeoutMs?: number;
  }

  export interface ConversionOptions {
    extract_scripts_as_code_blocks: boolean;
    generate_front_matter: boolean;
    use_title_as_h1: boolean;
  }

  export function definedValues(code: string, module?: string): Promise<ReadonlyArray<DefinedValue>>;
  export function diagnostics(code: string, enableTypeCheck?: boolean): Promise<ReadonlyArray<Diagnostic>>;
  export function hover(code: string, line: number, column: number): Promise<HoverResult | null>;
  export function inlayHints(code: string): Promise<ReadonlyArray<InlayHint>>;
  export function run(code: string, content: string, options: Options): Promise<string>;
  export function toAst(code: string): Promise<string>;
  export function format(code: string): Promise<string>;
  export function htmlToMarkdown(htmlInput: string, options?: ConversionOptions | null): Promise<string>;
  export function toHtml(markdownInput: string): Promise<string>;
  /** Clears mutable HTTP module cache (HEAD/branch imports) and their mq.lock entries. */
  export function clearHttpCache(): Promise<void>;
  /** Clears all HTTP module cache including versioned (tagged) imports, and deletes mq.lock. */
  export function clearAllHttpCache(): Promise<void>;

  export type SyncInitInput = BufferSource | WebAssembly.Module;

  /** Synchronously instantiates the wasm module from pre-loaded bytes or a compiled `WebAssembly.Module`. */
  export function initSync(module: { module: SyncInitInput } | SyncInitInput): unknown;

  /** Async, `fetch()`-based init. Not used by this plugin (see `src/mq/wasm.ts`); declared for completeness. */
  const init: (module_or_path?: unknown) => Promise<unknown>;
  export default init;
}
