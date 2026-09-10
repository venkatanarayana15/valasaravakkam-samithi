import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Build output & generated files
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Public assets are not linted
    "public/**",
    // Local OpenCode runtime scaffold (vendored node_modules + global skills)
    ".opencode/**",
    // QA artifacts
    "qa-runs/**",
  ]),
]);

export default eslintConfig;
