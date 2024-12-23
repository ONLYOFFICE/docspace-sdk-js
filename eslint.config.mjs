import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-expressions": "off"
    }
  }
];
