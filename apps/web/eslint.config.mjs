import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Vendored shadcn/ui source, installed and overwritten by `make shadcn`.
    // These are not ours to edit (NFR-MNT-006), so linting them only produces
    // findings we are not allowed to act on. Token wiring lives in globals.css.
    "src/components/ui/**",
    "src/hooks/use-mobile.ts",

    // Build artifact copied from dataset/derived/ by `make hazard`.
    "public/data/**",
  ]),
]);

export default eslintConfig;
