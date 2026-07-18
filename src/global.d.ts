declare module "*.wasm" {
  // esbuild's `dataurl` loader: a `data:application/wasm;base64,...` string, decoded by
  // hand in src/mq/wasm.ts (see the comment there for why `binary` isn't used instead).
  const dataUrl: string;
  export default dataUrl;
}
