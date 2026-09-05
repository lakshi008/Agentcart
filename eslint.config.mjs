import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const compat     = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react/no-unescaped-entities":       "off",
      "@next/next/no-img-element":          "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    // These files use setState inside effects intentionally (theme/user init)
    files: ["**/ThemeProvider.tsx", "**/hooks/useUser.ts", "**/profile/page.tsx"],
    rules: { "react-hooks/exhaustive-deps": "warn" },
  },
];
