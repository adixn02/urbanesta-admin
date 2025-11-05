import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Allow unescaped entities (we'll use proper escaping)
      "react/no-unescaped-entities": "error",
      // Allow img tags (Next.js Image optimization can be added later)
      "@next/next/no-img-element": "warn",
      // React hooks exhaustive deps - warnings are acceptable
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
