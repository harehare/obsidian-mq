import parser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
  {
    // Declarative settings API (getControlValue/setControlValue) is only invoked by Obsidian
    // on hosts that support it (>=1.13.0); older hosts fall back to display() instead, so
    // minAppVersion can stay at 1.5.0. See commit c1eeca6.
    files: ["src/settings.ts"],
    rules: {
      "obsidianmd/no-unsupported-api": "off",
    },
  },
  {
    // setDestructive() requires Obsidian 1.13+; setWarning() is used deliberately to keep
    // minAppVersion at 1.5.0.
    files: ["src/modals/ConfirmModal.ts"],
    rules: {
      "@typescript-eslint/no-deprecated": "off",
    },
  },
];
