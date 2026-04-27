import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "public/sw.js",
    "public/sw.js.map",
    "public/workbox-*.js",
    "public/workbox-*.js.map",
    "next-env.d.ts",
  ]),
]);
